const mongoose = require("mongoose");

const categories = [
    "sightseeing", "cafe", "restaurant", "bar", "nightlife", "museum",
    "park", "nature", "adventure", "temple", "beach", "shopping", "hostel", "hotel"
];

const placeSchema = new mongoose.Schema(
    {
        destination: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", required: true, index: true },
        name: { type: String, required: true },
        category: { type: String, enum: categories, required: true },
        tags: [{ type: String }],
        description: { type: String },
        location: { lat: Number, lng: Number },
        address: { type: String },
        rating: { type: Number, min: 0, max: 5 },
        images: [{ type: String }]
    },
    { timestamps: true }
);

placeSchema.index({ destination: 1, category: 1 });
placeSchema.set("toJSON", {
    virtuals: true, versionKey: false,
    transform: (_, ret) => { ret.id = ret._id; delete ret._id; }
});

module.exports = mongoose.model("Place", placeSchema);
module.exports.categories = categories;
