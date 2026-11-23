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
    counterpartyAccount: { type: String },
    counterpartyInn: { type: String },
    counterpartyName: { type: String },
    docNumber: { type: String },
    mfo: { type: String },
    debit: { type: Number, default: 0 }, // chiqim, tiyinda
    credit: { type: Number, default: 0 }, // kirim, tiyinda
    direction: { type: String, enum: ["in", "out"] },
    purposeCode: { type: String },
    purpose: { type: String },
    dedupKey: { type: String, required: true },

    // Belgilash: categoryID null bo'lsa, operatsiya hali belgilanmagan
    categoryId: { type: Schema.ObjectId, ref: "Category", default: null },
    subCategoryId: { type: Schema.ObjectId, ref: "SubCategory", default: null },
    classifiedBy: { type: Schema.ObjectId, ref: "User", default: null }, // kim belgiladi
    classifiedAt: { type: Date, default: null }, // qachon belgiladi
  },
  { timestamps: true },
);

// Bitta yozuv ikki marta saqlanmasligi uchun
bankTransactionModel.index({ companyId: 1, dedupKey: 1 }, { unique: true });
// Hisobotlar uchun
bankTransactionModel.index({ companyId: 1, account: 1, date: 1 });
bankTransactionModel.index({ companyId: 1, counterpartyInn: 1 });

bankTransactionModel.index({ companyId: 1, categoryId: 1, date: -1 });

module.exports = model("BankTransaction", bankTransactionModel);
