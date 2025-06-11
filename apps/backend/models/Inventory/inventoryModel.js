const mongoose = require("mongoose");

const inventorySchema =new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["sales", "rental", "service"],
      required: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    pricePerDay: {
      type: Number,
      required: function () {
        return this.type === "rental";
      },
    },
    salePrice: {
      type: Number,
      required: function () {
        return this.type === "sales";
      },
    },
    serviceStatus: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      required: function () {
        return this.type === "service";
      },
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    barcode: {
      type: String,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Inventory = mongoose.model("Inventory", inventorySchema);

module.exports = { Inventory };
