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

export default function StaffPage() {
  // Staff list and loading/error states
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search filter state
  const [searchTerm, setSearchTerm] = useState("");

  // Form input states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffid, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState("");
  const role = "staff";

  // Branch options
  const [branches, setBranches] = useState([]);

  // Table columns
  const staffColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role", label: "Role" },
    { key: "branchId.name", label: "Branch" },
    { key: "staffid", label: "Staff ID" },
  ];

  // Generate the next staff ID based on existing IDs (SGXXX)
  const getNextStaffId = () => {
    const pattern = /^SG(\d{3})$/;
    const maxNum = staffList.reduce((max, s) => {
      const match = pattern.exec(s.staffid);
      const num = match ? parseInt(match[1], 10) : 0;
      return num > max ? num : max;
    }, 0);
    const nextIndex = maxNum + 1;
    const nextStr = String(nextIndex).padStart(3, "0");
    return `SG${nextStr}`;
  };

  // Auto-set the staff ID whenever the list updates
  useEffect(() => {
    const nextId = getNextStaffId();
    setStaffId(nextId);
  }, [staffList]);

  // Fetch branches
  const fetchBranches = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/branch/all", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch branches");
      const data = await res.json();
      setBranches(data);
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  };

  // Fetch staff list
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchBranches();
    fetchStaff();
  }, []);

  // Filter staff by search term
  const filteredStaff = staffList.filter((staff) =>
    Object.values(staff).some((val) =>
      String(val ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Insert new staff
  const handleInsert = async () => {
    if (!name || !email || !phone || !staffid || !password || !branchId) {
      toast.error("Please fill all fields.");
      return;
    }
    const body = { name, email, phone, staffid, password, role, branchId };
    try {
      const res = await fetch("http://localhost:4000/api/create/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { message: text }; }
      if (!response.ok) throw new Error(data.message || "Failed to add staff");
      toast.success(data.message || "Staff added successfully!");
      // Refresh data; auto-ID will recalc
      fetchStaff();
      // Clear inputs except ID
      setName(""); setEmail(""); setPhone(""); setPassword(""); setBranchId("");
    } catch (err) {
      toast.error("Error adding staff: " + err.message);
    }
  };

  // Delete staff
  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:4000/api/staff/details/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      toast.error("Staff deleted successfully!");
      fetchStaff();
    } catch (err) {
      toast.error("Error deleting staff: " + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-8xl mx-auto p-4 w-310">
      <h1 className="text-2xl font-bold">Staff Management</h1>

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
            <DialogHeader><DialogTitle>Add New Staff</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
              <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <Input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
              <Input placeholder="Staff ID" value={staffid} readOnly />
              <Input placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />

              <label className="block font-medium text-sm">Branch</label>
              <select
                className="w-full p-2 border rounded"
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
              >
                <option value="">— Select a branch —</option>
                {branches.map(br => (
                  <option key={br._id} value={br._id}>{br.name}</option>
                ))}
              </select>

              <DialogClose asChild>
                <Button className="mt-2 w-full" onClick={handleInsert}>Save Staff</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card><CardContent className="p-4 space-y-4">
          <Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" />
        </CardContent></Card>
      ) : error ? (
        <p className="text-red-600 font-medium">{error}</p>
      ) : (
        <Card><CardContent className="p-4 overflow-auto">
          <ReTable
            data={filteredStaff}
            columns={staffColumns}
            onDelete={handleDelete}
            showViewButton
            showEditButton={false}
          />
        </CardContent></Card>
      )}
    </div>
  );
}
