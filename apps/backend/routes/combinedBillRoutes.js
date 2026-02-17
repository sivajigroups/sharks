// routes/combinedBillRoutes.js
const express = require("express");
const router = express.Router();
const {
  createCombinedBill,
  getCombinedBills,
  getCombinedBillById,
  getCombinedBillsByCustomer,
  markRentalItemsReturned,
  markCombinedBillAsPaid,
  updateCombinedBill,
} = require("../controllers/combinedBillController");

// ────────────────────────────────────────────────────────────────────
// COMBINED BILL ROUTES
// ────────────────────────────────────────────────────────────────────

// Create new combined bill
router.post("/", createCombinedBill);

// Get all combined bills (with pagination & filters)
router.get("/", getCombinedBills);

// Get single combined bill by ID
router.get("/:id", getCombinedBillById);

// Get combined bills by customer ID
router.get("/customer/:customerId", getCombinedBillsByCustomer);

// Mark rental items as returned
router.post("/:id/return", markRentalItemsReturned);

// Mark combined bill as paid
// Mark combined bill as paid
router.put("/:id", markCombinedBillAsPaid);

// Update combined bill (Rental Items)
router.put("/:id/update", updateCombinedBill);

module.exports = router;
