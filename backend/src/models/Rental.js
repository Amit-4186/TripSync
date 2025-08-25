const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
    {
        destination: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", required: true, index: true },
        type: { type: String, enum: ["car", "bike", "scooter"], required: true },
        vendorName: { type: String, required: true },
        contactPhone: { type: String },
        contactEmail: { type: String },
        location: { lat: Number, lng: Number, address: String },
        pricePerDay: { type: Number },
        rating: { type: Number, min: 0, max: 5 }
    },
    { timestamps: true }
);

rentalSchema.index({ destination: 1, type: 1 });
rentalSchema.set("toJSON", {
    virtuals: true, versionKey: false,
    transform: (_, ret) => { ret.id = ret._id; delete ret._id; }
});

module.exports = mongoose.model("Rental", rentalSchema);
