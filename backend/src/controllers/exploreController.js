const mongoose = require("mongoose");
const Destination = require("../models/Destination");
const Place = require("../models/Place");
const Rental = require("../models/Rental");
const Template = require("../models/Template");

exports.listDestinations = async (req, res) => {
    try {
        const items = await Destination.find().sort({ name: 1 });
        res.json({ success: true, data: items });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.getDestination = async (req, res) => {
    try {
        const { id } = req.params;
        const by = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
        const d = await Destination.findOne(by);
        if (!d) return res.status(404).json({ success: false, message: "Destination not found" });
        res.json({ success: true, data: d });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.listPlacesByDestination = async (req, res) => {
    try {
        const { id } = req.params;
        const { category, tag, q } = req.query;
        const filter = { destination: id };
        if (category) filter.category = category;
        if (tag) filter.tags = tag;
        if (q) filter.name = { $regex: q, $options: "i" };
        const items = await Place.find(filter).sort({ name: 1 });
        res.json({ success: true, data: items });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.listRentalsByDestination = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query;
        const filter = { destination: id };
        if (type) filter.type = type;
        const items = await Rental.find(filter).sort({ vendorName: 1 });
        res.json({ success: true, data: items });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.listTemplatesByDestination = async (req, res) => {
    try {
        const { id } = req.params;
        const items = await Template.find({ destination: id }).populate("steps.place", "name category");
        res.json({ success: true, data: items });
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};
