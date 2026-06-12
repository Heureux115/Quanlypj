const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/taskController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);

router.post("/", ctrl.createTask);
router.get("/group/:groupId", ctrl.getTasksByGroup);
router.patch("/:id/progress", ctrl.updateTaskProgress);
router.put("/:id", ctrl.updateTask);
router.delete("/:id", ctrl.deleteTask);

module.exports = router;