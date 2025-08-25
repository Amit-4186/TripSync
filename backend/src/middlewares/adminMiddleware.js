const User = require("../models/User");

module.exports = async function adminMiddleware(req, res, next) {
    try {
        const me = await User.findById(req.user.id).select("isAdmin");
        if (!me || !me.isAdmin) {
            return res.status(403).json({ success: false, message: "Admin only" });
        }
        next();
    } catch (e) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
