const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dbConnect = require("./config/dbConnect");
const userRouter = require("./routes/userRoute");
const staffRouter = require("./routes/staffRoute");
const saleRouter = require("./routes/saleRoute");
const adminRouter = require("./routes/adminRoute");
const app = express();
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use("/api",userRouter);
app.use("/api",staffRouter);
app.use("/api",saleRouter);
app.use("/api",adminRouter);
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
