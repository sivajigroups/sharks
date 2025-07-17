const mongoose = require("mongoose");

const salesInventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
  },
  { timestamps: true }
);

const SalesInventory = mongoose.model("SalesInventory", salesInventorySchema);

module.exports = { SalesInventory };
