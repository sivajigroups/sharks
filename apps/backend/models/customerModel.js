const mongoose = require("mongoose");
const { globalAuditPlugin } = require("../utils/globalAuditPlugin"); // ← ADD THIS

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    alternatePhone: { type: String },
    address: {
      street: String,
      area: String,
      city: String,
      pincode: String,
    },
    idProofType: {
      type: String,
      enum: ["Aadhaar", "PAN", "Voter ID", "Driving License"],
    },
    idProofNumber: String,
    lastVisitDate: { type: Date, default: Date.now },
    membershipPoints: { type: Number, default: 0 },
    followUp: {
      nextDate: Date,
      purpose: String,
      reasonInactive: String,
      remarks: String,
    },
  },
  { timestamps: true }
);

// ✅ Attach global audit plugin
customerSchema.plugin(globalAuditPlugin);
console.log("🧩 Audit plugin attached → Customer model");

const Customer = mongoose.model("Customer", customerSchema);
module.exports = { Customer };
