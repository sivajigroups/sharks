const express = require("express");
const {
  createRentalPurchase,
  markAsPaid,
  getAllRentals,
  markAsReturned,
} = require("../controllers/rentalPurchaseController");
const { userAuth } = require("../middleware/auth");

const rentalPurchaseRouter = express.Router();

rentalPurchaseRouter.post("/transaction", userAuth, createRentalPurchase);
rentalPurchaseRouter.put("/transaction/:id", userAuth, markAsPaid);
rentalPurchaseRouter.get("/transaction", userAuth, getAllRentals);
rentalPurchaseRouter.patch("/transaction/:id/return", userAuth, markAsReturned);

module.exports = rentalPurchaseRouter;
