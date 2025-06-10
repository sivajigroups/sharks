import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [inventories, setInventories] = useState(inventoryData);
  const [searchTerm, setSearchTerm] = useState("");
  const filterInventory = inventories.filter((inventory) =>
    Object.values(inventory).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New Tools
        </Button>
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
                <TableHead className="text-white text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filterInventory.length > 0 ? (
                filterInventory.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted transition duration-200"
                  >
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {item.ratePerDay > 0 ? `₹${item.ratePerDay}` : "N/A"}
                    </TableCell>
                    <TableCell>{item.lastUpdated}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" className="cursor-pointer">
                        View
                      </Button>
                      <Button variant="secondary" size="sm" className="cursor-pointer">
                        Edit
                      </Button>
                      <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="cursor-pointer">
                              Delete
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Are you absolutely sure?
                              </DialogTitle>
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
