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

    if (user.role !== "admin") {
      return res.status(401).json({
        message: "You are not authorized to add branch",
      });
    }
    const updated = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ message: "Branch updated successfully", updated });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error updating branch", error: err.message });
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

const updateStaff = async (req,res) => {
  const { id } = req.params;
  const { name, email, branchId, role } = req.body;
  try {
    const user = await User.findById(id);
    if (!user || !user.role == "staff") {
      return res.status(404).json({ message: "Staff not found" });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;

    if (user.role === "staff") {
      user.branchId = branchId || user.branchId;
    } else {
      user.branchId = undefined; // remove branchId if no longer staff
    }

    await user.save();

    res.json({ message: "Staff updated successfully", data: user });
  } catch (error) {
     res.status(500).json({ message: "Error updating staff", error: error.message });
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
};
