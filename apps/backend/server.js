const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const dbConnect = require("./config/dbConnect");
const userRouter = require("./routes/userRoute");
const staffRouter = require("./routes/staffRoute");
const saleRouter = require("./routes/saleRoute");
const adminRouter = require("./routes/adminRoute");
const transRouter = require("./routes/transactionRoute");

const app = express();

// ✅ Middleware: Cookie + CORS
app.use(cookieParser());

app.use(cors({
  origin: "https://sharks.sivajigroups.com", // or use process.env.CORS_ORIGIN
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ✅ Optional: custom CORS fallback to ensure preflight doesn't fail
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://sharks.sivajigroups.com");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// ✅ JSON parsing
app.use(express.json());

// ✅ Routes
app.use("/api", userRouter);
app.use("/api", staffRouter);
app.use("/api", saleRouter);
app.use("/api", adminRouter);
app.use("/api", transRouter);

// ✅ DB connect and start server
dbConnect()
  .then(() => {
    console.log("✅ DB is successfully connected");
    app.listen(4000, () => {
      console.log("🚀 Server is running on port 4000");
    });
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err.message);
  });
