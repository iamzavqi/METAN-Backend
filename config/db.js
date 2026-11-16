const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB ulandi");
  } catch (error) {
    console.error("MongoDB ulanishda xatolik:", error);
  }
};

module.exports = connectDB;
