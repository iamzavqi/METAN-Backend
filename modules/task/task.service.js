const mongoose = require("mongoose");
const TaskModel = require("./task.module");
const UserModel = require("../user/user.module");
const BaseError = require("../../errors/base.error");
const { emitToUsers } = require("../../socket/socket");

const MANAGER_ROLES = ["ceo", "director", "admin"];
const isId = (v) => mongoose.isValidObjectId(v);
const isManager = (user) => MANAGER_ROLES.includes(user.role);

// Frontend uchun: foiz va muddati o'tganligi hisoblanadi, bazada saqlanmaydi
const withProgress = (task) => {
  const total = task.assignees.length;
  const done = task.assignees.filter((a) => a.status === "done").length;
  return {
    ...task,
    progress: total ? Math.round((done / total) * 100) : 0,
    doneCount: done,
    isOverdue: task.status !== "approved" && new Date(task.deadline) < new Date(),
  };
};

const populateTask = (query) =>
  query
    .populate("assignees.userId", "fName lName role")
    .populate("createdBy", "fName lName")
    .populate("reviews.userId", "fName lName")
    .lean();

// Biriktirilgan xodimlar ID lari (populate qilingan yoki qilinmagan bo'lsa ham)
const assigneeIds = (task) => task.assignees.map((a) => String(a.userId?._id ?? a.userId));

class TaskService {
  // ================= YARATISH =================
  async createTask(req, res) {
    const { title, description, deadline, assignees } = req.body;
    const companyId = req.user.companyId;

    // 1. Nomi
    if (typeof title !== "string" || !title.trim()) {
      throw BaseError.BadRequest("Vazifa nomini kiriting");
    }

    // 2. Deadline: to'g'ri sana va o'tib ketmagan
    const deadlineDate = new Date(deadline);
    if (typeof deadline !== "string" || isNaN(deadlineDate)) {
      throw BaseError.BadRequest("Muddatni tanlang");
    }
    if (deadlineDate < new Date()) {
      throw BaseError.BadRequest("Muddat o'tgan sana bo'lishi mumkin emas");
    }

    // 3. Xodimlar: kamida bitta, takrorlanmasin
    if (!Array.isArray(assignees) || !assignees.length) {
      throw BaseError.BadRequest("Kamida bitta xodim biriktiring");
    }
    if (!assignees.every(isId)) throw BaseError.BadRequest("Xodim topilmadi");
    const userIds = [...new Set(assignees.map(String))];

    // 4. Hamma xodimlar shu kompaniyaniki va faol
    const count = await UserModel.countDocuments({
      _id: { $in: userIds },
      companyId,
      activated: true,
    });
    if (count !== userIds.length) {
      throw BaseError.BadRequest("Xodimlardan biri topilmadi yoki bloklangan");
    }

    // 5. Saqlash
    const task = await TaskModel.create({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      deadline: deadlineDate,
      assignees: userIds.map((userId) => ({ userId })),
      createdBy: req.user._id,
      companyId,
    });

    const result = withProgress(await populateTask(TaskModel.findById(task._id)));

    // 6. Biriktirilgan xodimlarga xabar
    emitToUsers(userIds, "task:new", result);

    return result;
  }

  // ================= RO'YXAT =================
  // Rahbarlar hamma vazifani ko'radi, xodim faqat o'ziga biriktirilganlarini.
  // ?status=in_progress|review|approved
  async getTasks(req, res) {
    const filter = { companyId: req.user.companyId };

    if (!isManager(req.user)) filter["assignees.userId"] = req.user._id;
    if (["in_progress", "review", "approved"].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const tasks = await populateTask(TaskModel.find(filter).sort({ deadline: 1, createdAt: -1 }));
    return tasks.map(withProgress);
  }

  async getTask(req, res) {
    const task = await this._findAccessible(req);
    return withProgress(task);
  }

  // ================= XODIM: "QILDIM" =================
  async markDone(req, res) {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const userId = req.user._id;
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";

    if (!isId(id)) throw BaseError.BadRequest("Vazifa topilmadi");

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // 1. O'z belgisini qo'yadi. Shart: vazifa ishlanmoqda, u biriktirilgan va hali belgilamagan
        const updated = await TaskModel.findOneAndUpdate(
          {
            _id: id,
            companyId,
            status: "in_progress",
            assignees: { $elemMatch: { userId, status: "pending" } },
          },
          {
            $set: {
              "assignees.$.status": "done",
              "assignees.$.doneAt": new Date(),
              "assignees.$.comment": comment,
            },
          },
          { new: true, session },
        );

        if (!updated) {
          const task = await TaskModel.findOne({ _id: id, companyId }).session(session).lean();
          if (!task) throw BaseError.BadRequest("Vazifa topilmadi");

          const mine = task.assignees.find((a) => String(a.userId) === String(userId));
          if (!mine) throw BaseError.Forbidden("Bu vazifa sizga biriktirilmagan");
          if (task.status !== "in_progress") throw BaseError.BadRequest("Vazifa allaqachon tekshiruvda yoki yopilgan");
          throw BaseError.BadRequest("Siz bu vazifani allaqachon bajargansiz");
        }

        // 2. Hamma bajargan bo'lsa, vazifa tekshiruvga o'tadi
        if (updated.assignees.every((a) => a.status === "done")) {
          await TaskModel.updateOne(
            { _id: id, status: "in_progress" },
            { status: "review" },
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    return this._notifyAndReturn(id, companyId);
  }

  // ================= RAHBAR: TASDIQLASH =================
  async approveTask(req, res) {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";

    if (!isId(id)) throw BaseError.BadRequest("Vazifa topilmadi");

    // Faqat yopilmagan vazifa. Kamida bitta xodim bajargan bo'lishi kerak
    const updated = await TaskModel.findOneAndUpdate(
      {
        _id: id,
        companyId,
        status: { $ne: "approved" },
        "assignees.status": "done",
      },
      {
        $set: { status: "approved", approvedAt: new Date() },
        $push: { reviews: { action: "approved", comment, userId: req.user._id, at: new Date() } },
      },
      { new: true },
    );

    if (!updated) {
      const task = await TaskModel.findOne({ _id: id, companyId }).lean();
      if (!task) throw BaseError.BadRequest("Vazifa topilmadi");
      if (task.status === "approved") throw BaseError.BadRequest("Vazifa allaqachon tasdiqlangan");
      throw BaseError.BadRequest("Hali hech kim bajarmagan, tasdiqlab bo'lmaydi");
    }

    return this._notifyAndReturn(id, companyId);
  }

  // ================= RAHBAR: RAD ETISH =================
  // Vazifa ishga qaytadi, hamma belgilar qayta "bajarilmagan" bo'ladi
  async rejectTask(req, res) {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";

    if (!isId(id)) throw BaseError.BadRequest("Vazifa topilmadi");
    if (!comment) throw BaseError.BadRequest("Rad etish sababini yozing");

    const updated = await TaskModel.findOneAndUpdate(
      { _id: id, companyId, status: { $ne: "approved" } },
      {
        $set: {
          status: "in_progress",
          "assignees.$[].status": "pending",
          "assignees.$[].doneAt": null,
          "assignees.$[].comment": "",
        },
        $push: { reviews: { action: "rejected", comment, userId: req.user._id, at: new Date() } },
      },
      { new: true },
    );

    if (!updated) {
      const exists = await TaskModel.exists({ _id: id, companyId });
      throw BaseError.BadRequest(exists ? "Tasdiqlangan vazifani rad etib bo'lmaydi" : "Vazifa topilmadi");
    }

    return this._notifyAndReturn(id, companyId);
  }

  // ================= YORDAMCHILAR =================

  // Vazifani topadi: rahbar hammasini, xodim faqat o'ziga biriktirilganini
  async _findAccessible(req) {
    const { id } = req.params;
    if (!isId(id)) throw BaseError.BadRequest("Vazifa topilmadi");

    const filter = { _id: id, companyId: req.user.companyId };
    if (!isManager(req.user)) filter["assignees.userId"] = req.user._id;

    const task = await populateTask(TaskModel.findOne(filter));
    if (!task) throw BaseError.BadRequest("Vazifa topilmadi");
    return task;
  }

  // O'zgarishdan keyin: vazifani qayta o'qib, yaratuvchiga va xodimlarga xabar beradi
  async _notifyAndReturn(id, companyId) {
    const task = withProgress(await populateTask(TaskModel.findOne({ _id: id, companyId })));
    emitToUsers([String(task.createdBy._id), ...assigneeIds(task)], "task:updated", task);
    return task;
  }
}

module.exports = new TaskService();