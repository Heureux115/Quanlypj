const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/register", auth.register);
router.post("/login", auth.login);
router.get("/me", authMiddleware, auth.me);
router.patch("/me", authMiddleware, auth.updateMe);
router.patch("/password", authMiddleware, auth.changePassword);

module.exports = router;
