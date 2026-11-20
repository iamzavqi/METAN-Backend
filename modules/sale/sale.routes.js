const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth.middleware");
const {createSale, getSales} = require("./sale.controller");


router.post("/create", authMiddleware, createSale)
router.get("/get-sales", authMiddleware, getSales)

module.exports = router;