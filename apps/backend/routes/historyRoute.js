// routes/historyRoute.js (or saleBill.routes.js)
const express = require('express');
const billRouter = express.Router();

const {
  createSaleBill,
  getBillById,
  listBills,
} = require('../controllers/billController');

// ✅ Pass function references (no parentheses)
billRouter.post('/bills', createSaleBill);
billRouter.get('/bills', listBills);
billRouter.get('/bills/:id', getBillById);

module.exports = billRouter;
