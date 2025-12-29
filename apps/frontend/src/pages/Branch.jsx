import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ReTable from "@/components/shared/ReTable";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const Branch = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;

  const [branchData, setBranchData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  // FETCH ALL BRANCHES
  const fetchBranch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/branch/all`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch branches");

      const data = await response.json();
      setBranchData(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranch();
  }, []);

  // ADD BRANCH
  const handleInsert = async () => {
    if (!name || !location || !contactNumber) {
      toast.error("Please fill all fields.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/branch/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, location, contactNumber }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Branch added successfully");
      setName("");
      setLocation("");
      setContactNumber("");
      fetchBranch();
    } catch (error) {
      toast.error(error.message || "Error adding branch");
    }
  };

  // EDIT BRANCH
  const handleEdit = async (id, updatedItem) => {
    try {
      const res = await fetch(`${API_BASE}/branch/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedItem),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Branch updated successfully");
      fetchBranch();
    } catch (error) {
      toast.error(error.message || "Error updating branch");
    }
  };

  // DELETE BRANCH
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/branch/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Branch deleted successfully");
      fetchBranch();
    } catch (error) {
      toast.error(error.message || "Error deleting branch");
    }
  };

  const filteredBranches = branchData.filter((branch) =>
    Object.values(branch).some((val) =>
      val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const columns = [
    { key: "name", label: "Branch Name" },
    { key: "location", label: "Location" },
    { key: "contactNumber", label: "Contact" },
  ];

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 space-y-6 overflow-hidden">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
        Branch Management
      </h1>

      {loading ? (
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <table className="w-full table-fixed border">
              <thead>
                <tr className="bg-black">
                  {columns.map((col) => (
                    <th key={col.key} className="p-3">
                      <Skeleton className="h-4 w-24" />
                    </th>
                  ))}
                  <th className="p-3">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-b">
                    {columns.map((col) => (
                      <td key={col.key} className="p-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                    <td className="p-3">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
              <Input
                placeholder="Search branches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:w-1/2"
              />

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex gap-2">
                    <Plus className="h-4 w-4" /> Add Branch
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Add New Branch</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3 mt-2">
                    <Input
                      placeholder="Branch Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                      placeholder="Location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                    <Input
                      placeholder="Contact Number"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                    />
                    <DialogClose asChild>
                      <Button className="w-full" onClick={handleInsert}>
                        Save Branch
                      </Button>
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <ReTable
              data={filteredBranches}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              showViewButton={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Branch;
