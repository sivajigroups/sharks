const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");

const signupUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required." });
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
    });

    await data.save();
    res.json({
      message: "Created Sucessfully",
      data: data,
    });
  } catch (err) {
    res.status(400).send(err.message);
  }
};
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    if (!user) {
      throw new Error("user is not in the data");
    }
    const passwordValid = await user.validatePassword(password);

    if (passwordValid) {
      const token = await user.getJWT();
      res.cookie("token", token);
      //console.log(token);
      res.json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      throw new Error("login Failed");
    }
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
