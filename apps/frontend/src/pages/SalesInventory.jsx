import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { inventoryData } from "@/Data/data";
import { Plus } from "lucide-react";

const SalesInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInventories = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/inventory", {
        method: "GET",
        credentials: "include",
      });

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
  const filterInventory = searchTerm
  ? inventories.filter((inventory) =>
      Object.values(inventory).some((value) =>
        (value ?? "").toString().toLowerCase().includes(searchTerm.toLowerCase())
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
    <Input placeholder="Item Name" />
    <Input placeholder="Barcode / Item Code" />
    <Input placeholder="Category" />
    <Input type="number" placeholder="Quantity" />
    <Input type="number" placeholder="Rate/Day (₹)" />
    <DialogClose asChild>
      <Button className="w-full mt-2">Save Inventory</Button>
    </DialogClose>
  </div>
</DialogContent>

        </Dialog>
      </div>
      <Card className="overflow-auto">
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-black hover:bg-black">
                <TableHead className="text-white">Item Name</TableHead>
                <TableHead className="text-white">Code</TableHead>
                <TableHead className="text-white">Category</TableHead>
                <TableHead className="text-white">Quantity</TableHead>
                <TableHead className="text-white">Rate/Day (₹)</TableHead>
                <TableHead className="text-white">Last Updated</TableHead>
                <TableHead className="text-white text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filterInventory.length > 0 ? (
                filterInventory.map((item) => (
                  <TableRow
                    key={item._id}
                    className="hover:bg-muted transition duration-200"
                  >
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.barcode}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {item.salePrice > 0 ? `₹${item.salePrice}` : "N/A"}
                    </TableCell>
                    <TableCell>{item.updatedAt}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                      >
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="cursor-pointer"
                      >
                        Edit
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="cursor-pointer"
                          >
                            Delete
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                          </DialogHeader>
                          <div className="flex justify-end gap-2">
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                              className="w-[30%]"
                              size="sm"
                              variant="destructive"
                            >
                              Confirm Delete
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No Tools found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesInventory;
