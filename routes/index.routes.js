const express = require("express");
const router = express.Router();

/* user */
router.use("/auth/user", require("../modules/user/user.routes"));
router.use("/auth/company", require("../modules/user/company.routes"));
router.use("/uploads", require("./image.routes"));
router.use("/categories", require("../modules/categories/categories.routes"));

router.use("/sale", require("../modules/sale/sale.routes"));
router.use("/wallet", require("../modules/wallet/wallet.routes"));



module.exports = router;
