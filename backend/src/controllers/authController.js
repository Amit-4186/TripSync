const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const redis = require("../config/redis");
const nodemailer = require("nodemailer");

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15d";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "15d";

function signAccessToken(user) {
    return jwt.sign({ id: user._id.toString(), email: user.email || null }, process.env.JWT_SECRET, {
        expiresIn: ACCESS_EXPIRES
    });
}

function signRefreshToken(user) {
    const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_EXPIRES
    });
    const ttlSeconds = parseTTLSeconds(REFRESH_EXPIRES);
    redis.set(`refresh:${token}`, user._id.toString(), "EX", ttlSeconds).catch(() => { });
    return token;
}

function parseTTLSeconds(exp) {
    if (typeof exp === "number") return exp;
    if (exp.endsWith("d")) return parseInt(exp) * 24 * 60 * 60;
    if (exp.endsWith("h")) return parseInt(exp) * 60 * 60;
    if (exp.endsWith("m")) return parseInt(exp) * 60;
    return 7 * 24 * 60 * 60; // Default: 7 days
}

async function sendResetEmail(toEmail, resetUrl) {
    if (!process.env.SMTP_HOST) {
        console.log("Password reset link (dev):", resetUrl);
        return;
    }
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || "tripsync@example.com",
        to: toEmail,
        subject: "TripSync password reset",
        text: `Reset your password: ${resetUrl}`,
        html: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`
    });
}

// ✅ FIXED REGISTER
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        if (!name || !password || (!email && !phone)) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const query = [];
        if (email) query.push({ email });
        if (phone) query.push({ phone });

        const existing = await User.findOne({ $or: query });
        if (existing) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, phone, password: hashed });

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);

        res.status(201).json({
            success: true,
            data: {
                user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
                accessToken,
                refreshToken
            }
        });
    } catch (err) {
        console.error("register error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ✅ FIXED LOGIN
exports.login = async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        if ((!email && !phone) || !password) {
            return res.status(400).json({ success: false, message: "Missing credentials" });
        }

        const query = [];
        if (email) query.push({ email });
        if (phone) query.push({ phone });

        const user = await User.findOne({ $or: query });
        if (!user) return res.status(400).json({ success: false, message: "Invalid credentials" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);

        res.json({
            success: true,
            data: {
                user: { id: user._id, name: user.name, email: user.email },
                accessToken,
                refreshToken
            }
        });
    } catch (err) {
        console.error("login error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ success: false, message: "Refresh token required" });
        await redis.del(`refresh:${refreshToken}`);
        res.json({ success: true, message: "Logged out" });
    } catch (err) {
        console.error("logout error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ success: false, message: "Refresh token required" });

        try {
            const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const stored = await redis.get(`refresh:${refreshToken}`);
            if (!stored || stored !== payload.id) {
                return res.status(401).json({ success: false, message: "Refresh token invalid" });
            }

            const user = await User.findById(payload.id);
            if (!user) return res.status(401).json({ success: false, message: "User not found" });

            await redis.del(`refresh:${refreshToken}`);
            const newRefresh = signRefreshToken(user);
            const accessToken = signAccessToken(user);

            res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
        } catch (e) {
            return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
        }
    } catch (err) {
        console.error("refresh error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email required" });

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: true, message: "If that email exists, a reset link has been sent" });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const hash = crypto.createHash("sha256").update(token).digest("hex");
        user.passwordResetToken = hash;
        user.passwordResetExpires = Date.now() + 3600000;
        await user.save();

        const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password?token=${token}&id=${user._id}`;
        await sendResetEmail(user.email, resetUrl);

        res.json({
            success: true,
            message: "If that email exists, a reset link has been sent",
            resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined
        });
    } catch (err) {
        console.error("forgotPassword error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, userId, newPassword } = req.body;
        if (!token || !userId || !newPassword) {
            return res.status(400).json({ success: false, message: "Missing fields" });
        }

        const hash = crypto.createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            _id: userId,
            passwordResetToken: hash,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ success: false, message: "Invalid or expired token" });

        user.password = await bcrypt.hash(newPassword, 10);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        await deleteAllRefreshTokensForUser(user._id.toString());

        res.json({ success: true, message: "Password reset successful" });
    } catch (err) {
        console.error("resetPassword error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Missing fields" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const ok = await bcrypt.compare(oldPassword, user.password);
        if (!ok) return res.status(400).json({ success: false, message: "Old password incorrect" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        await deleteAllRefreshTokensForUser(userId);

        res.json({ success: true, message: "Password changed successfully" });
    } catch (err) {
        console.error("changePassword error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.profile = async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const user = await User.findById(userId).select("-password -passwordResetToken -passwordResetExpires");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, data: user });
    } catch (err) {
        console.error("profile error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

async function deleteAllRefreshTokensForUser(userId) {
    try {
        const keys = await redis.keys("refresh:*");
        if (!keys || keys.length === 0) return;
        const pipeline = redis.pipeline();
        for (const k of keys) pipeline.get(k);
        const vals = await pipeline.exec();

        const delPipeline = redis.pipeline();
        for (let i = 0; i < keys.length; i++) {
            const value = vals[i] && vals[i][1] ? vals[i][1] : null;
            if (value === userId) delPipeline.del(keys[i]);
        }
        await delPipeline.exec();
    } catch (e) {
        console.error("deleteAllRefreshTokensForUser error:", e.message);
    }
}
