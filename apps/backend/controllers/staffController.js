const { Attendance } = require("../models/attendanceModel");
const { Customer } = require("../models/customerModel");
const { Inventory } = require("../models/Inventory/inventoryModel");
const { RentalInventory } = require("../models/Inventory/RentalInventoryModel");
const { SalesInventory } = require("../models/Inventory/SalesInventoryModel");
const { Branch } = require("../models/branchModel");
const Attribute = require("../models/Inventory/variantModel");
const insertSales = async (req, res) => {
  try {
    const { name, description, category, variants, branchId } = req.body;

    if (!name || !Array.isArray(variants) || variants.length === 0) {
      return res
        .status(400)
        .json({ message: "Missing required fields: name or variants" });
    }
    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    // Ensure branch exists
    const branch = await Branch.findById(branchId).lean();
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    // Generate SKU and validate each variant
    const processedVariants = variants.map((variant) => {
      const brand = variant.brand || "GENERIC";
      const size = variant.size || "STD";
      const sku = `${name}-${brand}-${size}`.replace(/\s+/g, "").toUpperCase();

      if (variant.price == null || variant.stock == null) {
        throw new Error("Each variant must have price and stock");
      }

      return { ...variant, sku };
    });

    // Check for duplicate SKUs in THIS branch
    const skuList = processedVariants.map((v) => v.sku);
    const existing = await SalesInventory.findOne({
      branch: branchId,
      "variants.sku": { $in: skuList },
    }).lean();

    if (existing) {
      return res
        .status(400)
        .json({ message: "One or more SKUs already exist in this branch" });
    }

    const sales = new SalesInventory({
      name,
      description,
      category,
      branch: branchId,
      variants: processedVariants,
    });

    await sales.save(); // compound index also guards race conditions

    const lowStockSKUs = processedVariants
      .filter((v) => Number(v.stock) < 5)
      .map((v) => v.sku);

    if (lowStockSKUs.length > 0) {
      return res.status(200).json({
        message: `Item(s) added. Low stock for SKUs: ${lowStockSKUs.join(", ")}`,
        data: sales,
      });
    }

    return res.status(201).json({
      message: "Inventory item(s) added successfully",
      data: sales,
    });
  } catch (error) {
    // Friendly duplicate error if index is hit
    if (error?.code === 11000) {
      return res.status(400).json({
        message: "Duplicate SKU in this branch",
        error: error.message,
      });
    }
    return res.status(500).json({
      message: "Error in adding Tools in Inventory",
      error: error.message,
    });
  }
};
//
const updateSales = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, variants } = req.body;

    // --- Basic validation ---
    if (!name || !Array.isArray(variants) || variants.length === 0) {
      return res
        .status(400)
        .json({ message: "Missing required fields: name or variants" });
    }

    // --- Regenerate SKUs for each variant ---
    const processedVariants = variants.map((variant) => {
      const brand = variant.brand || "GENERIC";
      const size = variant.size || "STD";
      const color = variant.color || "";
      const sku = `${name}-${brand}-${size}${color ? "-" + color : ""}`
        .replace(/\s+/g, "")
        .toUpperCase();

      if (variant.price == null || variant.stock == null) {
        throw new Error("Each variant must have both price and stock values");
      }

      return { ...variant, sku };
    });

    // --- Prevent duplicate SKUs within the same update payload ---
    const seen = new Set();
    const duplicates = processedVariants
      .map((v) => v.sku)
      .filter((sku) => {
        if (seen.has(sku)) return true;
        seen.add(sku);
        return false;
      });

    if (duplicates.length > 0) {
      return res.status(400).json({
        message: `Duplicate variants found within this item: ${duplicates.join(", ")}`,
      });
    }

    // --- Prevent SKU collisions with *other* items only ---
    const skuList = processedVariants.map((v) => v.sku);
    const conflict = await SalesInventory.findOne({
      _id: { $ne: id },
      "variants.sku": { $in: skuList },
    }).lean();

    if (conflict) {
      // Find exactly which SKUs are conflicting
      const conflictingSkus = conflict.variants
        .map((v) => v.sku)
        .filter((sku) => skuList.includes(sku));

      return res.status(400).json({
        message: `SKUs already exist in another item (${conflict.name}): ${conflictingSkus.join(
          ", "
        )}`,
      });
    }

    // --- Proceed to update ---
    const updated = await SalesInventory.findByIdAndUpdate(
      id,
      {
        name,
        description,
        category,
        variants: processedVariants,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    // --- Check for low stock warning ---
    const lowStock = processedVariants
      .filter((v) => v.stock < 5)
      .map((v) => v.sku);

    if (lowStock.length > 0) {
      return res.status(200).json({
        message: `Updated successfully, but low stock for: ${lowStock.join(", ")}`,
        data: updated,
      });
    }

    // --- Success ---
    return res.status(200).json({
      message: "Inventory item updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Error updating inventory:", error);
    res.status(500).json({
      message: error.message || "Error updating inventory item",
    });
  }
};




const updateRental = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, variants } = req.body || {};

    if (!name || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const processed = variants.map(v => {
      if (v.pricePerDay == null || v.stock == null) {
        throw new Error("Each variant needs pricePerDay and stock");
      }
      const sku =
        v.sku?.toString().trim() ||
        makeRentalSku({ name, brand: v.brand, size: v.size, color: v.color });

      return {
        sku,
        brand: v.brand ?? "",
        size: v.size ?? "",
        color: v.color ?? null,
        pricePerDay: Number(v.pricePerDay),
        stock: Number(v.stock),
      };
    });

    const updated = await RentalInventory.findByIdAndUpdate(
      id,
      { name, description, category, variants: processed },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Updated", data: updated });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Duplicate SKU in this branch", error: err.message });
    }
    res.status(400).json({ message: "Error updating rental", error: err.message });
  }
};


// ─── DELETE RENTAL INVENTORY ────────────────────────────────
const deleteRental = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }

    const found = await RentalInventory.findById(id);
    if (!found) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    await RentalInventory.findByIdAndDelete(id);
    res.json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    res.status(400).json({
      message: "Error deleting inventory",
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
// Rental Inventory Handlers
// controllers/rentalInventoryController.js
// controllers/rentalInventoryController.js



// ── helpers
const norm = (s, fallback = "") =>
  (s ?? fallback)
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase();

const makeBaseSku = ({ name, brand, size, color, includeColor = true }) => {
  const parts = [norm(name), norm(brand, "GENERIC"), norm(size, "STD")];
  if (includeColor && color) parts.push(norm(color));
  return parts.join("-");
};

// controllers/rentalInventory.js
const insertRental = async (req, res) => {
  try {
    const { name, description, category, branchId, variants } = req.body || {};
    if (!name || !branchId || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const processed = variants.map(v => {
      if (v.pricePerDay == null || v.stock == null) {
        throw new Error("Each variant needs pricePerDay and stock");
      }
      const sku =
        v.sku?.toString().trim() ||
        makeRentalSku({ name, brand: v.brand, size: v.size, color: v.color });
      return {
        sku,
        brand: v.brand ?? "",
        size: v.size ?? "",
        color: v.color ?? null,
        pricePerDay: Number(v.pricePerDay),
        stock: Number(v.stock),
      };
    });

    const doc = new RentalInventory({
      name,
      description,
      category,
      branch: branchId,
      variants: processed,
    });

    await doc.save();
    return res.status(201).json({ message: "Added", data: doc });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Duplicate SKU in this branch", error: err.message });
    }
    return res.status(400).json({ message: "Error adding rental", error: err.message });
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

const getAllRental = async (req, res) => {
  try {
    const {
      branch,
      q,                // free text search
      sku,
      brand,
      size,
      color,
      lowStock,         // number, e.g., 5
      page = 1,
      limit = 20,
      sort = "createdAt:desc", // e.g., "name:asc" or "updatedAt:desc"
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);

    // Parse sort "field:dir"
    let [sortField, sortDir] = String(sort).split(":");
    sortField = sortField || "createdAt";
    sortDir = (sortDir || "desc").toLowerCase() === "asc" ? 1 : -1;

    const match = {};
    if (branch) {
      match.branch = mongoose.Types.ObjectId.isValid(branch)
        ? new mongoose.Types.ObjectId(branch)
        : branch;
    }

    // Text-like search across name/category and variant fields
    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      match.$or = [
        { name: rx },
        { category: rx },
        { "variants.sku": rx },
        { "variants.brand": rx },
        { "variants.size": rx },
        { "variants.color": rx },
      ];
    }

    // Build variant-level filter for $filter
    const vConds = [];
    if (sku)   vConds.push({ $regexMatch: { input: "$$v.sku",   regex: sku,   options: "i" } });
    if (brand) vConds.push({ $regexMatch: { input: "$$v.brand", regex: brand, options: "i" } });
    if (size)  vConds.push({ $regexMatch: { input: "$$v.size",  regex: size,  options: "i" } });
    if (color) vConds.push({ $regexMatch: { input: "$$v.color", regex: color, options: "i" } });
    if (lowStock !== undefined) {
      const n = Number(lowStock);
      if (!Number.isNaN(n)) vConds.push({ $lt: ["$$v.stock", n] });
    }

    const pipeline = [
      { $match: match },
      // project a filtered variants array when any variant filters are present
      ...(vConds.length
        ? [{
            $addFields: {
              variants: {
                $filter: {
                  input: "$variants",
                  as: "v",
                  cond: { $and: vConds },
                },
              },
            },
          }]
        : []),
      // optional: remove items that end up with zero variants after filtering
      ...(vConds.length ? [{ $match: { "variants.0": { $exists: true } } }] : []),
      // join branch (lightweight fields)
      {
        $lookup: {
          from: "branches",
          localField: "branch",
          foreignField: "_id",
          as: "branch",
        },
      },
      { $unwind: "$branch" },
      {
        $project: {
          name: 1,
          category: 1,
          description: 1,
          createdAt: 1,
          updatedAt: 1,
          variants: 1,
          branch: { _id: 1, name: 1, code: 1 }, // adjust to your Branch schema
        },
      },
      {
        $facet: {
          docs: [
            { $sort: { [sortField]: sortDir } },
            { $skip: (pageNum - 1) * perPage },
            { $limit: perPage },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await RentalInventory.aggregate(pipeline).exec();
    const docs = result?.docs || [];
    const total = result?.totalCount?.[0]?.count || 0;

    return res.status(200).json({
      message: "Inventory fetched successfully",
      page: pageNum,
      limit: perPage,
      total,
      pages: Math.ceil(total / perPage),
      data: docs,
    });
  } catch (error) {
    return res.status(500).json({
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

    // if (!name || !phone || !address || !idProofType || !idProofNumber) {
    //   return res.status(400).json({
    //     message: "Please fill all the fields",
    //   });
    // }

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

    res.json({ message: "Customer Added Successfully", customer: customerSave });
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
    const limit = parseInt(req.query.limit) || 10;

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

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json({ data: customer });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching customer",
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

    if (!name || !phone) {
      return res.status(400).json({
        message: "Name and Phone are required",
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Check if phone number is being changed and if it's already taken by another user
    if (phone !== customer.phone) {
      const existingUser = await Customer.findOne({ phone });
      if (existingUser) {
        return res.status(409).json({ message: "Phone number already registered to another customer." });
      }
    }

    customer.name = name;
    customer.phone = phone;
    if (address) customer.address = address;
    if (alternatePhone) customer.alternatePhone = alternatePhone;
    if (idProofType) customer.idProofType = idProofType;
    if (idProofNumber) customer.idProofNumber = idProofNumber;

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

/**
 * POST /api/transfers/rental-to-sales
 * body: {
 *   rentalItemId: string,
 *   fromBranchId: string,
 *   toBranchId: string,     // can be same as from
 *   rentalSku: string,
 *   quantity: number,
 *   salePrice?: number      // required only if creating a new sales variant
 * }
 */
const rentalToSales = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      rentalItemId,
      fromBranchId,
      toBranchId,
      rentalSku,
      quantity,
      salePrice,
    } = req.body || {};

    // Basic validation
    if (!rentalItemId || !fromBranchId || !toBranchId || !rentalSku || !quantity) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: "Quantity must be > 0" });
    }

    // 1) Find rental item & variant (in the from-branch)
    const rentalDoc = await RentalInventory.findOne(
      { _id: rentalItemId, branch: fromBranchId }
    ).session(session);

    if (!rentalDoc) {
      return res.status(404).json({ message: "Rental item not found" });
    }

    const rIdx = (rentalDoc.variants || []).findIndex(v => v.sku === rentalSku);
    if (rIdx === -1) {
      return res.status(404).json({ message: "Rental SKU not found" });
    }

    const rVar = rentalDoc.variants[rIdx];
    if (Number(rVar.stock) < qty) {
      return res.status(400).json({ message: "Not enough stock in rental" });
    }

    // 2) Decrement rental stock
    rentalDoc.variants[rIdx].stock = Number(rVar.stock) - qty;

    const name  = rentalDoc.name;
    const brand = rVar.brand || "GENERIC";
    const size  = rVar.size  || "STD";
    const color = rVar.color ?? null;

    // 3) Upsert into SalesInventory (to-branch)
    let salesDoc = await SalesInventory.findOne(
      { name, branch: toBranchId }
    ).session(session);

    if (!salesDoc) {
      // creating a new Sales item requires a price on the variant
      if (salePrice == null) {
        return res.status(400).json({ message: "salePrice is required to create a new sales variant" });
      }

      // Mint a SKU unique within this branch for the new document
      // Base: NAME-BRAND-SIZE (normalize inline)
      const base = `${String(name)}-${String(brand)}-${String(size)}`
        .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9-]+/g, "").toUpperCase();

      // For a new doc, used set is empty
      let sku = base;
      let i = 2;
      // (No need to check DB here since this is the first sales doc for this name+branch;
      // unique index at save time will still protect against races with other items.)
      // If you want to be extra safe, you could scan existing variants in salesDoc, but it's new.

      salesDoc = new SalesInventory({
        name,
        description: rentalDoc.description,
        category: rentalDoc.category,
        branch: toBranchId,
        variants: [{
          sku,
          brand: brand || undefined,
          size:  size  || undefined,
          color,
          price: Number(salePrice),
          stock: qty,
        }],
      });
    } else {
      // Try to find a matching variant by attributes in existing sales item
      const sIdx = (salesDoc.variants || []).findIndex(v =>
        (v.brand || "") === (brand || "") &&
        (v.size  || "") === (size  || "") &&
        (v.color ?? null) === (color ?? null)
      );

      if (sIdx > -1) {
        // Variant exists: increment stock; update price if provided
        salesDoc.variants[sIdx].stock = Number(salesDoc.variants[sIdx].stock || 0) + qty;
        if (salePrice != null) {
          salesDoc.variants[sIdx].price = Number(salePrice);
        }
      } else {
        // Need to add a new sales variant -> requires price
        if (salePrice == null) {
          return res.status(400).json({ message: "salePrice is required to create a new sales variant" });
        }

        // Mint a unique SKU within this sales branch for the new variant
        const base = `${String(name)}-${String(brand)}-${String(size)}`
          .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^A-Za-z0-9-]+/g, "").toUpperCase();

        const used = new Set((salesDoc.variants || []).map(v => v.sku));
        let sku = base;
        let i = 2;
        while (used.has(sku)) {
          sku = `${base}-${i}`;
          i += 1;
        }

        salesDoc.variants.push({
          sku,
          brand: brand || undefined,
          size:  size  || undefined,
          color,
          price: Number(salePrice),
          stock: qty,
        });
      }
    }

    // 4) Save both atomically
    await rentalDoc.save({ session });
    await salesDoc.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: `Transferred ${qty} ${name} from rental → sales`,
      data: {
        rental: { id: rentalDoc._id, variant: rentalSku, newStock: rentalDoc.variants[rIdx].stock },
        sales:  { id: salesDoc._id, branch: toBranchId },
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ message: "Transfer failed", error: err.message });
  }
};

module.exports = {
  getAllCustomers,
  insertCustomer,
  deleteCustomer,
  editCustomer,
  getCustomerById,
  insertSales,
  updateSales,
  updateRental,
  deleteRental,
  insertRental,
  insertAttribute,
  getAttribute,
  getAllsales,
  getAllRental,
  updateInventory,
  deleteInventory,
  insertCheckin,
  insertCheckout,
  calculateAttendance,
  rentalToSales
};
