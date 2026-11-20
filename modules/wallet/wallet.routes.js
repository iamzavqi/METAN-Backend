const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth.middleware");
const {createWallet, perebros, getWallets, allPerebros} = require("./wallet.controller");


router.post("/create", authMiddleware, createWallet)
router.post("/perebros", authMiddleware, perebros)
router.get('/get-wallets', authMiddleware, getWallets)
router.get('/all-perebros', authMiddleware, allPerebros)

module.exports = router;