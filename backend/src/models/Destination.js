const mongoose = require("mongoose");

const destinationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String },
        location: {
            lat: { type: Number },
            lng: { type: Number }
        },
        coverImage: { type: String },
        tags: [{ type: String }]
    },
    { timestamps: true }
);

destinationSchema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => { ret.id = ret._id; delete ret._id; }
});

module.exports = mongoose.model("Destination", destinationSchema);
