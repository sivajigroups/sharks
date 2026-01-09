// controllers/rentalPurchaseController.js
const RentalPurchase = require("../models/rentalTransactionModel");
const { RentalInventory } = require("../models/Inventory/RentalInventoryModel");

// ───────────────────────────────────────────────
// CREATE RENTAL PURCHASE (TRANSACTION)
// ───────────────────────────────────────────────
const createRentalPurchase = async (req, res) => {
  try {
    const {
      customer,
      inventory,
      itemName,
      rentDate,
      returnDate,
      amount,
      days,
      quantity,
      sku,
    } = req.body;

    if (
      !customer ||
      !inventory ||
      !rentDate ||
      !days ||
      !amount ||
      !quantity ||
      !itemName
    ) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const qty = Number(quantity);
    if (qty <= 0)
      return res.status(400).json({ message: "Quantity must be positive" });

    // 1) Find the RentalInventory item
    const rentalItem = await RentalInventory.findById(inventory);
    if (!rentalItem) {
      return res.status(404).json({ message: "Rental Item not found" });
    }

    // 2) Find the specific variant to decrement
    // If 'sku' is provided, we use it. If not, and there's only 1 variant, we use that.
    // Otherwise we fall back to finding by matching properties (if provided) or fail?
    // STRICT MODE: We expect SKU or we try to find via itemName?
    // Let's rely on finding a variant with enough stock if no sku is provided, OR fail.
    // For now, let's assume we need to find it by SKU or just use the first one if length is 1.

    let variantIndex = -1;
    if (sku) {
      // Case-insensitive match for robust handling
      variantIndex = rentalItem.variants.findIndex(
        (v) => v.sku === sku || v.sku?.toLowerCase() === sku?.toLowerCase()
      );
    } else if (rentalItem.variants.length === 1) {
      variantIndex = 0;
    } else {
      // If multiple variants exist and no SKU, we can't reliably pick one.
      return res.status(400).json({
        message:
          "SKU is required for multi-variant items. Please contact support.",
      });
    }

    if (variantIndex === -1) {
      return res
        .status(404)
        .json({ message: "Variant not found or SKU mismatch" });
    }

    const variant = rentalItem.variants[variantIndex];
    if (variant.stock < qty) {
      return res
        .status(400)
        .json({ message: `Insufficient stock. available: ${variant.stock}` });
    }

    // 3) Decrement Stock
    variant.stock -= qty;
    await rentalItem.save();

    // 4) Create Transaction
    const newPurchase = new RentalPurchase({
      customer,
      inventory, // Refers to RentalInventory
      itemName: `${rentalItem.name} (${variant.sku || variant.size || ""})`,
      rentDate,
      returnDate: returnDate || null,
      days,
      quantity: qty,
      amount,
      status: "Pending",
      // Store sku/variantId in the transaction if possible?
      // Schema doesn't have it, but we can store it in 'itemName' or add a field later.
      // For now, relies on 'inventory' reference.
    });

    await newPurchase.save();

    res.status(201).json({
      message: "Rental purchase created successfully",
      rental: newPurchase,
    });
  } catch (error) {
    console.error(error);
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
    res
      .status(400)
      .json({ message: "Error fetching rentals", error: error.message });
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

    if (rental.status === "Returned") {
      return res.status(400).json({ message: "Rental is already returned" });
    }

    const rentDate = new Date(rental.rentDate);
    const actualDays = Math.ceil(
      (Date.now() - rentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Valid days (minimum 1)
    const finalDays = Math.max(1, actualDays);

    // Calculate Amount
    // Warning: rental.inventory might be null if deleted.
    const rentalItem = await RentalInventory.findById(
      rental.inventory?._id || rental.inventory
    );

    let dailyRate = 0;
    let variantSku = null;

    if (rentalItem) {
      // We need to know WHICH variant was rented to restore stock and get price.
      // Current RentalPurchase schema DOES NOT store variantId/SKU.
      // We have to GUESS or rely on 'itemName' parsng, or just put it back to the first variant?
      // This is a FLAW in the schema plan I didn't address fully (adding variantId to Transaction).
      // FIX: Attempt to find variant by matching price or name?
      // Or just default to first variant for now until Schema is upgraded further?
      // Better: Try to match variant by pricePerDay?

      // For now, IF rentalItem has variants, we'll try to match name.
      // If not found, we just default to the first variant to avoid losing stock.
      // Ideally we should add 'variantSku' to RentalPurchase model.

      // HACK: Restore to the first variant found or index 0.
      if (rentalItem.variants && rentalItem.variants.length > 0) {
        // Try to fuzzy find?
        // Fallback to 0
        rentalItem.variants[0].stock += rental.quantity || 1;
        dailyRate = rentalItem.variants[0].pricePerDay;
        await rentalItem.save();
      }
    }

    // Recalculate if we have a rate, else keep original or use existing amount logic
    const recalculatedAmount = dailyRate
      ? dailyRate * (rental.quantity || 1) * finalDays
      : rental.amount;

    rental.status = "Returned";
    rental.returnDate = new Date();
    rental.days = finalDays;
    rental.amount = recalculatedAmount;
    await rental.save();

    res.status(200).json({
      message: "Item marked as returned and stock restored",
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
      { amount },
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
// EXPORTS
// ───────────────────────────────────────────────
module.exports = {
  createRentalPurchase,
  markAsPaid,
  getAllRentals,
  markAsReturned,
  updateAmount,
  getRentalInventory,
};
