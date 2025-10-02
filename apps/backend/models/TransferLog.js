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
    price:      Number,

    // WHERE from/to
    fromBranch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    toBranch:   { type: Schema.Types.ObjectId, ref: "Branch", default: null }, // ⬅️ optional now

    // HOW MANY
    quantity:   { type: Number, required: true, min: 1 },

    // REF
    sourceItemId: { type: Schema.Types.ObjectId, ref: "SalesInventory", required: true },

    // NEW
    type: { // ⬅️ BRANCH (normal) | THEFT | SCRAP
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

module.exports = mongoose.model("TransferLog", TransferLogSchema);
