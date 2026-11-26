const mongoose = require("mongoose");
const TransactionModel = require("./transaction.module");
const WalletModel = require("../wallet.module");
const FirmModel = require("../../sale/firm/firm.module");
const CategoryModel = require("../../categories/category.module");
const SubCategoryModel = require("../../categories/subCategory.module");
const BaseError = require("../../../errors/base.error");
const { emitToRoles } = require("../../../socket/socket");

const TRANSACTION_ROLES = ["moliyachi", "director", "ceo",];
const DIRECTIONS = ["in", "out"];
const CASH_FLOWS = ["operating", "investing", "financing"];
const MIN_AMOUNT = 1000;

class TransactionService {
  async createTransaction(req, res) {
    const {
      date,
      direction,
      cashFlow,
      walletId,
      categoryID,
      subCategoryID,
      firmId,
      comment,
    } = req.body;
    const companyId = req.user.companyId;
    const isId = (v) => mongoose.isValidObjectId(v);

    // 1. Sana: to'g'ri format va kelajakda emas
    const txDate = new Date(date);
    if (typeof date !== "string" || isNaN(txDate) || txDate > new Date()) {
      throw BaseError.BadRequest("Sana noto'g'ri");
    }
    txDate.setUTCHours(0, 0, 0, 0);

    // 2. Kirim yoki chiqim, pul oqimi turi
    if (!DIRECTIONS.includes(direction)) {
      throw BaseError.BadRequest("Kirim yoki chiqimni tanlang");
    }
    if (!CASH_FLOWS.includes(cashFlow)) {
      throw BaseError.BadRequest("Pul oqimi turini tanlang");
    }

    // 3. Summa va komissiya
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
      throw BaseError.BadRequest(
        `${MIN_AMOUNT} yoki undan katta summa kiriting`,
      );
    }

    // Komissiya faqat chiqimda bo'ladi
    const commission =
      direction === "out" ? Number(req.body.commission) || 0 : 0;
    if (!Number.isFinite(commission) || commission < 0) {
      throw BaseError.BadRequest("Komissiya noto'g'ri");
    }

    // 4. ID lar formati
    if (!isId(walletId)) throw BaseError.BadRequest("Hamyonni tanlang");
    if (!isId(categoryID)) throw BaseError.BadRequest("Kategoriyani tanlang");
    if (subCategoryID && !isId(subCategoryID))
      throw BaseError.BadRequest("Subkategoriya topilmadi");
    if (firmId && !isId(firmId)) throw BaseError.BadRequest("Firma topilmadi");

    let created;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // 5. Kategoriya shu kompaniyaniki
        const category = await CategoryModel.findOne({
          _id: categoryID,
          companyId,
        })
          .session(session)
          .lean();
        if (!category) throw BaseError.BadRequest("Kategoriya topilmadi");

        // 6. Subkategoriya: status 1 da majburiy va aynan shu kategoriyaning ichidan
        let subCategory = null;
        if (category.status === 1) {
          if (!subCategoryID)
            throw BaseError.BadRequest("Subkategoriyani tanlang");

          subCategory = await SubCategoryModel.findOne({
            _id: subCategoryID,
            categoryId: category._id,
            companyId,
          })
            .session(session)
            .lean();
          if (!subCategory) {
            throw BaseError.BadRequest(
              "Subkategoriya bu kategoriyaga tegishli emas",
            );
          }
        }

        // 7. Firma (ixtiyoriy) shu kompaniyaniki
        let firm = null;
        if (firmId) {
          firm = await FirmModel.findOne({ _id: firmId, companyId }).session(
            session,
          );
          if (!firm) throw BaseError.BadRequest("Firma topilmadi");
        }

        // 8. Hamyon balansi
        if (direction === "out") {
          // Chiqim: summa + komissiya yechiladi. Shart ichida tekshiriladi:
          // pul yetmasa yoki boshqa so'rov oldinroq yechib qo'ygan bo'lsa, hamyon topilmaydi
          const total = amount + commission;
          const wallet = await WalletModel.findOneAndUpdate(
            { _id: walletId, companyId, balance: { $gte: total } },
            { $inc: { balance: -total } },
            { new: true, session },
          );

          if (!wallet) {
            const exists = await WalletModel.exists({
              _id: walletId,
              companyId,
            }).session(session);
            throw BaseError.BadRequest(
              exists ? "Hamyonda pul yetarli emas" : "Hamyon topilmadi",
            );
          }
        } else {
          // Kirim: summa hamyonga qo'shiladi
          const wallet = await WalletModel.findOneAndUpdate(
            { _id: walletId, companyId },
            { $inc: { balance: amount } },
            { new: true, session },
          );

          if (!wallet) throw BaseError.BadRequest("Hamyon topilmadi");
        }

        // 9. Firma balansi: + firma bizga qarzdor, − biz firmaga qarzdormiz
        //    Kirim: firma bizga to'ladi → qarzi kamayadi (−)
        //    Chiqim: biz firmaga to'ladik → bizning qarzimiz kamayadi (+)
        if (firm) {
          firm.balance += direction === "in" ? -amount : amount;
          await firm.save({ session });
        }

        // 10. Tranzaksiyani saqlash
        [created] = await TransactionModel.create(
          [
            {
              companyId,
              userId: req.user._id,
              date: txDate,
              direction,
              cashFlow,
              amount,
              commission,
              walletId,
              categoryID: category._id,
              subCategoryID: subCategory ? subCategory._id : null,
              firmId: firm ? firm._id : null,
              comment: typeof comment === "string" ? comment.trim() : "",
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    // 11. Frontend uchun nomlari bilan
    const newTransaction = await TransactionModel.findById(created._id)
      .populate("walletId", "walletName")
      .populate("categoryID", "categoryName")
      .populate("subCategoryID", "name")
      .populate("firmId", "firmName inn")
      .populate("userId", "fName lName")
      .lean();

    emitToRoles(
      String(companyId),
      TRANSACTION_ROLES,
      "transaction:created",
      newTransaction,
    );
  }

  async getTransactions(req, res) {
    return TransactionModel.find({ companyId: req.user.companyId })
      .populate("walletId", "walletName")
      .populate("categoryID", "categoryName")
      .populate("subCategoryID", "name")
      .populate("firmId", "firmName inn")
      .populate("userId", "fName lName")
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }
}

module.exports = new TransactionService();
