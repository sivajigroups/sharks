// routes/historyRoute.js (or saleBill.routes.js)
const express = require('express');
const billRouter = express.Router();

const {
  createSaleBill,
  listBills,
  getBillsByCustomer,
} = require('../controllers/billController');
const { userAuth } = require('../middleware/auth');

// ✅ Pass function references (no parentheses)
billRouter.post('/bills', userAuth,createSaleBill);
billRouter.get('/bills', listBills);
billRouter.get("/bills/customer/:customerId", getBillsByCustomer);
module.exports = billRouter;
