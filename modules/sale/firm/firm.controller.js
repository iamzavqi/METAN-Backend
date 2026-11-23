const firmService = require("./firm.service");

class FirmController {
	async createFirm(req, res, next) {
		try {
			const createdFirm = await firmService.createFirm(req, res);
			return res.json(createdFirm);
		} catch (error) {
			next(error)
		}
	}
	async getFirms(req, res, next) {
		try {
			const firms = await firmService.getFirms(req, res);
			return res.json(firms);
		} catch (error) {
			next(error)
		}
	}
}


module.exports = new FirmController()