import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose as PopupClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Helper to normalize ids
const normId = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val.$oid || val._id || val.id || "";
  }
  return String(val);
};

export default function UnifiedTransferDialog({
  open,
  onOpenChange,
  branches = [],
  inventories = [],
  type = "sales", // "sales" or "rental"
  API_BASE,
  t = (k) => k,
  onSubmit = async () => {}, // only used for branch/theft/scrap
}) {
  // Fields
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");

  const [transferScope, setTransferScope] = useState("branch"); // "branch", "convert", "theft", "scrap"

  const [fromBranch, setFromBranch] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState(""); // for theft/scrap
  const [price, setPrice] = useState(""); // for conversion (sale price or price per day)

  const [showItemList, setShowItemList] = useState(false);

  // Derived target type for conversion
  const targetType = type === "sales" ? "rental" : "sales";

  // Reset logic
  useEffect(() => {
    if (!open) {
      setSearch("");
      setItemId("");
      setBrand("");
      setSize("");
      setColor("");
      setFromBranch("");
      setToBranch("");
      setQty("");
      setReason("");
      setPrice("");
      setTransferScope("branch");
    }
  }, [open]);

  // When scope calls for conversion, force toBranch = fromBranch
  useEffect(() => {
    if (transferScope === "convert") {
      setToBranch(fromBranch);
    } else if (transferScope !== "branch") {
      setToBranch("");
    }
  }, [transferScope, fromBranch]);

  // --- Data Processing (reused from TransferSkuDialog) ---

  // Group by Item Name (to merge branches for the same item in the dropdown)
  const itemsById = useMemo(() => {
    const map = new Map();
    for (const row of inventories) {
      const id = row.name ? row.name.toLowerCase().trim() : normId(row._id);
      if (!id) continue;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(row);
    }
    return map;
  }, [inventories]);

  // Options for search
  const itemOptions = useMemo(() => {
    const list = [];
    for (const [id, rows] of itemsById.entries()) {
      const name = rows[0]?.name || `Item ${id.slice(0, 6)}`;
      list.push({ id, name });
    }
    return list
      .filter((it) => it.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsById, search]);

  // Variants for selected Item
  const variantsForItem = useMemo(() => {
    if (!itemId) return [];
    const rows = itemsById.get(itemId) || [];
    const sig = (v) => `${v.brand}|||${v.size}|||${v.color}`;
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      for (const v of r.variants || []) {
        const key = sig(v);
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            brand: v.brand || "",
            size: v.size || "",
            color: v.color || "",
            // We don't store stock/sku here because it varies by branch,
            // but we need them later.
          });
        }
      }
    }
    return out.sort((a, b) =>
      `${a.brand}-${a.size}-${a.color}`
        .toLowerCase()
        .localeCompare(`${b.brand}-${b.size}-${b.color}`.toLowerCase())
    );
  }, [itemId, itemsById]);

  // Cascading dropdowns
  const brandsForItem = useMemo(() => {
    const uniq = new Set(variantsForItem.map((v) => v.brand));
    return Array.from(uniq).filter(Boolean).sort();
  }, [variantsForItem]);

  const sizesForBrand = useMemo(() => {
    const uniq = new Set(
      variantsForItem.filter((v) => v.brand === brand).map((v) => v.size)
    );
    return Array.from(uniq).filter(Boolean).sort();
  }, [variantsForItem, brand]);

  const colorsForBrandSize = useMemo(() => {
    const uniq = new Set(
      variantsForItem
        .filter((v) => v.brand === brand && v.size === size)
        .map((v) => v.color)
    );
    return Array.from(uniq).filter(Boolean).sort();
  }, [variantsForItem, brand, size]);

  // Calculate stock per branch for the exact chosen variant
  const stockByBranch = useMemo(() => {
    if (!itemId || !brand || !size || !color) return {};
    const rows = itemsById.get(itemId) || [];
    const map = {};
    for (const r of rows) {
      const bId = normId(r.branch) || normId(r.branchId);
      if (!bId) continue;
      let sum = map[bId] || 0;
      for (const v of r.variants || []) {
        if (
          (v.brand || "") === brand &&
          (v.size || "") === size &&
          (v.color || "") === color
        ) {
          sum += Number(v.stock || 0);
        }
      }
      map[bId] = sum;
    }
    return map;
  }, [itemId, brand, size, color, itemsById]);

  const availableFrom = Number(stockByBranch[fromBranch] || 0);

  // Field resets
  useEffect(() => {
    setBrand("");
    setSize("");
    setColor("");
    setFromBranch("");
    setToBranch("");
    setQty("");
  }, [itemId]);
  useEffect(() => {
    setSize("");
    setColor("");
    setQty("");
  }, [brand]);
  useEffect(() => {
    setColor("");
    setQty("");
  }, [size]);

  // Auto-pick source branch with most stock
  useEffect(() => {
    if (availableFrom > 0) return; // already picked valid
    if (!itemId || !brand || !size || !color) return;

    let best = "";
    let maxS = 0;
    for (const b of branches) {
      const bId = normId(b._id);
      const s = Number(stockByBranch[bId] || 0);
      if (s > maxS) {
        maxS = s;
        best = bId;
      }
    }
    if (best) {
      setFromBranch(best);
      // Auto-pick "To Branch" if relevant
      if (transferScope === "branch") {
        const alt = branches.find((b) => normId(b._id) !== best);
        if (alt) setToBranch(normId(alt._id));
      }
    }
  }, [
    brand,
    size,
    color,
    itemId,
    branches,
    stockByBranch,
    availableFrom,
    transferScope,
  ]);

  // Find SKU for conversion
  const getSku = () => {
    const rows = itemsById.get(itemId) || [];
    // We need the SKU from the specific branch's inventory item if possible,
    // or ANY matching variant if SKUs are consistent across branches.
    // Usually SKU is consistent.
    for (const r of rows) {
      const v = (r.variants || []).find(
        (v) =>
          (v.brand || "") === brand &&
          (v.size || "") === size &&
          (v.color || "") === color
      );
      if (v?.sku) return v.sku;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = Number(qty);

    // Validation
    if (!itemId || !brand || !size || !color)
      return toast.error(t("inventory.selectItem") || "Select Item & Variant");
    if (!fromBranch)
      return toast.error(t("inventory.selectBranch") || "Select From Branch");
    if (q <= 0)
      return toast.error(t("inventory.quantity") || "Enter valid quantity");
    if (q > availableFrom)
      return toast.error(
        t("inventory.insufficientStock") || "Insufficient stock"
      );

    if (transferScope === "branch") {
      if (!toBranch)
        return toast.error(t("inventory.selectToBranch") || "Select To Branch");
      if (fromBranch === toBranch)
        return toast.error(
          t("common.sameBranchError") || "Cannot transfer to same branch"
        );
    }

    if (
      (transferScope === "theft" || transferScope === "scrap") &&
      !reason.trim()
    ) {
      return toast.error(t("inventory.reasonRequired") || "Reason is required");
    }

    // Find the exact document ID for the fromBranch
    let realItemId = null;
    const rows = itemsById.get(itemId) || [];
    for (const r of rows) {
      if (normId(r.branch) === fromBranch || normId(r.branchId) === fromBranch) {
        realItemId = normId(r._id);
        break;
      }
    }
    if (!realItemId) {
      return toast.error("Document not found for selected branch");
    }

    // Conversion logic
    if (transferScope === "convert") {
      const sku = getSku();
      if (!sku)
        return toast.error(
          t("inventory.skuNotFound") || "Variant SKU not found"
        );

      // Validate price is provided for conversions
      if (!price || Number(price) <= 0) {
        return toast.error(
          type === "sales"
            ? "Price per Day is required for sales-to-rental conversion"
            : "Sale Price is required for rental-to-sales conversion"
        );
      }

      try {
        const isSalesToRental = type === "sales";
        const endpoint = isSalesToRental
          ? "sales-to-rental"
          : "rental-to-sales";
        const url = `${API_BASE}/inventory/transfer/${endpoint}`;

        const body = {
          fromBranchId: fromBranch,
          toBranchId: fromBranch, // same branch
          quantity: q,
          // sales->rental
          salesItemId: isSalesToRental ? realItemId : undefined,
          salesSku: isSalesToRental ? sku : undefined,
          pricePerDay: isSalesToRental && price ? Number(price) : undefined,
          // rental->sales
          rentalItemId: !isSalesToRental ? realItemId : undefined,
          rentalSku: !isSalesToRental ? sku : undefined,
          salePrice: !isSalesToRental && price ? Number(price) : undefined,
        };

        const res = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || "Conversion failed");

        toast.success(
          t("inventory.transferSuccess") || "Transferred successfully"
        );
        onOpenChange(false);
      } catch (err) {
        toast.error(err.message);
      }
      return;
    }

    // Standard logic (Branch / Theft / Scrap) - delegate to parent
    try {
      const payload = {
        type: transferScope, // 'branch', 'theft', 'scrap'
        itemId: realItemId,
        brand,
        size,
        color,
        fromBranch,
        quantity: q,
        reason: reason || undefined,
        toBranch: transferScope === "branch" ? toBranch : undefined,
      };
      await onSubmit(payload);
      onOpenChange(false);
    } catch (err) {
      // toast handled in parent usually, but safe to do here? parent does it.
    }
  };
  const submitLabel = useMemo(() => {
    if (transferScope === "theft") return "Confirm Theft";
    if (transferScope === "scrap") return "Confirm Scrap";
    if (transferScope === "convert") return "Convert Inventory";
    return "Confirm Transfer";
  }, [transferScope]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[95vw] !max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>
            {t("inventory.manageStock") || "Manage Stock & Transfers"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Top Row: Search & Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-semibold mb-1">
                {t("inventory.selectItem") || "Select Item"}
              </label>
              <Input
                placeholder="Search Item..."
                value={
                  itemId
                    ? itemOptions.find((i) => i.id === itemId)?.name || ""
                    : search
                }
                onFocus={() => setShowItemList(true)}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setItemId("");
                  setShowItemList(true);
                }}
              />
              {(itemId || search) && (
                <button
                  type="button"
                  className="absolute right-2 top-8 text-gray-400 hover:text-black"
                  onClick={() => {
                    setSearch("");
                    setItemId("");
                    setShowItemList(false);
                  }}
                >
                  ✕
                </button>
              )}
              {showItemList && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded border bg-background shadow">
                  {itemOptions.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No items found
                    </div>
                  ) : (
                    itemOptions.map((it) => (
                      <div
                        key={it.id}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                        onClick={() => {
                          setItemId(it.id);
                          setSearch("");
                          setShowItemList(false);
                        }}
                      >
                        {it.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Variant Selectors */}
            <div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Brand
                  </label>
                  <select
                    className="w-full p-2 border rounded"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    disabled={!itemId}
                  >
                    <option value="">Select</option>
                    {brandsForItem.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Size
                  </label>
                  <select
                    className="w-full p-2 border rounded"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    disabled={!brand}
                  >
                    <option value="">Select</option>
                    {sizesForBrand.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Color
                  </label>
                  <select
                    className="w-full p-2 border rounded"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={!size}
                  >
                    <option value="">Select</option>
                    {colorsForBrandSize.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Setup: Transfer Scope & Branches */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t("inventory.transferType") || "Transfer Type"}
              </label>
              <select
                className="w-full p-2 border rounded font-medium"
                value={transferScope}
                onChange={(e) => setTransferScope(e.target.value)}
              >
                <option value="branch">
                  {t("inventory.type.branch") || "Branch Transfer"}
                </option>
                <option value="convert">
                  {type === "sales" ? "Move to Rental" : "Move to Sales"}
                </option>
                <option value="theft">
                  {t("inventory.type.theft") || "Report Theft"}
                </option>
                <option value="scrap">
                  {t("inventory.type.scrap") || "Report Scrap"}
                </option>
              </select>
              {transferScope === "convert" && (
                <p className="text-[10px] text-blue-600 mt-1">
                  Converts stock from {type === "sales" ? "Sales" : "Rental"} to{" "}
                  {targetType}.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {t("inventory.fromBranch") || "From Branch"}
              </label>
              <select
                className="w-full p-2 border rounded"
                value={fromBranch}
                onChange={(e) => setFromBranch(e.target.value)}
                disabled={!color}
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={normId(b._id)} value={normId(b._id)}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-muted-foreground mt-1">
                Available: <b>{availableFrom}</b>
              </div>
            </div>

            {/* To Branch: Hidden for theft/scrap, forced for convert */}
            {transferScope !== "theft" && transferScope !== "scrap" && (
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t("inventory.toBranch") || "To Branch"}
                </label>
                <select
                  className="w-full p-2 border rounded"
                  value={toBranch}
                  onChange={(e) => setToBranch(e.target.value)}
                  disabled={!fromBranch || transferScope === "convert"}
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={normId(b._id)} value={normId(b._id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Details Row: Qty, Price (if convert), Reason (if theft/scrap) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t("inventory.quantity") || "Quantity"}
                </label>
                <Input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="Qty"
                  max={availableFrom}
                />
              </div>

              {transferScope === "convert" && (
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {type === "sales" ? "Price per Day *" : "Sale Price *"}
                  </label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={type === "sales" ? "Rent Price" : "Sale Price"}
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>
              )}
            </div>

            <div>
              {(transferScope === "theft" || transferScope === "scrap") && (
                <div className="mb-0">
                  <label className="block text-xs font-semibold mb-1">
                    Reason (Required)
                  </label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Details..."
                  />
                </div>
              )}
              {transferScope === "branch" && (
                <div className="mb-0">
                  <label className="block text-xs font-semibold mb-1">
                    Transfer Note (Optional)
                  </label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ref #..."
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <PopupClose asChild>
              <Button variant="outline" className="mr-2" type="button">
                Cancel
              </Button>
            </PopupClose>
            <Button
              type="submit"
              disabled={
                !itemId || !brand || !fromBranch || Number(qty) > availableFrom
              }
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
