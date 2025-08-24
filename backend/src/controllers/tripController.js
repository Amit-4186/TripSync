const crypto = require("crypto");
const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const TripInvite = require("../models/TripInvite");
const User = require("../models/User");
const redis = require("../config/redis");

// ---------- helpers ----------
const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const genCode = (len = 10) => crypto.randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);

const findMember = (trip, userId) => trip.members.find(m => m.user.equals(userId));
const hasAnyRole = (trip, userId, roles) => {
    const m = findMember(trip, userId);
    if (!m) return false;
    return roles.includes(m.role);
};

const sanitizeTrip = (trip) => trip.toJSON();

// ---------- CRUD ----------
exports.createTrip = async (req, res) => {
    try {
        const { title, description, startDate, endDate } = req.body;
        if (!title) return res.status(400).json({ success: false, message: "Title required" });

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ success: false, message: "startDate must be before endDate" });
        }

        const trip = await Trip.create({
            title,
            description,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            owner: req.user.id,
            joinCode: genCode(8)
        });

        res.status(201).json({ success: true, data: sanitizeTrip(trip) });
    } catch (e) {
        console.error("createTrip:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.listMyTrips = async (req, res) => {
    try {
        const trips = await Trip.find({ "members.user": req.user.id }).sort({ updatedAt: -1 });
        res.json({ success: true, data: trips.map(sanitizeTrip) });
    } catch (e) {
        console.error("listMyTrips:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getTrip = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

        const trip = await Trip.findById(id).populate("members.user", "name email");
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!findMember(trip, req.user.id)) return res.status(403).json({ success: false, message: "Not a member" });

        res.json({ success: true, data: sanitizeTrip(trip) });
    } catch (e) {
        console.error("getTrip:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.updateTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, startDate, endDate, status } = req.body;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!hasAnyRole(trip, req.user.id, ["owner", "admin"])) return res.status(403).json({ success: false, message: "Only owner/admin can update" });

        if (title) trip.title = title;
        if (description !== undefined) trip.description = description;
        if (startDate) trip.startDate = new Date(startDate);
        if (endDate) trip.endDate = new Date(endDate);
        if (startDate && endDate && trip.startDate > trip.endDate) {
            return res.status(400).json({ success: false, message: "startDate must be before endDate" });
        }
        if (status && ["draft", "active", "completed", "cancelled"].includes(status)) {
            trip.status = status;
        }

        await trip.save();
        res.json({ success: true, data: sanitizeTrip(trip) });
    } catch (e) {
        console.error("updateTrip:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.deleteTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!hasAnyRole(trip, req.user.id, ["owner"])) return res.status(403).json({ success: false, message: "Only owner can delete" });

        await Trip.deleteOne({ _id: id });
        // cleanup cached locations
        await redis.del(`trip:${id}:locations`).catch(() => { });
        res.json({ success: true, message: "Trip deleted" });
    } catch (e) {
        console.error("deleteTrip:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ---------- lifecycle ----------
exports.startTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!hasAnyRole(trip, req.user.id, ["owner", "admin"])) return res.status(403).json({ success: false, message: "Only owner/admin" });

        trip.status = "active";
        await trip.save();
        res.json({ success: true, data: sanitizeTrip(trip) });
    } catch (e) {
        console.error("startTrip:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.completeTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!hasAnyRole(trip, req.user.id, ["owner", "admin"])) return res.status(403).json({ success: false, message: "Only owner/admin" });

        trip.status = "completed";
        await trip.save();
        // optional: freeze locations snapshot, or just clear
        await redis.del(`trip:${id}:locations`).catch(() => { });
        res.json({ success: true, data: sanitizeTrip(trip) });
    } catch (e) {
        console.error("completeTrip:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ---------- membership ----------
exports.leaveTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

        const member = findMember(trip, req.user.id);
        if (!member) return res.status(403).json({ success: false, message: "Not a member" });

        if (member.role === "owner" && trip.members.length > 1) {
            return res.status(400).json({ success: false, message: "Owner must transfer ownership or delete trip before leaving" });
        }

        trip.members = trip.members.filter(m => !m.user.equals(req.user.id));
        await trip.save();
        res.json({ success: true, message: "Left trip" });
    } catch (e) {
        console.error("leaveTrip:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.kickMember = async (req, res) => {
    try {
        const { id, memberId } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!hasAnyRole(trip, req.user.id, ["owner", "admin"])) return res.status(403).json({ success: false, message: "Only owner/admin" });

        const target = trip.members.find(m => m.user.equals(memberId));
        if (!target) return res.status(404).json({ success: false, message: "Member not in trip" });
        if (target.role === "owner") return res.status(400).json({ success: false, message: "Cannot remove owner" });

        trip.members = trip.members.filter(m => !m.user.equals(memberId));
        await trip.save();
        res.json({ success: true, message: "Member removed" });
    } catch (e) {
        console.error("kickMember:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.setRole = async (req, res) => {
    try {
        const { id, memberId } = req.params;
        const { role } = req.body; // admin/member (owner change via transferOwnership)
        if (!["admin", "member"].includes(role)) {
            return res.status(400).json({ success: false, message: "Role must be admin or member" });
        }
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!hasAnyRole(trip, req.user.id, ["owner"])) return res.status(403).json({ success: false, message: "Only owner" });

        const m = trip.members.find(m => m.user.equals(memberId));
        if (!m) return res.status(404).json({ success: false, message: "Member not found" });
        if (m.role === "owner") return res.status(400).json({ success: false, message: "Use transferOwnership" });

        m.role = role;
        await trip.save();
        res.json({ success: true, data: sanitizeTrip(trip) });
    } catch (e) {
        console.error("setRole:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.transferOwnership = async (req, res) => {
    try {
        const { id } = req.params;
        const { toUserId } = req.body;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        const me = findMember(trip, req.user.id);
        if (!me || me.role !== "owner") return res.status(403).json({ success: false, message: "Only owner" });

        const target = trip.members.find(m => m.user.equals(toUserId));
        if (!target) return res.status(404).json({ success: false, message: "Target user not a member" });

        // demote old owner to admin
        me.role = "admin";
        target.role = "owner";
        trip.owner = target.user;

        await trip.save();
        res.json({ success: true, data: sanitizeTrip(trip) });
    } catch (e) {
        console.error("transferOwnership:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ---------- invites ----------
exports.createInvites = async (req, res) => {
    try {
        const { id } = req.params;
        const { emails = [], phones = [], userIds = [], expiresInMinutes = 1440 } = req.body;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!hasAnyRole(trip, req.user.id, ["owner", "admin"])) return res.status(403).json({ success: false, message: "Only owner/admin" });

        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
        const invites = [];

        const targets = [
            ...emails.map(e => ({ email: e })),
            ...phones.map(p => ({ phone: p })),
            ...userIds.map(u => ({ invitedUser: u }))
        ];

        for (const t of targets) {
            const raw = crypto.randomBytes(24).toString("hex");
            const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
            const inv = await TripInvite.create({
                trip: trip._id,
                invitedBy: req.user.id,
                ...t,
                tokenHash,
                expiresAt
            });
            invites.push({
                invite: inv.toJSON(),
                // Dev-only link
                link: `${process.env.CLIENT_URL || "http://localhost:3000"}/trip-invite?token=${raw}`
            });
        }

        res.status(201).json({ success: true, data: invites });
    } catch (e) {
        console.error("createInvites:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.listInvites = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!hasAnyRole(trip, req.user.id, ["owner", "admin"])) return res.status(403).json({ success: false, message: "Only owner/admin" });

        const invites = await TripInvite.find({ trip: id }).sort({ createdAt: -1 });
        res.json({ success: true, data: invites.map(i => i.toJSON()) });
    } catch (e) {
        console.error("listInvites:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.acceptInvite = async (req, res) => {
    try {
        const { token } = req.params; // raw token from link
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const invite = await TripInvite.findOne({ tokenHash, status: "pending", expiresAt: { $gt: new Date() } }).populate("trip");
        if (!invite) return res.status(400).json({ success: false, message: "Invalid or expired invite" });

        const trip = invite.trip;
        if (!findMember(trip, req.user.id)) {
            trip.members.push({ user: req.user.id, role: "member" });
            await trip.save();
        }

        invite.status = "accepted";
        invite.invitedUser = req.user.id;
        await invite.save();

        res.json({ success: true, message: "Joined trip", data: sanitizeTrip(trip) });
    } catch (e) {
        console.error("acceptInvite:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.declineInvite = async (req, res) => {
    try {
        const { token } = req.params;
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const invite = await TripInvite.findOne({ tokenHash, status: "pending", expiresAt: { $gt: new Date() } });
        if (!invite) return res.status(400).json({ success: false, message: "Invalid or expired invite" });

        invite.status = "declined";
        invite.invitedUser = req.user.id;
        await invite.save();

        res.json({ success: true, message: "Invite declined" });
    } catch (e) {
        console.error("declineInvite:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ---------- join code ----------
exports.joinByCode = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ success: false, message: "Code required" });

        const trip = await Trip.findOne({ joinCode: code });
        if (!trip) return res.status(400).json({ success: false, message: "Invalid code" });

        if (!findMember(trip, req.user.id)) {
            trip.members.push({ user: req.user.id, role: "member" });
            await trip.save();
        }
        res.json({ success: true, message: "Joined trip", data: sanitizeTrip(trip) });
    } catch (e) {
        console.error("joinByCode:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.rotateJoinCode = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!hasAnyRole(trip, req.user.id, ["owner", "admin"])) return res.status(403).json({ success: false, message: "Only owner/admin" });

        trip.joinCode = genCode(8);
        await trip.save();
        res.json({ success: true, data: { joinCode: trip.joinCode } });
    } catch (e) {
        console.error("rotateJoinCode:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ---------- locations (Redis) ----------
exports.getLastLocations = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!findMember(trip, req.user.id)) return res.status(403).json({ success: false, message: "Not a member" });

        const key = `trip:${id}:locations`;
        const map = await redis.hgetall(key);
        // return as { userId: {lat,lng,ts} }
        Object.keys(map).forEach(k => { map[k] = JSON.parse(map[k]); });
        res.json({ success: true, data: map });
    } catch (e) {
        console.error("getLastLocations:", e.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
