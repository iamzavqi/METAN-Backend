const mongoose = require("mongoose");
const WalletModel = require("./wallet.module");
const PerebrosModel = require("./perebros.module");

class WalletService {
  async createWallet(req, res) {
    if (!req.body.walletName || !req.body.color) {
      throw new Error("Nom kiriting va rang tanlang");
    }
    const existWallet = await WalletModel.findOne({
      walletName: req.body.walletName,
      companyId: req.user.companyId,
    });
    if (existWallet) {
      throw new Error("Hamyon mavjud");
    }

    const newWallet = await WalletModel.create({
      walletName: req.body.walletName,
      color: req.body.color,
      userId: req.user._id,
      companyId: req.user.companyId,
    });
    return newWallet;
  }

  async perebros(req, res) {
    const { oneWalletID, twoWalletID } = req.body;
    const amount = Number(req.body.amount);
    const companyId = req.user.companyId;

    if (!oneWalletID || !twoWalletID || !req.body.amount) {
      throw new Error("Barcha maydonlarni to'ldiring");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Miqdor 0 dan katta bo'lishi kerak");
    }
    if (oneWalletID === twoWalletID) {
      throw new Error("Hamyonlar bir xil bo'lishi mumkin emas");
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const oneWallet = await WalletModel.findOneAndUpdate(
          { _id: oneWalletID, companyId, balance: { $gte: amount } },
          { $inc: { balance: -amount } },
          { session, new: true },
        );
        if (!oneWallet) {
          throw new Error(
            "Birinchi hamyon topilmadi yoki unda yetarli mablag' yo'q",
          );
        }

        const twoWallet = await WalletModel.findOneAndUpdate(
          { _id: twoWalletID, companyId },
          { $inc: { balance: amount } },
          { session, new: true },
        );
        if (!twoWallet) {
          throw new Error("Ikkinchi hamyon topilmadi");
        }

        await PerebrosModel.create(
          [
            {
              oneWalletID,
              twoWalletID,
              amount,
              userId: req.user._id,
              companyId,
            },
          ],
          { session },
        );
      }); // withTransaction shu yerda yopiladi
    } finally {
      await session.endSession();
    }

    return WalletModel.find({ companyId });
  }

  async allWallets(req, res) {
    const wallets = await WalletModel.find({ companyId: req.user.companyId });
    return wallets;
  }

  async allPerebros(req, res) {
    const perebrosList = await PerebrosModel.find({
      companyId: req.user.companyId,
    })
      .populate(["oneWalletID", "twoWalletID"])
      .sort({ createdAt: -1 });
    return perebrosList;
  }
}

module.exports = new WalletService();
