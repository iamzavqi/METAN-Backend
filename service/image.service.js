// image.service.js
const path = require("path");
const fs = require("fs");
const tokenService = require("../utils/generateToken");

class ImageService {
  async getImage(req, res) {
    const verifyToken = tokenService.validateAccessToken(req.params.token);

		if (!verifyToken) {
			 throw new Error("Xatolik bor")
		}

    const filename = req.params.filename;
    const filepath = path.join(__dirname, "../uploads/images", filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: "Rasm topilmadi" });
    }

    return filepath;
  }
}

module.exports = new ImageService();
