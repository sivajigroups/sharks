const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema({
  collectionName: {
    type: String,
    required: true,
  },

  action: {
    type: String,
    enum: ["create", "update", "delete", "login", "logout"],
    required: true,              // 👈 REQUIRED
  },

  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    default: null,
  },

  before: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  after: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  method: { type: String, default: null },
  route: { type: String, default: null },
  ip: { type: String, default: null },

  timestamp: {
    type: Date,
    default: Date.now,
  },
});
const Audit = mongoose.model("Audit", auditSchema);
module.exports = Audit;       // 👈 EXPORT MODEL DIRECTLY

