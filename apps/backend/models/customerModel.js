const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    idProofType: {
      type: String,
      enum: ["Aadhaar", "Driving License"],
    },
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);

module.exports = {
  Customer,
};
