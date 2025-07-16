import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [branch, setBranch] = useState("60f7a9d2c8f5a22b9c123456");
  const [barcode, setBarcode] = useState("");
  const [open, setOpen] = useState(false);

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

  const handleInsert = async () => {
    try {
      const newItem = {
        name,
        description,
        category,
        type,
        quantity: Number(quantity),
        branch,
      };
      if (
        !name ||
        !description ||
        !category ||
        !quantity ||
        !branch 
      ) {
        toast.error("All fields are required!");
        return;
      }

      if (type === "sales") {
        newItem.price = Number(price);
      } else if (type === "rental") {
        newItem.pricePerDay = Number(price);
      } else if (type === "service") {
        newItem.serviceStatus = "pending";
      }

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
        throw new Error(err.message || "Failed to insert Inventory");
      }

      await fetchInventories();
      toast.success("Inventory item added successfully!");
      setOpen(false);
      setName("");
      setDescription("");
      setCategory("");
      setQuantity("");
      setPrice("");
      setBranch("60f7a9d2c8f5a22b9c123456");
      //setBarcode("");
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
    // API update logic can go here
  };

  const columns = [
    { key: "name", label: t("inventory.itemName") },
    { key: "barcode", label: t("inventory.barcode") },
    { key: "category", label: t("inventory.category") },
    { key: "quantity", label: t("inventory.quantity") },
    type === "sales"
      ? { key: "price", label: t("inventory.salePrice") }
      : type === "rental"
        ? { key: "pricePerDay", label: t("inventory.rentPrice") }
        : { key: "serviceStatus", label: t("inventory.serviceStatus") },
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t("inventory.addInventory")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("inventory.addInventory")}</DialogTitle>
              <DialogDescription>
                {t("inventory.description")}
              </DialogDescription>
            </DialogHeader>

            <form
              className="space-y-4 mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleInsert(); // Custom validation inside
              }}
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
                required
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
              <Input
                placeholder={t("inventory.quantity")}
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <Input
                placeholder={
                  type === "sales"
                    ? t("inventory.salePrice")
                    : type === "rental"
                      ? t("inventory.rentPrice")
                      : t("inventory.serviceStatus")
                }
                type={type === "service" ? "text" : "number"}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <Input
                placeholder="Branch ID"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                required
              />
              {/* <Input
                placeholder={t("inventory.barcode")}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                required
              /> */}
              <Button type="submit" className="w-full mt-2">
                {t("inventory.save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
