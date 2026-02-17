const mongoose = require("mongoose");
const { globalAuditPlugin } = require("../utils/globalAuditPlugin"); // ← ADD THIS

const billItemSchema = new mongoose.Schema({
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

const saleBillSchema = new mongoose.Schema(
  {
    billNo: { type: String, required: true, unique: true },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false, // Changed from true to allow Walk-in customers
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true, // ⭐ IMPORTANT for audit
    },

    items: { type: [billItemSchema], required: true },

    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

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

    billingDate: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true },
);

// ⭐ Attach Audit Plugin
saleBillSchema.plugin(globalAuditPlugin);
console.log("🧩 Audit plugin attached → SaleBill model");

const SaleBill = mongoose.model("SaleBill", saleBillSchema);
module.exports = { SaleBill };
