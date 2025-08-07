import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import ReTable from "@/components/shared/ReTable";

export default function StaffPage() {
  const API = import.meta.env.VITE_API_BASE;

  //–– State ––//
  const [staffList, setStaffList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editStaffId, setEditStaffId] = useState(null);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffid, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState("");
  const role = "staff";

  // Columns config
  const staffColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role", label: "Role" },
    { key: "branchId.name", label: "Branch" },
    { key: "staffid", label: "Staff ID" },
  ];

  //–– Helpers ––//
  const getNextStaffId = () => {
    const pattern = /^SG(\d{3})$/;
    const maxNum = staffList.reduce((max, s) => {
      const m = pattern.exec(s.staffid);
      return m ? Math.max(max, +m[1]) : max;
    }, 0);
    return `SG${String(maxNum + 1).padStart(3, "0")}`;
  };

  //–– Fetchers ––//
  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API}/branch/all`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not load branches");
      setBranches(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/staff/details`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not load staff");
      setStaffList(await res.json());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchStaff();
  }, []);

  //–– Dialog open/close ––//
  const openAddDialog = () => {
    setIsEditMode(false);
    setEditStaffId(null);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setBranchId("");
    setStaffId(getNextStaffId());
    setOpen(true);
  };

  const openEditDialog = (staff) => {
    setIsEditMode(true);
    setEditStaffId(staff._id);
    setName(staff.name);
    setEmail(staff.email);
    setPhone(staff.phone);
    setPassword("");
    setBranchId(staff.branchId?._id || staff.branchId);
    setStaffId(staff.staffid);
    setOpen(true);
  };

  //–– Create / Update ––//
  const handleInsert = async () => {
    if (!name || !email || !phone || !branchId) {
      return toast.error("Please fill all required fields.");
    }
    try {
      const res = await fetch(`${API}/create/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          phone,
          staffid,
          password,
          role,
          branchId,
        }),
      });
      const text = await res.text();
      const data = res.ok ? JSON.parse(text) : { message: text };
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message || "Staff added!");
      setOpen(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async () => {
    if (!name || !email || !phone || !branchId) {
      return toast.error("Please fill all required fields.");
    }
    try {
      const payload = { name, email, phone, branchId };
      if (password) payload.password = password;
      const res = await fetch(`${API}/staff/details/${editStaffId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data = res.ok ? JSON.parse(text) : { message: text };
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message || "Staff updated!");
      setOpen(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.message);
    }
  };

  //–– Delete ––//
  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/staff/details/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      toast.success("Staff removed!");
      fetchStaff();
    } catch (err) {
      toast.error(err.message);
    }
  };

  //–– Filter ––//
  const [searchTerm, setSearchTerm] = useState("");
  const filteredStaff = staffList.filter((s) =>
    [s.name, s.email, s.phone, s.staffid, s.role]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-auto">
      <h1 className="text-2xl font-bold">Staff Management</h1>

      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search staff…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/2"
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {isEditMode ? "Edit Staff" : "Add Staff"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? "Edit Staff" : "Add New Staff"}
              </DialogTitle>
            </DialogHeader>

            <form
              className="space-y-3 mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                isEditMode ? handleUpdate() : handleInsert();
              }}
            >
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <Input placeholder="Staff ID" value={staffid} readOnly />

              <Input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                {...(!isEditMode ? { required: true } : {})}
              />

              <label className="block font-medium text-sm">Branch</label>
              <select
                className="w-full p-2 border rounded"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
              >
                <option value="">— Select a branch —</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <Button type="submit" className="mt-2 w-full">
                {isEditMode ? "Update Staff" : "Save Staff"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="w-full">
        <CardContent className="p-4 overflow-auto">
          {loading ? (
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-black">
                  {staffColumns.map((col) => (
                    <TableHead key={col.key}>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                  ))}
                  <TableHead>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {staffColumns.map((col) => (
                      <TableCell key={col.key}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <ReTable
              data={filteredStaff}
              columns={staffColumns}
              onDelete={handleDelete}
              onEditClick={openEditDialog}
              showViewButton={false}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
