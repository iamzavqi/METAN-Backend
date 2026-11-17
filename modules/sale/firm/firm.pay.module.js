const { Schema, model } = require("mongoose");

const firmPayModel = new Schema(
  {
    firmId: { type: String, required: true },
    date: { type: Date, required: true }, // smena sanasi
    amount: { type: Number, required: true, min: 0 },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

module.exports = model("FirmPay", firmPayModel);
