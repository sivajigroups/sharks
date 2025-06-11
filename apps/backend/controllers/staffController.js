const { Customer } = require("../models/customerModel");
const { Inventory } = require("../models/Inventory/inventoryModel");
const insertInventory = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      type,
      quantity,
      salePrice,
      pricePerDay,
      serviceStatus,
      branch,
      barcode,
    } = req.body;
    if (!name || !type || !quantity || !branch) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (type === "sales" && !salePrice) {
      return res
        .status(400)
        .json({ message: "Sale price required for sales item" });
    }
    if (type === "rental" && !pricePerDay) {
      return res
        .status(400)
        .json({ message: "Price per day required for rental item" });
    }
    const existing = await Inventory.findOne({ barcode });
    if (existing) {
      return res.status(400).json({ message: "Barcode already exists" });
    }

    const inventorySave = new Inventory({
      name,
      description,
      category,
      type,
      quantity,
      salePrice,
      pricePerDay,
      serviceStatus,
      branch,
      barcode,
    });
    await inventorySave.save();
    if (inventorySave.quantity < 5) {
          res.send("Inventory Item Added Successfully and stock is low");
    }
    res.send("Inventory Item Added Successfully");
  } catch (error) {
    res.status(400).json({
      message: "Error in adding Tools in Inventory",
      error: error.message,
    });
  }
};
const getAllInventory = async (req, res) => {
  try {
    const { branch, type } = req.query;

    const filter = {};
    if (branch) filter.branch = branch;
    if (type) filter.type = type;

    const inventories = await Inventory.find(filter).populate("branch");

    res.status(200).json({
      message: "Inventory fetched successfully",
      data: inventories,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching inventory",
      error: error.message,
    });
  }
};

const deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }
    const inventory = await Inventory.findById(id);
    if (!inventory) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    await Inventory.findByIdAndDelete(id);
    res.json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error deleting inventory", error: error.message });
  }
};
const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Inventory.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json({ message: "Inventory item updated successfully", updated });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating inventory", error: error.message });
  }
};



const insertCustomer = async (req, res) => {
  try {
    const { name, phone, address, idProofType } = req.body;

    if (!name || !phone || !address || !idProofType) {
      return res.status(400).json({
        message: "Please fill all the fields",
      });
    }

    const existingUser = await Customer.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({ message: "Customer already registered." });
    }

    const customerSave = new Customer({
      name,
      phone,
      address,
      idProofType,
    });

    await customerSave.save();

    res.json("Customer Added Successfully");
  } catch (error) {
    res.status(400).json({
      message: "Error in adding Customer",
      error: error.message,
    });
  }
};


const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching customers", error: error.message });
  }
};
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await Customer.findByIdAndDelete(id);
    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error deleting customer", error: error.message });
  }
};

module.exports={
    getAllCustomers,
    insertCustomer,
    deleteCustomer,
    insertInventory,
    getAllInventory,
    updateInventory,
    deleteInventory
}