const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth.middleware");
const {
  regisCompany,
  allCompany
} = require("./company.controller");

router.post("/regis", authMiddleware, regisCompany);
router.get("/all", authMiddleware, allCompany);

module.exports = router;
