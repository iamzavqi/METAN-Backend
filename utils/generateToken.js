const jwt = require("jsonwebtoken");
const env = require("../config/env")


class TokenService {
  generateToken(payload) {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: "5h",
    });
    return { accessToken };
  }

  validateAccessToken(token) {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

module.exports = new TokenService();
