const { Schema, model } = require("mongoose");

const skladStockModel = new Schema(
  {
    productId: { type: Schema.ObjectId, ref: "SkladProduct", required: true },
    skladHouseId: { type: Schema.ObjectId, ref: "SkladHouse", required: true },
    amount: { type: Number, default: 0 }, // qoldiq miqdori
    totalSum: { type: Number, default: 0 }, // qoldiqning tannarx qiymati (so'm)
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

skladStockModel.index({ companyId: 1, skladHouseId: 1, productId: 1 }, { unique: true });

module.exports = model("SkladStock", skladStockModel);