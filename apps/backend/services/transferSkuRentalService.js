// services/transferSkuRentalService.js
const mongoose = require("mongoose");
// Adjust the path if needed:
const { RentalInventory } = require("../models/Inventory/RentalInventoryModel");
const TransferLog = require("../models/TransferLog");

function asId(v) { try { return new mongoose.Types.ObjectId(v); } catch { return v; } }

async function transferSkuRental(payload) {
  const {
    type = "BRANCH",               // "BRANCH" | "THEFT" | "SCRAP"
    itemId, fromBranch, toBranch,
    quantity,
    sku: rawSku,
    brand: rawBrand, size: rawSize, color: rawColor,
    reason,
    userId
  } = payload;

  // Basic validations
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

  const session = await mongoose.startSession();
  try {
    let logDoc;

    await session.withTransaction(async () => {
      // 1) Load source item in-session
      const src = await RentalInventory.findOne(
        { _id: asId(itemId), branch: fromId },
        null,
        { session }
      );
      if (!src) throw new Error("Source item not found at source branch");

      // 2) Find exact variant
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
      if (!sku) throw new Error("SKU is required or derivable from variant");
      if ((srcVar.stock || 0) < qty) throw new Error("Insufficient stock in source variant");

      // 3) Guarded decrement from source
      const decRes = await RentalInventory.updateOne(
        {
          _id: src._id,
          branch: fromId,
          variants: { $elemMatch: { sku, stock: { $gte: qty } } },
        },
        { $inc: { "variants.$[v].stock": -qty } },
        { arrayFilters: [{ "v.sku": sku }], session }
      );
      if (decRes.matchedCount === 0 || decRes.modifiedCount === 0) {
        throw new Error("Failed to deduct stock (concurrent update?)");
      }

      // 4) Destination (branch only)
      if (isBranch) {
        const dest = await RentalInventory.findOneAndUpdate(
          { name: src.name, branch: toId },
          {
            $setOnInsert: {
              name: src.name,
              description: src.description,
              category: src.category,
              branch: toId,
            },
          },
          { upsert: true, new: true, session }
        );

        const destDoc = await RentalInventory.findById(dest._id, null, { session });
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
            pricePerDay: typeof srcVar.pricePerDay === "number" ? srcVar.pricePerDay : 0,
            stock: qty
          });
        }

        await destDoc.save({ session });
      }

      // 5) Log (store pricePerDay into `price`)
      const [log] = await TransferLog.create([{
        type,
        itemName: src.name,
        sku,
        brand: srcVar.brand,
        size: srcVar.size,
        color: srcVar.color,
        price: srcVar.pricePerDay,          // ⬅️ keep parity with sales log field
        fromBranch: fromId,
        toBranch: isBranch ? toId : null,
        quantity: qty,
        sourceItemId: src._id,              // references RentalInventory; schema ref name isn't enforced here
        reason: reason || undefined,
        createdBy: userId || undefined,
        status: "COMPLETED",
      }], { session });

      logDoc = log;
    });

    return logDoc;
  } finally {
    session.endSession();
  }
}

module.exports = { transferSkuRental };
