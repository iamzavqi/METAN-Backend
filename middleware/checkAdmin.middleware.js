const BaseError = require("../errors/base.error");
const tokenService = require("../service/auth/token.service");

module.exports = function (req, res, next) {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return next(BaseError.UnauthorizedError());
    }

    const accessToken = authorization.split(" ")[1];
    if (!accessToken) {
      return next(BaseError.UnauthorizedError());
    }

    const userData = tokenService.validateAccessToken(accessToken);
    if (!userData) {
      return next(BaseError.UnauthorizedError());
    }

    if (userData.role !== "admin") {
      return next(BaseError.UnauthorizedError());
    }

    next();
  } catch (error) {
    return next(BaseError.UnauthorizedError());
  }
};
