const express = require("express");
const router = express.Router();

const { gradeStudent, getProjectGrades, getStudentFinal } = require("../controllers/gradeController");
const requireAuth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

// ✅ Chỉ giảng viên chấm điểm
router.post("/", requireAuth, requireRole("LECTURER"), gradeStudent);

router.get("/project/:projectId", requireAuth, requireRole("LECTURER", "ADMIN"), getProjectGrades);
router.get("/:userId", requireAuth, getStudentFinal);

module.exports = router;
