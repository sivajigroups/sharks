const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");
const { setCurrentUser } = require("../utils/auditContext");

const userAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token) {
      return res.status(401).json({ message: "Authentication token missing" });
    }

    // must match getJWT()
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userId } = decoded;

    // Populate branchId (correct field)
    const user = await User.findById(userId).populate("branchId");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;

    // FIX: use branchId instead of branch
   setCurrentUser(
  {
    _id: user._id,
    name: user.name,
    branch: user.branchId ? user.branchId._id : null,
  },
  req   // pass request object too
);


    next();
  } catch (err) {
    console.error("Auth Error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { userAuth };
