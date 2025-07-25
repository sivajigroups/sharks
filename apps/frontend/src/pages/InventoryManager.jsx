import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ReTable from "@/components/shared/ReTable";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const categories = [
  "Power Tools",
  "Hand Tools",
  "Safety Gear",
  "Electrical",
  "Cleaning",
  "Plumbing",
];

const InventoryManager = ({ type }) => {
  const { t } = useTranslation();
  const [inventories, setInventories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
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

  const [newBrand, setNewBrand] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");

  useEffect(() => {
    const fetchInventories = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/inventory/${type}`, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        setInventories(data.data);
      } catch (err) {
        toast.error("Failed to fetch inventory");
      } finally {
        setLoading(false);
      }
    };
    fetchInventories();
  }, [type]);

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/inventory/attributes`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to fetch attributes");

        const data = await res.json();
        const { brand = [], size = [], color = [] } = data.data || {};

        setBrands(brand);
        setSizes(size);
        setColors(color);
      } catch (err) {
        toast.error("Failed to fetch attributes");
      }
    };
    fetchAttributes();
  }, []);

  const handleVariantChange = (index, field, value) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const addVariant = () => {
    setVariants([...variants, { brand: "", size: "", color: "", price: "", stock: "" }]);
  };

  const removeVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleInsert = async () => {
    try {
      const cleanedVariants = variants.map((v) => ({
        brand: v.brand || undefined,
        size: v.size || undefined,
        color: v.color || undefined,
        price: Number(v.price),
        stock: Number(v.stock),
      }));

      const newItem = { name, description, category, variants: cleanedVariants };

      const res = await fetch(`${import.meta.env.VITE_API_BASE}/inventory/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newItem),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Insert failed");
      }

      toast.success("Inventory item added successfully!");
      setName("");
      setDescription("");
      setCategory("");
      setVariants([{ brand: "", size: "", color: "", price: "", stock: "" }]);
    } catch (err) {
      toast.error("Insert failed: " + err.message);
    }
  };

  const handleAddAttribute = async (type, value, setFn, field) => {
    const trimmed = value.trim();
    if (!trimmed) return toast.error(`${type} cannot be empty!`);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/inventory/attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [type]: [trimmed] }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to add ${type}`);

      setFn((prev) => [...prev, trimmed]);
      setVariants((prev) =>
        prev.map((v) => (v[field] === `__add_${type}__` ? { ...v, [field]: trimmed } : v))
      );

      if (type === "brand") {
        setNewBrand("");
        setOpenBrandDialog(false);
      } else if (type === "size") {
        setNewSize("");
        setOpenSizeDialog(false);
      } else if (type === "color") {
        setNewColor("");
        setOpenColorDialog(false);
      }

      toast.success(`${type} added successfully!`);
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/inventory/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Inventory deleted!");
      setInventories((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      toast.error("Error deleting inventory");
    }
  };

  const columns = [
    { key: "name", label: t("inventory.itemName") },
    { key: "category", label: t("inventory.category") },
    { key: "updatedAt", label: "Last Updated" },
  ];

  const filterInventory = searchTerm
    ? inventories.filter((item) =>
        Object.values(item).some((val) =>
          (val ?? "").toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : inventories;

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 space-y-6 w-305">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        {t("inventory.title")}
      </h1>

      <div className="flex items-center justify-between">
        <Input
          type="text"
          placeholder={t("inventory.search")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/2"
        />

        <Drawer>
          <DrawerTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> {t("inventory.addInventory")}
            </Button>
          </DrawerTrigger>

          <DrawerContent className="h-screen p-0 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto p-6">
              <DrawerHeader>
                <DrawerTitle>{t("inventory.addInventory")}</DrawerTitle>
                <DrawerClose>
                  <Button variant="ghost">Close</Button>
                </DrawerClose>
              </DrawerHeader>

              <form
                id="inventory-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleInsert();
                }}
                className="space-y-4"
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
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {variants.map((variant, index) => (
                  <div key={index} className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <select
                      value={variant.brand}
                      onChange={(e) =>
                        e.target.value === "__add_brand__"
                          ? setOpenBrandDialog(true)
                          : handleVariantChange(index, "brand", e.target.value)
                      }
                      className="p-2 border rounded"
                      required
                    >
                      <option value="">Select Brand</option>
                      {brands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                      <option value="__add_brand__">➕ Add Brand</option>
                    </select>

                    <select
                      value={variant.size}
                      onChange={(e) =>
                        e.target.value === "__add_size__"
                          ? setOpenSizeDialog(true)
                          : handleVariantChange(index, "size", e.target.value)
                      }
                      className="p-2 border rounded"
                    >
                      <option value="">Select Size</option>
                      {sizes.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      <option value="__add_size__">➕ Add Size</option>
                    </select>

                    <select
                      value={variant.color}
                      onChange={(e) =>
                        e.target.value === "__add_color__"
                          ? setOpenColorDialog(true)
                          : handleVariantChange(index, "color", e.target.value)
                      }
                      className="p-2 border rounded"
                    >
                      <option value="">Select Color</option>
                      {colors.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__add_color__">➕ Add Color</option>
                    </select>

                    <Input
                      placeholder="Price"
                      type="number"
                      value={variant.price}
                      onChange={(e) => handleVariantChange(index, "price", e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Stock"
                      type="number"
                      value={variant.stock}
                      onChange={(e) => handleVariantChange(index, "stock", e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removeVariant(index)}
                      className="col-span-full"
                    >
                      Remove Variant
                    </Button>
                  </div>
                ))}

                <Button type="button" onClick={addVariant} variant="outline" className="w-full">
                  + Add Variant
                </Button>
              </form>
            </div>

            <div className="border-t px-6 py-4 bg-white">
              <Button type="submit" form="inventory-form" className="w-full">
                {t("inventory.save") || "Save Inventory"}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Attribute Dialogs */}
      <Dialog open={openBrandDialog} onOpenChange={setOpenBrandDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Brand</DialogTitle>
            <DialogDescription>Enter a new brand name</DialogDescription>
          </DialogHeader>
          <Input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setOpenBrandDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleAddAttribute("brand", newBrand, setBrands, "brand")}>
              Add Brand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openSizeDialog} onOpenChange={setOpenSizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Size</DialogTitle>
            <DialogDescription>Enter a new size</DialogDescription>
          </DialogHeader>
          <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setOpenSizeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleAddAttribute("size", newSize, setSizes, "size")}>
              Add Size
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openColorDialog} onOpenChange={setOpenColorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Color</DialogTitle>
            <DialogDescription>Enter a new color</DialogDescription>
          </DialogHeader>
          <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setOpenColorDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleAddAttribute("color", newColor, setColors, "color")}>
              Add Color
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="overflow-auto">
        <CardContent className="p-4">
          <ReTable data={filterInventory} columns={columns} onDelete={handleDelete} />
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryManager;
