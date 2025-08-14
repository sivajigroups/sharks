// models/saleBillModel.js
const mongoose = require("mongoose");

const billItemSchema = new mongoose.Schema({
  // References (for lookups later)
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

  unitPrice: { type: Number, required: true }, // price at time of sale
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true }, // unitPrice * quantity
});

const saleBillSchema = new mongoose.Schema(
  {
    billNo: { type: String, required: true, unique: true }, // e.g. INV-2025-000123
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: { type: [billItemSchema], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 }, // optional
    tax: { type: Number, default: 0 }, // optional
    totalAmount: { type: Number, required: true }, // subtotal - discount + tax
    paymentMode: {
      type: String,
      enum: ["Cash", "Card", "UPI", "EMI", "Others"],
      default: "Cash",
    },
    billingDate: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

const SaleBill = mongoose.model("SaleBill", saleBillSchema);
module.exports = { SaleBill };
