const mongoose = require("mongoose");

const RentalInventorySchema = new mongoose.Schema({
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
  pricePerDay: {
    type: Number,
    required: function () {
      return this.type === "rental";
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
},{timestamps: true});

const RentalInventory = mongoose.model("RentalInventory", RentalInventorySchema);   

module.exports = { RentalInventory };