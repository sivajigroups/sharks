const mongoose = require("mongoose");
// const { globalAuditPlugin } = require("../utils/globalAuditPlugin"); // ✅ add this line

const MONGO_URI = `mongodb://onstepadmin:%40Agent000000@3.111.58.3:27017/onstepdb?authSource=admin`;

const dbConnect = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("MongoDB connection URI is not defined.");
    }

    // // ✅ Enable audit plugin globally (before connecting)
    // mongoose.plugin(globalAuditPlugin);

    // Optional: helpful settings
    mongoose.set("strictQuery", true);
    mongoose.set("debug", true);

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = dbConnect;
