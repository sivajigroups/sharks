// controllers/combinedBillController.js
const mongoose = require("mongoose");
const { Bill } = require("../models/billModel");
const { SalesInventory } = require("../models/Inventory/SalesInventoryModel");
const { RentalInventory } = require("../models/Inventory/RentalInventoryModel");

// ────────────────────────────────────────────────────────────────────
// BILL NUMBER GENERATOR (CMB-YYYY-######)
// ────────────────────────────────────────────────────────────────────
// Check if Counter model already exists, if not create it
const Counter =
  mongoose.models.Counter ||
  mongoose.model(
    "Counter",
    new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }),
  );

async function nextCombinedBillNo() {
  const year = new Date().getFullYear();
  const counter = await Counter.findByIdAndUpdate(
    `combined-bill-${year}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `CMB-${year}-${String(counter.seq).padStart(6, "0")}`;
}

// ────────────────────────────────────────────────────────────────────
// ✅ CREATE COMBINED BILL
// ────────────────────────────────────────────────────────────────────
async function createCombinedBill(req, res) {
  // const session = await mongoose.startSession();
  // session.startTransaction();

  try {
    const {
      customerId,
      branch,
      saleItems = [],
      rentalItems = [],
      deposit = 0,
      discount = 0,
      tax = 0,
      paymentMode = "Cash",
      paymentStatus = "Paid",
    } = req.body;

    // ── Validation
    if (!branch) {
      return res.status(400).json({ message: "Branch is required" });
    }

    if (saleItems.length === 0 && rentalItems.length === 0) {
      return res.status(400).json({ message: "At least one item required" });
    }

    // ── If rental items present, customer is required
    if (rentalItems.length > 0 && !customerId) {
      return res.status(400).json({
        message: "Customer is required for rental items",
      });
    }

    // ────────────────────────────────────────────────────────────────
    // PROCESS SALE ITEMS
    // ────────────────────────────────────────────────────────────────
    let saleSubtotal = 0;
    const processedSaleItems = [];

    for (const item of saleItems) {
      const { inventoryId, variantId, quantity } = item;

      if (!inventoryId || !variantId || !quantity) {
        throw new Error("Sale item missing required fields");
      }

      // Fetch inventory
      // Fetch inventory
      const inventory = await SalesInventory.findById(inventoryId);
      if (!inventory) {
        throw new Error(`Sale inventory ${inventoryId} not found`);
      }

      // Find variant
      const variant = inventory.variants.id(variantId);
      if (!variant) {
        throw new Error(`Variant ${variantId} not found`);
      }

      if (variant.quantity < quantity) {
        throw new Error(
          `Insufficient stock for ${inventory.productName} - ${variant.sku}`,
        );
      }

      // Calculate price
      const unitPrice = variant.price || 0;
      const lineTotal = unitPrice * quantity;
      saleSubtotal += lineTotal;

      // Decrement stock using arrayFilters
      await SalesInventory.updateOne(
        { _id: inventoryId },
        { $inc: { "variants.$[elem].quantity": -quantity } },
        {
          arrayFilters: [{ "elem._id": variantId }],
          // session,
        },
      );

      // Add to processed list
      processedSaleItems.push({
        inventoryId: inventory._id,
        variantId: variant._id,
        productName: inventory.name,
        sku: variant.sku,
        brand: variant.brand,
        size: variant.size,
        color: variant.color,
        unitPrice,
        quantity,
        lineTotal,
      });
    }

    // ────────────────────────────────────────────────────────────────
    // PROCESS RENTAL ITEMS
    // ────────────────────────────────────────────────────────────────
    let rentalSubtotal = 0;
    const processedRentalItems = [];

    for (const item of rentalItems) {
      const {
        inventory,
        itemName,
        sku,
        rentDate,
        returnDate,
        days,
        quantity,
        pricePerDay,
      } = item;

      if (!inventory || !rentDate || !days || !quantity || !pricePerDay) {
        throw new Error("Rental item missing required fields");
      }

      // Fetch rental inventory
      // Fetch rental inventory
      const rentalInv = await RentalInventory.findById(inventory);
      if (!rentalInv) {
        throw new Error(`Rental inventory ${inventory} not found`);
      }

      if (rentalInv.availableStock < quantity) {
        throw new Error(`Insufficient rental stock for ${rentalInv.itemName}`);
      }

      // Calculate amount
      const amount = pricePerDay * days * quantity;
      rentalSubtotal += amount;

      // Decrement available stock
      await RentalInventory.updateOne(
        { _id: inventory },
        { $inc: { availableStock: -quantity } },
      );

      // Add to processed list
      processedRentalItems.push({
        inventory: rentalInv._id,
        itemName: itemName || rentalInv.itemName,
        sku: sku || rentalInv.sku,
        rentDate: new Date(rentDate),
        returnDate: returnDate ? new Date(returnDate) : null,
        days,
        originalDays: days,
        quantity,
        pricePerDay,
        amount,
        status: "Pending",
      });
    }

    // ────────────────────────────────────────────────────────────────
    // CREATE COMBINED BILL
    // ────────────────────────────────────────────────────────────────
    const billNo = await nextCombinedBillNo();
    const totalAmount =
      saleSubtotal + rentalSubtotal + tax - discount + Number(deposit);

    // Calculate Payment/Balance
    let paidAmount = 0;
    let balanceAmount = totalAmount;

    if (paymentStatus === "Paid") {
      paidAmount = totalAmount;
      balanceAmount = 0;
    }

    const bill = new Bill({
      billNo,
      type: "Combined",
      customer: customerId || null,
      branch,
      saleItems: processedSaleItems,
      rentalItems: processedRentalItems,
      saleSubtotal,
      rentalSubtotal,
      discount,
      tax,
      deposit: Number(deposit),
      totalAmount,
      paidAmount,
      balanceAmount,
      paymentMode,
      paymentStatus: paymentStatus || "Paid",
      status: processedRentalItems.length > 0 ? "Active" : "Closed",
    });

    await bill.save();

    // await session.commitTransaction();
    // session.endSession();

    // Populate customer and branch for response
    await bill.populate("customer branch");

    return res.status(201).json({
      message: "Combined bill created successfully",
      data: bill,
    });
  } catch (error) {
    // await session.abortTransaction();
    // session.endSession();
    console.error("❌ Combined bill creation error:", error);
    return res.status(500).json({
      message: error.message || "Failed to create combined bill",
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// GET ALL COMBINED BILLS
// ────────────────────────────────────────────────────────────────────
async function getCombinedBills(req, res) {
  try {
    const { page = 1, limit = 10, search = "", status } = req.query;

    const query = { type: "Combined" };
    if (search) {
      query.$or = [
        { billNo: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      query.status = status;
    }

    const bills = await Bill.find(query)
      .populate("customer", "name phone address")
      .populate("branch", "branchName")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Bill.countDocuments(query);

    return res.status(200).json({
      data: bills,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("❌ Get combined bills error:", error);
    return res.status(500).json({
      message: error.message || "Failed to fetch combined bills",
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// GET SINGLE COMBINED BILL
// ────────────────────────────────────────────────────────────────────
async function getCombinedBillById(req, res) {
  try {
    const { id } = req.params;

    const bill = await Bill.findById(id)
      .populate("customer", "name phone address idProofType idProofNumber")
      .populate("branch", "branchName location")
      .populate("saleItems.inventoryId", "productName")
      .populate("rentalItems.inventory", "itemName");

    if (!bill) {
      return res.status(404).json({ message: "Combined bill not found" });
    }

    return res.status(200).json({ data: bill });
  } catch (error) {
    console.error("❌ Get combined bill error:", error);
    return res.status(500).json({
      message: error.message || "Failed to fetch combined bill",
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// GET BILLS BY CUSTOMER
// ────────────────────────────────────────────────────────────────────
async function getCombinedBillsByCustomer(req, res) {
  try {
    const { customerId } = req.params;

    const bills = await Bill.find({ customer: customerId, type: "Combined" })
      .populate("branch", "branchName")
      .sort({ createdAt: -1 });

    return res.status(200).json({ data: bills });
  } catch (error) {
    console.error("❌ Get customer bills error:", error);
    return res.status(500).json({
      message: error.message || "Failed to fetch customer bills",
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// MARK RENTAL ITEMS AS RETURNED
// ────────────────────────────────────────────────────────────────────
async function markRentalItemsReturned(req, res) {
  // const session = await mongoose.startSession();
  // session.startTransaction();

  try {
    const { id } = req.params;
    const { rentalItemIds = [] } = req.body; // Array of rental item _ids to return

    const bill = await Bill.findById(id);
    if (!bill) {
      throw new Error("Combined bill not found");
    }

    if (bill.rentalItems.length === 0) {
      throw new Error("No rental items in this bill");
    }

    const returnDate = new Date();

    // Process each rental item to be returned
    for (const itemId of rentalItemIds) {
      const rentalItem = bill.rentalItems.id(itemId);
      if (!rentalItem) {
        throw new Error(`Rental item ${itemId} not found`);
      }

      if (rentalItem.status === "Returned") {
        continue; // Skip already returned items
      }

      // Update item status
      rentalItem.status = "Returned";
      rentalItem.returnedAt = returnDate;

      // Return inventory stock
      await RentalInventory.updateOne(
        { _id: rentalItem.inventory },
        { $inc: { availableStock: rentalItem.quantity } },
      );
    }

    // Update bill status
    const allReturned = bill.rentalItems.every(
      (item) => item.status === "Returned",
    );
    if (allReturned) {
      bill.status = "Closed";
    } else {
      bill.status = "Partially Returned";
    }

    await bill.save();

    // await session.commitTransaction();
    // session.endSession();

    return res.status(200).json({
      message: "Rental items returned successfully",
      data: bill,
    });
  } catch (error) {
    // await session.abortTransaction();
    // session.endSession();
    console.error("❌ Return rental items error:", error);
    return res.status(500).json({
      message: error.message || "Failed to return rental items",
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// MARK COMBINED BILL AS PAID
// ────────────────────────────────────────────────────────────────────
async function markCombinedBillAsPaid(req, res) {
  try {
    const { id } = req.params;

    const bill = await Bill.findByIdAndUpdate(
      id,
      { paymentStatus: "Paid" },
      { new: true },
    );

    if (!bill) {
      return res.status(404).json({ message: "Combined bill not found" });
    }

    return res.status(200).json({
      message: "Combined bill marked as paid",
      data: bill,
    });
  } catch (error) {
    console.error("❌ Mark combined bill as paid error:", error);
    return res.status(500).json({
      message: error.message || "Failed to mark combined bill as paid",
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// MARK COMBINED BILL AS UNPAID (REVERT)
// ────────────────────────────────────────────────────────────────────
async function markCombinedBillAsUnpaid(req, res) {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ message: "Combined bill not found" });
    }
    bill.paymentStatus = "Pending";
    bill.paidAmount = 0;
    bill.balanceAmount = bill.totalAmount;
    await bill.save();
    return res.status(200).json({
      message: "Combined bill marked as unpaid",
      data: bill,
    });
  } catch (error) {
    console.error("❌ Mark combined bill as unpaid error:", error);
    return res.status(500).json({
      message: error.message || "Failed to mark combined bill as unpaid",
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// UPDATE COMBINED BILL (RENTAL ITEMS ONLY)
// ────────────────────────────────────────────────────────────────────
async function updateCombinedBill(req, res) {
  try {
    const { id } = req.params;
    const { rentalItems: updatedItems } = req.body; // Array of { _id, days, quantity }

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ message: "Combined bill not found" });
    }

    if (bill.status === "Closed" || bill.status === "Returned") {
      // Allow editing? For now restricting.
    }

    let rentalSubtotal = 0;

    // Process Rental Items
    if (bill.rentalItems && updatedItems) {
      for (const item of bill.rentalItems) {
        const update = updatedItems.find((u) => u._id === item._id.toString());
        if (update) {
          // Handle Stock Update if quantity changes
          if (
            update.quantity !== undefined &&
            update.quantity !== item.quantity
          ) {
            const diff = item.quantity - update.quantity;
            if (diff !== 0 && item.inventory) {
              const rentalInventory = await RentalInventory.findById(
                item.inventory,
              );
              if (rentalInventory) {
                rentalInventory.availableStock += diff;
                await rentalInventory.save();
              }
            }
            item.quantity = Number(update.quantity);
          }

          if (update.days !== undefined) {
            // If originalDays is not set (legacy or first edit), set it to the OLD days value
            if (!item.originalDays) {
              item.originalDays = item.days;
            }
            // Now update to new days
            item.days = Number(update.days);

            // Recalculate return date
            const rDate = new Date(item.rentDate);
            const newRetDate = new Date(rDate);
            newRetDate.setDate(rDate.getDate() + (item.days - 1));
            item.returnDate = newRetDate;
          }

          // Recalculate Amount
          item.amount = item.pricePerDay * item.quantity * item.days;
        }
        rentalSubtotal += item.amount;
      }
    } else {
      rentalSubtotal = bill.rentalSubtotal; // Unchanged
    }

    bill.rentalSubtotal = rentalSubtotal;
    bill.totalAmount =
      bill.saleSubtotal +
      bill.rentalSubtotal +
      (bill.tax || 0) -
      (bill.discount || 0) +
      (Number(bill.deposit) || 0);

    if (req.body.discount !== undefined) {
      bill.discount = Number(req.body.discount);
      bill.totalAmount =
        bill.saleSubtotal +
        bill.rentalSubtotal +
        (bill.tax || 0) -
        bill.discount +
        (Number(bill.deposit) || 0);
    }

    // Update Balance
    bill.balanceAmount = bill.totalAmount - (bill.paidAmount || 0);
    if (bill.balanceAmount <= 0) {
      bill.balanceAmount = 0;
      bill.paymentStatus = "Paid";
    } else {
      bill.paymentStatus = bill.paidAmount > 0 ? "Partial" : "Pending";
    }

    await bill.save();

    return res.status(200).json({
      message: "Combined bill updated successfully",
      data: bill,
    });
  } catch (error) {
    console.error("❌ Update combined bill error:", error);
    return res.status(500).json({
      message: error.message || "Failed to update combined bill",
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────
module.exports = {
  createCombinedBill,
  getCombinedBills,
  getCombinedBillById,
  getCombinedBillsByCustomer,
  markRentalItemsReturned,
  markCombinedBillAsPaid,
  markCombinedBillAsUnpaid,
  updateCombinedBill,
};
