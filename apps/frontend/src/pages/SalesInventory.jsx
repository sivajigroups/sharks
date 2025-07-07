import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import { toast } from "sonner";
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

const SalesInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("sales");
  const [quantity, setQuantity] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [branch, setBranch] = useState("60f7a9d2c8f5a22b9c123456"); // default or from dropdown
  const [barcode, setBarcode] = useState("");

  const fetchInventories = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://api.sivajigroups.com/api/inventory?type=sales",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to fetch Inventory");

      const data = await response.json();
      console.log(data);
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
  }, []);
  const handleEdit = (id, updatedItem) => {
    // Implement your update logic here (e.g., API call)
    console.log("Edit", id, updatedItem);
  };

  const handleInsert = async () => {
    try {
      const newItem = {
        name,
        description,
        category,
        type,
        quantity: Number(quantity),
        salePrice: Number(salePrice),
        branch,
        barcode,
      };
      const response = await fetch("https://api.sivajigroups.com/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(newItem),
      });
      if (!response.ok) throw new Error("Failed to insert Inventory");
      await fetchInventories(); // Refresh the inventory list
      toast.success("Inventory item added successfully!");
      setName("");
      setDescription("");
      setCategory("");
      setType("sales");
      setQuantity("");
      setSalePrice("");
      setBranch("60f7a9d2c8f5a22b9c123456"); // Reset to default or selected branch
      setBarcode("");
      //  const data = await response.json();
    } catch (error) {
      console.error("Error Inserting Inventory:", error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(
        `https://api.sivajigroups.com/api/inventory/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to delete Inventory");
      toast.error("Customer deleted successfully!");
      // Refresh inventory list
      await fetchInventories();
    } catch (error) {
      console.error("Error Deleting Inventory:", error.message);
    }
  };

  const columns = [
    { key: "name", label: "Item Name" },
    { key: "barcode", label: "Code" },
    { key: "category", label: "Category" },
    { key: "quantity", label: "Quantity" },
    { key: "salePrice", label: "Rate/Day (₹)" },
    { key: "updatedAt", label: "Last Updated" },
  ];
const categories = ["Power Tools", "Hand Tools", "Safety Gear", "Electrical", "Cleaning"];

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
        Inventory & Services Overview
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
              <Plus className="mr-2 h-4 w-4" />
              Add Inventory
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
              <div className="space-y-1">
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
</div>
              <Input
                placeholder="Type (rental/sale)"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Sale Price(₹)"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
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

export default SalesInventory;
