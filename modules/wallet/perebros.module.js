const { Schema, model } = require("mongoose");

const perebrosModel = new Schema(
  {
    oneWalletID: { type: Schema.ObjectId, ref: "Wallet", required: true },
    twoWalletID: { type: Schema.ObjectId, ref: "Wallet", required: true },
    amount: { type: Number, default: 0 },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

module.exports = model("Perebros", perebrosModel);
