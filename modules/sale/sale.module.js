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
    difference: { type: Number, default: 0 }, // (naqd + terminal + perech.) - jami; + ortiqcha, - kamomad

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: { type: Schema.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = model("Sale", saleModel);
