// routes/historyRoute.js (or saleBill.routes.js)
const express = require("express");
const billRouter = express.Router();

const {
  createSaleBill,
  listBills,
  getBillsByCustomer,
  getBillById,
  generateBillPdf,
} = require("../controllers/billController");
const { userAuth } = require("../middleware/auth");

// ✅ Pass function references (no parentheses)
billRouter.post("/bills", userAuth, createSaleBill);
billRouter.get("/bills", listBills);
billRouter.get("/bills/customer/:customerId", getBillsByCustomer);
billRouter.get("/bills/:billId", getBillById);
billRouter.get("/bills/:billId/pdf", generateBillPdf);
module.exports = billRouter;
