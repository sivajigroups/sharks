import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import ReTable from "@/components/shared/ReTable";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [idProofType, setIdProofType] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [idProofNumber, setIdProofNumber] = useState("");

  const customerColumns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "alternatePhone", label: "Alt Phone" },
    { key: "address", label: "Address" },
    { key: "idProofType", label: "ID Type" },
    { key: "idProofNumber", label: "ID Number" },
  ];

  // Fetch customers from API
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:4000/api/customer/details",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to fetch customers");

      const data = await response.json();
      console.log(data);
      setCustomers(data);
      setError("");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers by name or phone matching search term
  const filteredCustomers = customers.filter((customer) =>
    Object.values(customer).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  // (cust) =>
  //   cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   cust.phone.includes(searchTerm)

  // Handle adding a new customer
  const handleInsert = async () => {
    if (
      !name ||
      !phone ||
      !street ||
      !area ||
      !city ||
      !pincode ||
      !idProofType ||
      !idProofNumber
    ) {
      alert("Please fill all fields.");
      return;
    }

    const body = {
      name,
      phone,
      alternatePhone,
      address: {
        street,
        area,
        city,
        pincode,
      },
      idProofType,
      idProofNumber,
    };

    try {
      const response = await fetch(
        "http://localhost:4000/api/customer/details",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to add customer");
        return;
      }

      toast.success("Customer added successfully!");

      // Clear input fields
      setName("");
      setPhone("");
      setAddress("");
      setIdProofType("");
      setAlternatePhone("");
      setStreet("");
      setArea("");
      setCity("");
      setPincode("");
      setIdProofNumber("");

      // Refresh customer list
      fetchCustomers();
    } catch (error) {
      alert("Error adding customer: " + error.message);
    }
  };
  const handleDelete = async (id) => {
    try {
      const res = await fetch(
        `http://localhost:4000/api/customer/details/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await res.json();
      toast.error("Customer deleted successfully!");

      fetchCustomers();
    } catch (error) {
      alert("error deleting customer" + error.message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 w-308">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        Customers
      </h1>

      {/* Search and Add */}
      <div className="flex items-center justify-between gap-4">
        <Input
          type="text"
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/2"
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                placeholder="Alternate Phone"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
              />

              <Input
                placeholder="Street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
              <Input
                placeholder="Area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                placeholder="Pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />

              <select
                value={idProofType}
                onChange={(e) => setIdProofType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select ID Proof</option>
                <option value="Aadhaar">Aadhaar</option>
                <option value="PAN">PAN</option>
                <option value="Voter ID">Voter ID</option>
                <option value="Driving License">Driving License</option>
              </select>

              <Input
                placeholder="ID Proof Number"
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
              />

              <DialogClose asChild>
                <Button className="mt-2 w-full" onClick={handleInsert}>
                  Save
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error or Loading */}
      {loading ? (
        <p className="text-muted-foreground">Loading customers...</p>
      ) : error ? (
        <p className="text-red-600 font-medium">{error}</p>
      ) : (
        <Card>
          <CardContent className="p-4 overflow-auto">
            <ReTable
              data={filteredCustomers}
              columns={customerColumns}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Customers;
