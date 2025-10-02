// services/transferSkuSalesService_notx.js
const mongoose = require("mongoose");
const { SalesInventory } = require("../models/Inventory/SalesInventoryModel");
const TransferLog = require("../models/TransferLog");

function asId(v) { try { return new mongoose.Types.ObjectId(v); } catch { return v; } }

async function transferSkuSales_NoTx(payload) {
  const {
    type = "BRANCH",
    itemId, fromBranch, toBranch, quantity,
    sku: rawSku, brand: rawBrand, size: rawSize, color: rawColor,
    reason, userId
  } = payload;

  if (!itemId || !fromBranch || !quantity) {
    throw new Error("itemId, fromBranch, quantity are required");
  }
  const isBranch = type === "BRANCH";
  if (isBranch && !toBranch) throw new Error("toBranch is required for BRANCH transfer");
  if (!isBranch && !reason?.trim()) throw new Error("Reason is required for THEFT/SCRAP");
  if (isBranch && String(fromBranch) === String(toBranch)) {
    throw new Error("fromBranch and toBranch cannot be the same");
  }

  const qty = Number(quantity);
  if (!qty || qty <= 0) throw new Error("quantity must be > 0");

  const fromId = asId(fromBranch);
  const toId   = isBranch ? asId(toBranch) : null;

  // 1) Load source item & locate the exact variant
  const src = await SalesInventory.findOne({ _id: asId(itemId), branch: fromId });
  if (!src) throw new Error("Source item not found at source branch");

  const skuUp = rawSku?.toUpperCase?.();
  const srcVar = skuUp
    ? (src.variants || []).find(v => (v.sku || "").toUpperCase() === skuUp)
    : (src.variants || []).find(v =>
        (v.brand || "") === (rawBrand || "") &&
        (v.size  || "") === (rawSize  || "") &&
        (v.color || "") === (rawColor || "")
      );
  if (!srcVar) throw new Error("Variant not found in source item");

  const sku = (srcVar.sku || skuUp || "").toUpperCase();
  if (!sku) throw new Error("SKU required");
  if ((srcVar.stock || 0) < qty) throw new Error("Insufficient stock in source variant");

  // 2) Deduct from source (guarded)
  const decRes = await SalesInventory.updateOne(
    {
      _id: src._id,
      branch: fromId,
      variants: { $elemMatch: { sku, stock: { $gte: qty } } },
    },
    { $inc: { "variants.$[v].stock": -qty } },
    { arrayFilters: [{ "v.sku": sku }] }
  );
  if (decRes.matchedCount === 0 || decRes.modifiedCount === 0) {
    throw new Error("Failed to deduct stock (concurrent update?)");
  }

  let credited = false;
  try {
    if (isBranch) {
      // 3) Ensure/get destination tool (top-level only)
      const dest = await SalesInventory.findOneAndUpdate(
        { name: src.name, branch: toId },
        {
          $setOnInsert: {
            name: src.name,
            description: src.description,
            category: src.category,
            branch: toId,
          },
        },
        { upsert: true, new: true }
      );

      // 4) Load the destination doc by _id, mutate variants in JS, then save
      const destDoc = await SalesInventory.findById(dest._id);
      if (!destDoc) throw new Error("Destination doc unexpectedly missing after upsert");

      const idx = (destDoc.variants || []).findIndex(
        v => (v.sku || "").toUpperCase() === sku
      );

      if (idx >= 0) {
        destDoc.variants[idx].stock = Number(destDoc.variants[idx].stock || 0) + qty;
      } else {
        destDoc.variants.push({
          sku,
          brand: srcVar.brand || rawBrand || "",
          size:  srcVar.size  || rawSize  || "",
          color: srcVar.color || rawColor || null,
          price: typeof srcVar.price === "number" ? srcVar.price : 0,
          stock: qty,
        });
      }

      // save with validation
      await destDoc.save();
      credited = true;
    }

    // 5) Log AFTER successful operations
    await TransferLog.create({
      type, // "BRANCH" | "THEFT" | "SCRAP"
      itemName: src.name,
      sku,
      brand: srcVar.brand,
      size: srcVar.size,
      color: srcVar.color,
      price: srcVar.price,
      fromBranch: fromId,
      toBranch: isBranch ? toId : null,
      quantity: qty,
      sourceItemId: src._id,
      reason,
      createdBy: userId || undefined,
      status: "COMPLETED",
    });

    return { ok: true, destItemId: credited ? true : null };
  } catch (err) {
    // Compensation for BRANCH on failure (add back to source)
    if (isBranch && !credited) {
      await SalesInventory.updateOne(
        { _id: src._id, branch: fromId, "variants.sku": sku },
        { $inc: { "variants.$[v].stock": qty } },
        { arrayFilters: [{ "v.sku": sku }] }
      );
    }
    throw err;
  }
}

module.exports = { transferSkuSales_NoTx };
