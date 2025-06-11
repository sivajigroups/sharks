const {Branch} =require("../models/branchModel");

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
      messge: "Branch Added Sucessfully",
    });
  } catch (err) {
    res.staus(400).json({
      messge: "Error in adding Branch",
      error: err.messge,
    });
  }
};

const getAllBranches = async (req, res) => {
  try {
     const user = req.user;

    if (user.role !== "admin") {
      return res.status(401).json({
        message: "You are not authorized to add branch",
      });
    }
    const branches = await Branch.find();
    res.json(branches);
  } catch (err) {
    res.status(500).json({ message: "Error fetching branches", error: err.message });
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
    res.status(500).json({ message: "Error fetching branch", error: err.message });
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
    res.status(400).json({ message: "Error deleting branch", error: err.message });
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
    const updated = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "Branch updated successfully", updated });
  } catch (err) {
    res.status(400).json({ message: "Error updating branch", error: err.message });
  }
};


module.exports = {
  addingBranch,
  getAllBranches,
  getBranchById,
  deleteBranch,
  updateBranch,
};
