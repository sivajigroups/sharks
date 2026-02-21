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
  markCombinedBillAsUnpaid,
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
router.put("/:id", markCombinedBillAsPaid);

// Mark combined bill as unpaid (revert)
router.put("/:id/unpay", markCombinedBillAsUnpaid);

// Update combined bill (Rental Items)
router.put("/:id/update", updateCombinedBill);

module.exports = router;
