const mongoose = require("mongoose");

const rentalTransactionSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    inventory: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true },
    itemName: { type: String, required: true },
    rentDate: { type: Date, required: true },
    returnDate: { type: Date },
    days: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    amount: { type: Number, required: true },
    deposit: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Pending", "Returned", "Paid"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RentalPurchase", rentalTransactionSchema);
