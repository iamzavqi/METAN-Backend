const crypto = require("crypto");
const mongoose = require("mongoose");
const { parseStatement } = require("../../utils/statementParser");
const BankStatementModel = require("./bank.statement.module");
const BankTransactionModel = require("./bank.transaction.module");

class BankService {
  async upload(req) {
    if (!req.file) throw new Error("Fayl yuborilmadi");

    const parsed = parseStatement(req.file.buffer);
    if (parsed.problems.length) {
      throw new Error(
        "Ko'chirma tekshiruvdan o'tmadi: " + parsed.problems.join("; "),
      );
    }

    const companyId = req.user.companyId;
    const { header } = parsed;

    // Har bir yozuv uchun barqaror kalit: bir xil yozuv qayta yuklansa, kalit ham bir xil chiqadi
    const seen = new Map();
    const docs = parsed.transactions.map((t) => {
      const base = [
        header.account,
        t.date.toISOString(),
        t.counterpartyAccount,
        t.docNumber,
        t.debit,
        t.credit,
        t.purpose,
      ].join("|");
      const n = seen.get(base) || 0;
      seen.set(base, n + 1);
      const dedupKey = crypto
        .createHash("sha256")
        .update(`${base}|${n}`)
        .digest("hex");
      return { ...t, companyId, account: header.account, dedupKey };
    });

    // Avval yuklangan yozuvlarni chiqarib tashlaymiz
    const existing = new Set(
      await BankTransactionModel.distinct("dedupKey", {
        companyId,
        dedupKey: { $in: docs.map((d) => d.dedupKey) },
      }),
    );
    const fresh = docs.filter((d) => !existing.has(d.dedupKey));
    if (!fresh.length) {
      throw new Error("Bu ko'chirma avval yuklangan, yangi yozuv yo'q");
    }

    let statement;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        [statement] = await BankStatementModel.create(
          [
            {
              companyId,
              uploadedBy: req.user._id,
              fileName: req.file.originalname,
              account: header.account,
              ownerInn: header.ownerInn,
              periodFrom: header.periodFrom,
              periodTo: header.periodTo,
              openingBalance: header.openingBalance,
              closingBalance: header.closingBalance,
              totalDebit: parsed.totals.debit,
              totalCredit: parsed.totals.credit,
              added: fresh.length,
              skipped: docs.length - fresh.length,
            },
          ],
          { session },
        );
        if (fresh.length) {
          await BankTransactionModel.insertMany(
            fresh.map((d) => ({ ...d, statementID: statement._id })),
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    return {
      statementID: statement._id,
      total: docs.length,
      added: fresh.length,
      skipped: docs.length - fresh.length,
    };
  }

    async getTransactions(req, res) {
    const transactions = await BankTransactionModel.find({
      companyId: req.user.companyId,
      categoryId: null,
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return transactions;
  }
}

module.exports = new BankService();
