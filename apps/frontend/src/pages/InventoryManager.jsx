import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose as PopupClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import ReTable from "@/components/shared/ReTable";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Keep branch-to-branch transfer
import TransferSkuDialog from "../components/TransferSkuDialog";
// Simple sales ↔ rental transfer
import TransferToOtherTypeDialog from "../components/TransferToOtherTypeDialog";

const categories = [
  "Power Tools",
  "Hand Tools",
  "Safety Gear",
  "Electrical",
  "Cleaning",
  "Plumbing",
];

export default function InventoryManager({ type = "sales", title }) {
  const { t } = useTranslation();
  const API_BASE = import.meta.env.VITE_API_BASE;

  // endpoint for branch↔branch transfer now depends on page type
  const BRANCH_TRANSFER_API = `${API_BASE}/transfers/${type}`;

  const isRental = type === "rental";
  const priceLabel = isRental
    ? t("inventory.rentPrice") || "Price per Day (₹)"
    : t("inventory.salePrice") || "Sale Price (₹)";

  // Table columns
  const columns = [
    { key: "name", label: t("inventory.itemName") || "Item" },
    { key: "category", label: t("inventory.category") || "Category" },
    { key: "branch", label: t("inventory.branch") || "Branch" },
    { key: "updatedAt", label: t("inventory.lastUpdated") || "Last Updated" },
  ];

  // State
  const [rawInventories, setRawInventories] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create/Edit dialog
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  // UI keeps `price`; maps to backend `price` (sales) or `pricePerDay` (rental)
  const [variants, setVariants] = useState([
    { brand: "", size: "", color: "", price: "", stock: "" },
  ]);

  // Branches
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");

  // Table branch filter
  const [selectedBranchId, setSelectedBranchId] = useState("ALL");

  // Attributes
  const [brands, setBrands] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [openBrandDialog, setOpenBrandDialog] = useState(false);
  const [openSizeDialog, setOpenSizeDialog] = useState(false);
  const [openColorDialog, setOpenColorDialog] = useState(false);
  const [newAttr, setNewAttr] = useState("");

  // Transfer dialogs
  const [transferOpen, setTransferOpen] = useState(false); // branch↔branch
  const [crossOpen, setCrossOpen] = useState(false); // sales↔rental

  // Branch id -> name
  const branchNameById = useMemo(() => {
    const map = {};
    for (const b of branches) {
      const id = b._id || b.id;
      const n = b.name || b.branchName || "Unnamed Branch";
      if (id) map[id] = n;
    }
    return map;
  }, [branches]);

  // Helpers
  const normalizeList = (data = [], idToName = {}) =>
    data.map((item) => {
      let branchLabel = "-";
      if (item.branch && typeof item.branch === "object") {
        branchLabel = item.branch?.name || item.branch?.branchName || "-";
      } else if (typeof item.branch === "string") {
        branchLabel = idToName[item.branch] || item.branch;
      } else if (!item.branch) {
        branchLabel = "-";
      }
      return { ...item, branch: branchLabel };
    });

  const itemOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    for (const it of rawInventories) {
      const id = it._id || it.itemId || it.id;
      const label = it.name || it.itemName || `Item-${id?.slice?.(0, 6) || ""}`;
      if (id && !seen.has(id)) {
        seen.add(id);
        opts.push({ id, label, category: it.category });
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [rawInventories]);

  // Fetchers
  const fetchInventories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inventory/${type}`, {
        credentials: "include",
      });
      const json = await res.json();
      const data = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      setRawInventories(data);
    } catch {
      toast.error(t("inventory.fetchError") || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttributes = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory/attributes`, {
        credentials: "include",
      });
      const json = await res.json();
      const data = json?.data || {};
      setBrands(data?.brand || []);
      setSizes(data?.size || []);
      setColors(data?.color || []);
    } catch {
      toast.error(t("inventory.fetchError") || "Failed to load attributes.");
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_BASE}/branch/all`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not load branches");
      const json = await res.json();
      const list = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      setBranches(list);
    } catch (err) {
      console.error(err);
      toast.error(t("inventory.branchFetchError") || "Failed to load branches.");
    }
  };

  // Effects
  useEffect(() => {
    fetchInventories();
  }, [type]);

  useEffect(() => {
    fetchAttributes();
    fetchBranches();
  }, []);

  useEffect(() => {
    setInventories(normalizeList(rawInventories, branchNameById));
  }, [rawInventories, branchNameById]);

  useEffect(() => {
    if (open && branches.length === 0) fetchBranches();
  }, [open, branches.length]);

  // Open form
  const openForm = (item = null) => {
    if (item) {
      setEditId(item._id);
      setName(item.name || "");
      setDescription(item.description || "");
      setCategory(item.category || "");
      const bId =
        item.branch?._id ||
        item.branch?.id ||
        item.branchId ||
        item.branch ||
        "";
      setBranchId(bId);

      // Backend → UI mapping
      const mappedVariants = (item.variants || []).map((v) => ({
        brand: v.brand ?? "",
        size: v.size ?? "",
        color: v.color ?? "",
        price: isRental ? v.pricePerDay ?? "" : v.price ?? "",
        stock: v.stock ?? "",
      }));
      setVariants(
        mappedVariants.length
          ? mappedVariants
          : [{ brand: "", size: "", color: "", price: "", stock: "" }]
      );
    } else {
      setEditId(null);
      setName("");
      setDescription("");
      setCategory("");
      setBranchId("");
      setVariants([{ brand: "", size: "", color: "", price: "", stock: "" }]);
    }
    setOpen(true);
  };

  // Save (create/update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!branchId) {
      toast.error(t("inventory.selectBranchFirst") || "Please select a branch");
      return;
    }

    for (let idx = 0; idx < variants.length; idx++) {
      const v = variants[idx];
      if (v.price === "" || Number.isNaN(Number(v.price))) {
        toast.error(
          `Variant ${idx + 1}: ${isRental ? "Price per Day" : "Price"} is required`
        );
        return;
      }
      if (v.stock === "" || Number.isNaN(Number(v.stock))) {
        toast.error(`Variant ${idx + 1}: Stock is required`);
        return;
      }
    }

    const payloadVariants = variants.map((v) => {
      const base = {
        brand: v.brand || undefined,
        size: v.size || undefined,
        color: v.color || null,
        stock: Number(v.stock),
      };
      return isRental
        ? { ...base, pricePerDay: Number(v.price) }
        : { ...base, price: Number(v.price) };
    });

    const payload = {
      name,
      description,
      category,
      branchId,
      variants: payloadVariants,
    };

    try {
      const url = editId
        ? `${API_BASE}/inventory/${type}/${editId}`
        : `${API_BASE}/inventory/${type}`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Request failed");
      }
      toast.success(
        t(editId ? "inventory.updateSuccess" : "inventory.insertSuccess") ||
          (editId ? "Updated successfully" : "Inserted successfully")
      );
      await fetchInventories();
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(
        t(editId ? "inventory.updateError" : "inventory.insertError") ||
          (editId ? "Update failed" : "Insert failed")
      );
    }
  };

  // Delete
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/inventory/${type}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setRawInventories((invs) => invs.filter((i) => i._id !== id));
      toast.success(t("inventory.deleteSuccess") || "Deleted successfully");
    } catch {
      toast.error(t("inventory.deleteError") || "Delete failed");
    }
  };

  // Variant handlers
  const handleVariantChange = (i, field, val) => {
    const arr = [...variants];
    const numeric = field === "price" || field === "stock";
    arr[i][field] = numeric ? Number(val) : val;
    setVariants(arr);
  };
  const addVariant = () =>
    setVariants((v) => [
      ...v,
      { brand: "", size: "", color: "", price: "", stock: "" },
    ]);
  const removeVariant = (i) =>
    setVariants((v) => v.filter((_, idx) => idx !== i));

  // Add attribute
  const handleAddAttr = async (kind, setter) => {
    if (!newAttr.trim())
      return toast.error(t("inventory.emptyAttribute") || "Enter a value");
    try {
      const res = await fetch(`${API_BASE}/inventory/attributes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [kind]: [newAttr.trim()] }),
      });
      if (!res.ok) throw new Error();
      setter((arr) => [...arr, newAttr.trim()]);
      toast.success(
        t(`inventory.${kind}AddSuccess`) || `${kind} added successfully`
      );
      setNewAttr("");
      setOpenBrandDialog(false);
      setOpenSizeDialog(false);
      setOpenColorDialog(false);
    } catch {
      toast.error(t(`inventory.${kind}AddError`) || `Failed to add ${kind}`);
    }
  };

  // Branch filter for table
  const branchFilteredRaw = useMemo(() => {
    if (selectedBranchId === "ALL") return rawInventories;
    return (rawInventories || []).filter((it) => {
      const bId =
        it?.branch?._id || it?.branch?.id || it?.branch || it?.branchId || "";
      return String(bId) === String(selectedBranchId);
    });
  }, [rawInventories, selectedBranchId]);

  const tableData = useMemo(
    () => normalizeList(branchFilteredRaw, branchNameById),
    [branchFilteredRaw, branchNameById]
  );

  const filtered = useMemo(() => {
    if (!searchTerm) return tableData;
    const q = searchTerm.toLowerCase();
    return tableData.filter((inv) =>
      JSON.stringify(inv).toLowerCase().includes(q)
    );
  }, [tableData, searchTerm]);

  const selectedBranchLabel =
    selectedBranchId === "ALL"
      ? t("inventory.allBranches") || "All branches"
      : branchNameById[selectedBranchId] || "—";

  // Render
  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-auto">
      <h1 className="text-2xl font-bold">
        {title || t("inventory.title") || "Inventory"}
      </h1>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Branch filter */}
        <select
          className="p-2 border rounded min-w-[220px]"
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          aria-label="Filter by branch"
        >
          <option value="ALL">
            {t("inventory.allBranches") || "All branches"}
          </option>
          {branches.map((b) => (
            <option key={b._id || b.id} value={b._id || b.id}>
              {b.name || b.branchName || "Unnamed Branch"}
            </option>
          ))}
        </select>

        {/* Search */}
        <Input
          placeholder={
            t("inventory.searchIn")?.replace?.("%s", selectedBranchLabel) ||
            `Search in ${selectedBranchLabel}...`
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[240px]"
        />

        {/* Actions */}
        <Button variant="outline" onClick={() => setTransferOpen(true)}>
          <Repeat className="mr-2 h-4 w-4" />
          {t("inventory.transferStock") || "Transfer Stock"}
        </Button>
        <Button variant="outline" onClick={() => setCrossOpen(true)}>
          {isRental ? "Move to Sales" : "Move to Rental"}
        </Button>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2" />
          {t("inventory.addInventory") || "Add Inventory"}
        </Button>
      </div>

      {/* Create/Edit Inventory Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[90vw] !max-w-[1100px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId
                ? t("inventory.editInventory") || "Edit Inventory"
                : t("inventory.addInventory") || "Add Inventory"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder={t("inventory.itemName") || "Item name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                placeholder={t("inventory.description") || "Description"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Branch */}
            <select
              className="w-full p-2 border rounded"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
            >
              <option value="">
                {t("inventory.selectBranch") || "Select branch"}
              </option>
              {branches.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.name || b.branchName || "Unnamed Branch"}
                </option>
              ))}
            </select>

            {/* Category */}
            <select
              className="w-full p-2 border rounded"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">
                {t("inventory.selectCategory") || "Select category"}
              </option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Variants */}
            {variants.map((v, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
              >
                {/* Brand */}
                <select
                  className="p-2 border rounded"
                  value={v.brand}
                  onChange={(e) => {
                    if (e.target.value === "__add_brand__")
                      return setOpenBrandDialog(true);
                    handleVariantChange(i, "brand", e.target.value);
                  }}
                  required
                >
                  <option value="">
                    {t("inventory.selectBrand") || "Select brand"}
                  </option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value="__add_brand__">
                    ➕ {t("inventory.addBrand") || "Add brand"}
                  </option>
                </select>

                {/* Size */}
                <select
                  className="p-2 border rounded"
                  value={v.size}
                  onChange={(e) => {
                    if (e.target.value === "__add_size__")
                      return setOpenSizeDialog(true);
                    handleVariantChange(i, "size", e.target.value);
                  }}
                  required
                >
                  <option value="">
                    {t("inventory.selectSize") || "Select size"}
                  </option>
                  {sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__add_size__">
                    ➕ {t("inventory.addSize") || "Add size"}
                  </option>
                </select>

                {/* Color */}
                <select
                  className="p-2 border rounded"
                  value={v.color}
                  onChange={(e) => {
                    if (e.target.value === "__add_color__")
                      return setOpenColorDialog(true);
                    handleVariantChange(i, "color", e.target.value);
                  }}
                  required
                >
                  <option value="">
                    {t("inventory.selectColor") || "Select color"}
                  </option>
                  {colors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__add_color__">
                    ➕ {t("inventory.addColor") || "Add color"}
                  </option>
                </select>

                {/* Price (UI) */}
                <Input
                  placeholder={priceLabel}
                  type="number"
                  value={v.price}
                  onChange={(e) => handleVariantChange(i, "price", e.target.value)}
                  required
                />

                {/* Stock + Remove */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={t("inventory.stock") || "Stock"}
                    type="number"
                    value={v.stock}
                    onChange={(e) =>
                      handleVariantChange(i, "stock", e.target.value)
                    }
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariant(i)}
                    aria-label="Remove this variant"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addVariant}
            >
              {t("inventory.addVariant") || "Add Variant"}
            </Button>

            <PopupClose asChild>
              <Button
                type="submit"
                className="w-full"
                disabled={!name || !category || !branchId}
              >
                {editId
                  ? t("inventory.update") || "Update"
                  : t("inventory.save") || "Save"}
              </Button>
            </PopupClose>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attribute Dialogs */}
      <Dialog open={openBrandDialog} onOpenChange={setOpenBrandDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.addBrand") || "Add Brand"}</DialogTitle>
          </DialogHeader>
          <Input
            value={newAttr}
            onChange={(e) => setNewAttr(e.target.value)}
            placeholder={t("inventory.enterBrand") || "Enter brand"}
          />
          <div className="flex justify-end gap-2 mt-4">
            <PopupClose asChild>
              <Button variant="outline">{t("common.close") || "Close"}</Button>
            </PopupClose>
            <Button onClick={() => handleAddAttr("brand", setBrands)}>
              {t("inventory.add") || "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openSizeDialog} onOpenChange={setOpenSizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.addSize") || "Add Size"}</DialogTitle>
          </DialogHeader>
          <Input
            value={newAttr}
            onChange={(e) => setNewAttr(e.target.value)}
            placeholder={t("inventory.enterSize") || "Enter size"}
          />
          <div className="flex justify-end gap-2 mt-4">
            <PopupClose asChild>
              <Button variant="outline">{t("common.close") || "Close"}</Button>
            </PopupClose>
            <Button onClick={() => handleAddAttr("size", setSizes)}>
              {t("inventory.add") || "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openColorDialog} onOpenChange={setOpenColorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.addColor") || "Add Color"}</DialogTitle>
          </DialogHeader>
          <Input
            value={newAttr}
            onChange={(e) => setNewAttr(e.target.value)}
            placeholder={t("inventory.enterColor") || "Enter color"}
          />
          <div className="flex justify-end gap-2 mt-4">
            <PopupClose asChild>
              <Button variant="outline">{t("common.close") || "Close"}</Button>
            </PopupClose>
            <Button onClick={() => handleAddAttr("color", setColors)}>
              {t("inventory.add") || "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Branch-to-Branch Transfer (same model) */}
      <TransferSkuDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        branches={branches}
        inventories={rawInventories}
        t={t}
        onSubmit={async (payload) => {
          const res = await fetch(BRANCH_TRANSFER_API, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              json?.error || t("inventory.transferError") || "Transfer failed"
            );
          }
          await fetchInventories();
        }}
      />

      {/* Simple Sales ↔ Rental Transfer (same-branch) */}
      <TransferToOtherTypeDialog
        open={crossOpen}
        onOpenChange={(v) => {
          setCrossOpen(v);
          if (!v) fetchInventories();
        }}
        type={type}                  // "rental" or "sales" (current page)
        inventories={rawInventories} // items of current page
        API_BASE={API_BASE}
        t={t}
      />

      {/* Inventory Table */}
      <Card className="w-full">
        <CardContent className="p-4 overflow-auto">
          {loading ? (
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-black">
                  {columns.map((col) => (
                    <TableHead key={col.key}>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                  ))}
                  <TableHead>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <ReTable
              data={filtered}
              columns={columns}
              onDelete={handleDelete}
              onEditClick={openForm}
              showViewButton={false}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
