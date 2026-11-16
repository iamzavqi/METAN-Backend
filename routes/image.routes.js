const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");

const {
	getImage,
} = require("../controller/image.controller");

router.get("/images/:filename/:token",  getImage);

module.exports = router;
