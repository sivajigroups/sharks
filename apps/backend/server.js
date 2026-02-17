const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

require("./models/auditModel");

const { startRequestContext } = require("./utils/auditContext");

const dbConnect = require("./config/dbConnect");
const userRouter = require("./routes/userRoute");
const staffRouter = require("./routes/staffRoute");
const saleRouter = require("./routes/saleRoute");
const adminRouter = require("./routes/adminRoute");
const billRouter = require("./routes/historyRoute");
const transferRouter = require("./routes/transfer");
const rentalPurchaseRouter = require("./routes/rentalPurchaseRoutes");
const combinedBillRouter = require("./routes/combinedBillRoutes");
const paymentRouter = require("./routes/paymentRoutes");
const { userAuth } = require("./middleware/auth");

const app = express();

app.use(cookieParser());
app.use(express.json());

app.use(startRequestContext);
// ✅ Setup CORS FIRST — this must come before anything else that reads the request
// const allowedOrigins = [
//   "https://sharks.sivajigroups.com",
//   "http://localhost:5173",
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, origin);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   }),
// );

app.use("/api", userRouter);
app.use("/api", staffRouter);
app.use("/api", saleRouter);
app.use("/api", adminRouter);
app.use("/api", rentalPurchaseRouter);
app.use("/api/combined-bills", combinedBillRouter);
app.use("/api", billRouter);
app.use("/api", transferRouter);
app.use("/api", paymentRouter);

dbConnect()
  .then(() => {
    console.log("DB is Sucessfully connected");
    app.listen(4000, () => {
      console.log("server is running in 4000");
    });
  })
  .catch(() => {
    console.log("Not Connected to Db");
  });
