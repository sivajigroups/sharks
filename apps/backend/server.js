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
app.use(cookieParser());
// const allowedOrigins = [
//   "http://localhost:5173",
//   "https://sharks.sivajigroups.com",
// ];

// app.use((req, res, next) => {
//   const origin = req.headers.origin;

//   // Detect Nginx-set CORS header (res.getHeaders() contains all response headers)
//   const headers = res.getHeaders();
//   const alreadySet = Object.keys(headers).some(
//     (key) => key.toLowerCase() === "access-control-allow-origin"
//   );

//   // Only set CORS headers if not already set
//   if (!alreadySet && origin && allowedOrigins.includes(origin)) {
//     res.setHeader("Access-Control-Allow-Origin", origin);
//     res.setHeader("Access-Control-Allow-Credentials", "true");
//     res.setHeader(
//       "Access-Control-Allow-Headers",
//       "Origin, Content-Type, Accept, Authorization"
//     );
//     res.setHeader(
//       "Access-Control-Allow-Methods",
//       "GET, POST, OPTIONS, PUT, DELETE, PATCH"
//     );
//   }

//   // Preflight
//   if (req.method === "OPTIONS") {
//     return res.sendStatus(204);
//   }

//   next();
// });

app.use(express.json());
app.use("/api", userRouter);
app.use("/api", staffRouter);
app.use("/api", saleRouter);
app.use("/api", adminRouter);
app.use("/api", transRouter);
//mongoose
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
