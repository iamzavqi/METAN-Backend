const { Schema, model } = require("mongoose");

// Biriktirilgan xodim va uning belgisi
const assigneeModel = new Schema(
  {
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "done"], default: "pending" },
    doneAt: { type: Date, default: null },
    comment: { type: String, trim: true, default: "" }, // "qildim" deganda izoh
  },
  { _id: false },
);

// CEO qarorlari tarixi
const reviewModel = new Schema(
  {
    action: { type: String, enum: ["approved", "rejected"], required: true },
    comment: { type: String, trim: true, default: "" },
    userId: { type: Schema.ObjectId, ref: "User", required: true },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const taskModel = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    deadline: { type: Date, required: true },

    assignees: {
      type: [assigneeModel],
      validate: [(v) => v.length > 0, "Kamida bitta xodim biriktiring"],
    },

    // in_progress - ishlanmoqda
    // review      - hamma "qildim" dedi, tekshiruv kutilmoqda
    // approved    - tasdiqlandi, yopildi
    status: {
      type: String,
      enum: ["in_progress", "review", "approved"],
      default: "in_progress",
    },

    reviews: { type: [reviewModel], default: [] },
    approvedAt: { type: Date, default: null },

    createdBy: { type: Schema.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true },
);

// Xodimning o'z vazifalari
taskModel.index({ companyId: 1, "assignees.userId": 1, status: 1, deadline: 1 });
// Barcha vazifalar holat va muddat bo'yicha
taskModel.index({ companyId: 1, status: 1, deadline: 1 });

module.exports = model("Task", taskModel);