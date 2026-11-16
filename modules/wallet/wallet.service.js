const mongoose = require("mongoose");
const WalletModel = require("./wallet.model");
const PerebrosModel = require("./perebros.model");


class WalletService {
  async createWallet(req, res) {
    if (!req.body.walletName || !req.body.color) {
      throw new Error("Nom kiriting va rang tanlang");
    }
    const existWallet = await WalletModel.findOne({
      walletName: req.body.walletName,
      companyID: req.user.companyID,
    });
    if (existWallet) {
      throw new Error("Hamyon mavjud");
    }

    const newWallet = await WalletModel.create({
      walletName: req.body.walletName,
      color: req.body.color,
      userID: req.user._id,
      companyID: req.user.companyID,
    });
    return newWallet;
  }

 async perebros(req, res) {
  const { oneWalletID, twoWalletID } = req.body;
  const amount = Number(req.body.amount);
  const companyID = req.user.companyID;

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
        { _id: oneWalletID, companyID, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { session, new: true }
      );
      if (!oneWallet) {
        throw new Error("Birinchi hamyon topilmadi yoki unda yetarli mablag' yo'q");
      }

      const twoWallet = await WalletModel.findOneAndUpdate(
        { _id: twoWalletID, companyID },
        { $inc: { balance: amount } },
        { session, new: true }
      );
      if (!twoWallet) {
        throw new Error("Ikkinchi hamyon topilmadi");
      }

      await PerebrosModel.create(
        [{ oneWalletID, twoWalletID, amount, userID: req.user._id, companyID }],
        { session }
      );
    }); // withTransaction shu yerda yopiladi
  } finally {
    await session.endSession();
  }

  return WalletModel.find({ companyID });
}

  async allWallets(req, res) {
    const wallets = await WalletModel.find({ companyID: req.user.companyID });
    return wallets;
  }

  async allPerebros(req, res) {
    const perebrosList = await PerebrosModel.find({
      companyID: req.user.companyID,
    })
      .populate(["oneWalletID", "twoWalletID"])
      .sort({ createdAt: -1 });
    return perebrosList;
  }
}

module.exports = new WalletService();