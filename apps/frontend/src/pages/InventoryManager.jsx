import React, { useEffect, useState } from "react";
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

const InventoryManager = ({ type, title }) => {
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

  const fetchInventories = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:4000/api/inventory/${type}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to fetch Inventory");

      const data = await response.json();
      console.log("Fetched Inventories:", data);
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
      barcode,
    };

    if (type === "sales") {
      // backend insertSales expects `price`
      newItem.price = Number(price);
    } else if (type === "rental") {
      newItem.pricePerDay = Number(price);
    } else if (type === "service") {
      newItem.serviceStatus = "pending"; // or pull from an input if you add one
    }

    const response = await fetch(
      `http://localhost:4000/api/inventory/${type}`,
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

    // reset form
    setName("");
    setDescription("");
    setCategory("");
    setQuantity("");
    setPrice("");
    setBranch("60f7a9d2c8f5a22b9c123456");
    setBarcode("");
  } catch (error) {
    toast.error("Error inserting inventory: " + error.message);
  }
};


  const handleDelete = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/inventory/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

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
    { key: "name", label: "Item Name" },
    { key: "barcode", label: "Code" },
    { key: "category", label: "Category" },
    { key: "quantity", label: "Quantity" },
    type === "sales"
      ? { key: "price", label: "Sale Price (₹)" }
      : type === "rental"
        ? { key: "pricePerDay", label: "Rate/Day (₹)" }
        : { key: "serviceStatus", label: "Service Status" },
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
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 space-y-6 w-308">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        {title}
      </h1>
      <div className="flex items-center justify-between">
        <Input
          type="text"
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/2"
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Inventory
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Inventory</DialogTitle>
              <DialogDescription>
                Fill in the details below to add a new inventory item.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Item Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white text-black"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <Input
                placeholder={
                  type === "sales"
                    ? "Sale Price (₹)"
                    : type === "rental"
                      ? "Price per Day (₹)"
                      : "Service Status"
                }
                type={type === "service" ? "text" : "number"}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <Input
                placeholder="Branch ID"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
              <Input
                placeholder="Barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
              <DialogClose asChild>
                <Button className="w-full mt-2" onClick={handleInsert}>
                  Save Inventory
                </Button>
              </DialogClose>
            </div>
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
