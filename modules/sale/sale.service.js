const mongoose = require("mongoose");
const SaleModel = require("./sale.module");
const FirmModel = require("./firm/firm.module");
const BaseError = require("../../errors/base.error");
const { emitToRoles } = require("../../socket/socket");

const SALE_ROLES = ["moliyachi", "director", "ceo", "kassir"];

// Summa maydoni: yozilmagan bo'lsa 0, yozilgan bo'lsa manfiy bo'lmagan son
const toAmount = (value, name) => {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw BaseError.BadRequest(`${name} noto'g'ri`);
  }
  return n;
};

class SaleService {
  async createSale(req, res) {
    const {
      date,
      volume,
      pricePerCube,
      cash,
      terminal,
      transferItems,
      comment,
    } = req.body;
    const companyId = req.user.companyId;

    // 1. Sana: to'g'ri format va kelajakda emas
    const saleDate = new Date(date);
    if (typeof date !== "string" || isNaN(saleDate) || saleDate > new Date()) {
      throw BaseError.BadRequest("Sana noto'g'ri");
    }
    saleDate.setUTCHours(0, 0, 0, 0); // hamma sotuv kun boshida turadi

    // 2. Kub va narx majburiy, noldan katta
    const v = Number(volume);
    const p = Number(pricePerCube);
    if (!Number.isFinite(v) || v <= 0) {
      throw BaseError.BadRequest("Sotilgan kubni kiriting");
    }
    if (!Number.isFinite(p) || p <= 0) {
      throw BaseError.BadRequest("1 kub narxini kiriting");
    }

    // 3. Olingan pullar
    const c = toAmount(cash, "Naqd summa");
    const t = toAmount(terminal, "Terminal summasi");

    // 4. Perechisleniya: har bir qatorda firma va kub
    const rawItems = Array.isArray(transferItems) ? transferItems : [];
    const items = rawItems.map((item, i) => {
      const itemVolume = Number(item?.volume);
      if (!mongoose.isValidObjectId(item?.firmId)) {
        throw BaseError.BadRequest(`${i + 1}-qatorda firma tanlanmagan`);
      }
      if (!Number.isFinite(itemVolume) || itemVolume <= 0) {
        throw BaseError.BadRequest(`${i + 1}-qatorda kub noto'g'ri`);
      }
      return { firmId: String(item.firmId), volume: itemVolume };
    });

    // 4.1. Bitta firma ikki marta bo'lmasin
    const firmIds = [...new Set(items.map((it) => it.firmId))];
    if (firmIds.length !== items.length) {
      throw BaseError.BadRequest("Bitta firma ikki marta tanlangan");
    }

    // 4.2. Hamma firmalar shu kompaniyaniki bo'lishi shart
    if (firmIds.length) {
      const count = await FirmModel.countDocuments({
        _id: { $in: firmIds },
        companyId,
      });
      if (count !== firmIds.length) {
        throw BaseError.BadRequest("Firma topilmadi");
      }
    }

    // 4.3. Firmalarga yozilgan gaz jami sotilgan gazdan oshmasin
    const transferVolume = items.reduce((sum, it) => sum + it.volume, 0);
    if (transferVolume > v) {
      throw BaseError.BadRequest(
        `Firmalarga ${transferVolume} kub yozilgan, jami sotilgan ${v} kub`,
      );
    }

    // 5. Pul kam bo'lmasin (ko'p bo'lsa mayli)
    const totalAmount = Math.round(v * p);
    const transferTotal = items.reduce(
      (sum, it) => sum + Math.round(it.volume * p),
      0,
    );
    const received = c + t + transferTotal;
    if (received < totalAmount) {
      throw BaseError.BadRequest(
        `Pul kam: yana ${totalAmount - received} so'm yetishmayapti`,
      );
    }

    // 6. Saqlash. userId va companyId tokendan, clientdan emas.
    //    transfer, amount, totalAmount va difference ni model o'zi hisoblaydi
    let sale;
    try {
      sale = await SaleModel.create({
        date: saleDate,
        volume: v,
        pricePerCube: p,
        cash: c,
        terminal: t,
        transferItems: items,
        comment: typeof comment === "string" ? comment.trim() : undefined,
        userId: req.user._id,
        companyId,
      });
    } catch (err) {
      if (err.code === 11000) {
        throw BaseError.BadRequest(
          "Bu kun uchun sotuv hisoboti allaqachon kiritilgan",
        );
      }
      if (err.name === "ValidationError") {
        throw BaseError.BadRequest(Object.values(err.errors)[0].message);
      }
      throw err;
    }

    // 7. Kassir va firma nomlarini qo'shib, tegishli rollarga yuboramiz
    await sale.populate([
      { path: "userId", select: "fName lName" },
      { path: "transferItems.firmId", select: "firmName inn" },
    ]);
    emitToRoles(String(companyId), SALE_ROLES, "sale:created", sale);

    return sale;
  }

  async getSales(req, res) {
    return SaleModel.find({ companyId: req.user.companyId })
      .populate("userId", "fName lName")
      .populate("transferItems.firmId", "firmName inn")
      .sort({ date: -1 })
      .lean();
  }

  async approveSale(req, res) {}

  async rejectSale(req, res) {
    const rejectedSale = await SaleModel.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
        approvedBy: req.user._id,
      },
      { new: true },
    );
    await rejectedSale.populate([
      { path: "userId", select: "fName lName" },
      { path: "transferItems.firmId", select: "firmName inn" },
    ]);
    emitToRoles(
      String(req.user.companyId),
      SALE_ROLES,
      "sale:rejected",
      rejectedSale,
    );

    return rejectedSale;
  }
}

module.exports = new SaleService();
