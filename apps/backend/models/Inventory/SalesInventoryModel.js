// models/SalesInventory.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const variantSchema = new Schema({
  sku: { type: String, required: true }, // <-- remove unique:true (we'll enforce per-branch)
  brand: { type: String },
  size: { type: String },
  color: { type: String, default: null },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
});

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

/**
 * Enforce uniqueness of SKU **within a branch**.
 * This is a multikey compound unique index over an array field.
 */
salesInventorySchema.index(
  { branch: 1, "variants.sku": 1 },
  { unique: true, name: "uniq_variant_sku_per_branch" }
);

const SalesInventory = mongoose.model("SalesInventory", salesInventorySchema);
module.exports = { SalesInventory };
