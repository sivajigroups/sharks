import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose as PopupClose,
} from "@/components/ui/dialog";
import ReTable from "@/components/shared/ReTable";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export default function PurchaseManager() {
  const API_BASE = import.meta.env.VITE_API_BASE;

  // ── List state
  const [purchases, setPurchases] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState("");

  // ── Dialog (Add/Edit) state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  // header fields
  const [vendorName, setVendorName] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));

  // items
  const [items, setItems] = useState([{ description: "", quantity: 1, rate: 0 }]);

  // focus last item row
  const lastRowRef = useRef(null);
  useEffect(() => {
    lastRowRef.current?.focus?.();
  }, [items.length]);

  // ───────────────────────────────
  // API
  // ───────────────────────────────
  const fetchPurchases = async () => {
    try {
      setLoadingList(true);
      const res = await fetch(`${API_BASE}/purchases`, { credentials: "include" });
      const json = await res.json();
      if (json?.success === false) throw new Error(json.error || "Failed to fetch");
      setPurchases(Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load purchases");
    } finally {
      setLoadingList(false);
    }
  };
  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/purchases/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      toast.success("Bill deleted");
      setPurchases((list) => list.filter((p) => p._id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ───────────────────────────────
  // Dialog helpers
  // ───────────────────────────────
  const openAdd = () => {
    setEditId(null);
    setVendorName("");
    setBillNumber("");
    setBillDate(new Date().toISOString().slice(0, 10));
    setItems([{ description: "", quantity: 1, rate: 0 }]);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditId(row._id);
    setVendorName(row.vendorName || "");
    setBillNumber(row.billNumber || "");
    const iso = row.billDate
      ? new Date(row.billDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    setBillDate(iso);
    setItems(
      (row.items || []).map((it) => ({
        description: it.description || "",
        quantity: Number(it.quantity || 0),
        rate: Number(it.rate || 0),
      }))
    );
    setOpen(true);
  };

  const handleItemChange = (i, key, val) => {
    setItems((prev) =>
      prev.map((r, idx) =>
        idx === i
          ? { ...r, [key]: key === "description" ? val : Math.max(0, Number(val || 0)) }
          : r
      )
    );
  };
  const addRow = () =>
    setItems((prev) => [...prev, { description: "", quantity: 1, rate: 0 }]);
  const removeRow = (i) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const rows = useMemo(
    () =>
      items.map((r) => ({
        ...r,
        amount: Number(r.quantity || 0) * Number(r.rate || 0),
      })),
    [items]
  );
  const totalQty = rows.reduce((s, r) => s + (r.quantity || 0), 0);
  const subTotal = rows.reduce((s, r) => s + (r.amount || 0), 0);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!vendorName.trim()) return toast.error("Vendor name is required");
    const filteredItems = rows
      .filter((r) => r.description.trim())
      .map((r) => ({
        description: r.description.trim(),
        quantity: Number(r.quantity || 0),
        rate: Number(r.rate || 0),
      }));
    if (!filteredItems.length) return toast.error("Add at least one item");

    const payload = {
      vendorName: vendorName.trim(),
      billNumber: billNumber.trim(),
      billDate: new Date(billDate),
      items: filteredItems,
    };

    try {
      setSaving(true);
      const url = editId ? `${API_BASE}/purchases/${editId}` : `${API_BASE}/purchases`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");

      toast.success(editId ? "Bill updated ✅" : "Bill added ✅");
      setOpen(false);
      fetchPurchases();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ───────────────────────────────
  // ReTable config + rows
  // ───────────────────────────────
  const nfAmt = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    []
  );

  // Normal purchases table rows (when NOT searching)
  const listRows = useMemo(
    () =>
      (purchases || []).map((p, i) => ({
        _id: p._id,
        sl: i + 1,
        vendorName: p.vendorName || "—",
        billNumber: p.billNumber || "—",
        billDateTxt: p.billDate ? new Date(p.billDate).toLocaleDateString("en-IN") : "—",
        qtyTxt: Number(p.totalQuantity || 0),
        subTotalTxt: `₹ ${nfAmt.format(Number(p.subTotal || 0))}`,
        // originals for edit:
        items: p.items || [],
        billDate: p.billDate,
      })),
    [purchases, nfAmt]
  );

  const purchaseColumns = [
    { key: "sl", label: "#" },
    { key: "vendorName", label: "Vendor" },
    { key: "billNumber", label: "Bill No" },
    { key: "billDateTxt", label: "Date" },
    { key: "qtyTxt", label: "Total Qty" },
    { key: "subTotalTxt", label: "SubTotal (₹)" },
  ];

  // ITEM NAME SEARCH MODE (flat line-item view)
  const itemSearchRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const rows = [];
    (purchases || []).forEach((p) => {
      (p.items || []).forEach((it) => {
        const desc = (it.description || "").toLowerCase();
        if (desc.includes(q)) {
          const qty = Number(it.quantity || 0);
          const rate = Number(it.rate || 0);
          rows.push({
            _id: `${p._id}-${rows.length}`,
            sl: rows.length + 1,
            description: it.description || "—",
            quantity: qty,
            rateTxt: `₹ ${nfAmt.format(rate)}`,
            amountTxt: `₹ ${nfAmt.format(qty * rate)}`,
            vendorName: p.vendorName || "—",
            billNumber: p.billNumber || "—",
            billDateTxt: p.billDate
              ? new Date(p.billDate).toLocaleDateString("en-IN")
              : "—",
          });
        }
      });
    });
    return rows;
  }, [search, purchases, nfAmt]);

  const itemColumns = [
    { key: "sl", label: "#" },
    { key: "description", label: "Item" },
    // { key: "quantity", label: "Qty" },
    { key: "rateTxt", label: "Rate (₹)" },
    // { key: "amountTxt", label: "Amount (₹)" },
    { key: "vendorName", label: "Vendor" },
    { key: "billNumber", label: "Bill No" },
    { key: "billDateTxt", label: "Date" },
  ];

  const itemSearchTotals = useMemo(() => {
    if (!itemSearchRows.length) return { qty: 0, amount: 0 };
    return itemSearchRows.reduce(
      (acc, r) => {
        const qty = Number(r.quantity || 0);
        // r.amountTxt is formatted; recompute from rateTxt? better to compute again:
        const amount = (() => {
          const rate = Number(
            (r.rateTxt || "").replace(/[^\d.-]/g, "")
          );
          return qty * (isNaN(rate) ? 0 : rate);
        })();
        return { qty: acc.qty + qty, amount: acc.amount + amount };
      },
      { qty: 0, amount: 0 }
    );
  }, [itemSearchRows]);

  const inItemSearchMode = search.trim().length > 0;

  // ───────────────────────────────
  // Render
  // ───────────────────────────────
  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-auto">
      <h1 className="text-2xl font-bold">Purchases</h1>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by ITEM name… e.g., Hitachi Shaw 10W"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[300px] flex-1"
        />
        <div className="flex gap-2">
          <Button onClick={fetchPurchases} variant="outline" disabled={loadingList}>
            {loadingList ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Bill
          </Button>
        </div>
      </div>

      {/* List (switches view based on search mode) */}
      <Card className="w-full">
        <CardContent className="p-4 overflow-auto">
          {inItemSearchMode ? (
            <>
              <div className="flex items-center justify-between px-1 pb-3 text-sm text-muted-foreground">
                <div>
                  Matches for <b>“{search}”</b>: <b>{itemSearchRows.length}</b>
                </div>
                <div className="flex gap-4">
                  <span>
                    Total Qty: <b>{itemSearchTotals.qty}</b>
                  </span>
                  <span>
                    Total Spend:{" "}
                    <b>₹ {nfAmt.format(itemSearchTotals.amount)}</b>
                  </span>
                </div>
              </div>
              <ReTable
                data={itemSearchRows}
                columns={itemColumns}
                showViewButton={false}
                showEditButton={false}   // no edit/delete in search mode
              />
            </>
          ) : (
            <ReTable
              data={listRows}
              columns={purchaseColumns}
              showViewButton={false}
              onEditClick={(row) => openEdit(row)}
              onDelete={(id) => handleDelete(id)}
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[90vw] !max-w-[1100px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Purchase Bill" : "Add Purchase Bill"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {/* Header fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Vendor Company Name"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                required
              />
              <Input
                placeholder="Bill No."
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
              />
              <Input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </div>

            {/* Items Table inside dialog */}
            <div className="overflow-auto border rounded-md">
              <Table className="min-w-[900px] text-sm">
                <TableHeader>
                  <TableRow className="bg-black">
                    <TableHead className="text-white">#</TableHead>
                    <TableHead className="text-white">Item Name</TableHead>
                    <TableHead className="text-white text-right">Qty</TableHead>
                    <TableHead className="text-white text-right">Rate (₹)</TableHead>
                    <TableHead className="text-white text-right">Amount (₹)</TableHead>
                    <TableHead className="text-white text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Input
                          ref={idx === rows.length - 1 ? lastRowRef : null}
                          placeholder="Item name"
                          value={row.description}
                          onChange={(e) =>
                            handleItemChange(idx, "description", e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (idx === rows.length - 1) addRow();
                            }
                          }}
                          required
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) =>
                            handleItemChange(idx, "quantity", e.target.value)
                          }
                          className="text-right"
                          required
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          value={row.rate}
                          onChange={(e) =>
                            handleItemChange(idx, "rate", e.target.value)
                          }
                          className="text-right"
                          required
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹ {row.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {items.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => removeRow(idx)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableRow>
                    <TableCell colSpan={6} className="py-3">
                      <Button type="button" variant="outline" onClick={addRow}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Row
                      </Button>
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={2}>Totals</TableCell>
                    <TableCell className="text-right">{totalQty}</TableCell>
                    <TableCell className="text-right">Sub Total</TableCell>
                    <TableCell className="text-right">₹ {subTotal.toFixed(2)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Dialog footer */}
            <div className="flex justify-end gap-2">
              <PopupClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </PopupClose>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editId ? "Update Bill" : "Save Bill"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
