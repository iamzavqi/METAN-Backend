const { Schema, model } = require("mongoose");

const skladResponsibleModel = new Schema(
  {
    skladHouseId: { type: Schema.ObjectId, ref: "SkladHouse", required: true },
    responsibleUserId: { type: Schema.ObjectId, ref: "User", required: true },
    comment: { type: String, trim: true, default: "" },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

skladResponsibleModel.index({ companyId: 1, skladHouseId: 1, createdAt: -1 });

module.exports = model("SkladResponsible", skladResponsibleModel);