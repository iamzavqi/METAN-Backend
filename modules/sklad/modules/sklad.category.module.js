const { Schema, model } = require("mongoose");

const skladCategoryModel = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

skladCategoryModel.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = model("SkladCategory", skladCategoryModel);