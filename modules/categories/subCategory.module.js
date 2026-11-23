const { Schema, model } = require("mongoose");

const subCategoryModel = new Schema(
  {
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    comment: { type: String, default: "" },
    categoryId: { type: Schema.ObjectId, ref: "Category", required: true },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

// Bitta kategoriya ichida bir xil nomli subkategoriya bo'lmaydi
subCategoryModel.index({ categoryID: 1, name: 1 }, { unique: true });
// Kompaniya kategoriyasining subkategoriyalarini olish uchun
subCategoryModel.index({ companyID: 1, categoryID: 1 });

module.exports = model("SubCategory", subCategoryModel);