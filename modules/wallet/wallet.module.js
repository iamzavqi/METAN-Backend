const { Schema, model } = require("mongoose");

const walletModel = new Schema(
  {
    walletName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    bankNumber: { type: String, default: "" },
    color: { type: String, default: "" },
    balance: { type: Number, default: 0 },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

// Bitta kompaniyada bir xil nomli hamyon bo'lmaydi
walletModel.index({ companyId: 1, walletName: 1 }, { unique: true });
// Yuklashda operatsiyalarni hamyonlar bilan solishtirish uchun
walletModel.index({ companyId: 1, bankNumber: 1 });

module.exports = model("Wallet", walletModel);
