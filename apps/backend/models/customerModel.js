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
    alternatePhone: {
      type: String,
    },
    address: {
      street: { type: String, required: true },
      area: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    idProofType: {
      type: String,
      enum: ["Aadhaar", "PAN", "Voter ID", "Driving License"],
      required: true,
    },
    idProofNumber: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);

module.exports = {
  Customer,
};
