const { Schema, model } = require("mongoose");

const TYPES = ["in", "out", "issue", "return", "writeoff", "reversal"];

const skladTransactionModel = new Schema(
  {
    // in       - kirim: firmadan sotib olindi
    // out      - chiqim: material ishlatildi
    // issue    - inventar xodimga berildi
    // return   - inventar xodimdan qaytdi
    // writeoff - inventar hisobdan chiqarildi (sindi, yo'qoldi)
    // reversal - storno: boshqa harakatni bekor qiladi
    type: { type: String, enum: TYPES, required: true },

    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 }, // kirimda xarid narxi, qolganlarida tannarx
    totalSum: { type: Number, required: true, min: 0 }, // server hisoblaydi

    skladProductId: { type: Schema.ObjectId, ref: "SkladProduct", required: true },
    skladHouseId: { type: Schema.ObjectId, ref: "SkladHouse", required: true },

    // Kirim
    firmId: { type: Schema.ObjectId, ref: "Firm", default: null },
    paidSum: { type: Number, default: 0, min: 0 }, // shu kirim uchun firmaga to'langan

    // Chiqim va hisobdan chiqarish: nima uchun
    categoryID: { type: Schema.ObjectId, ref: "Category", default: null },
    subCategoryID: { type: Schema.ObjectId, ref: "SubCategory", default: null },

    // Xodim: chiqimda kim oldi, berish/qaytarishda kimga/kimdan,
    // hisobdan chiqarishda kimning zimmasidan (bo'sh bo'lsa, ombordan)
    employeeId: { type: Schema.ObjectId, ref: "User", default: null },

    // Storno
    reversalOf: { type: Schema.ObjectId, ref: "SkladTransaction", default: null }, // storno yozuvida
    reversedType: { type: String, enum: [...TYPES.filter((t) => t !== "reversal"), null], default: null },
    reversedBy: { type: Schema.ObjectId, ref: "SkladTransaction", default: null }, // asl yozuvda
    reason: { type: String, trim: true, default: "" },

    comment: { type: String, trim: true, default: "" },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

skladTransactionModel.index({ companyId: 1, date: -1 });
skladTransactionModel.index({ companyId: 1, skladHouseId: 1, date: -1 });
skladTransactionModel.index({ companyId: 1, skladProductId: 1, date: -1 });
skladTransactionModel.index({ companyId: 1, firmId: 1, date: -1 });
skladTransactionModel.index({ companyId: 1, employeeId: 1, date: -1 });
skladTransactionModel.index({ companyId: 1, categoryID: 1, date: -1 });

module.exports = model("SkladTransaction", skladTransactionModel);