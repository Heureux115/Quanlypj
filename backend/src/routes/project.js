const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/projectController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

router.use(authMiddleware);

router.post("/", requireRole("LECTURER", "ADMIN"), ctrl.createProject);
router.get("/", ctrl.getAllProjects);
router.get("/:id", ctrl.getProjectById);
router.put("/:id", requireRole("LECTURER", "ADMIN"), ctrl.updateProject);
router.delete("/:id", requireRole("LECTURER", "ADMIN"), ctrl.deleteProject);

module.exports = router;