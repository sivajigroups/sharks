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
  const [branches, setBranches] = useState([]);
  const [branchData, setBranchData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // States for branch creation form
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const fetchBranch = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://api.sivajigroups.com/api/branch/all", {
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
      alert("Please fill all fields.");
      return;
    }

    const body = { name, location, contactNumber };

    try {
      const res = await fetch("https://api.sivajigroups.com/api/branch/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to add branch");
        return;
      }

      toast.success("Branch added successfully!");
      setName("");
      setLocation("");
      setContactNumber("");
      fetchBranch();
    } catch (error) {
      alert("Error adding branch: " + error.message);
    }
  };

 const handleEdit = async (id, updatedItem) => {
  try {
    const response = await fetch(`https://api.sivajigroups.com/api/branch/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updatedItem),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to update branch");
      return;
    }

    toast.success("Branch updated successfully!");
    fetchBranch(); // Refresh data
  } catch (error) {
    alert("Error updating branch: " + error.message);
  }
};


const handleDelete = async (id) => {
  try {
    const res = await fetch(`https://api.sivajigroups.com/api/branch/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to delete branch");
    }

    toast.success("Branch deleted successfully!");
    fetchBranch(); // Refresh the list
  } catch (error) {
    alert("Error deleting branch: " + error.message);
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
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 space-y-6 w-308">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
        Branches Management
      </h1>

      {loading ? (
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-full mb-2" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <Input
                type="text"
                placeholder="Search branches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-1/2"
              />
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Branch
                  </Button>
                </DialogTrigger>
                <DialogContent>
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
