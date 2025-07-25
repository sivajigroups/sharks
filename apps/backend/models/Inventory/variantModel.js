const mongoose = require("mongoose");

const AttributeSchema = new mongoose.Schema({
  brand: {
    type: [String],
    default: [],
  },
  size: {
    type: [String],
    default: [],
  },
  color: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
  versionKey: false,
});

// Optional: lock to a single document by setting fixed _id like "master"
const Attribute = mongoose.model("Attribute", AttributeSchema);

module.exports = Attribute;
