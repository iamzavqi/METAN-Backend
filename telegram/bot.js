const { Bot, GrammyError, HttpError } = require("grammy");
const { autoRetry } = require("@grammyjs/auto-retry");
const { TELEGRAM_BOT_TOKEN } = require("../config/env");

let bot = null;

const initBot = () => {
  // Token bo'lmasa server baribir ishlaydi, faqat Telegram xabarlari yuborilmaydi
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN topilmadi: Telegram bot ishga tushmadi");
    return null;
  }

  bot = new Bot(TELEGRAM_BOT_TOKEN);

  // 429 (ko'p so'rov) va vaqtinchalik xatolarda o'zi kutib, qayta yuboradi
  bot.api.config.use(autoRetry());

  // Hozircha tekshirish uchun. Keyingi qadamda bu yerda xodim ulanadi
  bot.command("start", async (ctx) => {
    await ctx.reply( ctx.chat);
  });

  // Bot ichidagi har qanday xato server'ni to'xtatmasin
  bot.catch((err) => {
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Telegram xatosi:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Telegram'ga ulanib bo'lmadi:", e.message);
    } else {
      console.error("Bot xatosi:", e);
    }
  });

  // Polling: server Telegram'dan yangi xabarlarni o'zi so'rab turadi
  bot
    .start({
      onStart: (info) => console.log(`Telegram bot ishga tushdi: @${info.username}`),
    })
    .catch((err) => {
      console.error("Telegram bot ishga tushmadi:", err.message);
    });

  return bot;
};

// Xabar yuborish. Xato bo'lsa false qaytaradi, so'rovni to'xtatmaydi
const sendMessage = async (chatId, text, extra = {}) => {
  if (!bot || !chatId) return false;

  try {
    await bot.api.sendMessage(chatId, text, { parse_mode: "HTML", ...extra });
    return true;
  } catch (err) {
    console.error(`Telegram xabari yuborilmadi (${chatId}):`, err.description || err.message);
    return false;
  }
};

// Xabarga qo'yiladigan matnni tozalash: <, > va & HTML'ni buzmasin
const escapeHtml = (text = "") =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const stopBot = async () => {
  if (bot) await bot.stop();
};

module.exports = { initBot, sendMessage, escapeHtml, stopBot };