const router = require("express").Router();
const skladController = require("./sklad.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const checkRole = require("../../middleware/checkRole.middleware");

// Kim nima qila oladi
const MANAGE = checkRole("admin", "director", "moliyachi", "bugalter");


// ================= KATEGORIYA =================
router.post("/category/create", authMiddleware, MANAGE, skladController.createCategory);
router.get("/category/get-categories", authMiddleware, skladController.getCategories);

// ================= MAHSULOT =================
router.post("/product/create", authMiddleware, MANAGE, skladController.createProduct);
router.get("/product/get-products", authMiddleware, skladController.getProducts);

// ================= OMBOR =================
router.post("/house/create", authMiddleware, MANAGE, skladController.createHouse);
router.get("/house/get-houses", authMiddleware, skladController.getHouses);
router.get("/house/:id", authMiddleware, skladController.getHouse);
router.put("/house/:id/responsible", authMiddleware, MANAGE, skladController.setResponsible);

// ================= XODIMDAGI INVENTAR =================
router.get("/holding/get-holdings", authMiddleware,  skladController.getHoldings);

// ================= HARAKATLAR =================
router.post("/transaction/create", authMiddleware, MANAGE, skladController.createTransaction);
router.post("/transaction/:id/reverse", authMiddleware, MANAGE, skladController.reverseTransaction);
router.get("/transaction/get-transactions", authMiddleware, skladController.getTransactions);



module.exports = router;