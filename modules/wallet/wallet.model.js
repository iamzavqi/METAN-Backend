const { Schema, model } = require("mongoose");

const walletSchema = new Schema(
  {
        walletName: { type: String, required: true, unique: true, lowercase: true, trim: true },
        color: { type: String, default: '', required: true },
        balance: { type: Number, default: 0 },
        userID: {type: Schema.ObjectId, ref: 'User', required: true},
        companyID: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

module.exports = model("Wallet", walletSchema)