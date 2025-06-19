import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import ReTable from "@/components/shared/ReTable";

const StaffPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("staff");
  const [branchId, setBranchId] = useState("");
  const [password, setPassword] = useState("");

  const staffColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role", label: "Role" },
    { key: "branchId.name", label: "Branch" },
  ];

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/staff/details", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch staff");

      const data = await res.json();
      setStaffList(data);
      console.log(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleInsert = async () => {
    if (!name || !email || !password || !role || !branchId || !phone) {
      alert("Please fill all fields.");
      return;
    }

    const body = { name, email, password, role, branchId, phone };

    try {
      const res = await fetch("http://localhost:4000/api/create/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to add staff");

      toast.success("Staff added successfully!");

      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setBranchId("");
      fetchStaff();
    } catch (err) {
      alert("Error adding staff: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:4000/api/staff/details/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      toast.error("Staff deleted successfully!");
      fetchStaff();
    } catch (error) {
      alert("Error deleting staff: " + error.message);
    }
  };

  const filteredStaff = staffList.filter((staff) =>
    Object.values(staff).some((val) =>
      (val ?? "").toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 w-308">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        Staff Management
      </h1>

      <div className="flex items-center justify-between gap-4">
        <Input
          type="text"
          placeholder="Search staff..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/2"
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Staff</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input
                placeholder="Branch ID"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              />
              <DialogClose asChild>
                <Button className="mt-2 w-full" onClick={handleInsert}>
                  Save Staff
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <p className="text-red-600 font-medium">{error}</p>
      ) : (
        <Card>
          <CardContent className="p-4 overflow-auto">
            <ReTable
              data={filteredStaff}
              columns={staffColumns}
              onDelete={handleDelete}
              showViewButton={true}
              showEdirButton={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaffPage;
