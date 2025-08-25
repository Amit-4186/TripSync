const Destination = require("../models/Destination");
const Place = require("../models/Place");
const Rental = require("../models/Rental");
const Template = require("../models/Template");

exports.createDestination = async (req, res) => {
    try {
        const { name, slug, description, location, coverImage, tags } = req.body;
        const doc = await Destination.create({ name, slug, description, location, coverImage, tags });
        res.status(201).json({ success: true, data: doc });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.createPlace = async (req, res) => {
    try {
        const { destination, name, category, tags, description, location, address, rating, images } = req.body;
        const doc = await Place.create({ destination, name, category, tags, description, location, address, rating, images });
        res.status(201).json({ success: true, data: doc });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.createRental = async (req, res) => {
    try {
        const { destination, type, vendorName, contactPhone, contactEmail, location, pricePerDay, rating } = req.body;
        const doc = await Rental.create({ destination, type, vendorName, contactPhone, contactEmail, location, pricePerDay, rating });
        res.status(201).json({ success: true, data: doc });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};

exports.createTemplate = async (req, res) => {
    try {
        const { destination, title, steps } = req.body; // steps: [{order, day, place, note}]
        const doc = await Template.create({ destination, title, steps });
        res.status(201).json({ success: true, data: doc });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};
