const { Schema, model } = require("mongoose");

const bankStatementModel = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, required: true },
    fileName: { type: String },
    account: { type: String, required: true },
    ownerInn: { type: String },
    periodFrom: { type: Date },
    periodTo: { type: Date },
    openingBalance: { type: Number }, // hamma summalar tiyinda
    closingBalance: { type: Number },
    totalDebit: { type: Number },
    totalCredit: { type: Number },
    added: { type: Number },
    skipped: { type: Number },
  },
  { timestamps: true },
);

module.exports = model("BankStatement", bankStatementModel);
