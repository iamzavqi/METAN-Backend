const mongoose = require("mongoose");
const SkladHoldingModel = require("./modules/sklad.holding.module");

class SkladHoldingService {
  // Xodimlarning zimmasidagi inventar. ?employeeId=... bilan bitta xodim
  async getHoldings(req, res) {
    const filter = { companyId: req.user.companyId, amount: { $gt: 0 } };

    if (mongoose.isValidObjectId(req.query.employeeId)) {
      filter.employeeId = req.query.employeeId;
    }

    const holdings = await SkladHoldingModel.find(filter)
      .populate("employeeId", "fName lName role")
      .populate("productId", "name unit")
      .sort({ employeeId: 1 })
      .lean();

    return holdings.map((h) => ({
      ...h,
      avgPrice: Math.round(h.totalSum / h.amount),
    }));
  }
}

module.exports = new SkladHoldingService();