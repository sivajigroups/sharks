const { Attendance } = require("../models/attendanceModel");
const { Customer } = require("../models/customerModel");
const { Inventory } = require("../models/Inventory/inventoryModel");
const { RentalInventory } = require("../models/Inventory/RentalInventoryModel");
const { SalesInventory } = require("../models/Inventory/SalesInventoryModel");
const Attribute = require("../models/Inventory/variantModel");
const insertSales = async (req, res) => {
  try {
    const { name, description, category, variants } = req.body;

    if (
      !name ||
      !variants ||
      !Array.isArray(variants) ||
      variants.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Missing required fields: name or variants" });
    }

    // Generate SKU and validate each variant
    const processedVariants = variants.map((variant) => {
      const brand = variant.brand || "GENERIC";
      const size = variant.size || "STD";
      const sku = `${name}-${brand}-${size}`.replace(/\s+/g, "").toUpperCase();

      if (!variant.price || !variant.stock) {
        throw new Error("Each variant must have price and stock");
      }

      return {
        ...variant,
        sku,
      };
    });

    // Check for duplicate SKUs in DB
    const skuList = processedVariants.map((v) => v.sku);
    const existing = await SalesInventory.findOne({
      "variants.sku": { $in: skuList },
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "One or more SKUs already exist" });
    }

    const sales = new SalesInventory({
      name,
      description,
      category,
      variants: processedVariants,
    });

    await sales.save();

    const lowStockSKUs = processedVariants
      .filter((v) => v.stock < 5)
      .map((v) => v.sku);

    if (lowStockSKUs.length > 0) {
      return res.status(200).json({
        message: `Item(s) added. Low stock for SKUs: ${lowStockSKUs.join(", ")}`,
        data: sales,
      });
    }

    res.status(201).json({
      message: "Inventory item(s) added successfully",
      data: sales,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error in adding Tools in Inventory",
      error: error.message,
    });
  }
};

//const Attribute = require("../models/Attribute");

const insertAttribute = async (req, res) => {
  try {
    const { brand = [], size = [], color = [] } = req.body;

    if (!brand.length && !size.length && !color.length) {
      return res
        .status(400)
        .json({
          message: "At least one of brand, size, or color must be provided",
        });
    }

    const updateOps = {};

    if (brand.length) updateOps.brand = { $each: brand };
    if (size.length) updateOps.size = { $each: size };
    if (color.length) updateOps.color = { $each: color };

    const updatedAttribute = await Attribute.findOneAndUpdate(
      {}, // always update the single document
      { $addToSet: updateOps },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      message: "Attributes updated successfully",
      data: updatedAttribute,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating attributes",
      error: error.message,
    });
  }
};

const getAttribute= async(req,res)=>{
  try {
    const attributes = await Attribute.findOne({});
    if (!attributes) {
      return res.status(404).json({ message: "No attributes found" });
    }
    res.status(200).json({
      message: "Attributes fetched successfully",
      data: attributes,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching attributes",
      error: error.message,
    });
  }
}

const insertRental = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      quantity,
      pricePerDay,
      branch,
      barcode,
    } = req.body;
    if (!name || !quantity || !branch || !barcode || !pricePerDay) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await RentalInventory.findOne({ barcode });
    if (existing) {
      return res.status(400).json({ message: "Barcode already exists" });
    }

    const rental = new RentalInventory({
      name,
      description,
      category,
      quantity,
      pricePerDay,
      branch,
      barcode,
    });
    await rental.save();
    if (rental.quantity < 5) {
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

const getAllsales = async (req, res) => {
  try {
    const inventories = await SalesInventory.find();

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

const getAllrental = async (req, res) => {
  try {
    const { branch, type } = req.query;

    const filter = {};
    if (branch) filter.branch = branch;
    if (type) filter.type = type;

    const inventories = await RentalInventory.find(filter).populate("branch");

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
    const inventory = await SalesInventory.findById(id);
    if (!inventory) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    await SalesInventory.findByIdAndDelete(id);
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
    const { name, phone, address, alternatePhone, idProofType, idProofNumber } =
      req.body;

    if (!name || !phone || !address || !idProofType || !idProofNumber) {
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
      alternatePhone,
      idProofNumber,
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
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 8; // fixed to return only 8 customers per page

    const query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { alternatePhone: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
      ],
    };

    const customers = await Customer.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Customer.countDocuments(query);

    res.json({
      data: customers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching customers",
      error: error.message,
    });
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
const editCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, alternatePhone, idProofType, idProofNumber } =
      req.body;

    if (!name || !phone || !address || !idProofType || !idProofNumber) {
      return res.status(400).json({
        message: "Please fill all the fields",
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    customer.name = name;
    customer.phone = phone;
    customer.address = address;
    customer.alternatePhone = alternatePhone;
    customer.idProofType = idProofType;
    customer.idProofNumber = idProofNumber;

    await customer.save();

    res.json({ message: "Customer updated successfully", customer });
  } catch (error) {
    res.status(400).json({
      message: "Error updating Customer",
      error: error.message,
    });
  }
};
const insertCheckin = async (req, res) => {
  try {
    const { branch } = req.body;
    const user = req.user;
    if (user.role !== "staff") {
      return res.status(401).json({
        message: "You are not Checkin",
      });
    }
    const alreadyCheckedIn = await Attendance.findOne({
      userId: user._id,
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
      checkOut: null,
    });

    if (alreadyCheckedIn) {
      return res.status(400).json({
        message: "You have already checked in and not checked out yet",
      });
    }
    const attendanceSave = new Attendance({
      userId: user._id,
      branchId: branch,
      date: new Date(),
      checkIn: new Date(),
    });
    await attendanceSave.save();
    res.send("Checkin Sucessfully");
  } catch (err) {
    res.status(400).json({
      message: "Error in adding check-in",
      error: err.message,
    });
  }
};
const insertCheckout = async (req, res) => {
  try {
    const { branch } = req.body;
    const user = req.user;
    if (user.role !== "staff") {
      return res.status(401).json({
        message: "You are not Checkin",
      });
    }
    const attendance = await Attendance.findOne({
      userId: user._id,
      branchId: branch,
    });
    if (!attendance) {
      return res.status(400).json({
        message: "No Checkin Found",
      });
    }
    attendance.checkOut = new Date();
    await attendance.save();
    res.send("Checkout Sucessfully");
  } catch (err) {
    res.status(400).json({
      messge: "Error in adding Customer",
      error: err.messge,
    });
  }
};
const calculateAttendance = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "admin") {
      return res.status(401).json({
        message: "You are not authorized to view attendance",
      });
    }

    const records = await Attendance.find({
      checkIn: { $ne: null },
      checkOut: { $ne: null },
    }).populate("userId");
    const uniqueStaffIds = new Set();
    const attendanceSummary = records.map((record) => {
      const durationMs = new Date(record.checkOut) - new Date(record.checkIn);
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
      if (record.userId?._id) {
        uniqueStaffIds.add(record.userId._id.toString());
      }
      return {
        name: record.userId.name,
        id: record.userId._id,
        email: record.userId.email,
        date: record.date.toISOString().split("T")[0],
        hoursWorked: `${hours}h ${minutes}m`,
      };
    });

    res.json({
      totalStaffs: uniqueStaffIds.size,
      attendance: attendanceSummary,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error calculating attendance",
      error: err.message,
    });
  }
};

module.exports = {
  getAllCustomers,
  insertCustomer,
  deleteCustomer,
  editCustomer,
  insertSales,
  insertRental,
  insertAttribute,
  getAttribute,
  getAllsales,
  getAllrental,
  updateInventory,
  deleteInventory,
  insertCheckin,
  insertCheckout,
  calculateAttendance,
};
