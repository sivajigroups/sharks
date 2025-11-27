const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");

const Audit = require("../models/auditModel"); // <-- ADD THIS

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

    const newUser = new User({
      name,
      email,
      password: hashPassword,
      role,
      branchId: role === "staff" ? branchId : null,
      approved: role === "staff" || role === "admin" ? false : true,
    });

    await newUser.save();

    // ✅ Send response immediately
    res.json({
      message: "User created. Awaiting approval if staff.",
      data: newUser,
    });

    // Email notification removed as per requirement
  } catch (err) {
    res.status(400).send(err.message);
  }
};

const signupUserByAdmin = async (req, res) => {
  try {
    const { name, email, role, password, phone } = req.body;

    if (!name || !email || !password || !role || !phone) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (role === "staff") {
      return res
        .status(400)
        .json({ message: "Branch ID is required for staff." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashPassword,
      role,
      approved: true,
      phone,
    });

    await newUser.save();

    res.json({
      message: "User created successfully.",
      data: newUser,
    });
  } catch (err) {
    res.status(400).send(err.message);
  }
};
const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, role, password, branchId, phone, staffid } = req.body;

    if ((!name || !email || !password || !role, !phone, !staffid)) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (role === "staff" && !branchId) {
      return res
        .status(400)
        .json({ message: "Branch ID is required for staff." });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({ message: "phone already registered." });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashPassword,
      role,
      branchId: role === "staff" ? branchId : null,
      approved: true,
      phone,
      staffid,
    });

    await newUser.save();

    res.json({
      message: "User created successfully.",
      data: newUser,
    });
  } catch (err) {
    res.status(400).send(err.message);
  }
};


const deleteStaffByAdmin = async (req, res) => {
  try {
    const staffId = req.params.id;
    const deletedStaff = await User.findByIdAndDelete(staffId);
    if (!deletedStaff) {
      return res.status(404).json({ message: "Staff not found" });
    }
    res.json({ message: "Staff deleted successfully", data: deletedStaff });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getStaffById = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id).populate("branchId");
    if (!staff || staff.role !== "staff") {
      return res.status(404).json({ message: "Staff not found" });
    }
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // console.log("Login request body:", req.body);
    const user = await User.findOne({ phone: phone }).populate("branchId");
    if (!user || !user.approved) {
      throw new Error("User not found");
    }

    const passwordValid = await user.validatePassword(password);

    if (!passwordValid) {
      throw new Error("Invalid credentials");
    }

    // ⭐ PRODUCTION MODE — TOKEN EXPIRES AT MIDNIGHT
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const expiresInSeconds = Math.floor((midnight.getTime() - now.getTime()) / 1000);
    
    const timeUntilExpiry = expiresInSeconds * 1000; // convert to ms

    const token = await user.getJWT(expiresInSeconds);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      maxAge: timeUntilExpiry,
    });

    // 🔥 AUDIT LOGIN
    await Audit.create({
      collectionName: "User",
      action: "login",
      modifiedBy: user._id,
      branch: user.role === "staff" ? user.branchId : null,
      before: null,
      after: {
        userId: user._id,
        name: user.name,
        role: user.role,
      },
      method: req.method,
      route: req.originalUrl,
      ip: req.ip,
      timestamp: new Date(),
    });

    res.json({
      message: "Login successful",
      token,
       expiresIn: expiresInSeconds,   // ⭐ Add this
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
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
    // Read token before clearing
    const token = req.cookies?.token;

    
    let userInfo = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, "7f8a9b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9");
        userInfo = await User.findById(decoded.userId).populate("branchId");
        // console.log("Logout user info:", userInfo);
      } catch (err) {
        // token invalid or expired → skip user
        // console.error("Error decoding token during logout:", err.message);
      }
    }

    // 👉 AUDIT (only if user exists)
    if (userInfo) {
      await Audit.create({
        collectionName: "User",
        action: "logout",
        modifiedBy: userInfo._id,
        branch: userInfo.role === "staff" ? userInfo.branchId : null,
        before: null,
        after: {
          userId: userInfo._id,
          name: userInfo.name,
          role: userInfo.role,
        },
        method: req.method,
        route: req.originalUrl,
        ip: req.ip,
      });
    }
    // console.log("Audit log created for logout.");

    // Clear token AFTER audit
    res.clearCookie("token");

    res.json({ message: "Logout successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


const approveUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { approved: true });
    res.send("✅ User approved successfully.");
  } catch (err) {
    res.status(400).send(err.message);
  }
};

const rejectUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.send("❌ User rejected and deleted.");
  } catch (err) {
    res.status(400).send(err.message);
  }
};

module.exports = {
  signupUser,
  signupUserByAdmin,
  loginUser,
  logoutUser,
  approveUser,
  rejectUser,
  createUserByAdmin,
  deleteStaffByAdmin,
};
