// controllers/rentalPurchaseController.js
const RentalPurchase = require("../models/rentalTransactionModel");
const { RentalInventory } = require("../models/Inventory/RentalInventoryModel");

// ───────────────────────────────────────────────
// CREATE RENTAL PURCHASE (TRANSACTION)
// ───────────────────────────────────────────────
// ───────────────────────────────────────────────
// CREATE RENTAL PURCHASE (TRANSACTION)
// ───────────────────────────────────────────────
const createRentalPurchase = async (req, res) => {
  try {
    const { customer, items, branch, deposit, paymentMode } = req.body;
    // items must be array: [{ inventory, itemName, sku, rentDate, returnDate, days, quantity, pricePerDay, amount }]

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    // 1. Generate Bill No (RNT-YYYY-XXXX)
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const count = await RentalPurchase.countDocuments({
      createdAt: { $gte: startOfYear },
    });
    const billNo = `RNT-${new Date().getFullYear()}-${String(
      count + 1
    ).padStart(6, "0")}`;

    // 2. Calculate Totals
    let subtotal = 0;
    const processedItems = items.map((it) => {
      // parse dates safely
      const rDate = new Date(it.rentDate || it.fromDate);
      let retDate = null;
      if (it.returnDate || it.toDate) {
        retDate = new Date(it.returnDate || it.toDate);
      } else if (it.days) {
        retDate = new Date(rDate);
        retDate.setDate(retDate.getDate() + (Number(it.days) - 1));
      }

      const lineTotal = Number(it.amount || 0);
      subtotal += lineTotal;

      return {
        inventory: it.inventory || it.inventoryId,
        itemName: it.itemName || it.name,
        sku: it.sku,
        rentDate: rDate,
        returnDate: retDate,
        days: Number(it.days),
        quantity: Number(it.quantity || it.qty),
        pricePerDay: Number(it.pricePerDay),
        amount: lineTotal,
        status: "Pending",
      };
    });

    const tax = 0; // if tax needed, add here
    const totalAmount = subtotal + tax + Number(deposit || 0);

    // 3. Create Transaction
    const newTransaction = new RentalPurchase({
      billNo,
      customer,
      branch: branch || req.user?.branch,
      items: processedItems,
      subtotal,
      tax,
      deposit: Number(deposit || 0),
      totalAmount,
      status: "Pending",
      paymentStatus: "Pending",
      paymentMode: paymentMode || "Cash",
    });

    await newTransaction.save();

    // 4. Update Inventory Stock (Decrease)
    for (const item of processedItems) {
      if (item.sku) {
        await RentalInventory.findOneAndUpdate(
          { _id: item.inventory, "variants.sku": item.sku },
          { $inc: { "variants.$.stock": -item.quantity } }
        );
      } else {
        // Fallback: Decrement the first variant or handle legacy
        // For now, doing nothing if no SKU, or could decrement first variant
      }
    }

    res.status(201).json({
      message: "Rental Order Created Successfully",
      data: newTransaction,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error creating transaction", error: error.message });
  }
};

// ───────────────────────────────────────────────
// GET ALL RENTALS WITH PAGINATION + FILTERS
// ───────────────────────────────────────────────
const getAllRentals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      q = "",
      status,
      branch,
      customerId,
    } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (q) {
      query.$or = [{ billNo: { $regex: q, $options: "i" } }];
    }

    if (status) query.status = status;
    if (branch) query.branch = branch;
    if (customerId) query.customer = customerId; // ✅ Add this

    const total = await RentalPurchase.countDocuments(query);
    const rentals = await RentalPurchase.find(query)
      .populate("customer", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      message: "Rentals fetched successfully",
      data: rentals,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error fetching rentals", error: error.message });
  }
};

// ───────────────────────────────────────────────
// MARK RENTAL AS PAID
// ───────────────────────────────────────────────
const markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentDate, amount } = req.body;

    const updated = await RentalPurchase.findByIdAndUpdate(
      id,
      {
        paymentStatus: "Paid",
        /* status: "Paid", // status 'Paid' is not in enum, removing to avoid validation error */
        /* amount, // invalid field name, removing */
        paymentDate: paymentDate || new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Rental not found" });
    }

    res.status(200).json({
      message: "Rental marked as paid successfully",
      rental: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating rental",
      error: error.message,
    });
  }
};

// ───────────────────────────────────────────────
// MARK AS RETURNED — AUTO CALCULATE EXTRA DAYS COST
// ───────────────────────────────────────────────
// ───────────────────────────────────────────────
// MARK AS RETURNED (Whole Bill)
// ───────────────────────────────────────────────
const markAsReturned = async (req, res) => {
  try {
    const { id } = req.params;

    const rental =
      await RentalPurchase.findById(id).populate("items.inventory");
    if (!rental)
      return res.status(404).json({ message: "Rental Order not found" });

    if (rental.status === "Returned") {
      return res.status(400).json({ message: "Rental is already returned" });
    }

    // 1. Restore Stock for ALL items
    for (const item of rental.items) {
      // if item is already returned (future granular check), skip
      if (item.status === "Returned") continue;

      const rentalItem = await RentalInventory.findById(item.inventory);
      if (rentalItem && item.sku) {
        const variant = rentalItem.variants.find((v) => v.sku === item.sku);
        if (variant) {
          variant.stock += item.quantity;
          await rentalItem.save();
        }
      } else if (rentalItem) {
        // Fallback if no SKU found (legacy or error), try first variant
        if (rentalItem.variants.length > 0) {
          rentalItem.variants[0].stock += item.quantity;
          await rentalItem.save();
        }
      }
      item.status = "Returned";
      item.returnedAt = new Date();
    }

    // 2. Update Bill Status
    rental.status = "Returned";
    // paymentStatus logic could handle 'deposit' return here if needed

    await rental.save();

    res.status(200).json({
      message: "Order marked as returned and stock restored",
      rental,
    });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ message: "Error updating rental", error: error.message });
  }
};

// ───────────────────────────────────────────────
// MANUAL AMOUNT UPDATE (ADMIN OVERRIDE)
// ───────────────────────────────────────────────
const updateAmount = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (isNaN(amount)) {
      return res.status(400).json({ message: "Invalid amount value" });
    }

    const updated = await RentalPurchase.findByIdAndUpdate(
      id,
      { totalAmount: amount }, // Updated to totalAmount
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Rental purchase not found" });
    }

    res.status(200).json({
      message: "Rental amount updated successfully",
      rental: updated,
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating amount", error: error.message });
  }
};

// ───────────────────────────────────────────────
// GET RENTAL INVENTORY (ITEMS FOR RENT)
// ───────────────────────────────────────────────
const getRentalInventory = async (req, res) => {
  try {
    const { branch } = req.query;
    const query = {};
    if (branch) query.branch = branch;

    const items = await RentalInventory.find(query)
      .populate("branch", "name")
      .sort({ name: 1 });

    res.status(200).json({
      message: "Rental inventory fetched successfully",
      data: items,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching rental inventory",
      error: error.message,
    });
  }
};

// ───────────────────────────────────────────────
// GET SINGLE RENTAL TRANSACTION
// ───────────────────────────────────────────────
const getSingleRental = async (req, res) => {
  try {
    const { id } = req.params;
    const rental = await RentalPurchase.findById(id)
      .populate("customer", "name phone address")
      .populate("items.inventory", "name rentPrice category"); // populate item details

    if (!rental) {
      return res.status(404).json({ message: "Rental Bill not found" });
    }

    res.status(200).json({
      message: "Rental fetched successfully",
      data: rental,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching rental details",
      error: error.message,
    });
  }
};

// ───────────────────────────────────────────────
// EXPORTS
// ───────────────────────────────────────────────
module.exports = {
  createRentalPurchase,
  markAsPaid,
  getAllRentals,
  markAsReturned,
  updateAmount,
  getRentalInventory,
  getSingleRental, // ✅ Export
};
