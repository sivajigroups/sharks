import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose as PopupClose,
} from "@/components/ui/dialog";
import ReTable from "@/components/shared/ReTable";
import { toast } from "sonner";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
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
  const columns = [
  { key: "name",      label: t("inventory.itemName") },
  { key: "category",  label: t("inventory.category") },
  { key: "updatedAt", label: t("inventory.lastUpdated") },
];
  const [inventories, setInventories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [variants, setVariants] = useState([
    { brand: "", size: "", color: "", price: "", stock: "" },
  ]);
  const [brands, setBrands] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);

  // Dialog flags and new-attribute value
  const [openBrandDialog, setOpenBrandDialog] = useState(false);
  const [openSizeDialog, setOpenSizeDialog] = useState(false);
  const [openColorDialog, setOpenColorDialog] = useState(false);
  const [newAttrValue, setNewAttrValue] = useState("");

  // Fetch inventory list
  useEffect(() => {
    async function loadInventories() {
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}/inventory/${type}`,
          { credentials: "include" }
        );
        const { data } = await res.json();
        setInventories(data);
      } catch {
        const msg = t("inventory.fetchError");
        toast.error(msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadInventories();
  }, [type, t]);

  // Fetch attributes
  useEffect(() => {
    async function loadAttributes() {
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
    }
    loadAttributes();
  }, [t]);

  // Submit new inventory
  const handleInsert = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        description,
        category,
        variants: variants.map((v) => ({
          brand: v.brand,
          size: v.size,
          color: v.color,
          price: Number(v.price),
          stock: Number(v.stock),
        })),
      };
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/inventory/${type}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(t("inventory.insertSuccess"));
      setName("");
      setDescription("");
      setCategory("");
      setVariants([{ brand: "", size: "", color: "", price: "", stock: "" }]);
      // refresh
      const listRes = await fetch(
        `${import.meta.env.VITE_API_BASE}/inventory/${type}`,
        { credentials: "include" }
      );
      const { data } = await listRes.json();
      setInventories(data);
    } catch {
      toast.error(t("inventory.insertError"));
    }
  };

  // Add attribute helper
  const handleAddAttribute = async (attrType, setter) => {
    const value = newAttrValue.trim();
    if (!value) return toast.error(t("inventory.emptyAttribute"));
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/inventory/attributes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ [attrType]: [value] }),
        }
      );
      if (!res.ok) throw new Error();
      setter((prev) => [...prev, value]);
      toast.success(t(`inventory.${attrType}AddSuccess`));
      setNewAttrValue("");
    } catch {
      toast.error(t(`inventory.${attrType}AddError`));
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
      setInventories((prev) => prev.filter((i) => i._id !== id));
      toast.success(t("inventory.deleteSuccess"));
    } catch {
      toast.error(t("inventory.deleteError"));
    }
  };

  // Variant change/add/remove
  const handleVariantChange = (idx, field, val) => {
    const u = [...variants];
    u[idx][field] = val;
    setVariants(u);
  };
  const addVariant = () =>
    setVariants((prev) => [
      ...prev,
      { brand: "", size: "", color: "", price: "", stock: "" },
    ]);
  const removeVariant = (idx) =>
    setVariants((prev) => prev.filter((_, i) => i !== idx));

  // Filter
  const filtered = searchTerm
    ? inventories.filter((item) =>
        Object.values(item).some((v) =>
          String(v).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : inventories;

  return (
    <div className="flex flex-col flex-1 min-w-0 w-full h-full p-4 gap-4 overflow-auto">
      <h1 className="text-2xl font-bold">{t("inventory.title")}</h1>

      {/* Toolbar */}
      <div className="flex items-center justify-between w-full gap-4 min-w-0">
        <Input
          placeholder={t("inventory.search")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-0"
        />
        <Drawer>
          <DrawerTrigger asChild>
            <Button>
              <Plus className="mr-2" /> {t("inventory.addInventory")}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="flex flex-col p-0">
            <DrawerHeader>
              <DrawerTitle>{t("inventory.addInventory")}</DrawerTitle>
              <DrawerClose>
                <Button variant="ghost">{t("common.close")}</Button>
              </DrawerClose>
            </DrawerHeader>
            <form
              id="inventory-form"
              className="flex-1 overflow-auto p-6 space-y-4"
              onSubmit={handleInsert}
            >
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
              {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                  <select
                    className="p-2 border rounded"
                    value={v.size}
                    onChange={(e) => {
                      if (e.target.value === "__add_size__")
                        return setOpenSizeDialog(true);
                      handleVariantChange(i, "size", e.target.value);
                    }}
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
                  <select
                    className="p-2 border rounded"
                    value={v.color}
                    onChange={(e) => {
                      if (e.target.value === "__add_color__")
                        return setOpenColorDialog(true);
                      handleVariantChange(i, "color", e.target.value);
                    }}
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
                  <Input
                    placeholder={t("inventory.price")}
                    type="number"
                    value={v.price}
                    onChange={(e) =>
                      handleVariantChange(i, "price", e.target.value)
                    }
                    required
                  />
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
                    variant="destructive"
                    onClick={() => removeVariant(i)}
                    className="col-span-full"
                  >
                    {t("inventory.removeVariant")}
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={addVariant}
                variant="outline"
                className="w-full"
              >
                {t("inventory.addVariant")}
              </Button>
            </form>
            <div className="border-t p-4">
              <Button type="submit" form="inventory-form" className="w-full">
                {t("inventory.save")}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Add-Attribute Dialogs */}
      <Dialog open={openBrandDialog} onOpenChange={setOpenBrandDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.addBrand")}</DialogTitle>
            <DialogDescription>{t("inventory.enterBrand")}</DialogDescription>
          </DialogHeader>
          <Input
            value={newAttrValue}
            onChange={(e) => setNewAttrValue(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <PopupClose asChild>
              <Button variant="ghost">{t("common.close")}</Button>
            </PopupClose>
            <Button
              onClick={() => {
                handleAddAttribute("brand", setBrands);
                setOpenBrandDialog(false);
              }}
            >
              {t("inventory.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openSizeDialog} onOpenChange={setOpenSizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.addSize")}</DialogTitle>
            <DialogDescription>{t("inventory.enterSize")}</DialogDescription>
          </DialogHeader>
          <Input
            value={newAttrValue}
            onChange={(e) => setNewAttrValue(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <PopupClose asChild>
              <Button variant="ghost">{t("common.close")}</Button>
            </PopupClose>
            <Button
              onClick={() => {
                handleAddAttribute("size", setSizes);
                setOpenSizeDialog(false);
              }}
            >
              {t("inventory.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openColorDialog} onOpenChange={setOpenColorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.addColor")}</DialogTitle>
            <DialogDescription>{t("inventory.enterColor")}</DialogDescription>
          </DialogHeader>
          <Input
            value={newAttrValue}
            onChange={(e) => setNewAttrValue(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <PopupClose asChild>
              <Button variant="ghost">{t("common.close")}</Button>
            </PopupClose>
            <Button
              onClick={() => {
                handleAddAttribute("color", setColors);
                setOpenColorDialog(false);
              }}
            >
              {t("inventory.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-none">
        <CardContent className="p-4 overflow-auto w-full max-w-none">
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
                {[...Array(5)].map((_, i) => (
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
              columns={[
                { key: "name", label: t("inventory.itemName") },
                { key: "category", label: t("inventory.category") },
                { key: "updatedAt", label: t("inventory.lastUpdated") },
              ]}
              onDelete={handleDelete}
              showViewButton={false}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
