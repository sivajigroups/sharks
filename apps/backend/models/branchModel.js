const mongoose = require("mongoose");
const { globalAuditPlugin } = require("../utils/globalAuditPlugin");  // ← IMPORTANT

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true },
  },
  { timestamps: true }
);

// ✅ Attach global audit plugin
branchSchema.plugin(globalAuditPlugin);
console.log("🧩 Audit plugin attached → Branch model");

const Branch = mongoose.model("Branch", branchSchema);

module.exports = { Branch };
