const mongoose = require("mongoose");
const { Schema } = mongoose;
const { globalAuditPlugin } = require("../../utils/globalAuditPlugin"); // ✅ import plugin

// ───────────────────────────────
// Variant Subschema
// ───────────────────────────────
const variantSchema = new Schema({
  sku: { type: String, required: true },
  brand: { type: String },
  size: { type: String },
  color: { type: String, default: null },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
});

// ───────────────────────────────
// Sales Inventory Schema
// ───────────────────────────────
const salesInventorySchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String },
    description: { type: String },
    branch: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    variants: [variantSchema],
  },
  { timestamps: true }
);

// ───────────────────────────────
// Enforce unique SKU per branch
// ───────────────────────────────
salesInventorySchema.index(
  { branch: 1, "variants.sku": 1 },
  { unique: true, name: "uniq_variant_sku_per_branch" }
);

// ───────────────────────────────
// ✅ Attach global audit plugin
// ───────────────────────────────
salesInventorySchema.plugin(globalAuditPlugin);
console.log("🧩 Audit plugin attached → SalesInventory model");

// ───────────────────────────────
// Export Model
// ───────────────────────────────
const SalesInventory = mongoose.model("SalesInventory", salesInventorySchema);
module.exports = { SalesInventory };
