const { Schema, model } = require("mongoose");

const companySchema = new Schema(
  {
    companyName: { type: String, required: true, unique: true, lowercase: true, trim: true },
    activated: { type: Boolean, default: true },
    phone: { type: String },
  },
  { timestamps: true },
);

module.exports = model("Company", companySchema);
