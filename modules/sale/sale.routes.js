const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth.middleware");
const {createSale, getSales} = require("./sale.controller");
const {createFirm, getFirms} = require("./firm/firm.controller")


router.post("/create", authMiddleware, createSale)
router.get("/get-sales", authMiddleware, getSales)

// firm
router.post("/create/firm", authMiddleware, createFirm)
router.get("/get-firms", authMiddleware, getFirms)

module.exports = router;