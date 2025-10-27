// models/TransferLog.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const TransferLogSchema = new Schema(
  {
    // WHAT moved
    itemName:   { type: String, required: true },
    sku:        { type: String, required: true, uppercase: true, trim: true },
    brand:      String,
    size:       String,
    color:      String,
    price:      Number, // for rental you can store pricePerDay here

    // WHERE from/to
    fromBranch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    toBranch:   { type: Schema.Types.ObjectId, ref: "Branch", default: null }, // optional

    // HOW MANY
    quantity:   { type: Number, required: true, min: 1 },

    // REF (dynamic so it works for SalesInventory and RentalInventory)
    sourceModel: {
      type: String,
      enum: ["SalesInventory", "RentalInventory"],
      default: "SalesInventory",            // keeps old logs valid
      index: true
    },
    sourceItemId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "sourceModel"
    },

    // (Optional) destination doc for cross-model moves
    targetModel: {
      type: String,
      enum: ["SalesInventory", "RentalInventory"],
      default: null
    },
    targetItemId: {
      type: Schema.Types.ObjectId,
      refPath: "targetModel",
      default: null
    },

    // NEW
    type: {
      // BRANCH | THEFT | SCRAP
      type: String,
      enum: ["BRANCH", "THEFT", "SCRAP"],
      default: "BRANCH",
      index: true
    },

    reason:     { type: String, default: "" }, // required for THEFT/SCRAP (validated below)

    createdBy:  { type: Schema.Types.ObjectId, ref: "User" },
    status:     { type: String, enum: ["COMPLETED","CANCELLED"], default: "COMPLETED" },
  },
  { timestamps: true }
);

// Conditional validation: reason is required for THEFT/SCRAP
TransferLogSchema.pre("validate", function(next) {
  if ((this.type === "THEFT" || this.type === "SCRAP") && !this.reason?.trim()) {
    return next(new Error("Reason is required for THEFT/SCRAP transfers"));
  }
  next();
});

TransferLogSchema.index({ createdAt: -1 });
TransferLogSchema.index({ sku: 1, createdAt: -1 }); // handy for audits

module.exports = mongoose.model("TransferLog", TransferLogSchema);
