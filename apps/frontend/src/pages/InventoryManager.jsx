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
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [variants, setVariants] = useState([
    { brand: "", size: "", color: "", price: "", stock: "" },
  ]);

  const fetchInventories = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/inventory/${type}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to fetch Inventory");

      const data = await response.json();
      setInventories(data.data);
      setError("");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventories();
  }, [type]);

  const handleVariantChange = (index, field, value) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const addVariant = () => {
    setVariants([
      ...variants,
      { brand: "", size: "", color: "", price: "", stock: "" },
    ]);
  };

  const removeVariant = (index) => {
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
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

      const newItem = {
        name,
        description,
        category,
        variants: cleanedVariants,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/inventory/${type}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(newItem),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(`${err.message}${err.error ? ": " + err.error : ""}`);
      }
      console.log("type:", type);

      await fetchInventories();
      toast.success("Inventory item added successfully!");
      setOpen(false);
      setName("");
      setDescription("");
      setCategory("");
      setVariants([{ brand: "", size: "", color: "", price: "", stock: "" }]);
    } catch (error) {
      toast.error("Error inserting inventory: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/inventory/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      console.log(response);
      if (!response.ok) throw new Error("Failed to delete Inventory");
      toast.error("Inventory deleted successfully!");
      await fetchInventories();
    } catch (error) {
      toast.error("Error deleting inventory: " + error.message);
    }
  };

  const handleEdit = (id, updatedItem) => {
    console.log("Edit", id, updatedItem);
    // Future edit API
  };

  const columns = [
    { key: "name", label: t("inventory.itemName") },
    { key: "category", label: t("inventory.category") },
    { key: "updatedAt", label: "Last Updated" },
  ];

  const filterInventory = searchTerm
    ? inventories.filter((inventory) =>
        Object.values(inventory).some((value) =>
          (value ?? "")
            .toString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
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
            {/* Form content scrollable */}
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
                  className="w-full p-2 border border-gray-300 rounded bg-white text-black"
                  required
                >
                  <option value="">{t("inventory.selectCategory")}</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <div key={index} className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <Input
                        placeholder="Brand"
                        value={variant.brand}
                        onChange={(e) =>
                          handleVariantChange(index, "brand", e.target.value)
                        }
                      />
                      <Input
                        placeholder="Size"
                        value={variant.size}
                        onChange={(e) =>
                          handleVariantChange(index, "size", e.target.value)
                        }
                      />
                      <Input
                        placeholder="Color"
                        value={variant.color}
                        onChange={(e) =>
                          handleVariantChange(index, "color", e.target.value)
                        }
                      />
                      <Input
                        placeholder="Price"
                        type="number"
                        value={variant.price}
                        onChange={(e) =>
                          handleVariantChange(index, "price", e.target.value)
                        }
                        required
                      />
                      <Input
                        placeholder="Stock"
                        type="number"
                        value={variant.stock}
                        onChange={(e) =>
                          handleVariantChange(index, "stock", e.target.value)
                        }
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
                  <Button
                    type="button"
                    onClick={addVariant}
                    variant="outline"
                    className="w-full"
                  >
                    + Add Variant
                  </Button>
                </div>
              </form>
            </div>

            {/* Fixed submit button */}
            <div className="border-t px-6 py-4 bg-white">
              <Button type="submit" form="inventory-form" className="w-full">
                {t("inventory.save") || "Save Inventory"}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <Card className="overflow-auto">
        <CardContent className="p-4">
          <ReTable
            data={filterInventory}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryManager;
