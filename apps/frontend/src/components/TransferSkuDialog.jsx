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

// Helper to normalize ids whether they come as string or { $oid } or {_id}
const normId = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    // common mongo export shapes
    return val.$oid || val._id || val.id || "";
  }
  return String(val);
};

export default function TransferSkuDialog({
  open,
  onOpenChange,
  branches = [],
  inventories = [],
  t = (k) => k,
  onSubmit = async () => {},
}) {
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [fromBranch, setFromBranch] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");

  // NEW: transfer type
  const [type, setType] = useState("branch"); // 'branch' | 'theft' | 'scrap'

  // When type is not branch, ensure toBranch is cleared
  useEffect(() => {
    if (type !== "branch") setToBranch("");
  }, [type]);

  // Group inventories by itemId (each row = item at a specific branch)
  const itemsById = useMemo(() => {
    const map = new Map();
    for (const row of inventories) {
      const id = normId(row._id);
      if (!id) continue;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(row);
    }
    return map;
  }, [inventories]);

  // Build item options (dedup + filter by search)
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

  // All distinct variants (brand/size/color) for the selected item (across branches)
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
          });
        }
      }
    }
    return out.sort((a, b) =>
      `${a.brand}-${a.size}-${a.color}`
        .toLowerCase()
        .localeCompare(
          `${b.brand}-${b.size}-${b.color}`.toLowerCase()
        )
    );
  }, [itemId, itemsById]);

  const brandsForItem = useMemo(() => {
    const uniq = new Set(variantsForItem.map((v) => v.brand));
    return Array.from(uniq).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [variantsForItem]);

  const sizesForBrand = useMemo(() => {
    const uniq = new Set(
      variantsForItem.filter((v) => v.brand === brand).map((v) => v.size)
    );
    return Array.from(uniq).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [variantsForItem, brand]);

  const colorsForBrandSize = useMemo(() => {
    const uniq = new Set(
      variantsForItem
        .filter((v) => v.brand === brand && v.size === size)
        .map((v) => v.color)
    );
    return Array.from(uniq).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [variantsForItem, brand, size]);

  // ✅ Exact-variant stock per branch
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
          const s = Number(v.stock || 0);
          if (!Number.isNaN(s)) sum += s;
        }
      }
      map[bId] = sum;
    }
    return map;
  }, [itemId, brand, size, color, itemsById]);

  const availableFrom = Number(stockByBranch[fromBranch] || 0);

  // Reset dependent fields when parent changes
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

  // Auto-pick a source branch that has stock for the chosen variant
  useEffect(() => {
    if (!itemId || !brand || !size || !color) return;
    if (availableFrom > 0) return;

    let bestBranch = "";
    let maxS = 0;
    for (const b of branches) {
      const bId = normId(b._id);
      const s = Number(stockByBranch[bId] || 0);
      if (s > maxS) {
        maxS = s;
        bestBranch = bId;
      }
    }
    if (bestBranch) {
      setFromBranch(bestBranch);
      if (type === "branch") {
        const alt = branches.find((b) => normId(b._id) !== bestBranch);
        if (alt) setToBranch(normId(alt._id));
      }
    }
  }, [brand, size, color, itemId, branches, stockByBranch, availableFrom, type]);

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = Number(qty);

    if (!itemId || !brand || !size || !color)
      return toast.error(
        t("inventory.selectItem") || "Select Item & Variant"
      );
    if (!fromBranch)
      return toast.error(t("inventory.selectBranch") || "Select Branch");

    if (type === "branch") {
      if (!toBranch)
        return toast.error(t("inventory.selectBranch") || "Select Branches");
      if (fromBranch === toBranch)
        return toast.error(
          t("common.sameBranchError") || "From/To cannot be same"
        );
    } else {
      // theft/scrap requires reason
      if (!reason?.trim())
        return toast.error(
          t("inventory.reasonRequired") ||
            "Reason is required for theft/scrap"
        );
    }

    if (!q || q <= 0)
      return toast.error(t("inventory.quantity") || "Enter quantity");
    if (q > availableFrom)
      return toast.error(
        t("inventory.transferError") || "Quantity exceeds available stock"
      );

    try {
      const payload = {
        type, // 'branch' | 'theft' | 'scrap'
        itemId,
        brand,
        size,
        color,
        fromBranch,
        quantity: q,
        reason: reason || undefined,
        // send toBranch only for branch transfers
        ...(type === "branch" ? { toBranch } : {}),
      };

      await onSubmit(payload);

      toast.success(
        type === "branch"
          ? t("inventory.transferSuccess") || "Transfer completed"
          : t("inventory.adjustSuccess") ||
              "Stock adjusted (theft/scrap) successfully"
      );

      onOpenChange(false);
      setSearch("");
      setItemId("");
      setBrand("");
      setSize("");
      setColor("");
      setFromBranch("");
      setToBranch("");
      setQty("");
      setReason("");
      setType("branch");
    } catch (err) {
      toast.error(
        err?.message || t("inventory.transferError") || "Transfer failed"
      );
    }
  };

  const isBranch = type === "branch";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[92vw] !max-w-[880px]">
        <DialogHeader>
          <DialogTitle>
            {isBranch
              ? t("inventory.transferStock") || "Transfer Stock"
              : t("inventory.adjustStock") || "Adjust Stock (Theft/Scrap)"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Transfer Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs mb-1">
                {t("inventory.transferType") || "Transfer Type"}
              </label>
              <select
                className="w-full p-2 border rounded"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
              >
                <option value="branch">
                  {t("inventory.type.branch") || "Branch"}
                </option>
                <option value="theft">
                  {t("inventory.type.theft") || "Theft"}
                </option>
                <option value="scrap">
                  {t("inventory.type.scrap") || "Scrap"}
                </option>
              </select>
              {!isBranch && (
                <p className="text-[11px] opacity-70 mt-1">
                  {t("inventory.typeInfo") ||
                    "No destination branch; stock will be reduced from the source branch."}
                </p>
              )}
            </div>

            {/* Item search */}
            <div className="md:col-span-1">
              <label className="block text-xs mb-1">
                {t("inventory.search") || "Search inventory..."}
              </label>
              <Input
                placeholder={t("inventory.search") || "Search inventory..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Item select */}
            <div className="md:col-span-1">
              <label className="block text-xs mb-1">
                {t("inventory.selectItem") || "Select item"}
              </label>
              <select
                className="w-full p-2 border rounded"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                required
              >
                <option value="">
                  {t("inventory.selectItem") || "Select item"}
                </option>
                {itemOptions.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Variant pickers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1">
                {t("inventory.selectBrand") || "Select Brand"}
              </label>
              <select
                className="w-full p-2 border rounded"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                disabled={!itemId}
                required
              >
                <option value="">
                  {t("inventory.selectBrand") || "Select Brand"}
                </option>
                {brandsForItem.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1">
                {t("inventory.selectSize") || "Select Size"}
              </label>
              <select
                className="w-full p-2 border rounded"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                disabled={!brand}
                required
              >
                <option value="">
                  {t("inventory.selectSize") || "Select Size"}
                </option>
                {sizesForBrand.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1">
                {t("inventory.selectColor") || "Select Color"}
              </label>
              <select
                className="w-full p-2 border rounded"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={!size}
                required
              >
                <option value="">
                  {t("inventory.selectColor") || "Select Color"}
                </option>
                {colorsForBrandSize.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ✅ Stock by branch for exact SKU */}
          {itemId && brand && size && color && (
            <div className="rounded-2xl border p-3">
              <p className="text-sm font-medium mb-2">
                {t("inventory.available") || "Available"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {branches.map((b) => {
                  const bId = normId(b._id);
                  const qty = Number(stockByBranch[bId] || 0);
                  return (
                    <div
                      key={bId}
                      className="flex items-center justify-between rounded border px-3 py-2"
                    >
                      <span className="text-sm">{b.name}</span>
                      <span className="text-sm font-semibold">{qty}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Branches + qty */}
          <div className={`grid grid-cols-1 ${isBranch ? "md:grid-cols-2" : "md:grid-cols-1"} gap-3`}>
            <div>
              <label className="block text-xs mb-1">
                {t("inventory.fromBranch") || "From Branch"}
              </label>
              <select
                className="w-full p-2 border rounded"
                value={fromBranch}
                onChange={(e) => setFromBranch(e.target.value)}
                disabled={!color}
                required
              >
                <option value="">
                  {t("inventory.selectBranch") || "Select Branch"}
                </option>
                {branches.map((b) => (
                  <option key={normId(b._id)} value={normId(b._id)}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] opacity-70 mt-1">
                {(t("inventory.available") || "Available")}: {availableFrom}
              </p>
            </div>

            {isBranch && (
              <div>
                <label className="block text-xs mb-1">
                  {t("inventory.toBranch") || "To Branch"}
                </label>
                <select
                  className="w-full p-2 border rounded"
                  value={toBranch}
                  onChange={(e) => setToBranch(e.target.value)}
                  disabled={!fromBranch}
                  required={isBranch}
                >
                  <option value="">
                    {t("inventory.selectBranch") || "Select Branch"}
                  </option>
                  {branches.map((b) => (
                    <option key={normId(b._id)} value={normId(b._id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Reason (required for theft/scrap, optional for branch) */}
          <div>
            <label className="block text-xs mb-1">
              {isBranch
                ? t("inventory.reason") || "Reason (optional)"
                : t("inventory.reasonRequiredLabel") ||
                  "Reason (required for Theft/Scrap)"}
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isBranch
                  ? t("inventory.reasonPlaceholder") ||
                    "e.g., Customer order needs 2 pcs at Branch1"
                  : t("inventory.reasonTheftScrapPlaceholder") ||
                    "e.g., Theft incident #CR-1023 / Damaged beyond repair"
              }
              required={!isBranch}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs mb-1">
                {t("inventory.quantity") || "Quantity"}
              </label>
              <Input
                type="number"
                min={1}
                max={availableFrom || undefined}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder={t("inventory.enterQuantity") || "Enter quantity"}
                required
              />
              <p className="text-[11px] opacity-70 mt-1">
                {t("inventory.quantity")} ≤ {availableFrom}
              </p>
            </div>

            <PopupClose asChild>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  !itemId ||
                  !brand ||
                  !size ||
                  !color ||
                  !fromBranch ||
                  (isBranch && !toBranch) ||
                  (isBranch && fromBranch === toBranch) ||
                  Number(qty) <= 0 ||
                  Number(qty) > availableFrom ||
                  (!isBranch && !reason?.trim())
                }
              >
                {isBranch
                  ? t("inventory.transfer") || "Transfer"
                  : t("inventory.adjust") || "Adjust"}
              </Button>
            </PopupClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
