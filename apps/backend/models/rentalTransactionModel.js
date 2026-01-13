const mongoose = require("mongoose");

// Sub-schema for individual items in a rental bill
const rentalItemSchema = new mongoose.Schema({
  inventory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RentalInventory",
    required: true,
  },
  itemName: { type: String, required: true },
  sku: { type: String }, // Store SKU for reference
  rentDate: { type: Date, required: true },
  returnDate: { type: Date }, // Expected return date initially
  days: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  pricePerDay: { type: Number, required: true },
  amount: { type: Number, required: true }, // qty * days * pricePerDay
  status: {
    type: String,
    enum: ["Pending", "Returned", "Scrapped"],
    default: "Pending",
  },
  returnedAt: { type: Date }, // Actual return date
});

const rentalTransactionSchema = new mongoose.Schema(
  {
    billNo: { type: String, required: true, unique: true }, // e.g. RNT-2025-001
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },

    // Items List
    items: [rentalItemSchema],

    // Totals
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Top-level Status
    status: {
      type: String,
      enum: ["Pending", "Partially Returned", "Returned", "Overdue", "Closed"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending",
    },
    paymentMode: { type: String, default: "Cash" }, // Cash, UPI, etc.
  },
  { timestamps: true }
);

module.exports = mongoose.model("RentalPurchase", rentalTransactionSchema);
