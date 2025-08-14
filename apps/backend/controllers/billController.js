// controllers/saleBill.controller.js
const mongoose = require('mongoose');
const { SaleBill } = require('../models/saleBillModel');
const { SalesInventory } = require('../models/Inventory/SalesInventoryModel');
const { Customer } = require('../models/customerModel');

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

// If you still want to keep your original generator, you can, but counters are safer.
// async function generateBillNo() { ... }

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

      // Atomic: only decrement if stock >= quantity, and return the matched variant (pre-update)
      const inv = await SalesInventory.findOneAndUpdate(
        {
          _id: inventoryId,
          'variants._id': variantId,
          'variants.stock': { $gte: quantity }
        },
        { $inc: { 'variants.$.stock': -quantity } },
        {
          new: false, // return doc BEFORE decrement so we snapshot original price/details
          projection: { name: 1, variants: { $elemMatch: { _id: variantId } } }
        }
      ).lean();

      if (!inv) {
        throw new Error('Variant not found or insufficient stock');
      }

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

    const billNo = await nextBillNo(); // use counter (or your old generateBillNo if you prefer)
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

const getBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await SaleBill.findById(id)
      .populate('customer') // basic customer details
      .lean();

    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json({ data: bill });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const listBills = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();

    const match = {};
    if (search) {
      // allow searching by billNo or SKU inside items
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

module.exports = { createSaleBill, getBillById, listBills };
