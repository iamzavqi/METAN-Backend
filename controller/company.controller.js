const companyService = require('../service/company.service');

class CompanyController {
	async regisCompany(req, res, next) {
		try {
			const company = await companyService.regisCompany(req, res)
			return res.json(company);
		} catch (error) {
			next(error);
		}
	}
	async allCompany(req, res, next) {
		try {
			const company = await companyService.allCompany(req, res)
			return res.json(company);
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new CompanyController();