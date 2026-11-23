const { Schema, model } = require("mongoose");

const firmModel = new Schema(
  {
    firmName: { type: String, required: true },
    inn: { type: String, default: "" },
    phone: { type: String, default: "" },
    balance: { type: Number, default: 0 },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

firmModel.index(
  { companyId: 1, inn: 1 },
  { unique: true, partialFilterExpression: { inn: { $gt: "" } } },
);

module.exports = model("Firm", firmModel);
