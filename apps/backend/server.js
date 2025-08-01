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
const allowedOrigins = [
  "https://sharks.sivajigroups.com",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin); // return the origin instead of 'true'
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);


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
