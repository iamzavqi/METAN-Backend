const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth.middleware");

const {regis, login, checkUser, allUsers} = require("./user.controller");

// Routes
router.post("/regis", authMiddleware, regis);
router.post("/login", login);
router.get("/check-user", authMiddleware, checkUser);
router.get("/all", authMiddleware, allUsers);

module.exports = router;
