const { Schema, model } = require("mongoose");

const userModel = new Schema(
  {
    fName: { type: String, required: true },
    lName: { type: String, required: true },
    phone: { type: String },
    role: {
      type: String,
      enum: [
        "admin",
        "director",
        "ceo",
        "moliyachi",
        "bugalter",
        "kassir",
        "texnik",
      ],
    },
    activated: { type: Boolean, default: true },
    lastSeen: { type: Date, default: new Date() },
    userName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    telegramID: { type: String },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

module.exports = model("User", userModel);
