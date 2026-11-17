const { Schema, model } = require("mongoose");

const firmBuyModel = new Schema(
  {
    firmId: { type: String, required: true },
    date: { type: Date, required: true }, // smena sanasi
    volume: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true },
    discountPercent: { type: Number, required: true },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

module.exports = model("FirmBuy", firmBuyModel);
