import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Phone, User, Building2, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";


const StaffDetail = () => {
  const { id } = useParams();
  const [staff, setStaff] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({});
const navigate = useNavigate();

  const fetchStaff = async () => {
    const res = await fetch(`https://api.sivajigroups.com/api/staff/details/${id}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();
    setStaff(data);
    setForm({
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      branchId: data.branchId?._id,
    });
  };

  const fetchBranches = async () => {
    const res = await fetch("https://api.sivajigroups.com/api/branch/all");
    const data = await res.json();
    setBranches(data);
  };

  useEffect(() => {
    fetchStaff();
    fetchBranches();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    const res = await fetch(`https://api.sivajigroups.com/api/staff/details/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      toast.error("Update failed");
      return;
    }

    toast.success("Staff updated");
     navigate("/layout/users");
    setEditMode(false);
    fetchStaff();
  };

  if (!staff) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-6 w-308">
      <h2 className="text-3xl font-bold text-gray-800 text-center">
        Staff Profile
      </h2>

      <Card className="shadow-lg">
        <CardContent className="p-6 space-y-5">

          {/* Name */}
          <div className="flex items-center gap-3">
            <User className="text-gray-600" />
            <Input
              name="name"
              disabled={!editMode}
              value={form.name}
              onChange={handleChange}
              className="bg-white"
              placeholder="Name"
            />
          </div>

          {/* Email */}
          <div className="flex items-center gap-3">
            <Mail className="text-gray-600" />
            <Input
              name="email"
              disabled={!editMode}
              value={form.email}
              onChange={handleChange}
              className="bg-white"
              placeholder="Email"
            />
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3">
            <Phone className="text-gray-600" />
            <Input
              name="phone"
              disabled={!editMode}
              value={form.phone}
              onChange={handleChange}
              className="bg-white"
              placeholder="Phone"
            />
          </div>

          {/* Role */}
          <div className="flex items-center gap-3">
            <Shield className="text-gray-600" />
            <select
              name="role"
              value={form.role}
              disabled={!editMode}
              onChange={handleChange}
              className="w-full p-2 border rounded text-black"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Branch */}
          <div className="flex items-center gap-3">
            <Building2 className="text-gray-600" />
            <select
              name="branchId"
              value={form.branchId}
              disabled={!editMode}
              onChange={handleChange}
              className="w-full p-2 border rounded text-black"
            >
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate}>Save</Button>
              </>
            ) : (
              <>
              <Button variant="primary" onClick={() => navigate("/layout/users")}>
                Back to Staff List</Button>
              <Button onClick={() => setEditMode(true)}>Edit</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDetail;
