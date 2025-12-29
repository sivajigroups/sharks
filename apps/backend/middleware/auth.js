const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");
const { setCurrentUser } = require("../utils/auditContext");

const userAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token) {
      return res.status(401).json({ message: "Authentication token missing" });
    }

    // ⭐ HARDCODED SECRET (must match getJWT signing key)
    const SECRET_KEY =
      "7f8a9b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9";

    // must match getJWT()
    const decoded = jwt.verify(token, SECRET_KEY);
    const { userId } = decoded;

    // Populate branchIds (correct field)
    const user = await User.findById(userId).populate("branchIds");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;

    setCurrentUser(
      {
        _id: user._id,
        name: user.name,
        // For audit, if multi-branch, we can't easily pin single branch unless passed in request.
        // For now, let's store branches array or null.
        branches: user.branchIds?.map((b) => b._id),
        // fallback for legacy audit
        branch: user.branchIds?.[0]?._id || null,
      },
      req
    );

    next();
  } catch (err) {
    console.error("Auth Error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { userAuth };
