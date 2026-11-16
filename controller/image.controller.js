const imageService = require("../service/image.service");

class ImageController {
	async getImage(req, res, next) {
		try {
			const image = await imageService.getImage(req, res);
			return res.sendFile(image);
		} catch (error) {
			next(error);
		}
	}
	
}

module.exports = new ImageController();
