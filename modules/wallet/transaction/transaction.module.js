const { Schema, model } = require("mongoose");

const transactionModel = new Schema(
  {
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
    userId: { type: Schema.ObjectId, ref: "User", required: true }, 

    date: { type: Date, required: true },

    // Kirim yoki chiqim
    direction: { type: String, enum: ["in", "out"], required: true },

    // Pul oqimi turi (DDS)
    cashFlow: {
      type: String,
      enum: ["operating", "investing", "financing"],
      required: true,
    },

    // Summalar (so'mda)
    amount: { type: Number, required: true, min: 1 }, // asosiy summa
    commission: { type: Number, default: 0, min: 0 }, // komissiya, faqat chiqimda

    // Qayerdan / qayerga
    walletId: { type: Schema.ObjectId, ref: "Wallet", required: true },

    // Nima uchun
    categoryID: { type: Schema.ObjectId, ref: "Category", required: true },
    subCategoryID: { type: Schema.ObjectId, ref: "SubCategory", default: null },

    // Kimga / kimdan
    firmId: { type: Schema.ObjectId, ref: "Firm", default: null },

    // Skladga kelgan mahsulot uchun to'lov
    skladTransactionId: { type: Schema.ObjectId, ref: "SkladTransaction", default: null },

    comment: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

// Hisobotlar uchun
transactionModel.index({ companyId: 1, date: -1 });
transactionModel.index({ companyId: 1, walletId: 1, date: -1 });
transactionModel.index({ companyId: 1, categoryID: 1, date: -1 });
transactionModel.index({ companyId: 1, cashFlow: 1, date: -1 });
transactionModel.index({ companyId: 1, firmId: 1, date: -1 });

module.exports = model("Transaction", transactionModel);

//        direction
// in  - kirim
// out - chiqim

//        cashFlow (DDS)
// operating  - operatsion
// investing  - investitsion
// financing  - moliyaviy