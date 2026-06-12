const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/chatController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);

router.get("/groups/:id/messages", ctrl.getGroupMessages);
router.post("/groups/:id/messages", ctrl.createGroupMessage);

module.exports = router;
