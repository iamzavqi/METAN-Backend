// utils/statementParser.js
// IABS bank ko'chirmasi (TXT, windows-1251) parseri.
// Tashqi kutubxona kerak emas: TextDecoder Node.js ichida bor.

const SEPARATOR = /^\s*-{20,}\s*$/;
const PURPOSE_WIDTH = 30;

// "106,257.69" -> 10625769 (tiyinda, butun son). Float ishlatilmaydi.
function toTiyin(text) {
  const clean = text.replace(/[,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) {
    throw new Error(`Summani o'qib bo'lmadi: "${text}"`);
  }
  const [whole, frac = ""] = clean.split(".");
  return Number(whole + frac.padEnd(2, "0"));
}

// "02.11.2026" -> Date (UTC yarim tun)
function toDate(text) {
  const m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) throw new Error(`Sanani o'qib bo'lmadi: "${text}"`);
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
}

// To'lov maqsadi 30 belgidan so'z bo'yicha ko'chirilgan. Faqat 30 belgidan
// uzun yaxlit token o'rtasidan bo'linadi, o'sha holatda probel qo'shilmaydi.
function joinPurpose(cells) {
  let result = "";
  for (let i = 0; i < cells.length; i++) {
    const text = cells[i].trim();
    if (!text) continue;
    const prev = i > 0 ? cells[i - 1] : "";
    const hardBreak =
      prev.length >= PURPOSE_WIDTH && !/\s/.test(prev.slice(0, PURPOSE_WIDTH));
    result += result && !hardBreak ? " " + text : text;
  }
  return result.replace(/\s+/g, " ").trim();
}

// Fayl boshidagi sarlavha: davr, hisob raqam, INN, qoldiqlar
function parseHeader(lines) {
  const head = lines.join("\n");
  const period = head.match(/c\s+(\d{2}\.\d{2}\.\d{4})\s+по\s+(\d{2}\.\d{2}\.\d{4})/i);
  const account = head.match(/[CС]чет:\s+(\d+)\s+(.+?)\s+ИНН:\s*(\d+)/);
  const opening = head.match(/Остаток на начало периода:\s+([\d,.]+)/);
  const closing = head.match(/Остаток на конец периода:\s+([\d,.]+)/);
  if (!period || !account || !opening || !closing) {
    throw new Error(
      "Fayl sarlavhasi tanilmadi: bu IABS ko'chirmasi emas yoki kodirovka noto'g'ri"
    );
  }
  return {
    periodFrom: toDate(period[1]),
    periodTo: toDate(period[2]),
    account: account[1],
    ownerName: account[2].trim(),
    ownerInn: account[3],
    openingBalance: toTiyin(opening[1]),
    closingBalance: toTiyin(closing[1]),
  };
}

// Bitta to'lov bloki (chiziqchalar orasidagi qatorlar)
function parseRecord(blockLines) {
  const rows = blockLines.map((line) => line.split("|"));
  const first = rows[0];
  if (first.length < 8) {
    throw new Error(`Yozuv qatori kutilgan ko'rinishda emas: "${blockLines[0]}"`);
  }

  const innMatch = rows[1] ? rows[1][1].match(/ИНН\s*(\d+)/) : null;
  const name = rows
    .slice(2)
    .map((r) => (r[1] || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");

  const purposeFull = joinPurpose(rows.map((r) => r.slice(7).join("|")));
  const code = purposeFull.match(/^(\d{5})\s*(.*)$/s);

  const debit = toTiyin(first[5]);
  const credit = toTiyin(first[6]);

  return {
    date: toDate(first[0].trim()),
    counterpartyAccount: first[1].trim(),
    counterpartyInn: innMatch ? innMatch[1] : null,
    counterpartyName: name,
    docNumber: first[2].trim(),
    operationType: first[3].trim(),
    mfo: first[4].trim(),
    debit, // chiqim, tiyinda
    credit, // kirim, tiyinda
    direction: credit > 0 ? "in" : "out",
    purposeCode: code ? code[1] : null,
    purpose: code ? code[2] : purposeFull,
  };
}

// Asosiy funksiya: fayl baytlarini (Buffer) qabul qiladi
function parseStatement(buffer) {
  const text = new TextDecoder("windows-1251").decode(buffer);
  const lines = text.split(/\r?\n/);

  // Sarlavha: birinchi chiziqcha qatorigacha
  const firstSep = lines.findIndex((l) => SEPARATOR.test(l));
  if (firstSep === -1) throw new Error("Faylda jadval topilmadi");
  const header = parseHeader(lines.slice(0, firstSep));

  // Qolganini chiziqcha qatorlari bo'yicha bloklarga bo'lamiz
  const blocks = [];
  let current = [];
  for (const line of lines.slice(firstSep)) {
    if (SEPARATOR.test(line)) {
      if (current.length) blocks.push(current);
      current = [];
    } else if (line.trim()) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  const transactions = [];
  let totals = null;
  for (const block of blocks) {
    const head = block[0].trim();
    if (head.startsWith("Дата")) continue; // ustun nomlari
    if (head.startsWith("Итоговый оборот")) {
      const m = head.match(/:\s*([\d,.]+)\s*\|\s*([\d,.]+)/);
      if (m) totals = { debit: toTiyin(m[1]), credit: toTiyin(m[2]) };
      continue;
    }
    transactions.push(parseRecord(block));
  }

  // Nazorat: yig'indilar bankning o'z jami bilan mos kelishi shart
  const sumDebit = transactions.reduce((s, t) => s + t.debit, 0);
  const sumCredit = transactions.reduce((s, t) => s + t.credit, 0);
  const problems = [];
  if (!totals) {
    problems.push("Faylda 'Итоговый оборот' qatori topilmadi (fayl to'liq emas?)");
  } else {
    if (totals.debit !== sumDebit) problems.push("Debet jami mos kelmadi");
    if (totals.credit !== sumCredit) problems.push("Kredit jami mos kelmadi");
  }
  if (header.openingBalance + sumCredit - sumDebit !== header.closingBalance) {
    problems.push("Boshlang'ich qoldiq + kirim - chiqim oxirgi qoldiqqa teng emas");
  }

  return {
    header,
    transactions,
    totals: { debit: sumDebit, credit: sumCredit },
    problems,
  };
}

module.exports = { parseStatement };