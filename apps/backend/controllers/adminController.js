const { Branch } = require("../models/branchModel");
const { User } = require("../models/userModel");
const Audit = require("../models/auditModel");
const Purchase = require("../models/purchaseModel");

const addingBranch = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "admin") {
      return res.status(401).json({
        message: "You are not authorized to add branch",
      });
    }

    const { name, location, contactNumber } = req.body;

    if (!name || !location) {
      return res.status(400).json({
        message: "Please provide all the details",
      });
    }

    const branchDetails = new Branch({
      name,
      location,
      contactNumber,
    });

    await branchDetails.save();
    res.json({
      message: "Branch Added Successfully",
    });
  } catch (err) {
    console.error("Error in adding branch:", err); // Debug log
    res.status(400).json({
      message: "Error in adding Branch",
      error: err.message,
    });
  }
};

const getAllBranches = async (req, res) => {
  try {
    const user = req.user;

    // if (user.role !== "admin") {
    //   return res.status(401).json({
    //     message: "You are not authorized to add branch",
    //   });
    // }
    const branches = await Branch.find();
    res.json(branches);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching branches", error: err.message });
  }
};
const getBranchById = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "admin") {
      return res.status(401).json({
        message: "You are not authorized to add branch",
      });
    }
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    res.json(branch);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching branch", error: err.message });
  }
};
const deleteBranch = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "admin") {
      return res.status(401).json({
        message: "You are not authorized to add branch",
      });
    }
    await Branch.findByIdAndDelete(req.params.id);
    res.json({ message: "Branch deleted successfully" });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error deleting branch", error: err.message });
  }
};
const updateBranch = async (req, res) => {
  try {
    const user = req.user;

    // if (!user || user.role !== "admin") {
    //   return res.status(401).json({
    //     message: "You are not authorized to update branch",
    //   });
    // }

    const { id } = req.params;
    const updateData = req.body;

    if (!id || !updateData) {
      return res.status(400).json({ message: "Missing ID or update data" });
    }

    const updated = await Branch.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true, // Ensures schema validation
    });

    if (!updated) {
      return res.status(404).json({ message: "Branch not found" });
    }

    res.status(200).json({
      message: "Branch updated successfully",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error updating branch",
      error: err.message,
    });
  }
};

const getAllStaff = async (req, res) => {
  try {
    const staffs = await User.find({ role: "staff" }).populate("branchIds");
    res.json(staffs);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching staff", error: error.message });
  }
};

const getStaffById = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id).populate("branchIds");
    if (!staff || staff.role !== "staff") {
      return res.status(404).json({ message: "Staff not found" });
    }
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    const updateFields = req.body;

    const updated = await User.findByIdAndUpdate(staffId, updateFields, {
      new: true,
    }).populate("branchIds");

    if (!updated) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.json({
      message: "Staff updated successfully",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const deleteStaff = async (req, res) => {
  try {
    const staffId = req.params.id;

    const deleted = await User.findByIdAndDelete(staffId);

    if (!deleted) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.json({ message: "Staff deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const purchaseEntry = async (req, res) => {
  try {
    const doc = await Purchase.create(req.body); // works fine now
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("Purchase Entry Error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// 📋 Get all Purchase Bills
const getAllPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ billDate: -1 });
    res.status(200).json({ success: true, data: purchases });
  } catch (err) {
    console.error("Get All Purchases Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🔍 Get Purchase Bill by ID
const getPurchaseById = async (req, res) => {
  try {
    const doc = await Purchase.findById(req.params.id);
    if (!doc)
      return res
        .status(404)
        .json({ success: false, error: "Purchase not found" });
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    console.error("Get Purchase By ID Error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// ✏️ Update Purchase Bill
const updatePurchase = async (req, res) => {
  try {
    const updated = await Purchase.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated)
      return res
        .status(404)
        .json({ success: false, error: "Purchase not found" });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("Update Purchase Error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// ❌ Delete Purchase Bill
const deletePurchase = async (req, res) => {
  try {
    const deleted = await Purchase.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, error: "Purchase not found" });
    res.status(200).json({ success: true, message: "Purchase deleted" });
  } catch (err) {
    console.error("Delete Purchase Error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await Audit.find({})
      .populate("modifiedBy", "name")
      .populate("branch", "name")
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching audit logs",
      error: err.message,
    });
  }
};

module.exports = {
  addingBranch,
  getAllBranches,
  getBranchById,
  deleteBranch,
  updateBranch,
  getAllStaff,
  updateStaff,
  getStaffById,
  deleteStaff,
  purchaseEntry,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  getAuditLogs,
};
