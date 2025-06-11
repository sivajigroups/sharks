const mongoose = require("mongoose");
const branchSchema =new mongoose.Schema(
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

const Branch = mongoose.model("Branch", branchSchema);

module.exports = {
  Branch,
};


//rental Model
//Attendance Model
//status for check in and checkout