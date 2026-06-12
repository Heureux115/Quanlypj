const express = require("express");
const router = express.Router();

const { createWarning } = require("../controllers/warningController");
const requireAuth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

// chỉ giảng viên tạo warning
router.post("/", requireAuth, requireRole("LECTURER"), createWarning);

module.exports = router;