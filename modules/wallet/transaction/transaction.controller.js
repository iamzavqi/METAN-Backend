const transactionService = require("./transaction.service");

class TransactionController {
	async createTransaction(req, res, next) {
		try {
			const createdTransaction = await transactionService.createTransaction(req, res);
			return res.json(createdTransaction);
		} catch (error) {
			next(error);
		}
	}

	async getTransactions(req, res, next) {
		try {
			const transactions = await transactionService.getTransactions(req, res);
			return res.json(transactions);
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new TransactionController();