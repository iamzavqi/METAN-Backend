const bankService = require('./bank.service');


class BankController {
	async upload(req, res, next) {
		try {
			const result = await bankService.upload(req);
			return res.json(result);
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new BankController();
