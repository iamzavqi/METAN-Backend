const userService = require("./user.service")

class UserController {
  async regis(req, res, next) {
    try {
      const data = await userService.regis(req, res);
      return res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { userName, password } = req.body;
      const data = await userService.login(userName, password);
      return res.json({ ...data });
    } catch (error) {
      next(error);
    }
  }

  // check
  async checkUser(req, res, next) {
    try {
      const user = await userService.checkUser(req, res);
      return res.json(user);
    } catch (error) {
      next(error);
    }
  }
  
  async allUsers(req, res, next) {
    try {
      const user = await userService.allUsers(req, res);
      return res.json(user);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
