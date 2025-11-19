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
  const [branchData, setBranchData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const fetchBranch = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/branch/all", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch branches");
      const data = await response.json();
      setBranchData(data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranch();
  }, []);

  const handleInsert = async () => {
    if (!name || !location || !contactNumber) {
      toast.error("Please fill all fields.");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/api/branch/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, location, contactNumber }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add branch");

      toast.success("Branch added successfully!");
      setName("");
      setLocation("");
      setContactNumber("");
      fetchBranch();
    } catch (error) {
      toast.error("Error adding branch: " + error.message);
    }
  };

  const handleEdit = async (id, updatedItem) => {
    try {
      const res = await fetch(`http://localhost:4000/api/branch/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedItem),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update branch");

      toast.success("Branch updated successfully!");
      fetchBranch();
    } catch (error) {
      toast.error("Error updating branch: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:4000/api/branch/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete branch");

      toast.success("Branch deleted successfully!");
      fetchBranch();
    } catch (error) {
      toast.error("Error deleting branch: " + error.message);
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

            {/* TABLE SKELETON */}
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border">
                <thead>
                  <tr className="bg-black">
                    {columns.map((col) => (
                      <th key={col.key} className="p-3 text-left text-white text-sm">
                        <Skeleton className="h-4 w-24" />
                      </th>
                    ))}
                    <th className="p-3 text-right text-white text-sm">
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
                      <td className="p-3 text-right">
                        <Skeleton className="h-4 w-20 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
              <Input
                type="text"
                placeholder="Search branches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:w-1/2 w-full"
              />

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add Branch
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-visible">
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
                      <Button className="mt-2 w-full" onClick={handleInsert}>
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
