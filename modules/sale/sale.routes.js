const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth.middleware");
const {createSale} = require("./sale.controller");


router.post("/create", authMiddleware, createSale)

module.exports = router;