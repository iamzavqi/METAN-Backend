const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth.middleware");
const {createCategory, createSubCategory, getCategories, getSubCategories} = require("./categories.controller");


router.post("/category", authMiddleware, createCategory)
router.post("/subcategory/:categoryId", authMiddleware, createSubCategory)
router.get('/category', authMiddleware, getCategories)
router.get('/subcategory/:categoryId', authMiddleware, getSubCategories)
module.exports = router;