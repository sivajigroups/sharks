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
  const [branchIds, setBranchIds] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  const role = "staff";

  // Columns config
  const staffColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role", label: "Role" },
    {
      key: "branchIds",
      label: "Branches",
      render: (val) => val?.map((b) => b.name).join(", "),
    },
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
    setPhone("");
    setPassword("");
    setBranchIds([]);
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
    // Handle both old single branchId and new branchIds array
    const existingIds = staff.branchIds?.map((b) => b._id || b) || [];
    if (existingIds.length === 0 && staff.branchId) {
      existingIds.push(staff.branchId._id || staff.branchId);
    }
    setBranchIds(existingIds);
    setStaffId(staff.staffid);
    setOpen(true);
  };

  //–– Create / Update ––//
  const handleInsert = async () => {
    if (!name || !email || !phone || branchIds.length === 0) {
      return toast.error(
        "Please fill all required fields and select at least one branch."
      );
    }
    if (phone.length !== 10) {
      return toast.error("Phone number must be exactly 10 digits.");
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
          branchIds,
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
    if (!name || !email || !phone || branchIds.length === 0) {
      return toast.error(
        "Please fill all required fields and select at least one branch."
      );
    }
    if (phone.length !== 10) {
      return toast.error("Phone number must be exactly 10 digits.");
    }
    try {
      const payload = { name, email, phone, branchIds };
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
              Add Staff
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

                if (branchIds.length === 0) {
                  alert("Please add at least one branch");
                  return;
                }

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
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 10) setPhone(val);
                }}
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

              {/* ================= BRANCH SELECT ================= */}
              <label className="block font-medium text-sm mt-2">Branches</label>

              <div className="flex gap-2">
                <select
                  className="flex-1 p-2 border rounded"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="">— Select a branch —</option>
                  {branches
                    .filter((b) => !branchIds.includes(b._id))
                    .map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                  disabled={!selectedBranch}
                  onClick={() => {
                    setBranchIds((prev) => [...prev, selectedBranch]);
                    setSelectedBranch("");
                  }}
                >
                  Add
                </button>
              </div>

              {/* ================= SELECTED BRANCH CHIPS ================= */}
              {branchIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {branchIds.map((id) => {
                    const branch = branches.find((b) => b._id === id);
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 border rounded-full text-sm"
                      >
                        {branch?.name || "Unknown"}

                        <button
                          type="button"
                          className="text-red-500 font-bold"
                          onClick={() =>
                            setBranchIds((prev) =>
                              prev.filter((bId) => bId !== id)
                            )
                          }
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* ================= SUBMIT ================= */}
              <Button type="submit" className="mt-3 w-full">
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
