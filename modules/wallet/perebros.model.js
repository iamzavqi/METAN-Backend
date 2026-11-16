const { Schema, model } = require("mongoose");

const perebrosSchema = new Schema(
  {
        oneWalletID: {type: Schema.ObjectId, ref: 'Wallet', required: true},
        twoWalletID: {type: Schema.ObjectId, ref: 'Wallet', required: true},
        amount: { type: Number, default: 0 },
        userID: {type: Schema.ObjectId, ref: 'User', required: true},
        companyID: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

module.exports = model("Perebros", perebrosSchema)