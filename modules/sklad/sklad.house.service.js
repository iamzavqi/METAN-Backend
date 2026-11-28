const mongoose = require("mongoose");
const SkladHouseModel = require("./modules/sklad.house.module");
const SkladStockModel = require("./modules/sklad.stock.module");
const SkladResponsibleModel = require("./modules/sklad.responsible.module");
const UserModel = require("../user/user.module");
const BaseError = require("../../errors/base.error");

class SkladHouseService {
  async createHouse(req, res) {
    const { name, comment } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      throw BaseError.BadRequest("Ombor nomini kiriting");
    }

    try {
      return await SkladHouseModel.create({
        name: name.trim(),
        comment: typeof comment === "string" ? comment.trim() : "",
        userId: req.user._id,
        companyId: req.user.companyId,
      });
    } catch (err) {
      if (err.code === 11000) throw BaseError.BadRequest("Bunday nomli ombor allaqachon bor");
      throw err;
    }
  }

  // Omborlar ro'yxati. Har birining qiymati qoldiqlar yig'indisidan hisoblanadi
  async getHouses(req, res) {
    const companyId = req.user.companyId;

    const houses = await SkladHouseModel.find({ companyId })
      .populate("responsibleUserId", "fName lName")
      .sort({ name: 1 })
      .lean();

    const totals = await SkladStockModel.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(String(companyId)) } },
      { $group: { _id: "$skladHouseId", totalSum: { $sum: "$totalSum" } } },
    ]);
    const totalByHouse = new Map(totals.map((t) => [String(t._id), t.totalSum]));

    return houses.map((house) => ({
      ...house,
      totalSum: totalByHouse.get(String(house._id)) || 0,
    }));
  }

  // Bitta ombor va undagi qoldiqlar
  async getHouse(req, res) {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!mongoose.isValidObjectId(id)) throw BaseError.BadRequest("Ombor topilmadi");

    const house = await SkladHouseModel.findOne({ _id: id, companyId })
      .populate("responsibleUserId", "fName lName phone role")
      .lean();
    if (!house) throw BaseError.BadRequest("Ombor topilmadi");

    const stocks = await SkladStockModel.find({
      companyId,
      skladHouseId: id,
      amount: { $gt: 0 },
    })
      .populate("productId", "name unit type")
      .lean();

    return {
      house: {
        ...house,
        totalSum: stocks.reduce((sum, s) => sum + s.totalSum, 0),
      },
      stocks: stocks.map((s) => ({
        ...s,
        avgPrice: Math.round(s.totalSum / s.amount),
      })),
    };
  }

  // Mas'ul tayinlash: omborga yoziladi va tarixga qator qo'shiladi
  async setResponsible(req, res) {
    const { id } = req.params;
    const { responsibleUserId, comment } = req.body;
    const companyId = req.user.companyId;

    if (!mongoose.isValidObjectId(id)) throw BaseError.BadRequest("Ombor topilmadi");
    if (!mongoose.isValidObjectId(responsibleUserId)) {
      throw BaseError.BadRequest("Mas'ul xodimni tanlang");
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // 1. Xodim shu kompaniyaniki
        const user = await UserModel.exists({ _id: responsibleUserId, companyId }).session(session);
        if (!user) throw BaseError.BadRequest("Xodim topilmadi");

        // 2. Omborga yangi mas'ul
        const house = await SkladHouseModel.findOneAndUpdate(
          { _id: id, companyId },
          { responsibleUserId },
          { session },
        );
        if (!house) throw BaseError.BadRequest("Ombor topilmadi");

        // 3. Tarixga yozamiz
        const history = new SkladResponsibleModel({
          skladHouseId: id,
          responsibleUserId,
          comment: typeof comment === "string" ? comment.trim() : "",
          userId: req.user._id,
          companyId,
        });
        await history.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return SkladHouseModel.findById(id)
      .populate("responsibleUserId", "fName lName")
      .lean();
  }
}

module.exports = new SkladHouseService();