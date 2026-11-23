const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth.middleware");
const bankController = require("./bank.controller");
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.post("/upload", authMiddleware, upload.single("file"), bankController.upload);
router.get("/transactions", authMiddleware, bankController.getTransactions);

module.exports = router;