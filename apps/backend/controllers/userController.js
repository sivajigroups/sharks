const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");

const signupUser = async (req, res) => {
  try {
    const { name, email, role, password, branchId } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (role === "staff" && !branchId) {
      return res
        .status(400)
        .json({ message: "Branch ID is required for staff." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const data = new User({
      name,
      email,
      password: hashPassword,
      role,
      branchId:role==="staff"?branchId:null,
    });

    await data.save();
    res.json({
      message: "User Created Sucessfully",
      data: data,
    });
   // console.log("Request body:", req.body);

  } catch (err) {
    res.status(400).send(err.message);
  }
};
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email }).populate("branchId");
    if (!user) {
      throw new Error("User not found");
    }

    const passwordValid = await user.validatePassword(password);

    if (!passwordValid) {
      throw new Error("Invalid credentials");
    }

    const token = await user.getJWT();
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.role === "staff" ? user.branchId : null,
      },
    });

  } catch (err) {
    res.status(400).send(err.message);
  }
};

const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token");
    res.send("Logout Sucessfully");
  } catch (err) {
    res.status(400).send(err.message);
  }
};
module.exports = {
  signupUser,
  loginUser,
  logoutUser,
};
