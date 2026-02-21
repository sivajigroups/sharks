const express = require("express");
const {
  createRentalPurchase,
  markAsPaid,
  markAsUnpaid,
  getAllRentals,
  markAsReturned,
  getRentalInventory,
  getSingleRental,
  updateRentalBill,
} = require("../controllers/rentalPurchaseController");
const { userAuth } = require("../middleware/auth");

const rentalPurchaseRouter = express.Router();

rentalPurchaseRouter.post("/transaction", userAuth, createRentalPurchase);
rentalPurchaseRouter.get("/transaction/:id", userAuth, getSingleRental); // ✅ New Route
rentalPurchaseRouter.put("/transaction/:id", userAuth, markAsPaid);
rentalPurchaseRouter.put("/transaction/:id/unpay", userAuth, markAsUnpaid);
rentalPurchaseRouter.put("/transaction/:id/update", userAuth, updateRentalBill);
rentalPurchaseRouter.get("/transaction", userAuth, getAllRentals);
rentalPurchaseRouter.patch("/transaction/:id/return", userAuth, markAsReturned);
rentalPurchaseRouter.get("/rental-inventory", userAuth, getRentalInventory);

module.exports = rentalPurchaseRouter;
