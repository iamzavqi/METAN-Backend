const BaseError = require("../errors/base.error");

// Ishlatish: router.post("/", authMiddleware, checkRole("moliyachi", "kassir"), controller)
module.exports = function checkRole(...roles) {
  return function (req, res, next) {
    // authMiddleware'dan keyin ishlaydi: req.user u yerda to'ldiriladi
    if (!req.user) {
      return next(BaseError.UnauthorizedError());
    }

    if (!roles.includes(req.user.role)) {
      return next(BaseError.Forbidden("Bu amal uchun ruxsatingiz yo'q"));
    }

    next();
  };
};