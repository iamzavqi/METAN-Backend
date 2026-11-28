const { Schema, model } = require("mongoose");

const skladHoldingModel = new Schema(
  {
    employeeId: { type: Schema.ObjectId, ref: "User", required: true },
    productId: { type: Schema.ObjectId, ref: "SkladProduct", required: true },
    amount: { type: Number, default: 0 }, // xodimdagi miqdor
    totalSum: { type: Number, default: 0 }, // tannarx qiymati (so'm)
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

skladHoldingModel.index({ companyId: 1, employeeId: 1, productId: 1 }, { unique: true });

module.exports = model("SkladHolding", skladHoldingModel);