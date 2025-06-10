const jwt = require("jsonwebtoken");
const {User} = require("../models/userModel");

const userAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({ message: "Authentication token missing" });
    }

    const decoded = jwt.verify(token, "MYsec"); // Consider using env variable
    const { userId } = decoded;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = {
  userAuth,
};
