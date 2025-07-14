const mongoose = require("mongoose");
require("dotenv").config();

const dbConnect = async () => {
  try {
    console.log(process.env.MONGO_URI);
    await mongoose.connect('mongodb://onstepadmin:%40Agent000000@3.111.58.3:27017/onstepdb');
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
  }
};

module.exports = dbConnect;
