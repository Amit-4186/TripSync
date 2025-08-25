const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const Place = require("../models/Place");
const Template = require("../models/Template");

const isMember = (trip, uid) => trip.members.some(m => m.user.equals(uid));
const canManageTrip = (trip, uid) => trip.members.some(m => m.user.equals(uid) && ["owner", "admin"].includes(m.role));

exports.setDestination = async (req, res) => {
    try {
        const { id } = req.params;
        const { destinationId } = req.body;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!canManageTrip(trip, req.user.id)) return res.status(403).json({ success: false, message: "Only owner/admin" });
        trip.destination = destinationId;
        trip.plan = []; // reset plan when destination changes
        await trip.save();
        res.json({ success: true, data: trip.toJSON() });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.createPlanFromTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { templateId } = req.body;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!canManageTrip(trip, req.user.id)) return res.status(403).json({ success: false, message: "Only owner/admin" });

        const tpl = await Template.findById(templateId).populate("steps.place", "destination");
        if (!tpl) return res.status(404).json({ success: false, message: "Template not found" });
        if (!trip.destination || tpl.destination.toString() !== trip.destination.toString()) {
            return res.status(400).json({ success: false, message: "Template destination mismatch" });
        }
        trip.plan = tpl.steps.map(s => ({
            place: s.place._id,
            day: s.day || 1,
            order: s.order,
            note: s.note
        }));
        await trip.save();
        res.status(201).json({ success: true, data: trip.plan });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.createCustomPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { steps } = req.body; // [{place, day, note}] order inferred 1..N
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!canManageTrip(trip, req.user.id)) return res.status(403).json({ success: false, message: "Only owner/admin" });
        if (!trip.destination) return res.status(400).json({ success: false, message: "Set destination first" });
        if (!Array.isArray(steps) || steps.length === 0) {
            return res.status(400).json({ success: false, message: "Steps required" });
        }

        // Validate all places belong to the same destination
        const placeIds = steps.map(s => s.place);
        const places = await Place.find({ _id: { $in: placeIds } }).select("destination");
        const allOk = places.every(p => p.destination.toString() === trip.destination.toString());
        if (!allOk) return res.status(400).json({ success: false, message: "All places must belong to the trip destination" });

        trip.plan = steps.map((s, i) => ({
            place: s.place,
            day: s.day || 1,
            order: i + 1,
            note: s.note
        }));
        await trip.save();
        res.status(201).json({ success: true, data: trip.plan });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.getPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id).populate("plan.place", "name category location");
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!isMember(trip, req.user.id)) return res.status(403).json({ success: false, message: "Not a member" });
        const plan = [...trip.plan].sort((a, b) => a.order - b.order);
        res.json({ success: true, data: plan });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.reorderPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { order } = req.body; // array of planItemIds in new order
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!canManageTrip(trip, req.user.id)) return res.status(403).json({ success: false, message: "Only owner/admin" });
        if (!Array.isArray(order) || order.length !== trip.plan.length) {
            return res.status(400).json({ success: false, message: "Order array must include all plan item ids" });
        }

        const idToItem = new Map(trip.plan.map(it => [it._id.toString(), it]));
        const newPlan = order.map((pid, idx) => {
            const it = idToItem.get(pid);
            if (!it) throw new Error("Invalid plan item id");
            it.order = idx + 1;
            return it;
        });
        trip.plan = newPlan;
        await trip.save();
        res.json({ success: true, data: trip.plan });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.markVisited = async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const { lat, lng } = req.body || {};
        const trip = await Trip.findById(id).populate("plan.place", "location");
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!isMember(trip, req.user.id)) return res.status(403).json({ success: false, message: "Not a member" });

        const item = trip.plan.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: "Plan item not found" });

        // Optional geofence check (simple)
        if (lat && lng && item.place?.location?.lat && item.place?.location?.lng) {
            const d = haversine(lat, lng, item.place.location.lat, item.place.location.lng);
            // You can enforce a threshold later if you want: if (d > 0.3) return res.status(400)...
            // For now we accept but you could record distance.
        }

        item.visitedAt = new Date();
        await trip.save();
        res.json({ success: true, data: { itemId: item._id, visitedAt: item.visitedAt } });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.unvisit = async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!canManageTrip(trip, req.user.id)) return res.status(403).json({ success: false, message: "Only owner/admin" });

        const item = trip.plan.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: "Plan item not found" });

        item.visitedAt = undefined;
        await trip.save();
        res.json({ success: true, data: { itemId: item._id, visitedAt: null } });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.getProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });
        if (!isMember(trip, req.user.id)) return res.status(403).json({ success: false, message: "Not a member" });

        const total = trip.plan.length;
        const visited = trip.plan.filter(i => i.visitedAt).length;
        const pendingSorted = trip.plan.filter(i => !i.visitedAt).sort((a, b) => a.order - b.order);
        const nextItem = pendingSorted[0] || null;

        res.json({ success: true, data: { total, visited, pending: total - visited, nextItem } });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};


function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371; // km
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
