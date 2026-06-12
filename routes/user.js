const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

router.use(authMiddleware);

router.get("/", requireRole("ADMIN", "LECTURER"), ctrl.getUsers);
router.post("/", requireRole("ADMIN"), ctrl.createUser);
router.patch("/:id/role", requireRole("ADMIN"), ctrl.updateUserRole);
router.patch("/:id/status", requireRole("ADMIN"), ctrl.updateUserStatus);
router.patch("/:id/git-username", requireRole("ADMIN", "LECTURER"), ctrl.updateUserGitUsername);
router.delete("/:id", requireRole("ADMIN"), ctrl.deleteUser);

module.exports = router;
