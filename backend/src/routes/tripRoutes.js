const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/tripController");
const plan = require("../controllers/tripPlanController");

// CRUD
router.post("/", ctrl.createTrip);
router.get("/", ctrl.listMyTrips);
router.get("/:id", ctrl.getTrip);
router.put("/:id", ctrl.updateTrip);
router.delete("/:id", ctrl.deleteTrip);

// lifecycle
router.post("/:id/start", ctrl.startTrip);
router.post("/:id/complete", ctrl.completeTrip);

// membership
router.post("/:id/leave", ctrl.leaveTrip);
router.delete("/:id/members/:memberId", ctrl.kickMember);
router.post("/:id/members/:memberId/role", ctrl.setRole);
router.post("/:id/transfer-ownership", ctrl.transferOwnership);

// invites
router.post("/:id/invites", ctrl.createInvites);
router.get("/:id/invites", ctrl.listInvites);
router.post("/invites/:token/accept", ctrl.acceptInvite);
router.post("/invites/:token/decline", ctrl.declineInvite);

// join code
router.post("/join/code", ctrl.joinByCode);
router.post("/:id/rotate-join-code", ctrl.rotateJoinCode);

// locations
router.get("/:id/locations", ctrl.getTripLocations);

// destination + plan
router.put("/:id/destination", plan.setDestination);
router.post("/:id/plan/from-template", plan.createPlanFromTemplate);
router.post("/:id/plan/custom", plan.createCustomPlan);
router.get("/:id/plan", plan.getPlan);
router.put("/:id/plan/reorder", plan.reorderPlan);
router.post("/:id/plan/:itemId/visited", plan.markVisited);
router.post("/:id/plan/:itemId/unvisit", plan.unvisit);
router.get("/:id/progress", plan.getProgress);

module.exports = router;
