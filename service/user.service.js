const argon2 = require("argon2");
const token = require("../utils/generateToken");
const UserSchema = require("../schema/user.schema");

class AuthService {
  async regis(req, res) {
    const { fName, lName, phone, userName, password, role, companyID } =
      req.body;
    if (
      !fName ||
      !lName ||
      !phone ||
      !userName ||
      !password ||
      !role ||
      !companyID
    ) {
      throw new Error("Barcha maydonlarni to'ldiring");
    }

    

    const existUser = await UserSchema.findOne({ userName });

    if (existUser)
      throw new Error(`User ${existUser.userName} oldin ro'yxatdan o'tgan`);

    const hashPassword = await argon2.hash(password);
    const user = await UserSchema.create({
      fName,
      lName,
      phone,
      userName,
      password: hashPassword,
      role,
      companyID,
    });

    return {
      user: {
        fName: user.fName,
        lName: user.lName,
        userName: user.userName,
        role: user.role,
        companyID: user.companyID,
      },
    };
  }

  async login(userName, password) {
    const user = await UserSchema.findOne({ userName });
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
      companyID: user.companyID,
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  async checkUser(req, res) {
    const user = await UserSchema.findById(req.user._id).populate("companyID");
    if (user._id) {
      return {
        _id: user._id,
        fName: user.fName,
        lName: user.lName,
        role: user.role,
        company: user.companyID.companyName,
      };
    }
  }

  async allUsers(req, res) {
    const users = await UserSchema.find({
      companyID: req.user.companyID,
    });

    return users;
  }
}

module.exports = new AuthService();
