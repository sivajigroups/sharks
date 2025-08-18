// routes/historyRoute.js (or saleBill.routes.js)
const express = require('express');
const billRouter = express.Router();

const {
  createSaleBill,
  listBills,
  getBillsByCustomer,
} = require('../controllers/billController');

// ✅ Pass function references (no parentheses)
billRouter.post('/bills', createSaleBill);
billRouter.get('/bills', listBills);
billRouter.get("/bills/customer/:customerId", getBillsByCustomer);
module.exports = billRouter;
