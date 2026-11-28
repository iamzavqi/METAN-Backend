const router = require("express").Router();
const taskController = require("./task.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const checkRole = require("../../middleware/checkRole.middleware");

const MANAGE = checkRole("ceo", "director", "admin");

// Rahbar: yaratish, tasdiqlash, rad etish
router.post("/create", authMiddleware, MANAGE, taskController.createTask);
router.put("/:id/approve", authMiddleware, MANAGE, taskController.approveTask);
router.put("/:id/reject", authMiddleware, MANAGE, taskController.rejectTask);

// Hamma: ro'yxat va bitta vazifa (service o'zi kimga nima ko'rinishini hal qiladi)
router.get("/get-tasks", authMiddleware, taskController.getTasks);
router.get("/:id", authMiddleware, taskController.getTask);

// Biriktirilgan xodim: "qildim"
router.put("/:id/done", authMiddleware, taskController.markDone);

module.exports = router;
