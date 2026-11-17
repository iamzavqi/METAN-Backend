const firmService = require("./firm.service");

class FirmController {
	async createSale(req, res, next) {
		try {
			const createdFirm = await firmService.createFirm(req, res);
			return res.json(createdFirm);
		} catch (error) {
			next(error)
		}
	}
}


module.exports = new FirmController()