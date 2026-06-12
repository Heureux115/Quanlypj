const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/groupController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

router.use(authMiddleware);

router.post("/", requireRole("LECTURER", "ADMIN"), ctrl.createGroup);
router.post("/:id/join", requireRole("STUDENT"), ctrl.joinGroup);
router.post("/:id/join-requests", requireRole("STUDENT"), ctrl.joinGroup);
router.get("/:id/join-requests", ctrl.getJoinRequests);
router.patch("/join-requests/:requestId", ctrl.reviewJoinRequest);
router.get("/mine/list", ctrl.myGroups);
router.post("/:id/members", requireRole("LECTURER", "ADMIN"), ctrl.addMember);
router.delete("/:groupId/members/:userId", requireRole("LECTURER", "ADMIN"), ctrl.removeMember);
router.post("/:id/leader", requireRole("LECTURER", "ADMIN"), ctrl.setLeader);
router.post("/auto-assign/:projectId", requireRole("LECTURER", "ADMIN"), ctrl.autoAssign);
router.get("/:id", ctrl.getGroupDetails);
router.get("/:id/report", ctrl.groupReport);

module.exports = router;
