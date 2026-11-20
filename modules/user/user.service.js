const argon2 = require("argon2");
const token = require("../../utils/generateToken");
const UserModel = require("./user.module");

class AuthService {
  async regis(req, res) {
    const { fName, lName, phone, userName, password, role, companyId } =
      req.body;

    const required = [fName, lName, phone, userName, password, role, companyId];

    if (required.some((v) => typeof v !== "string" || !v.trim())) {
      throw new Error("Barcha maydonlarni to'ldiring");
    }

    const existUser = await UserModel.findOne({ userName });

    if (existUser)
      throw new Error(`User ${existUser.userName} oldin ro'yxatdan o'tgan`);

    const hashPassword = await argon2.hash(password);
    const user = await UserModel.create({
      fName,
      lName,
      phone,
      userName,
      password: hashPassword,
      role,
      companyId,
    });

    return {
      user: {
        fName: user.fName,
        lName: user.lName,
        userName: user.userName,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  async login(userName, password) {
    const user = await UserModel.findOne({ userName });
    if (!user) {
      throw new Error("Login yoki parol xato");
    }

    const isPassword = await argon2.verify(user.password, password);
    if (!isPassword) {
      throw new Error("Login yoki parol xato");
    }
    if (!user.activated) {
      throw new Error("Sizning akkauntingiz bloklangan");
    }

    const tokens = token.generateToken({
      _id: user._id,
      fName: user.fName,
      lName: user.lName,
      userName: user.userName,
      role: user.role,
      activated: user.activated,
      companyId: user.companyId,
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  async checkUser(req, res) {
    const user = await UserModel.findById(req.user._id).populate("companyId");
    if (user._id) {
      return {
        _id: user._id,
        fName: user.fName,
        lName: user.lName,
        role: user.role,
        company: user.companyId.companyName,
      };
    }
  }

  async allUsers(req, res) {
    const users = await UserModel.find({
      companyId: req.user.companyId,
    });

    return users;
  }
}

module.exports = new AuthService();
