const mongoose = require("mongoose");
const SkladTransactionModel = require("./modules/sklad.transaction.module");
const SkladStockModel = require("./modules/sklad.stock.module");
const SkladHoldingModel = require("./modules/sklad.holding.module");
const SkladProductModel = require("./modules/sklad.product.module");
const SkladHouseModel = require("./modules/sklad.house.module");
const FirmModel = require("../sale/firm/firm.module");
const UserModel = require("../user/user.module");
const CategoryModel = require("../categories/category.module");
const SubCategoryModel = require("../categories/subCategory.module");
const BaseError = require("../../errors/base.error");

const CREATE_TYPES = ["in", "out", "issue", "return", "writeoff"];

// Kasr miqdorlar 3 xonagacha (0.1 + 0.2 = 0.30000000000000004 muammosi uchun)
const roundQty = (n) => Math.round(n * 1000) / 1000;
const EPS = 0.0005;
const isId = (v) => mongoose.isValidObjectId(v);

// ---------- Qoldiq bilan ishlash (ombor ham, xodim ham shu qolipda) ----------

// Qoldiqdan AVCO bo'yicha yechadi va yechilgan qiymatni qaytaradi
const takeAvg = async (Model, filter, qty, session, message) => {
  const row = await Model.findOne(filter).session(session);
  const available = row ? row.amount : 0;
  if (available + EPS < qty) {
    throw BaseError.BadRequest(`${message}. Mavjud: ${roundQty(available)}`);
  }

  const avg = row.totalSum / row.amount;
  const isLast = Math.abs(row.amount - qty) < EPS;
  const sum = isLast ? row.totalSum : Math.round(qty * avg);

  // Shart ichida yana tekshiriladi: boshqa so'rov oldinroq yechgan bo'lsa, yangilanmaydi
  const updated = await Model.findOneAndUpdate(
    { _id: row._id, amount: { $gte: qty - EPS } },
    isLast ? { $set: { amount: 0, totalSum: 0 } } : { $inc: { amount: -qty, totalSum: -sum } },
    { new: true, session },
  );
  if (!updated) throw BaseError.BadRequest(message);

  return { sum, price: Math.round(avg) };
};

// Qoldiqdan aniq miqdor va aniq summani yechadi (storno uchun)
const takeExact = async (Model, filter, qty, sum, session, message) => {
  const row = await Model.findOne(filter).session(session);
  if (!row || row.amount + EPS < qty || row.totalSum + 1 < sum) {
    throw BaseError.BadRequest(message);
  }

  const leftAmount = roundQty(row.amount - qty);
  const leftSum = row.totalSum - sum;

  // Mahsulot qolmasa-yu, qiymat qolsa: oradagi harakatlar o'rtacha narxni o'zgartirgan.
  // Bunday holda avval keyingi harakatlarni storno qilish kerak
  if (leftAmount < EPS && leftSum > 1) throw BaseError.BadRequest(message);

  // Optimistik shart: o'qilgan paytdan beri qoldiq o'zgarmagan bo'lsa
  const result = await Model.updateOne(
    { _id: row._id, amount: row.amount, totalSum: row.totalSum },
    leftAmount < EPS ? { $set: { amount: 0, totalSum: 0 } } : { $inc: { amount: -qty, totalSum: -sum } },
    { session },
  );
  if (!result.modifiedCount) throw BaseError.BadRequest(message);
};

// Qoldiqqa qo'shadi. Qator bo'lmasa, yaratiladi
const put = (Model, filter, qty, sum, session) =>
  Model.updateOne(filter, { $inc: { amount: qty, totalSum: sum } }, { upsert: true, session });

class SkladTransactionService {
  // ================= YARATISH =================
  async createTransaction(req, res) {
    const { type, date, skladProductId, skladHouseId, comment } = req.body;
    const companyId = req.user.companyId;

    // 1. Umumiy tekshiruvlar
    if (!CREATE_TYPES.includes(type)) throw BaseError.BadRequest("Harakat turini tanlang");

    const txDate = new Date(date);
    if (typeof date !== "string" || isNaN(txDate) || txDate > new Date()) {
      throw BaseError.BadRequest("Sana noto'g'ri");
    }
    txDate.setUTCHours(0, 0, 0, 0);

    const amount = roundQty(Number(req.body.amount));
    if (!Number.isFinite(amount) || amount <= 0) throw BaseError.BadRequest("Miqdorni kiriting");

    if (!isId(skladProductId)) throw BaseError.BadRequest("Mahsulotni tanlang");
    if (!isId(skladHouseId)) throw BaseError.BadRequest("Omborni tanlang");

    let created;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // 2. Mahsulot va ombor shu kompaniyaniki
        const product = await SkladProductModel.findOne({ _id: skladProductId, companyId })
          .session(session)
          .lean();
        if (!product) throw BaseError.BadRequest("Mahsulot topilmadi");

        const house = await SkladHouseModel.exists({ _id: skladHouseId, companyId }).session(session);
        if (!house) throw BaseError.BadRequest("Ombor topilmadi");

        if (product.unit === "dona" && !Number.isInteger(amount)) {
          throw BaseError.BadRequest("Dona butun son bo'lishi kerak");
        }

        const ctx = {
          req,
          product,
          session,
          base: {
            date: txDate,
            amount,
            skladProductId,
            skladHouseId,
            comment: typeof comment === "string" ? comment.trim() : "",
            userId: req.user._id,
            companyId,
          },
        };

        // 3. Turiga qarab
        if (type === "in") created = await this._inflow(ctx);
        if (type === "out") created = await this._outflow(ctx);
        if (type === "issue") created = await this._issue(ctx);
        if (type === "return") created = await this._return(ctx);
        if (type === "writeoff") created = await this._writeoff(ctx);
      });
    } finally {
      await session.endSession();
    }

    return this._populated(created._id);
  }

  // ---------- KIRIM: firmadan sotib olindi ----------
  async _inflow({ req, session, base }) {
    const { firmId } = req.body;
    const price = Number(req.body.price);

    if (!Number.isFinite(price) || price <= 0) throw BaseError.BadRequest("Narxni kiriting");
    if (!isId(firmId)) throw BaseError.BadRequest("Firmani tanlang");

    const firm = await FirmModel.exists({ _id: firmId, companyId: base.companyId }).session(session);
    if (!firm) throw BaseError.BadRequest("Firma topilmadi");

    const totalSum = Math.round(base.amount * price);

    // Omborga qo'shamiz
    await put(
      SkladStockModel,
      { companyId: base.companyId, skladHouseId: base.skladHouseId, productId: base.skladProductId },
      base.amount,
      totalSum,
      session,
    );

    // Firma balansi: biz qarzdor bo'ldik (−)
    await FirmModel.updateOne(
      { _id: firmId, companyId: base.companyId },
      { $inc: { balance: -totalSum } },
      { session },
    );

    const tx = new SkladTransactionModel({ ...base, type: "in", price, totalSum, firmId });
    await tx.save({ session });
    return tx;
  }

  // ---------- CHIQIM: material ishlatildi ----------
  async _outflow({ req, product, session, base }) {
    if (product.type !== "material") {
      throw BaseError.BadRequest("Inventarni chiqim qilib bo'lmaydi. Uni xodimga bering");
    }

    const category = await this._checkCategory(req.body, base.companyId, session);
    const employeeId = await this._checkEmployee(req.body.employeeId, base.companyId, session, false);

    const { sum, price } = await takeAvg(
      SkladStockModel,
      { companyId: base.companyId, skladHouseId: base.skladHouseId, productId: base.skladProductId },
      base.amount,
      session,
      `Omborda yetarli mahsulot yo'q (${product.unit})`,
    );

    const tx = new SkladTransactionModel({
      ...base,
      ...category,
      type: "out",
      price,
      totalSum: sum,
      employeeId,
    });
    await tx.save({ session });
    return tx;
  }

  // ---------- BERISH: inventar xodimga ----------
  async _issue({ req, product, session, base }) {
    if (product.type !== "inventory") {
      throw BaseError.BadRequest("Xodimga faqat inventar beriladi. Materialni chiqim qiling");
    }

    const employeeId = await this._checkEmployee(req.body.employeeId, base.companyId, session, true);

    // Ombordan olamiz
    const { sum, price } = await takeAvg(
      SkladStockModel,
      { companyId: base.companyId, skladHouseId: base.skladHouseId, productId: base.skladProductId },
      base.amount,
      session,
      `Omborda yetarli mahsulot yo'q (${product.unit})`,
    );

    // Xodimning zimmasiga yozamiz
    await put(
      SkladHoldingModel,
      { companyId: base.companyId, employeeId, productId: base.skladProductId },
      base.amount,
      sum,
      session,
    );

    const tx = new SkladTransactionModel({ ...base, type: "issue", price, totalSum: sum, employeeId });
    await tx.save({ session });
    return tx;
  }

  // ---------- QAYTARISH: inventar xodimdan omborga ----------
  async _return({ req, product, session, base }) {
    if (product.type !== "inventory") throw BaseError.BadRequest("Faqat inventar qaytariladi");

    const employeeId = await this._checkEmployee(req.body.employeeId, base.companyId, session, true);

    // Xodimdan olamiz
    const { sum, price } = await takeAvg(
      SkladHoldingModel,
      { companyId: base.companyId, employeeId, productId: base.skladProductId },
      base.amount,
      session,
      `Xodimda bu inventar yetarli emas (${product.unit})`,
    );

    // Omborga qo'shamiz
    await put(
      SkladStockModel,
      { companyId: base.companyId, skladHouseId: base.skladHouseId, productId: base.skladProductId },
      base.amount,
      sum,
      session,
    );

    const tx = new SkladTransactionModel({ ...base, type: "return", price, totalSum: sum, employeeId });
    await tx.save({ session });
    return tx;
  }

  // ---------- HISOBDAN CHIQARISH: inventar sindi yoki yo'qoldi ----------
  // employeeId bo'lsa xodimning zimmasidan, bo'lmasa ombordan
  async _writeoff({ req, product, session, base }) {
    if (product.type !== "inventory") {
      throw BaseError.BadRequest("Hisobdan faqat inventar chiqariladi. Materialni chiqim qiling");
    }

    const category = await this._checkCategory(req.body, base.companyId, session);
    const employeeId = await this._checkEmployee(req.body.employeeId, base.companyId, session, false);

    const { sum, price } = employeeId
      ? await takeAvg(
          SkladHoldingModel,
          { companyId: base.companyId, employeeId, productId: base.skladProductId },
          base.amount,
          session,
          `Xodimda bu inventar yetarli emas (${product.unit})`,
        )
      : await takeAvg(
          SkladStockModel,
          { companyId: base.companyId, skladHouseId: base.skladHouseId, productId: base.skladProductId },
          base.amount,
          session,
          `Omborda yetarli mahsulot yo'q (${product.unit})`,
        );

    const tx = new SkladTransactionModel({
      ...base,
      ...category,
      type: "writeoff",
      price,
      totalSum: sum,
      employeeId,
    });
    await tx.save({ session });
    return tx;
  }

  // ================= STORNO =================
  async reverseTransaction(req, res) {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";

    if (!isId(id)) throw BaseError.BadRequest("Harakat topilmadi");
    if (!reason) throw BaseError.BadRequest("Bekor qilish sababini yozing");

    let reversal;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // 1. Asl harakat
        const original = await SkladTransactionModel.findOne({ _id: id, companyId })
          .session(session)
          .lean();
        if (!original) throw BaseError.BadRequest("Harakat topilmadi");
        if (original.type === "reversal") throw BaseError.BadRequest("Storno yozuvini bekor qilib bo'lmaydi");
        if (original.reversedBy) throw BaseError.BadRequest("Bu harakat allaqachon bekor qilingan");
        if (original.type === "in" && original.paidSum > 0) {
          throw BaseError.BadRequest("Bu kirim uchun firmaga pul to'langan. Avval to'lovni hal qiling");
        }

        // 2. Storno yozuvi (ID darhol bor, asl yozuvga bog'lash uchun)
        reversal = new SkladTransactionModel({
          type: "reversal",
          reversalOf: original._id,
          reversedType: original.type,
          reason,
          date: new Date(new Date().setUTCHours(0, 0, 0, 0)),
          amount: original.amount,
          price: original.price,
          totalSum: original.totalSum,
          skladProductId: original.skladProductId,
          skladHouseId: original.skladHouseId,
          firmId: original.firmId,
          categoryID: original.categoryID,
          subCategoryID: original.subCategoryID,
          employeeId: original.employeeId,
          userId: req.user._id,
          companyId,
        });

        // 3. Asl yozuvni belgilaymiz. Shart: hali bekor qilinmagan (ikki marta bosilsa ham bir marta)
        const marked = await SkladTransactionModel.findOneAndUpdate(
          { _id: original._id, companyId, reversedBy: null },
          { reversedBy: reversal._id },
          { session },
        );
        if (!marked) throw BaseError.BadRequest("Bu harakat allaqachon bekor qilingan");

        // 4. Ta'sirini teskari qaytaramiz
        const stockFilter = {
          companyId,
          skladHouseId: original.skladHouseId,
          productId: original.skladProductId,
        };
        const holdingFilter = {
          companyId,
          employeeId: original.employeeId,
          productId: original.skladProductId,
        };
        const { amount, totalSum } = original;

        switch (original.type) {
          case "in":
            await takeExact(
              SkladStockModel,
              stockFilter,
              amount,
              totalSum,
              session,
              "Kirimni bekor qilib bo'lmaydi: mahsulot allaqachon ishlatilgan. Avval keyingi harakatlarni bekor qiling",
            );
            await FirmModel.updateOne(
              { _id: original.firmId, companyId },
              { $inc: { balance: totalSum } },
              { session },
            );
            break;

          case "out":
            await put(SkladStockModel, stockFilter, amount, totalSum, session);
            break;

          case "issue":
            await takeExact(
              SkladHoldingModel,
              holdingFilter,
              amount,
              totalSum,
              session,
              "Berishni bekor qilib bo'lmaydi: xodimda bu inventar yetarli emas",
            );
            await put(SkladStockModel, stockFilter, amount, totalSum, session);
            break;

          case "return":
            await takeExact(
              SkladStockModel,
              stockFilter,
              amount,
              totalSum,
              session,
              "Qaytarishni bekor qilib bo'lmaydi: omborda bu inventar yetarli emas",
            );
            await put(SkladHoldingModel, holdingFilter, amount, totalSum, session);
            break;

          case "writeoff":
            if (original.employeeId) {
              await put(SkladHoldingModel, holdingFilter, amount, totalSum, session);
            } else {
              await put(SkladStockModel, stockFilter, amount, totalSum, session);
            }
            break;
        }

        // 5. Storno yozuvini saqlaymiz
        await reversal.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return this._populated(reversal._id);
  }

  // ================= RO'YXATLAR =================
  async getTransactions(req, res) {
    const filter = { companyId: req.user.companyId };
    const { firmId, skladHouseId, employeeId, type } = req.query;

    if (isId(firmId)) filter.firmId = firmId;
    if (isId(skladHouseId)) filter.skladHouseId = skladHouseId;
    if (isId(employeeId)) filter.employeeId = employeeId;
    if ([...CREATE_TYPES, "reversal"].includes(type)) filter.type = type;

    return SkladTransactionModel.find(filter)
      .populate("skladProductId", "name unit type")
      .populate("skladHouseId", "name")
      .populate("firmId", "firmName inn")
      .populate("categoryID", "categoryName")
      .populate("subCategoryID", "name")
      .populate("employeeId", "fName lName")
      .populate("userId", "fName lName")
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  // ================= YORDAMCHILAR =================

  // Kategoriya majburiy; status 1 da subkategoriya ham majburiy va shu kategoriyaning ichidan
  async _checkCategory({ categoryID, subCategoryID }, companyId, session) {
    if (!isId(categoryID)) throw BaseError.BadRequest("Kategoriyani tanlang");

    const category = await CategoryModel.findOne({ _id: categoryID, companyId })
      .session(session)
      .lean();
    if (!category) throw BaseError.BadRequest("Kategoriya topilmadi");

    if (category.status !== 1) return { categoryID: category._id, subCategoryID: null };

    if (!isId(subCategoryID)) throw BaseError.BadRequest("Subkategoriyani tanlang");
    const subCategory = await SubCategoryModel.exists({
      _id: subCategoryID,
      categoryID: category._id,
      companyId,
    }).session(session);
    if (!subCategory) throw BaseError.BadRequest("Subkategoriya bu kategoriyaga tegishli emas");

    return { categoryID: category._id, subCategoryID };
  }

  // Xodim shu kompaniyaniki. required bo'lmasa va berilmasa, null
  async _checkEmployee(employeeId, companyId, session, required) {
    if (!employeeId) {
      if (required) throw BaseError.BadRequest("Xodimni tanlang");
      return null;
    }
    if (!isId(employeeId)) throw BaseError.BadRequest("Xodim topilmadi");

    const user = await UserModel.exists({ _id: employeeId, companyId }).session(session);
    if (!user) throw BaseError.BadRequest("Xodim topilmadi");
    return employeeId;
  }

  _populated(id) {
    return SkladTransactionModel.findById(id)
      .populate("skladProductId", "name unit type")
      .populate("skladHouseId", "name")
      .populate("firmId", "firmName inn")
      .populate("categoryID", "categoryName")
      .populate("subCategoryID", "name")
      .populate("employeeId", "fName lName")
      .populate("userId", "fName lName")
      .lean();
  }
}

module.exports = new SkladTransactionService();