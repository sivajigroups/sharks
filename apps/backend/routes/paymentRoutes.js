const express = require("express");
const { collectCustomerPayment } = require("../controllers/paymentController");
const { userAuth } = require("../middleware/auth");

const paymentRouter = express.Router();

paymentRouter.post("/payment/collect", userAuth, collectCustomerPayment);

module.exports = paymentRouter;
