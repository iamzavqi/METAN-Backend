const { Schema, model } = require("mongoose");

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
    transfer: { type: Number, default: 0, min: 0 }, // perechisleniya
    comment: { type: String, trim: true },

    // Server hisoblaydi, clientdan qabul qilinmaydi
    totalAmount: { type: Number, default: 0 }, // volume * pricePerCube
    difference: {
      type: Number,
      default: 0,
      min: [0, "Olingan pul jami summadan kam bo'lishi mumkin emas"],
    }, // (naqd + terminal + perech.) - jami; + ortiqcha, - kamomad

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: { type: Schema.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// Validatsiyadan oldin summalarni hisoblaydi
saleModel.pre("validate", function () {
  this.totalAmount = Math.round(this.volume * this.pricePerCube);
  this.difference = this.cash + this.terminal + this.transfer - this.totalAmount;
});


saleModel.index({ companyId: 1, status: 1, date: -1 });
saleModel.index({ companyId: 1, date: 1 }, { unique: true });

module.exports = model("Sale", saleModel);
