const SkladCategoryModel = require("./modules/sklad.category.module");
const BaseError = require("../../errors/base.error");

class SkladCategoryService {
  async createCategory(req, res) {
    const { name, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      throw BaseError.BadRequest("Kategoriya nomini kiriting");
    }

    try {
      return await SkladCategoryModel.create({
        name: name.trim(),
        description: typeof description === "string" ? description.trim() : "",
        userId: req.user._id,
        companyId: req.user.companyId,
      });
    } catch (err) {
      if (err.code === 11000) throw BaseError.BadRequest("Bunday kategoriya allaqachon bor");
      throw err;
    }
  }

  async getCategories(req, res) {
    return SkladCategoryModel.find({ companyId: req.user.companyId })
      .sort({ name: 1 })
      .lean();
  }
}

module.exports = new SkladCategoryService();