const { Schema, model } = require("mongoose");

const categoryModel = new Schema(
  {
    categoryName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: { type: Number, enum: [0, 1], required: true },
    type: { type: Number, enum: [0, 1, 2], required: true },
    subCategories: [{ type: Schema.ObjectId, ref: "SubCategory" }],
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

// Bitta kompaniya ichida bir xil nomli kategoriya bo'lmaydi
categoryModel.index({ companyID: 1, categoryName: 1 }, { unique: true });

module.exports = model("Category", categoryModel);

//              status
// 0 - oddiy kategoriya
// 1 - buni ichida subCategories bo'ladi, kimlar bilandir oldi-berdi

//              type
// 0 - ADM
// 1 - NACH
// 2 - boshqa