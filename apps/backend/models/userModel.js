const mongoose = require("mongoose");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "staff"],
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: function () {
        return this.role === "staff";
      },
    },
    approved: {
      type: Boolean,
      default: false,
      required: true,
    },
    staffid:
    {
      type:String,
      required: function () {
        return this.role === "staff";
      },
    },
  },
  { timestamps: true }
);
userSchema.methods.getJWT = async function (expiresIn = "7d") {
  const user = this;
  const payload = { userId: user.id, email: user.email };
  const secretKey = process.env.JWT_SECRET;
  const token = jwt.sign(payload, secretKey, { expiresIn });

  return token;
};
userSchema.methods.validatePassword = async function (passwordby) {
  const user = this;
  const hashPass = user.password;
  const passwordValid = await bcrypt.compare(passwordby, hashPass);

  return passwordValid;
};
const User = mongoose.model("User", userSchema);

module.exports = {
  User,
};
