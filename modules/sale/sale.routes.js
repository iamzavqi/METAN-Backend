const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth.middleware");
const checkRole = require("../../middleware/checkRole.middleware");
const {
  createSale,
  getSales,
  approveSale,
  rejectSale,
} = require("./sale.controller");
const { createFirm, getFirms } = require("./firm/firm.controller");

router.post("/create", authMiddleware, createSale);
router.get("/get-sales", authMiddleware, getSales);
router.put(
  "/:id/approve",
  authMiddleware,
  checkRole("moliyachi"),
  approveSale,
);
router.put("/:id/reject", authMiddleware, checkRole("moliyachi"), rejectSale);

// firm
router.post("/create/firm", authMiddleware, createFirm);
router.get("/get-firms", authMiddleware, getFirms);

module.exports = router;
