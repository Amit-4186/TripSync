const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

const planItemSchema = new mongoose.Schema(
    {
        place: { type: mongoose.Schema.Types.ObjectId, ref: "Place", required: true },
        day: { type: Number, default: 1 },
        order: { type: Number, required: true },
        note: { type: String },
        visitedAt: { type: Date }
    },
    { _id: true }
);

const tripSchema = new mongoose.Schema(
    {
        destination: { type: mongoose.Schema.Types.ObjectId, ref: "Destination" },
        plan: { type: [planItemSchema], default: [] },
        title: { type: String, required: true },
        description: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        status: { type: String, enum: ["draft", "active", "completed", "cancelled"], default: "draft" },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        members: { type: [memberSchema], default: [] },
        joinCode: { type: String, index: true } // public join via code, can be rotated
    },
    { timestamps: true }
);

// Ensure owner is also in members[] as "owner"
tripSchema.pre("save", function (next) {
    if (!this.members.some(m => m.user.equals(this.owner))) {
        this.members.push({ user: this.owner, role: "owner" });
    }
    next();
});

// JSON transform (id instead of _id, hide internal fields)
tripSchema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => {
        ret.id = ret._id;
        delete ret._id;
    }
});

module.exports = mongoose.model("Trip", tripSchema);
