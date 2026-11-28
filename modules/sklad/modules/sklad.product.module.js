const { Schema, model } = require("mongoose");

const skladProductModel = new Schema(
  {
    name: { type: String, required: true, trim: true },
    skladCategoryId: { type: Schema.ObjectId, ref: "SkladCategory", required: true },
    unit: { type: String, enum: ["dona", "kg", "kub", "metr", "litr"], required: true },

    // material  - ishlatilganda yo'q bo'ladi (chiqim)
    // inventory - xodimga beriladi va qaytariladi (berish / qaytarish / hisobdan chiqarish)
    type: { type: String, enum: ["material", "inventory"], required: true },

    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

skladProductModel.index({ companyId: 1, skladCategoryId: 1, name: 1 }, { unique: true });

module.exports = model("SkladProduct", skladProductModel);