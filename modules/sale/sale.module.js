const { Schema, model } = require("mongoose");

// Perechisleniya: qaysi firma qancha gaz olgan
const transferItemSchema = new Schema(
  {
    firmId: { type: Schema.ObjectId, ref: "Firm", required: true },
    volume: { type: Number, required: true, min: [0.01, "Firma uchun kub kiriting"] }, // kub
    amount: { type: Number, default: 0 }, 
  },
  { _id: false },
);

const saleModel = new Schema(
  {
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
    date: { type: Date, required: true }, // smena sanasi
    userId: { type: Schema.ObjectId, ref: "User", required: true }, // kassir

    // Kassir kiritadi
    volume: { type: Number, required: true, min: 0 }, // jami sotilgan kub
    pricePerCube: { type: Number, required: true, min: 0 }, // 1 kub narxi
    cash: { type: Number, default: 0, min: 0 }, // naqd
    terminal: { type: Number, default: 0, min: 0 }, // terminal
    transferItems: { type: [transferItemSchema], default: [] }, // 
    comment: { type: String, trim: true },

    transfer: { type: Number, default: 0, min: 0 }, // perechisleniya jami: transferItems.amount yig'indisi
    totalAmount: { type: Number, default: 0 }, // volume * pricePerCube
    difference: {
      type: Number,
      default: 0,
      min: [0, "Olingan pul jami summadan kam bo'lishi mumkin emas"],
    }, // (naqd + terminal + perech.) - jami; faqat 0 yoki ortiqcha

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: { type: Schema.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// Validatsiyadan oldin summalarni hisoblaydi va perechisleniyani tekshiradi
saleModel.pre("validate", function () {
  const price = this.pricePerCube || 0;

  // 1. Har bir firma summasi va perechisleniya jami
  let transferVolume = 0;
  let transferTotal = 0;
  const firmIds = new Set();

  for (const item of this.transferItems) {
    item.amount = Math.round((item.volume || 0) * price);
    transferVolume += item.volume || 0;
    transferTotal += item.amount;

    // Bitta firma bir sotuvda ikki marta bo'lmasin
    const key = String(item.firmId);
    if (firmIds.has(key)) {
      this.invalidate("transferItems", "Bitta firma ikki marta tanlangan");
    }
    firmIds.add(key);
  }

  // 2. Firmalarga yozilgan gaz jami sotilgan gazdan oshmasin
  if (transferVolume > (this.volume || 0)) {
    this.invalidate(
      "transferItems",
      "Firmalarga yozilgan kub jami sotilgan kubdan ko'p",
    );
  }

  // 3. Jami summalar
  this.transfer = transferTotal;
  this.totalAmount = Math.round((this.volume || 0) * price);
  this.difference = this.cash + this.terminal + this.transfer - this.totalAmount;
});

saleModel.index({ companyId: 1, status: 1, date: -1 });
saleModel.index({ companyId: 1, date: 1 }, { unique: true });
// Firma bo'yicha hisobot: qaysi firma qachon qancha gaz olgan
saleModel.index({ companyId: 1, "transferItems.firmId": 1, date: -1 });

module.exports = model("Sale", saleModel);