const express=require("express");
const { rentalsTransaction } = require("../controllers/transactionController");
const {userAuth}=require("../middleware/auth")
const transRouter=express.Router();

transRouter.post("/transaction",userAuth,rentalsTransaction);

module.exports=transRouter;