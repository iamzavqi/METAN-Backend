const { Schema, model } = require("mongoose");

const bankStatementModel = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, required: true },
    fileName: String,
    account: { type: String, required: true },
    ownerInn: String,
    periodFrom: Date,
    periodTo: Date,
    openingBalance: Number, // hamma summalar tiyinda
    closingBalance: Number,
    totalDebit: Number,
    totalCredit: Number,
    added: Number,
    skipped: Number,
  },
  { timestamps: true },
);

module.exports = model("BankStatement", bankStatementModel);
