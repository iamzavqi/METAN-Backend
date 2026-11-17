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
    color: { type: String, default: "", required: true },
    balance: { type: Number, default: 0 },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

module.exports = model("Wallet", walletModel);
