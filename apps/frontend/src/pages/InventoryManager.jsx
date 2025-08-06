import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
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

const categories = [
  "Power Tools",
  "Hand Tools",
  "Safety Gear",
  "Electrical",
  "Cleaning",
  "Plumbing",
];

export default function InventoryManager({ type }) {
  const { t } = useTranslation();

  // Table columns
  const columns = [
    { key: "name", label: t("inventory.itemName") },
    { key: "category", label: t("inventory.category") },
    { key: "updatedAt", label: t("inventory.lastUpdated") },
  ];

  // State
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [variants, setVariants] = useState([
    { brand: "", size: "", color: "", price: "", stock: "" },
  ]);
  const [brands, setBrands] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [openBrandDialog, setOpenBrandDialog] = useState(false);
  const [openSizeDialog, setOpenSizeDialog] = useState(false);
  const [openColorDialog, setOpenColorDialog] = useState(false);
  const [newAttr, setNewAttr] = useState("");

  // Fetch inventories
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}/inventory/${type}`,
          { credentials: "include" }
        );
        const { data } = await res.json();
        setInventories(data);
      } catch {
        toast.error(t("inventory.fetchError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [type, t]);

  // Fetch attributes
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}/inventory/attributes`,
          { credentials: "include" }
        );
        const { data } = await res.json();
        setBrands(data.brand || []);
        setSizes(data.size || []);
        setColors(data.color || []);
      } catch {
        toast.error(t("inventory.fetchError"));
      }
    })();
  }, [t]);

  // Open form
  const openForm = (item = null) => {
    if (item) {
      setEditId(item._id);
      setName(item.name);
      setDescription(item.description);
      setCategory(item.category);
      setVariants(
        item.variants.map((v) => ({
          brand: v.brand,
          size: v.size,
          color: v.color,
          price: v.price,
          stock: v.stock,
        }))
      );
    } else {
      setEditId(null);
      setName("");
      setDescription("");
      setCategory("");
      setVariants([{ brand: "", size: "", color: "", price: "", stock: "" }]);
    }
    setOpen(true);
  };

  // Submit create/update
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { name, description, category, variants };
    try {
      const url = editId
        ? `${import.meta.env.VITE_API_BASE}/inventory/${type}/${editId}`
        : `${import.meta.env.VITE_API_BASE}/inventory/${type}`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(
        t(editId ? "inventory.updateSuccess" : "inventory.insertSuccess")
      );
      // reload
      const list = await fetch(
        `${import.meta.env.VITE_API_BASE}/inventory/${type}`,
        { credentials: "include" }
      );
      const { data } = await list.json();
      setInventories(data);
      setOpen(false);
    } catch {
      toast.error(
        t(editId ? "inventory.updateError" : "inventory.insertError")
      );
    }
  };

  // Delete
  const handleDelete = async (id) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/inventory/${id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error();
      setInventories((invs) => invs.filter((i) => i._id !== id));
      toast.success(t("inventory.deleteSuccess"));
    } catch {
      toast.error(t("inventory.deleteError"));
    }
  };

  // Variants
  const handleVariantChange = (i, field, val) => {
    const arr = [...variants];
    arr[i][field] = field === "price" || field === "stock" ? Number(val) : val;
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
  const handleAddAttr = async (type, setter) => {
    if (!newAttr.trim()) return toast.error(t("inventory.emptyAttribute"));
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/inventory/attributes`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [type]: [newAttr.trim()] }),
        }
      );
      if (!res.ok) throw new Error();
      setter((arr) => [...arr, newAttr.trim()]);
      toast.success(t(`inventory.${type}AddSuccess`));
      setNewAttr("");
      setOpenBrandDialog(false);
      setOpenSizeDialog(false);
      setOpenColorDialog(false);
    } catch {
      toast.error(t(`inventory.${type}AddError`));
    }
  };

  const filtered = searchTerm
    ? inventories.filter((inv) =>
        JSON.stringify(inv).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : inventories;

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-auto">
      <h1 className="text-2xl font-bold">{t("inventory.title")}</h1>

      {/* Toolbar */}
      <div className="flex gap-4">
        <Input
          placeholder={t("inventory.search")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button onClick={() => openForm()}>
          <Plus className="mr-2" />
          {t("inventory.addInventory")}
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[90vw] !max-w-[1100px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId
                ? t("inventory.editInventory")
                : t("inventory.addInventory")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4  mt-4 ">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder={t("inventory.itemName")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                placeholder={t("inventory.description")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <select
              className="w-full p-2 border rounded"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">{t("inventory.selectCategory")}</option>
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
                  <option value="">{t("inventory.selectBrand")}</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value="__add_brand__">
                    ➕ {t("inventory.addBrand")}
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
                  <option value="">{t("inventory.selectSize")}</option>
                  {sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__add_size__">
                    ➕ {t("inventory.addSize")}
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
                  <option value="">{t("inventory.selectColor")}</option>
                  {colors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__add_color__">
                    ➕ {t("inventory.addColor")}
                  </option>
                </select>

                {/* Price */}
                <Input
                  placeholder={t("inventory.price")}
                  type="number"
                  value={v.price}
                  onChange={(e) =>
                    handleVariantChange(i, "price", e.target.value)
                  }
                  required
                />

                {/* Stock + Remove */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={t("inventory.stock")}
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
              {t("inventory.addVariant")}
            </Button>

            <PopupClose asChild>
              <Button type="submit" className="w-full">
                {editId ? t("inventory.update") : t("inventory.save")}
              </Button>
            </PopupClose>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attribute Dialogs */}
      <Dialog open={openBrandDialog} onOpenChange={setOpenBrandDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.addBrand")}</DialogTitle>
          </DialogHeader>
          <Input
            value={newAttr}
            onChange={(e) => setNewAttr(e.target.value)}
            placeholder={t("inventory.enterBrand")}
          />
          <div className="flex justify-end gap-2 mt-4">
            <PopupClose asChild>
              <Button variant="outline">{t("common.close")}</Button>
            </PopupClose>
            <Button onClick={() => handleAddAttr("brand", setBrands)}>
              {t("inventory.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openSizeDialog} onOpenChange={setOpenSizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.addSize")}</DialogTitle>
          </DialogHeader>
          <Input
            value={newAttr}
            onChange={(e) => setNewAttr(e.target.value)}
            placeholder={t("inventory.enterSize")}
          />
          <div className="flex justify-end gap-2 mt-4">
            <PopupClose asChild>
              <Button variant="outline">{t("common.close")}</Button>
            </PopupClose>
            <Button onClick={() => handleAddAttr("size", setSizes)}>
              {t("inventory.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openColorDialog} onOpenChange={setOpenColorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.addColor")}</DialogTitle>
          </DialogHeader>
          <Input
            value={newAttr}
            onChange={(e) => setNewAttr(e.target.value)}
            placeholder={t("inventory.enterColor")}
          />
          <div className="flex justify-end gap-2 mt-4">
            <PopupClose asChild>
              <Button variant="outline">{t("common.close")}</Button>
            </PopupClose>
            <Button onClick={() => handleAddAttr("color", setColors)}>
              {t("inventory.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
