const mongoose = require("mongoose");
const CategoryModel = require("./category.module");
const SubCategoryModel = require("./subCategory.module");
const BaseError = require("../../errors/base.error");

const STATUSES = [0, 1]; // 0 - oddiy, 1 - ichida subkategoriyalar bor
const TYPES = [0, 1, 2]; // 0 - ADM, 1 - NACH, 2 - boshqa

class CategoriesService {
  async createCategory(req, res) {
    const { categoryName } = req.body;
    const status = Number(req.body.status);
    const type = Number(req.body.type);
    const companyId = req.user.companyId;

    // 1. Maydonlarni tekshirish
    if (typeof categoryName !== "string" || !categoryName.trim()) {
      throw BaseError.BadRequest("Kategoriya nomini kiriting");
    }
    if (!STATUSES.includes(status)) {
      throw BaseError.BadRequest("Kategoriya statusini tanlang");
    }
    if (!TYPES.includes(type)) {
      throw BaseError.BadRequest("Kategoriya turini tanlang");
    }

    // 2. Saqlash. Takroriy nomni tushunarli xabarga aylantiramiz
    try {
      return await CategoryModel.create({
        categoryName: categoryName.trim(),
        status,
        type,
        userId: req.user._id,
        companyId,
      });
    } catch (err) {
      if (err.code === 11000) {
        throw BaseError.BadRequest("Bunday nomli kategoriya allaqachon bor");
      }
      throw err;
    }
  }

  async getCategories(req, res) {
    return CategoryModel.find({ companyId: req.user.companyId })
      .sort({ createdAt: -1 })
      .populate("subCategories", "name comment")
      .lean();
  }

  async createSubCategory(req, res) {
    const { categoryId } = req.params;
    const { name, comment } = req.body;
    const companyId = req.user.companyId;

    // 1. Maydonlarni tekshirish
    if (!mongoose.isValidObjectId(categoryId)) {
      throw BaseError.BadRequest("Ota kategoriya topilmadi");
    }
    if (typeof name !== "string" || !name.trim()) {
      throw BaseError.BadRequest("Subkategoriya nomini kiriting");
    }

    // 2. Kategoriya shu kompaniyaniki bo'lishi shart
    const category = await CategoryModel.findOne({
      _id: categoryId,
      companyId,
    }).lean();
    if (!category) throw BaseError.BadRequest("Ota kategoriya topilmadi");

    // 3. Subkategoriya faqat status 1 kategoriyada bo'ladi
    if (category.status !== 1) {
      throw BaseError.BadRequest("Bu kategoriyada subkategoriya bo'lmaydi");
    }

    // 4. Subkategoriya yaratish va kategoriyaga qo'shish bir butun bo'lib bajariladi
    let newSubCategory;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        [newSubCategory] = await SubCategoryModel.create(
          [
            {
              name: name.trim(),
              comment: typeof comment === "string" ? comment.trim() : "",
              categoryId: category._id,
              userId: req.user._id,
              companyId,
            },
          ],
          { session },
        );

        await CategoryModel.updateOne(
          { _id: category._id, companyId },
          { $push: { subCategories: newSubCategory._id } },
          { session },
        );
      });
    } catch (err) {
      if (err.code === 11000) {
        throw BaseError.BadRequest("Bu kategoriyada bunday subkategoriya allaqachon bor");
      }
      throw err;
    } finally {
      await session.endSession();
    }

    return newSubCategory;
  }

  async getSubCategories(req, res) {
    const { categoryId } = req.params;
    const companyId = req.user.companyId;
    // 1. Kategoriya shu kompaniyaniki bo'lishi shart
    if (!mongoose.isValidObjectId(categoryId)) {
      throw BaseError.BadRequest("Kategoriya topilmadi");
    }
    const category = await CategoryModel.findOne({
      _id: categoryId,
      companyId,
    }).lean();
    if (!category) throw BaseError.BadRequest("Kategoriya topilmadi");

    // 2. Shu kategoriyaning subkategoriyalari
    return SubCategoryModel.find({ categoryId: category._id, companyId })
      .sort({ createdAt: -1 })
      .lean();
  }
}

module.exports = new CategoriesService();