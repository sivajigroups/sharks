// models/RentalInventory.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

// ── Variant Schema
const variantSchema = new Schema({
  sku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,       // normalize so ABC-1 and abc-1 are identical
  },
  brand: { type: String, trim: true },
  size:  { type: String, trim: true },
  color: { type: String, default: null, trim: true },
  pricePerDay: { type: Number, required: true },
  stock: { type: Number, required: true, min: 0 },
});

// ── Rental Inventory Schema
const rentalInventorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
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

// ── Enforce uniqueness of SKU per branch (ignore null/non-string)
rentalInventorySchema.index(
  { branch: 1, "variants.sku": 1 },
  {
    unique: true,
    name: "uniq_rental_variant_sku_per_branch",
    partialFilterExpression: { "variants.sku": { $type: "string" } },
  }
);

const RentalInventory = mongoose.model("RentalInventory", rentalInventorySchema);
module.exports = { RentalInventory };
