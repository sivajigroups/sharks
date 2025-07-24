const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  brand: { type: String, required: false }, // Optional
  size: { type: String, required: false }, // Optional
  color: { type: String, default: null },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
});

const salesInventorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String },
    description: { type: String },
    variants: [variantSchema],
  },
  { timestamps: true }
);

const SalesInventory = mongoose.model("SalesInventory", salesInventorySchema);

module.exports = { SalesInventory };
