const router = require("express").Router();
const ctrl = require("../controllers/exploreController");

router.get("/destinations", ctrl.listDestinations);
router.get("/destinations/:id", ctrl.getDestination); // id or slug
router.get("/destinations/:id/places", ctrl.listPlacesByDestination);
router.get("/destinations/:id/rentals", ctrl.listRentalsByDestination);
router.get("/destinations/:id/templates", ctrl.listTemplatesByDestination);

module.exports = router;
