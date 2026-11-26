const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth.middleware");
const checkRole = require("../../middleware/checkRole.middleware");
const {
  createWallet,
  perebros,
  getWallets,
  allPerebros,
} = require("./wallet.controller");
const {
  createTransaction,
  getTransactions,
} = require("./transaction/transaction.controller");

router.post("/create", authMiddleware, createWallet);
router.post("/perebros", authMiddleware, perebros);
router.get("/get-wallets", authMiddleware, getWallets);
router.get("/all-perebros", authMiddleware, allPerebros);

router.post(
  "/transaction",
  authMiddleware,
  checkRole("moliyachi"),
  createTransaction,
);
router.get("/get-transactions", authMiddleware, getTransactions);

module.exports = router;
