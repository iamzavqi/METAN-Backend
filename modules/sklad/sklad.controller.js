const skladCategoryService = require("./sklad.category.service");
const skladProductService = require("./sklad.product.service");
const skladHouseService = require("./sklad.house.service");
const skladTransactionService = require("./sklad.transaction.service");
const skladHoldingService = require("./sklad.holding.service");

class SkladController {
  // ================= KATEGORIYA =================
  async createCategory(req, res, next) {
    try {
      const category = await skladCategoryService.createCategory(req, res);
      return res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await skladCategoryService.getCategories(req, res);
      return res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  // ================= MAHSULOT =================
  async createProduct(req, res, next) {
    try {
      const product = await skladProductService.createProduct(req, res);
      return res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  async getProducts(req, res, next) {
    try {
      const products = await skladProductService.getProducts(req, res);
      return res.json(products);
    } catch (error) {
      next(error);
    }
  }

  // ================= OMBOR =================
  async createHouse(req, res, next) {
    try {
      const house = await skladHouseService.createHouse(req, res);
      return res.status(201).json(house);
    } catch (error) {
      next(error);
    }
  }

  async getHouses(req, res, next) {
    try {
      const houses = await skladHouseService.getHouses(req, res);
      return res.json(houses);
    } catch (error) {
      next(error);
    }
  }

  async getHouse(req, res, next) {
    try {
      const house = await skladHouseService.getHouse(req, res);
      return res.json(house);
    } catch (error) {
      next(error);
    }
  }

  async setResponsible(req, res, next) {
    try {
      const house = await skladHouseService.setResponsible(req, res);
      return res.json(house);
    } catch (error) {
      next(error);
    }
  }

  // ================= HARAKATLAR =================
  async createTransaction(req, res, next) {
    try {
      const transaction = await skladTransactionService.createTransaction(req, res);
      return res.status(201).json(transaction);
    } catch (error) {
      next(error);
    }
  }

  async reverseTransaction(req, res, next) {
    try {
      const reversal = await skladTransactionService.reverseTransaction(req, res);
      return res.status(201).json(reversal);
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req, res, next) {
    try {
      const transactions = await skladTransactionService.getTransactions(req, res);
      return res.json(transactions);
    } catch (error) {
      next(error);
    }
  }

  // ================= XODIMDAGI INVENTAR =================
  async getHoldings(req, res, next) {
    try {
      const holdings = await skladHoldingService.getHoldings(req, res);
      return res.json(holdings);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SkladController();