const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/dashboardController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

router.use(authMiddleware);

router.get("/student", requireRole("STUDENT"), ctrl.studentDashboard);
router.get("/lecturer", requireRole("LECTURER"), ctrl.lecturerDashboard);
router.get("/admin", requireRole("ADMIN"), ctrl.adminDashboard);

module.exports = router;
