// controllers/rentalPurchaseController.js
const RentalPurchase = require("../models/rentalTransactionModel");

// ───────────────────────────────────────────────
// CREATE RENTAL PURCHASE (TRANSACTION)
// ───────────────────────────────────────────────
const createRentalPurchase = async (req, res) => {
  try {
    const { customer, inventory, itemName, rentDate, returnDate, amount, days, quantity } = req.body;

    if (!customer || !inventory || !rentDate || !days || !amount || !quantity || !itemName) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const newPurchase = new RentalPurchase({
      customer,
      inventory,
      itemName,
      rentDate,
      returnDate: returnDate || null,
      days,
      quantity,
      amount,
      status: "Pending",
    });

    await newPurchase.save();

    res.status(201).json({
      message: "Rental purchase created successfully",
      rental: newPurchase,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating rental purchase",
      error: error.message,
    });
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
        status: "Paid",
        amount,
        paymentDate: paymentDate || new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Rental purchase not found" });
    }

    res.status(200).json({
      message: "Rental marked as paid successfully",
      rental: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating rental purchase",
      error: error.message,
    });
  }
};

// ───────────────────────────────────────────────
// GET ALL RENTALS WITH PAGINATION + FILTERS
// ───────────────────────────────────────────────
const getAllRentals = async (req, res) => {
  try {
    const { page = 1, limit = 25, q = "", status, branch } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (q) {
      query.$or = [
        { "customer.name": { $regex: q, $options: "i" } },
        { "inventory.name": { $regex: q, $options: "i" } },
      ];
    }

    if (status) query.status = status;
    if (branch) query.branch = branch;

    const total = await RentalPurchase.countDocuments(query);
    const rentals = await RentalPurchase.find(query)
      .populate("customer", "name phone")
      .populate("inventory", "name rentPrice")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      message: "Rentals fetched successfully",
      data: rentals,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    res.status(400).json({ message: "Error fetching rentals", error: error.message });
  }
};

// ───────────────────────────────────────────────
// MARK AS RETURNED — AUTO CALCULATE EXTRA DAYS COST
// ───────────────────────────────────────────────
const markAsReturned = async (req, res) => {
  try {
    const { id } = req.params;

    const rental = await RentalPurchase.findById(id).populate("inventory");
    if (!rental) return res.status(404).json({ message: "Rental not found" });

    const rentDate = new Date(rental.rentDate);
    const actualDays = Math.ceil((Date.now() - rentDate.getTime()) / (1000 * 60 * 60 * 24));

    const dailyRate = rental.inventory?.rentPrice || 0;
    const recalculatedAmount = dailyRate * (rental.quantity || 1) * actualDays;

    rental.status = "Returned";
    rental.returnDate = new Date();
    rental.days = actualDays;
    rental.amount = recalculatedAmount;
    await rental.save();

    res.status(200).json({
      message: "Item marked as returned and amount auto-adjusted",
      rental,
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating rental", error: error.message });
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

    const updated = await RentalPurchase.findByIdAndUpdate(id, { amount }, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Rental purchase not found" });
    }

    res.status(200).json({
      message: "Rental amount updated successfully",
      rental: updated,
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating amount", error: error.message });
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
};
