const express = require("express");
const cookieParser = require("cookie-parser");
// ❌ If NGINX is handling CORS, you can optionally comment this out
// const cors = require("cors");
require("dotenv").config();

const dbConnect = require("./config/dbConnect");
const userRouter = require("./routes/userRoute");
const staffRouter = require("./routes/staffRoute");
const saleRouter = require("./routes/saleRoute");
const adminRouter = require("./routes/adminRoute");
const transRouter = require("./routes/transactionRoute");

const app = express();

// ✅ Middleware: Cookie
app.use(cookieParser());

// ❌ REMOVE this (CORS is already handled in NGINX, so no need to set it in Express)
// app.use(cors({ ... })); ← remove all instances of this line

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
