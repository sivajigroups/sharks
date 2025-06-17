import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import Attendance from "./Attendance";

const StaffPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editableStaff, setEditableStaff] = useState(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/staff/details", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch staff");

      const data = await res.json();
      console.log(data);
      setStaffList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedStaff(null);

    if (value.trim() === "") {
      setSuggestions([]);
      return;
    }

    const filtered = staffList.filter((staff) =>
      [staff.name, staff.email].some((val) =>
        val?.toLowerCase().includes(value.toLowerCase())
      )
    );

    setSuggestions(filtered.slice(0, 5)); // limit to 5 suggestions
  };

  const handleSuggestionClick = (staff) => {
    setSearchTerm(staff.name);
    setSuggestions([]);
    setSelectedStaff(staff);
  };

  const handleProfileClick = () => {
    const match = staffList.find((staff) =>
      [staff.name, staff.email].some((val) =>
        val?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    if (match) {
      setSelectedStaff(match);
    } else {
      toast.error("No matching staff found.");
    }
  };
  const handleSave = async () => {
    try {
      const res = await fetch(
        `http://localhost:4000/api/staff/details/${editableStaff._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(editableStaff),
        }
      );

      if (!res.ok) throw new Error("Failed to update staff");

      toast.success("Staff updated successfully");
      setSelectedStaff(editableStaff);
      setEditMode(false);
      fetchStaff();
    } catch (error) {
      toast.error("Update failed: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this staff member?"))
      return;

    try {
      const res = await fetch(
        `http://localhost:4000/api/staff/details/${selectedStaff._id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Failed to delete staff");

      toast.success("Staff deleted successfully");
      setSelectedStaff(null);
      setSearchTerm("");
    } catch (error) {
      toast.error("Delete failed: " + error.message);
    }
  };

  return (
    <div className="space-y-6 p-6 w-308">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        Staff Lookup
      </h1>

      <div className="relative">
        <Input
          type="text"
          placeholder="Enter name or email..."
          value={searchTerm}
          onChange={handleInputChange}
          className="w-full"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded shadow-md max-h-48 overflow-y-auto">
            {suggestions.map((staff) => (
              <li
                key={staff.email}
                onClick={() => handleSuggestionClick(staff)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                {staff.name} ({staff.email})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-4">
        <Button onClick={handleProfileClick}>Profile</Button>
        <Link to="/layout/attendance">
          <Button variant="outline">Attendance</Button>
        </Link>
      </div>

      {loading && (
        <p className="text-muted-foreground">Loading staff data...</p>
      )}
      {error && <p className="text-red-600 font-medium">{error}</p>}

      {selectedStaff && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="text-xl font-semibold">Staff Profile</h2>

            {editMode ? (
              <>
                <Input
                  type="text"
                  value={editableStaff.name}
                  onChange={(e) =>
                    setEditableStaff({ ...editableStaff, name: e.target.value })
                  }
                  placeholder="Name"
                />
                <Input
                  type="email"
                  value={editableStaff.email}
                  onChange={(e) =>
                    setEditableStaff({
                      ...editableStaff,
                      email: e.target.value,
                    })
                  }
                  placeholder="Email"
                />
                <Input
                  type="text"
                  value={editableStaff.phone || ""}
                  onChange={(e) =>
                    setEditableStaff({
                      ...editableStaff,
                      phone: e.target.value,
                    })
                  }
                  placeholder="Phone"
                />
                <Input
                  type="text"
                  value={editableStaff.role}
                  onChange={(e) =>
                    setEditableStaff({ ...editableStaff, role: e.target.value })
                  }
                  placeholder="Role"
                />
                <div className="flex gap-3">
                  <Button onClick={handleSave}>Save</Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p>
                  <strong>Name:</strong> {selectedStaff.name}
                </p>
                <p>
                  <strong>Email:</strong> {selectedStaff.email}
                </p>
                <p>
                  <strong>Phone:</strong> {selectedStaff.phone || "N/A"}
                </p>
                <p>
                  <strong>Role:</strong> {selectedStaff.role}
                </p>
                <p>
                  <strong>Branch:</strong> {selectedStaff.branchId?.name}
                </p>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setEditMode(true);
                      setEditableStaff({ ...selectedStaff });
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaffPage;
