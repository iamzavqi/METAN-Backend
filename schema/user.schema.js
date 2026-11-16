const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    fName: { type: String, required: true },
    lName: { type: String, required: true },
    phone: { type: String },
    role: {
      type: String,
      enum: ["admin", "director", "manager", "moliyachi", "texnik"],
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
    telegramID: { type: String },
    companyID: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

module.exports = model("User", userSchema);
