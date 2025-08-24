const mongoose = require("mongoose");

const tripInviteSchema = new mongoose.Schema(
    {
        trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        email: { type: String },   // optional target identity
        phone: { type: String },   // optional
        invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // if known
        tokenHash: { type: String, required: true }, // store hash, not raw token
        expiresAt: { type: Date, required: true },
        status: { type: String, enum: ["pending", "accepted", "declined", "revoked"], default: "pending" }
    },
    { timestamps: true }
);

tripInviteSchema.index({ tokenHash: 1 }, { unique: true });
tripInviteSchema.index({ trip: 1, status: 1 });

tripInviteSchema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.tokenHash; // never leak
    }
});

module.exports = mongoose.model("TripInvite", tripInviteSchema);
