const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/documentController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);

router.post("/", ctrl.createDocument);
router.get("/task/:taskId", ctrl.getTaskDocuments);
router.delete("/:id", ctrl.deleteDocument);

module.exports = router;
