const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/gitController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/sync", authMiddleware, ctrl.syncCommits);
router.post("/groups/:groupId/sync-github", authMiddleware, ctrl.syncGitHubGroup);
router.patch("/groups/:groupId/repo", authMiddleware, ctrl.updateGroupRepo);
router.get("/commits/group/:groupId", authMiddleware, ctrl.getCommitsByGroup);
router.get("/activities/group/:groupId", authMiddleware, ctrl.getActivitiesByGroup);

module.exports = router;
