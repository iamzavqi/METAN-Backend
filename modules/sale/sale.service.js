const SaleModel = require("./sale.module");
const BaseError = require("../../errors/base.error");
const { emitToRoles } = require("../../socket/socket");

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
    const { date, volume, pricePerCube, cash, terminal, transfer, comment } =
      req.body;

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
    const tr = toAmount(transfer, "Perechisleniya summasi");

    // 4. Pul kam bo'lmasin (ko'p bo'lsa mayli)
    const totalAmount = Math.round(v * p);
    const received = c + t + tr;
    if (received < totalAmount) {
      throw BaseError.BadRequest(
        `Pul kam: yana ${totalAmount - received} so'm yetishmayapti`,
      );
    }

    // 5. Saqlash. userId va companyId tokendan, clientdan emas
    const sale = await SaleModel.create({
      date: saleDate,
      volume: v,
      pricePerCube: p,
      cash: c,
      terminal: t,
      transfer: tr,
      comment: typeof comment === "string" ? comment.trim() : undefined,
      userId: req.user._id,
      companyId: req.user.companyId,
    });

    await sale.populate("userId", "fName lName")
    emitToRoles(
      String(req.user.companyId),
      ["moliyachi", "director", "ceo", "kassir"],
      "sale:created",
      sale,
    );

    return sale;
  }

  // Oy bo'yicha sotuvlar: month = "2026-11"
  async getSales(req, res) {
    return SaleModel.find({
      companyId: req.user.companyId,
    })
      .populate("userId", "fName lName")
      .sort({ date: -1 })
      .lean();
  }
}

module.exports = new SaleService();
