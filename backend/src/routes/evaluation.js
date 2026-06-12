const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/evaluationController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);
router.post("/", ctrl.createEvaluation);
router.get("/group/:groupId/analyze", ctrl.analyzeGroup);

module.exports = router;