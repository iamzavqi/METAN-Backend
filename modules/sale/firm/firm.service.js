const mongoose = require("mongoose");
const FirmModel = require("./firm.module");
const { emitToRoles } = require("../../../socket/socket");

class FirmService {
  async createFirm(req, res) {
    const { firmName, inn, phone } = req.body;

    if (typeof firmName !== "string" || !firmName.trim()) {
      throw BaseError.BadRequest("Firma nomini kiriting");
    }
    if (inn && !/^\d{9}$/.test(inn)) {
      throw BaseError.BadRequest("INN 9 ta raqamdan iborat bo'lishi kerak");
    }
    if (phone && !/^\+998\d{9}$/.test(phone)) {
      throw BaseError.BadRequest("Telefon raqami noto'g'ri");
    }

    const firm = await FirmModel.create({
      firmName: firmName.trim(),
      inn: inn || "",
      phone: phone || "",
      userId: req.user._id,
      companyId: req.user.companyId,
    });

    await firm.populate("userId", "fName lName");
    emitToRoles(
      String(req.user.companyId),
      ["moliyachi", "director", "ceo"],
      "firm:created",
      firm,
    );

    return firm;
  }

  async getFirms(req, res) {
    return FirmModel.find({
      companyId: req.user.companyId,
    })
      .populate("userId", "fName lName")
      .sort({ date: -1 })
      .lean();
  }
}

module.exports = new FirmService();
