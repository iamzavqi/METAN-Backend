const walletService = require("./wallet.service");

class WalletController {
  async createWallet(req, res, next) {
    try {
      const createdWallet = await walletService.createWallet(req, res);
      return res.json(createdWallet);
    } catch (error) {
      next(error);
    }
  }
  async perebros(req, res, next) {
    try {
      const perebrosResult = await walletService.perebros(req, res);
      return res.json(perebrosResult);
    } catch (error) {
      next(error);
    }
  }

  async allWallet(req, res, next) {
    try {
      const wallets = await walletService.allWallets(req, res);
      return res.json(wallets);
    } catch (error) {
      next(error);
    }
  }

  async allPerebros(req, res, next) {
    try {
      const perebroskaList = await walletService.allPerebros(req, res);
      return res.json(perebroskaList);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WalletController();