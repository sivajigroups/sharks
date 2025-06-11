const express=require("express");
const { insertSale } = require("../controllers/saleController");
const {userAuth}=require("../middleware/auth");
const saleRouter=express.Router();

saleRouter.post("/sales",userAuth,insertSale);

module.exports=saleRouter;