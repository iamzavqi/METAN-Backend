const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Papka borligini tekshirish, yo'q bo'lsa yaratish (Xatolikni oldini oladi)
const uploadDir = path.join(__dirname, "../uploads/images");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Storage: Qayerga va qanday nom bilan saqlashni belgilaymiz
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Rasmlar shu papkaga tushadi
  },
  filename: function (req, file, cb) {
    // Fayl nomiga aniq vaqtni qo'shamiz (Nomlar ustma-ust tushmasligi uchun)
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Masalan: message-1698765432-12345.jpg
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 3. FileFilter: Faqat kerakli formatdagi fayllarga ruxsat beramiz
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  console.log(file);
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // O'tkazvorish
  } else {
    cb(new Error("Faqat rasm formatlari (JPG, PNG, WEBP) ruxsat etilgan!"), false); // Qaytarish
  }
};


// 4. Multerni yig'ib export qilamiz
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024, // Maksimal hajm: 5MB
  },
});

module.exports = upload;