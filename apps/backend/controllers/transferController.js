// controllers/transferController.js
const mongoose = require("mongoose");
const { transferSkuSales } = require("../services/transferSkuSalesService");           // TX version
const { transferSkuSales_NoTx } = require("../services/transferSkuSalesService_notx"); // No-TX fallback
const TransferLog = require("../models/TransferLog");

const USE_TXN = process.env.MONGO_USE_TXN === "true"; // set to "true" when running a replica set

const isObjId = (v) => mongoose.isValidObjectId(v);

exports.createTransfer = async (req, res) => {
  try {
    const {
      type = "BRANCH", // BRANCH | THEFT | SCRAP
      itemId,
      fromBranch,
      toBranch,
      quantity,
      sku,
      brand,
      size,
      color,
      reason,
    } = req.body;

    const t = String(type).toUpperCase();
    const isBranch = t === "BRANCH";

    // Basic validation
    if (!isObjId(itemId) || !isObjId(fromBranch)) {
      return res.status(400).json({ error: "Invalid itemId/fromBranch" });
    }
    if (isBranch && !isObjId(toBranch)) {
      return res.status(400).json({ error: "Invalid toBranch for BRANCH transfer" });
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: "Quantity must be a positive number" });
    }

    if (isBranch && String(fromBranch) === String(toBranch)) {
      return res.status(400).json({ error: "fromBranch and toBranch cannot be the same" });
    }

    if (!isBranch && !String(reason || "").trim()) {
      return res.status(400).json({ error: "Reason is required for THEFT/SCRAP" });
    }

    const payload = {
      type: t,
      itemId: new mongoose.Types.ObjectId(itemId),
      fromBranch: new mongoose.Types.ObjectId(fromBranch),
      quantity: qty,
      sku,
      brand,
      size,
      color,
      userId: req.user?._id, // requires auth middleware that sets req.user
      reason,
      ...(isBranch && toBranch ? { toBranch: new mongoose.Types.ObjectId(toBranch) } : {}),
    };

    // Choose service based on env (replica set vs standalone)
    const run = USE_TXN ? transferSkuSales : transferSkuSales_NoTx;
    const log = await run(payload);

    res.status(201).json({
      message: isBranch ? "Transfer completed" : "Stock adjusted",
      transfer: log,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Transfer failed" });
  }
};

// GET /api/transfers?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&branch=<id>&sku=...&item=...&type=BRANCH|THEFT|SCRAP&page=1&limit=20
exports.getTransfers = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      branch,            // filter by either fromBranch or toBranch
      sku,
      item,
      type,              // optional filter: BRANCH | THEFT | SCRAP
      page = 1,
      limit = 20,
    } = req.query;

    const q = {};
    if (fromDate || toDate) {
      q.createdAt = {};
      if (fromDate) q.createdAt.$gte = new Date(fromDate);
      if (toDate)   q.createdAt.$lte = new Date(toDate);
    }
    if (sku) q.sku = new RegExp(`^${String(sku).trim()}`, "i");      // begins-with
    if (item) q.itemName = new RegExp(String(item).trim(), "i");     // contains
    if (branch && isObjId(branch)) {
      q.$or = [{ fromBranch: branch }, { toBranch: branch }];
    }
    if (type) {
      const t = String(type).toUpperCase();
      if (["BRANCH", "THEFT", "SCRAP"].includes(t)) q.type = t;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * lim;

    const [data, total] = await Promise.all([
      TransferLog.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("fromBranch toBranch", "name"),
      TransferLog.countDocuments(q),
    ]);

    res.json({
      data,
      page: pageNum,
      limit: lim,
      total,
      pages: Math.ceil(total / lim),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
