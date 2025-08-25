const mongoose = require("mongoose");

const stepSchema = new mongoose.Schema(
    {
        order: { type: Number, required: true },
        day: { type: Number, default: 1 },       // grouping by day (optional)
        place: { type: mongoose.Schema.Types.ObjectId, ref: "Place", required: true },
        note: { type: String }
    },
    { _id: false }
);

const templateSchema = new mongoose.Schema(
    {
        destination: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", required: true, index: true },
        title: { type: String, required: true },
        steps: { type: [stepSchema], default: [] }
    },
    { timestamps: true }
);

templateSchema.set("toJSON", {
    virtuals: true, versionKey: false,
    transform: (_, ret) => { ret.id = ret._id; delete ret._id; }
});

module.exports = mongoose.model("Template", templateSchema);
