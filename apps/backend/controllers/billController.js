// controllers/saleBill.controller.js
const mongoose = require("mongoose");
const { Bill } = require("../models/billModel");
const { SalesInventory } = require("../models/Inventory/SalesInventoryModel");
const { Customer } = require("../models/customerModel");
const {
  Types: { ObjectId },
} = mongoose;

// Simple bill number generator: INV-YYYY-######
// You can replace this with a counter collection if you prefer strict sequential.
const Counter = mongoose.model(
  "Counter",
  new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }),
);
async function nextBillNo() {
  const y = new Date().getFullYear();
  const c = await Counter.findOneAndUpdate(
    { _id: `bill-${y}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return `INV-${y}-${String(c.seq).padStart(6, "0")}`;
}

// -----------------------------------------------------------------------------
// ✅ Create Sale Bill with correct variant stock decrement (using arrayFilters)
// -----------------------------------------------------------------------------
const createSaleBill = async (req, res) => {
  try {
    const {
      customerId,
      items = [],
      paymentMode = "Cash",
      paymentStatus = "Paid",
      discount = 0,
      tax = 0,
      notes,
      branch: sentBranch, // ⭐ coming from FE admin selection
    } = req.body;

    // if (!customerId) throw new Error("customerId is required"); // Removed for Walk-in

    // ⭐ FIX: STAFF uses req.user.branchId
    //         ADMIN uses req.body.branch
    const branchId = sentBranch || req.user.branchId || req.user.branch?._id;

    if (!branchId) {
      throw new Error("Branch information missing for user");
    }

    // ⭐ VERY IMPORTANT:
    // Audit Plugin reads ctx.user.branch
    // So we must set it manually for admin
    req.user.branch = branchId;

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item is required");
    }

    let customer = null;
    if (customerId) {
      customer = await Customer.findById(customerId);
      if (!customer) throw new Error("Customer not found");
    }

    let billItems = [];
    let subtotal = 0;

    for (const raw of items) {
      const { inventoryId, variantId, quantity, overridePrice } = raw;

      const inv = await SalesInventory.findOneAndUpdate(
        {
          _id: inventoryId,
          branch: branchId, // ⭐ stock only from selected branch
          variants: {
            $elemMatch: { _id: variantId, stock: { $gte: quantity } },
          },
        },
        { $inc: { "variants.$[v].stock": -quantity } },
        {
          arrayFilters: [{ "v._id": variantId }],
          new: false,
          projection: { name: 1, variants: { $elemMatch: { _id: variantId } } },
        },
      ).lean();

      if (!inv) throw new Error("Variant not found or insufficient stock");

      const variant = inv.variants[0];
      const unitPrice = overridePrice ?? variant.price;
      const lineTotal = unitPrice * quantity;

      billItems.push({
        inventoryId,
        variantId,
        productName: inv.name,
        sku: variant.sku,
        brand: variant.brand,
        size: variant.size,
        color: variant.color,
        unitPrice,
        quantity,
        lineTotal,
      });

      subtotal += lineTotal;
    }

    const billNo = await nextBillNo();
    const totalAmount = subtotal - discount + tax;

    // Calculate Payment/Balance
    let paidAmount = 0;
    let balanceAmount = totalAmount;

    if (paymentStatus === "Paid") {
      paidAmount = totalAmount;
      balanceAmount = 0;
    }

    const billDoc = await Bill.create({
      billNo,
      type: "Sale",
      customer: customerId,
      branch: branchId, // ⭐ HERE branch is saved correctly
      saleItems: billItems,
      subtotal,
      discount,
      tax,
      totalAmount,
      paidAmount,
      balanceAmount,
      paymentMode,
      paymentStatus: paymentStatus || "Paid",
      notes,
    });

    res.status(201).json({ message: "Bill created", data: billDoc });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// -----------------------------------------------------------------------------
// Get Bills by Customer
// -----------------------------------------------------------------------------
const getBillsByCustomer = async (req, res) => {
  try {
    const customerId = req.query.customerId || req.params.customerId;
    if (!customerId) {
      return res.status(400).json({ message: "customerId is required" });
    }

    const filter = { type: "Sale" };
    if (ObjectId.isValid(customerId)) {
      filter.customer = new ObjectId(customerId);
    } else {
      filter.customer = customerId;
    }

    const bills = await Bill.find(filter)
      .sort({ createdAt: -1 })
      .populate("customer")
      .lean();

    return res.json({ data: bills });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// -----------------------------------------------------------------------------
// List All Bills (pagination + search)
// -----------------------------------------------------------------------------
const listBills = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || "").trim();

    const match = { type: "Sale" };
    if (search) {
      match.$or = [
        { billNo: new RegExp(search, "i") },
        { "saleItems.sku": new RegExp(search, "i") },
      ];
    }

    const [rows, total] = await Promise.all([
      Bill.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("customer", "name phone")
        .lean(),
      Bill.countDocuments(match),
    ]);

    res.json({
      data: rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// -----------------------------------------------------------------------------
// Get Single Bill by ID
// -----------------------------------------------------------------------------
const getBillById = async (req, res) => {
  try {
    const { billId } = req.params;

    if (!billId || !ObjectId.isValid(billId)) {
      return res.status(400).json({ message: "Invalid bill ID" });
    }

    const bill = await Bill.findById(billId)
      .populate("customer", "name phone email address")
      .populate("branch", "branchName")
      .lean();

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    return res.json({ data: bill });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// -----------------------------------------------------------------------------
// Generate PDF for a Bill
// -----------------------------------------------------------------------------
const generateBillPdf = async (req, res) => {
  try {
    const { billId } = req.params;

    if (!billId || !ObjectId.isValid(billId)) {
      return res.status(400).json({ message: "Invalid bill ID" });
    }

    const bill = await Bill.findById(billId)
      .populate("customer", "name phone email address")
      .lean();

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Check if PDFKit is available
    try {
      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument({ margin: 50 });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Bill-${bill.billNo}.pdf`,
      );

      // Pipe PDF to response
      doc.pipe(res);

      // Add content to PDF
      doc.fontSize(20).text("INVOICE", { align: "center" });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Bill No: ${bill.billNo}`, 50, 100);
      doc.text(
        `Date: ${new Date(bill.billingDate || bill.createdAt).toLocaleDateString("en-IN")}`,
        50,
        115,
      );

      doc.text(`Customer: ${bill.customer?.name || "N/A"}`, 50, 145);
      doc.text(`Phone: ${bill.customer?.phone || "N/A"}`, 50, 160);

      // Items table
      doc.moveDown(2);
      let yPos = 200;

      doc.fontSize(10).text("Item", 50, yPos);
      doc.text("Qty", 300, yPos);
      doc.text("Rate", 370, yPos);
      doc.text("Amount", 470, yPos, { align: "right" });

      doc
        .moveTo(50, yPos + 15)
        .lineTo(550, yPos + 15)
        .stroke();

      yPos += 25;

      (bill.saleItems || []).forEach((item, idx) => {
        const itemName = item.productName || item.name || "Item";
        const qty = item.quantity || item.qty || 0;
        const price = item.unitPrice || item.price || 0;
        const amount = qty * price;

        doc.text(itemName, 50, yPos);
        doc.text(qty.toString(), 300, yPos);
        doc.text(`₹${price.toFixed(2)}`, 370, yPos);
        doc.text(`₹${amount.toFixed(2)}`, 470, yPos, { align: "right" });

        yPos += 20;
      });

      // Totals
      yPos += 20;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 15;

      doc.fontSize(11);
      doc.text("Subtotal:", 370, yPos);
      doc.text(`₹${(bill.subtotal || 0).toFixed(2)}`, 470, yPos, {
        align: "right",
      });
      yPos += 20;

      if (bill.discount) {
        doc.text("Discount:", 370, yPos);
        doc.text(`-₹${bill.discount.toFixed(2)}`, 470, yPos, {
          align: "right",
        });
        yPos += 20;
      }

      if (bill.tax) {
        doc.text("Tax:", 370, yPos);
        doc.text(`₹${bill.tax.toFixed(2)}`, 470, yPos, { align: "right" });
        yPos += 20;
      }

      doc.fontSize(12).font("Helvetica-Bold");
      doc.text("Total:", 370, yPos);
      doc.text(`₹${(bill.totalAmount || 0).toFixed(2)}`, 470, yPos, {
        align: "right",
      });

      yPos += 30;
      doc.fontSize(10).font("Helvetica");
      doc.text(`Payment Mode: ${bill.paymentMode || "Cash"}`, 50, yPos);

      if (bill.notes) {
        yPos += 30;
        doc.text("Notes:", 50, yPos);
        doc.text(bill.notes, 50, yPos + 15, { width: 500 });
      }

      // Finalize PDF
      doc.end();
    } catch (pdfError) {
      console.error("PDFKit not available:", pdfError);
      // Return JSON response if PDF generation fails
      return res.status(501).json({
        message:
          "PDF generation not available on server. Please use client-side PDF generation.",
        data: bill,
      });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

const markAsPaid = async (req, res) => {
  try {
    const { billId } = req.params;
    const bill = await Bill.findByIdAndUpdate(
      billId,
      {
        paymentStatus: "Paid",
        paidAmount: await Bill.findById(billId).then(
          (b) => b?.totalAmount || 0,
        ),
        balanceAmount: 0,
      },
      { new: true },
    );
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    res.status(200).json({ message: "Bill marked as paid", data: bill });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -----------------------------------------------------------------------------
// Mark Bill as Unpaid (Revert)
// -----------------------------------------------------------------------------
const markAsUnpaid = async (req, res) => {
  try {
    const { billId } = req.params;
    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    bill.paymentStatus = "Pending";
    bill.paidAmount = 0;
    bill.balanceAmount = bill.totalAmount;
    await bill.save();
    res.status(200).json({ message: "Bill marked as unpaid", data: bill });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -----------------------------------------------------------------------------
// Update Bill (Discount Only)
// -----------------------------------------------------------------------------
const updateBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const { discount } = req.body;

    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (discount !== undefined) {
      bill.discount = Number(discount);
      bill.totalAmount = (bill.subtotal || 0) + (bill.tax || 0) - bill.discount;

      // Update Balance
      bill.balanceAmount = bill.totalAmount - (bill.paidAmount || 0);
      if (bill.balanceAmount <= 0) {
        bill.balanceAmount = 0;
        bill.paymentStatus = "Paid";
      } else {
        bill.paymentStatus = bill.paidAmount > 0 ? "Partial" : "Pending";
      }
    }

    await bill.save();
    return res.status(200).json({ message: "Bill updated", data: bill });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = {
  createSaleBill,
  getBillsByCustomer,
  listBills,
  getBillById,
  generateBillPdf,
  markAsPaid,
  markAsUnpaid,
  updateBill,
};
