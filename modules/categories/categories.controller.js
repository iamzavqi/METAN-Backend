const categoriesService = require("./categories.service")

class CategoriesController {
  async createCategory(req, res, next) {
    try {
			const createdCategory = await categoriesService.createCategory(req, res)
			return res.json(createdCategory)
    } catch (error) {
      next(error);
    }
  }
  async createSubCategory(req, res, next) {
    try {
			const createdSubCategory = await categoriesService.createSubCategory(req, res)
			return res.json(createdSubCategory)
    } catch (error) {
      next(error);
    }
  }
  async getCategories(req, res, next) {
    try {
      const categories = await categoriesService.getCategories(req, res);
      return res.json(categories);
    } catch (error) {
      next(error);
    }
  }
  async getSubCategories(req, res, next) {
    try {
      const subCategories = await categoriesService.getSubCategories(req, res);
      return res.json(subCategories);
    } catch (error) {
      next(error);
    }
  }
}


module.exports = new CategoriesController()