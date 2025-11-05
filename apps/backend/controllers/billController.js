// controllers/saleBill.controller.js
const mongoose = require('mongoose');
const { SaleBill } = require('../models/saleBillModel');
const { SalesInventory } = require('../models/Inventory/SalesInventoryModel');
const { Customer } = require('../models/customerModel');
const { Types: { ObjectId } } = mongoose;

// Simple bill number generator: INV-YYYY-######
// You can replace this with a counter collection if you prefer strict sequential.
const Counter = mongoose.model('Counter', new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }));
async function nextBillNo() {
  const y = new Date().getFullYear();
  const c = await Counter.findOneAndUpdate(
    { _id: `bill-${y}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `INV-${y}-${String(c.seq).padStart(6, '0')}`;
}

// -----------------------------------------------------------------------------
// ✅ Create Sale Bill with correct variant stock decrement (using arrayFilters)
// -----------------------------------------------------------------------------
const createSaleBill = async (req, res) => {
  try {
    const { customerId, items = [], paymentMode = 'Cash', discount = 0, tax = 0, notes } = req.body;

    if (!customerId) throw new Error('customerId is required');
    if (!Array.isArray(items) || items.length === 0) throw new Error('At least one item is required');

    const customer = await Customer.findById(customerId);
    if (!customer) throw new Error('Customer not found');

    const billItems = [];
    let subtotal = 0;

    for (const raw of items) {
      const { inventoryId, variantId, quantity, overridePrice } = raw;
      if (!inventoryId || !variantId || !quantity || quantity < 1) {
        throw new Error('Each item needs inventoryId, variantId, quantity >= 1');
      }

      // ✅ Fixed logic — only decrement the matching variant
      const inv = await SalesInventory.findOneAndUpdate(
        {
          _id: inventoryId,
          variants: { $elemMatch: { _id: variantId, stock: { $gte: quantity } } },
        },
        { $inc: { 'variants.$[v].stock': -quantity } },
        {
          arrayFilters: [{ 'v._id': variantId }],
          new: false,
          projection: { name: 1, variants: { $elemMatch: { _id: variantId } } },
        }
      ).lean();

      if (!inv) throw new Error('Variant not found or insufficient stock');

      const variant = inv.variants[0];
      const unitPrice = typeof overridePrice === 'number' ? overridePrice : variant.price;
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
    const totalAmount = subtotal - (discount || 0) + (tax || 0);

    const billDoc = await SaleBill.create({
      billNo,
      customer: customerId,
      items: billItems,
      subtotal,
      discount,
      tax,
      totalAmount,
      paymentMode,
      notes,
    });

    res.status(201).json({ message: 'Bill created', data: billDoc });
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

    const filter = {};
    if (ObjectId.isValid(customerId)) {
      filter.customer = new ObjectId(customerId);
    } else {
      filter.customer = customerId;
    }

    const bills = await SaleBill.find(filter)
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
    const search = (req.query.search || '').trim();

    const match = {};
    if (search) {
      match.$or = [
        { billNo: new RegExp(search, 'i') },
        { 'items.sku': new RegExp(search, 'i') },
      ];
    }

    const [rows, total] = await Promise.all([
      SaleBill.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('customer', 'name phone')
        .lean(),
      SaleBill.countDocuments(match),
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

module.exports = { createSaleBill, getBillsByCustomer, listBills };
