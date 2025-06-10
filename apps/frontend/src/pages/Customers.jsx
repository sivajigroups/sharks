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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [idProofType, setIdProofType] = useState("");

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
    if (!name || !phone || !address || !idProofType) {
      alert("Please fill all fields.");
      return;
    }

    const body = { name, phone, address, idProofType };

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
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <select
                value={idProofType}
                onChange={(e) => setIdProofType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select ID Proof</option>
                <option value="Aadhaar">Aadhaar</option>{" "}
                {/* corrected spelling */}
                <option value="PAN">PAN</option>
                <option value="Passport">Passport</option>
              </select>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>ID Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((cust, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{cust.name}</TableCell>
                      <TableCell>{cust.phone}</TableCell>
                      <TableCell>{cust.address}</TableCell>
                      <TableCell>{cust.idProofType}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        <Button variant="secondary" size="sm">
                          Edit
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              Delete
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Are you absolutely sure?
                              </DialogTitle>
                            </DialogHeader>
                            <div className="flex justify-end gap-2">
                              <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <Button
                                className="w-[30%]"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(cust._id)}
                              >
                                Confirm Delete
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No customers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Customers;
