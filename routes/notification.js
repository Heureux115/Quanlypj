const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notificationController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);
router.get("/", ctrl.getNotifications);

module.exports = router;
