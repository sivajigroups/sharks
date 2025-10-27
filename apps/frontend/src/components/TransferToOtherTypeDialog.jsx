import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogClose as PopupClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// normalize _id shapes
const normId = (v) =>
  typeof v === "object" ? (v?._id || v?.id || v?.$oid || "") : (v || "");

/**
 * Minimal “move between models” dialog.
 *
 * Props:
 * - open, onOpenChange
 * - type: "rental" | "sales"         // current page/model you’re on
 * - inventories: array               // items for the current page (rental OR sales)
 * - API_BASE: string
 * - t: i18n function (optional)
 *
 * Backend endpoints expected:
 * - POST `${API_BASE}/inventory/transfer/rental-to-sales`
 *   body: { rentalItemId, fromBranchId, toBranchId, rentalSku, quantity, salePrice }
 * - POST `${API_BASE}/inventory/transfer/sales-to-rental`
 *   body: { salesItemId, fromBranchId, toBranchId, salesSku, quantity, pricePerDay }
 *
 * NOTE: This dialog uses the item’s own branch as both from/to (same branch move).
 */
export default function TransferToOtherTypeDialog({
  open,
  onOpenChange,
  type = "rental",
  inventories = [],
  API_BASE = "",
  t = (k) => k,
}) {
  const [moveTo, setMoveTo] = useState(type === "rental" ? "sales" : "rental"); // target model
  const [itemId, setItemId] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState(""); // salePrice OR pricePerDay (dynamic label)

  // reset on open/close or type change
  useEffect(() => {
    if (!open) {
      setMoveTo(type === "rental" ? "sales" : "rental");
      setItemId("");
      setSku("");
      setQty("");
      setPrice("");
    }
  }, [open, type]);

  const items = inventories || [];

  const selectedItem = useMemo(
    () => items.find((it) => String(normId(it._id)) === String(itemId)),
    [items, itemId]
  );

  const variants = useMemo(() => selectedItem?.variants || [], [selectedItem]);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.sku === sku),
    [variants, sku]
  );

  const available = Number(selectedVariant?.stock || 0);

  const priceLabel =
    moveTo === "sales"
      ? t("inventory.salePrice") || "Sale Price (₹)"
      : t("inventory.rentPrice") || "Price per Day (₹)";

  const canSubmit =
    itemId && sku && Number(qty) > 0 && Number(qty) <= (available || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const branchId =
        normId(selectedItem?.branch) ||
        normId(selectedItem?.branchId) ||
        normId(selectedItem?.branch?._id);

      let url = "";
      let body = null;

      if (type === "rental" && moveTo === "sales") {
        // Rental → Sales
        url = `${API_BASE}/inventory/transfer/rental-to-sales`;
        body = {
          rentalItemId: itemId,
          fromBranchId: branchId,
          toBranchId: branchId, // same branch move
          rentalSku: sku,
          quantity: Number(qty),
          // price is required if the target sales variant doesn't exist; safe to send when filled
          ...(price !== "" ? { salePrice: Number(price) } : {}),
        };
      } else if (type === "sales" && moveTo === "rental") {
        // Sales → Rental (you need this endpoint on backend)
        url = `${API_BASE}/inventory/transfer/sales-to-rental`;
        body = {
          salesItemId: itemId,
          fromBranchId: branchId,
          toBranchId: branchId, // same branch move
          salesSku: sku,
          quantity: Number(qty),
          // pricePerDay required if target rental variant doesn't exist
          ...(price !== "" ? { pricePerDay: Number(price) } : {}),
        };
      } else {
        throw new Error("Invalid move direction");
      }

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Transfer failed");

      toast.success(
        moveTo === "sales"
          ? (t("inventory.transferToSalesSuccess") || "Moved to Sales")
          : (t("inventory.transferToRentalSuccess") || "Moved to Rental")
      );

      onOpenChange(false); // closes & resets via effect
    } catch (err) {
      toast.error(err?.message || "Transfer failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {moveTo === "sales"
              ? t("inventory.transferToSales") || "Move to Sales"
              : t("inventory.transferToRental") || "Move to Rental"}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          {/* Target toggle (Sales / Rental) */}
          <div>
            <label className="block text-xs mb-1">
              {t("inventory.moveTo") || "Move to"}
            </label>
            <select
              className="w-full p-2 border rounded"
              value={moveTo}
              onChange={(e) => {
                setMoveTo(e.target.value);
                setPrice("");
              }}
            >
              {type === "rental" ? (
                <>
                  <option value="sales">{t("inventory.sales") || "Sales"}</option>
                  <option value="rental" disabled>
                    {t("inventory.rental") || "Rental"}
                  </option>
                </>
              ) : (
                <>
                  <option value="rental">{t("inventory.rental") || "Rental"}</option>
                  <option value="sales" disabled>
                    {t("inventory.sales") || "Sales"}
                  </option>
                </>
              )}
            </select>
          </div>

          {/* Item */}
          <div>
            <label className="block text-xs mb-1">
              {t("inventory.itemName") || "Item"}
            </label>
            <select
              className="w-full p-2 border rounded"
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                setSku("");
                setQty("");
                setPrice("");
              }}
              required
            >
              <option value="">
                {t("inventory.selectItem") || "Select item"}
              </option>
              {items.map((it) => (
                <option key={normId(it._id)} value={normId(it._id)}>
                  {it.name} {it.category ? `• ${it.category}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Variant */}
          <div>
            <label className="block text-xs mb-1">
              {t("inventory.variant") || "Variant (SKU)"}
            </label>
            <select
              className="w-full p-2 border rounded"
              value={sku}
              onChange={(e) => {
                setSku(e.target.value);
                setQty("");
              }}
              disabled={!itemId}
              required
            >
              <option value="">
                {itemId
                  ? t("inventory.selectVariant") || "Select variant"
                  : t("inventory.selectItemFirst") || "Select an item first"}
              </option>
              {variants.map((v, i) => (
                <option key={`${v.sku}-${i}`} value={v.sku}>
                  {v.sku} — {v.brand || "GENERIC"} / {v.size || "STD"}
                  {v.color ? ` / ${v.color}` : ""} • Stock: {v.stock}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs mb-1">
                {t("inventory.quantity") || "Quantity"}
              </label>
              <Input
                type="number"
                min={1}
                max={selectedVariant ? selectedVariant.stock : undefined}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder={t("inventory.enterQuantity") || "Enter quantity"}
                required
              />
              <p className="text-[11px] opacity-70 mt-1">
                {(t("inventory.available") || "Available")}: {selectedVariant?.stock ?? 0}
              </p>
            </div>

            <div>
              <label className="block text-xs mb-1">{priceLabel}</label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={
                  moveTo === "sales" ? "e.g. 1299" : "e.g. 250"
                }
              />
              <p className="text-[11px] opacity-70 mt-1">
                {t("inventory.mayBeRequired") ||
                  "Only needed if the target variant does not exist"}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <PopupClose asChild>
              <Button variant="outline">{t("common.cancel") || "Cancel"}</Button>
            </PopupClose>
            <Button
              type="submit"
              disabled={!canSubmit}
            >
              {t("inventory.transfer") || "Transfer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
