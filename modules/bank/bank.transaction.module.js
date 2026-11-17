const { Schema, model } = require("mongoose");

const bankTransactionModel = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true },
    statementID: {
      type: Schema.Types.ObjectId,
      ref: "BankStatement",
      required: true,
    },
    account: { type: String, required: true },
    date: { type: Date, required: true },
    counterpartyAccount: String,
    counterpartyInn: String,
    counterpartyName: String,
    docNumber: String,
    mfo: String,
    debit: { type: Number, default: 0 }, // chiqim, tiyinda
    credit: { type: Number, default: 0 }, // kirim, tiyinda
    direction: { type: String, enum: ["in", "out"] },
    purposeCode: String,
    purpose: String,
    dedupKey: { type: String, required: true },
  },
  { timestamps: true },
);

// Bitta yozuv ikki marta saqlanmasligi uchun
bankTransactionSchema.index({ companyId: 1, dedupKey: 1 }, { unique: true });
// Hisobotlar uchun
bankTransactionSchema.index({ companyId: 1, account: 1, date: 1 });
bankTransactionSchema.index({ companyId: 1, counterpartyInn: 1 });

module.exports = model("BankTransaction", bankTransactionModel);
