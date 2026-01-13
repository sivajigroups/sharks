const express = require("express");
const {
  createRentalPurchase,
  markAsPaid,
  getAllRentals,
  markAsReturned,
  getRentalInventory,
  getSingleRental, // ✅ Import
} = require("../controllers/rentalPurchaseController");
const { userAuth } = require("../middleware/auth");

const rentalPurchaseRouter = express.Router();

rentalPurchaseRouter.post("/transaction", userAuth, createRentalPurchase);
rentalPurchaseRouter.get("/transaction/:id", userAuth, getSingleRental); // ✅ New Route
rentalPurchaseRouter.put("/transaction/:id", userAuth, markAsPaid);
rentalPurchaseRouter.get("/transaction", userAuth, getAllRentals);
rentalPurchaseRouter.patch("/transaction/:id/return", userAuth, markAsReturned);
rentalPurchaseRouter.get("/rental-inventory", userAuth, getRentalInventory);

module.exports = rentalPurchaseRouter;
