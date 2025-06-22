const { Branch } = require("../models/branchModel");
const { User } = require("../models/userModel");

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
    const staffs = await User.find({ role: "staff" }).populate("branchId");
    res.json(staffs);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching staff", error: error.message });
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

const updateStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    const updateFields = req.body;

    const updated = await User.findByIdAndUpdate(staffId, updateFields, {
      new: true,
    }).populate("branchId");

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

module.exports = {
  addingBranch,
  getAllBranches,
  getBranchById,
  deleteBranch,
  updateBranch,
  getAllStaff,
  updateStaff,
  getStaffById,
};
