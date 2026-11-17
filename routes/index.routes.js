const express = require("express");
const router = express.Router();

/* user */
router.use("/auth/user", require("../modules/user/user.routes"));
router.use("/auth/company", require("../modules/user/company.routes"));
router.use("/uploads", require("./image.routes"));

router.use("/wallet", require("../modules/wallet/wallet.routes"));
router.use("/bank", require("../modules/bank/bank.routes"));



module.exports = router;
