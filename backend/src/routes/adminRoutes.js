const router = require("express").Router();
const admin = require("../middlewares/adminMiddleware");
const auth = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/adminController");

router.use(auth, admin);

router.post("/destinations", ctrl.createDestination);
router.post("/places", ctrl.createPlace);
router.post("/rentals", ctrl.createRental);
router.post("/templates", ctrl.createTemplate);

module.exports = router;
