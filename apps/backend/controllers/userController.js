const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");
const nodemailer = require("nodemailer");

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

    // ✅ Send email asynchronously after response
    if (role === "staff" || role === "admin") {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });

      const approveLink = `https://api.sivajigroups.com/api/approve/${newUser._id}`;
      const rejectLink = `https://api.sivajigroups.com/api/reject/${newUser._id}`;

      transporter
        .sendMail({
          from: `"Tool Rental App" <${process.env.GMAIL_USER}>`,
          to: process.env.GMAIL_USER,
          subject: `🛠️ New ${role} Signup - Approval Needed`,
          html: `
          <div style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
              <div style="padding: 20px; border-bottom: 1px solid #eee;">
                <h2 style="margin: 0; color: #333;">🔔 New ${roleLabel} Registration</h2>
              </div>
              <div style="padding: 20px;">
                <p style="font-size: 16px; color: #333;">
                 A new ${roleLabel.toLowerCase()} has signed up...
                </p>
                <ul style="list-style: none; padding-left: 0; font-size: 15px;">
                  <li><strong>Name:</strong> ${name}</li>
                  <li><strong>Email:</strong> ${email}</li>
                </ul>
                <p style="margin-top: 20px; font-size: 16px;">Please choose an action:</p>
                <div style="margin-top: 15px;">
                  <a href="${approveLink}" style="text-decoration: none; padding: 10px 20px; background: #28a745; color: #fff; border-radius: 5px; margin-right: 10px;">✅ Approve</a>
                  <a href="${rejectLink}" style="text-decoration: none; padding: 10px 20px; background: #dc3545; color: #fff; border-radius: 5px;">❌ Reject</a>
                </div>
              </div>
              <div style="padding: 15px 20px; background: #f9f9f9; text-align: center; font-size: 13px; color: #999;">
                Tool Rental App • Internal Admin Notification
              </div>
            </div>
          </div>
        `,
        })
        .then(() => {
          console.log("✅ Approval email sent to admin.");
        })
        .catch((err) => {
          console.error("❌ Email send failed:", err.message);
        });
    }
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

    const user = await User.findOne({ phone: phone }).populate("branchId");
    if (!user || !user.approved) {
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
    res.clearCookie("token");
    res.send("Logout Sucessfully");
  } catch (err) {
    res.status(400).send(err.message);
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
