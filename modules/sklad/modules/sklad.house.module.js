const { Schema, model } = require("mongoose");

const skladHouseModel = new Schema(
  {
    name: { type: String, required: true, trim: true },
    comment: { type: String, trim: true, default: "" },
    responsibleUserId: { type: Schema.ObjectId, ref: "User", default: null },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

skladHouseModel.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = model("SkladHouse", skladHouseModel);