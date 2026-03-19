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
  sku: { type: String }, // Store SKU for reference
  rentDate: { type: Date, required: true },
  returnDate: { type: Date }, // Expected return date initially
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
// UNIFIED BILL SCHEMA 
// ────────────────────────────────────────────────────────────────────
const billSchema = new mongoose.Schema(
  {
    billNo: { type: String, required: true, unique: true },

    type: {
      type: String,
      enum: ["Sale", "Rental", "Combined"],
      required: true,
      default: "Sale",
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false, // Optional for pure sales walk-ins
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },

    // ── Item Arrays (Flexible: can contain either or both depending on bill type)
    saleItems: { type: [saleItemSchema], default: [] },
    rentalItems: { type: [rentalItemSchema], default: [] },

    // ── Totals
    saleSubtotal: { type: Number, default: 0 },
    rentalSubtotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 }, 
    tax: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 }, // Specific to rentals
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // ── Top-level Status
    status: {
      type: String,
      enum: ["Pending", "Active", "Partially Returned", "Returned", "Overdue", "Closed"],
      default: "Closed", // Closed by default for sales; Rentals might start as Pending/Active
    },

    // ── Payment Info
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending",
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Card", "UPI", "EMI", "Others"],
      default: "Cash",
    },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },

    billingDate: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true },
);

// ── Attach Audit Plugin
billSchema.plugin(globalAuditPlugin);

const Bill = mongoose.model("Bill", billSchema);
module.exports = { Bill, billSchema };
