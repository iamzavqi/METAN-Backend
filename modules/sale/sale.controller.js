const saleService = require("./sale.service");

class SaleController {
  async createSale(req, res, next) {
    try {
      const createdSale = await saleService.createSale(req, res);
      return res.json(createdSale);
    } catch (error) {
			next(error)
		}
  }
  async getSales(req, res, next) {
    try {
      const sales = await saleService.getSales(req, res);
      return res.json(sales);
    } catch (error) {
			next(error)
		}
  }
  async approveSale(req, res, next) {
    try {
      const sale = await saleService.approveSale(req, res);
      return res.json(sale);
    } catch (error) {
			next(error)
		}
  }
  async rejectSale(req, res, next) {
    try {
      const sale = await saleService.rejectSale(req, res);
      return res.json(sale);
    } catch (error) {
			next(error)
		}
  }
}


module.exports = new SaleController()