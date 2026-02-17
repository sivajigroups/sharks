const mongoose = require("mongoose");
const { globalAuditPlugin } = require("../utils/globalAuditPlugin");

// ────────────────────────────────────────────────────────────────────
// SALE ITEM SCHEMA (for items being purchased)
// ────────────────────────────────────────────────────────────────────
const saleItemSchema = new mongoose.Schema({
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SalesInventory",
    required: true,
  },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },

  productName: { type: String, required: true },
  sku: { type: String, required: true },
  brand: { type: String },
  size: { type: String },
  color: { type: String },

  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true },
});

// ────────────────────────────────────────────────────────────────────
// RENTAL ITEM SCHEMA (for items being rented)
// ────────────────────────────────────────────────────────────────────
const rentalItemSchema = new mongoose.Schema({
  inventory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RentalInventory",
    required: true,
  },
  itemName: { type: String, required: true },
  sku: { type: String },
  rentDate: { type: Date, required: true },
  returnDate: { type: Date }, // Expected return date
  days: { type: Number, required: true },
  originalDays: { type: Number }, // To track initial agreement if changed later
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

// ────────────────────────────────────────────────────────────────────
// COMBINED BILL SCHEMA (supports both sale and rental items)
// ────────────────────────────────────────────────────────────────────
const combinedBillSchema = new mongoose.Schema(
  {
    billNo: { type: String, required: true, unique: true },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false, // Optional if only sale items (walk-in)
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },

    // ── Item Arrays (can have both, or just one type)
    saleItems: { type: [saleItemSchema], default: [] },
    rentalItems: { type: [rentalItemSchema], default: [] },

    // ── Totals
    saleSubtotal: { type: Number, default: 0 },
    rentalSubtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 }, // For rental items
    totalAmount: { type: Number, required: true },

    // ── Payment Info
    paymentMode: {
      type: String,
      enum: ["Cash", "Card", "UPI", "EMI", "Others"],
      default: "Cash",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Paid",
    },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },

    // ── Bill Status (for rental tracking)
    status: {
      type: String,
      enum: ["Active", "Partially Returned", "Closed"],
      default: "Active",
    },

    billingDate: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true },
);

// ── Attach Audit Plugin
combinedBillSchema.plugin(globalAuditPlugin);

const CombinedBill = mongoose.model("CombinedBill", combinedBillSchema);
module.exports = { CombinedBill };
