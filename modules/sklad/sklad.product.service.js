const mongoose = require("mongoose");
const SkladProductModel = require("./modules/sklad.product.module");
const SkladCategoryModel = require("./modules/sklad.category.module");
const BaseError = require("../../errors/base.error");

const UNITS = ["dona", "kg", "kub", "metr", "litr"];
const TYPES = ["material", "inventory"];

class SkladProductService {
  async createProduct(req, res) {
    const { name, skladCategoryId, unit, type } = req.body;
    const companyId = req.user.companyId;

    // 1. Maydonlar
    if (typeof name !== "string" || !name.trim()) {
      throw BaseError.BadRequest("Mahsulot nomini kiriting");
    }
    if (!UNITS.includes(unit)) throw BaseError.BadRequest("O'lchov birligini tanlang");
    if (!TYPES.includes(type)) throw BaseError.BadRequest("Mahsulot turini tanlang");
    if (!mongoose.isValidObjectId(skladCategoryId)) {
      throw BaseError.BadRequest("Kategoriyani tanlang");
    }

    // 2. Kategoriya shu kompaniyaniki
    const category = await SkladCategoryModel.exists({ _id: skladCategoryId, companyId });
    if (!category) throw BaseError.BadRequest("Kategoriya topilmadi");

    // 3. Saqlash
    let product;
    try {
      product = await SkladProductModel.create({
        name: name.trim(),
        skladCategoryId,
        unit,
        type,
        userId: req.user._id,
        companyId,
      });
    } catch (err) {
      if (err.code === 11000) {
        throw BaseError.BadRequest("Bu kategoriyada bunday mahsulot allaqachon bor");
      }
      throw err;
    }

    return SkladProductModel.findById(product._id)
      .populate("skladCategoryId", "name")
      .lean();
  }

  async getProducts(req, res) {
    return SkladProductModel.find({ companyId: req.user.companyId })
      .populate("skladCategoryId", "name")
      .sort({ name: 1 })
      .lean();
  }
}

module.exports = new SkladProductService();