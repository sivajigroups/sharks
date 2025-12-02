import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Customers() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  // State to track if we are editing an existing customer (for "Add Details" flow)
  const [editingId, setEditingId] = useState(null);
  const [fullDetailsOpen, setFullDetailsOpen] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [idProofType, setIdProofType] = useState("");
  const [idProofNumber, setIdProofNumber] = useState("");

  const limit = 10;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const customerColumns = [
    { key: "name", label: t("customers.name") },
    { key: "phone", label: t("customers.phone") },
    { key: "idProofType", label: t("customers.idProof") },
    { key: "idProofNumber", label: t("customers.idProofNumber") },
  ];

  const fetchCustomers = async (query = "", pageNum = 1) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/customer/details?search=${encodeURIComponent(query)}&page=${pageNum}&limit=${limit}`,
        { method: "GET", credentials: "include" }
      );
      if (!response.ok) throw new Error(t("customers.error"));
      const json = await response.json();
      setCustomers(json.data || []);
      setTotalPages(json.totalPages || 1);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset to page 1 on search change
    setPage(1);
    const timer = setTimeout(() => fetchCustomers(searchTerm, 1), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchCustomers(searchTerm, newPage);
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setAlternatePhone("");
    setStreet("");
    setArea("");
    setCity("");
    setPincode("");
    setIdProofType("");
    setIdProofNumber("");
    setEditingId(null);
    setFullDetailsOpen(false);
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Only reset if we are closing.
      // If we are opening, we might be opening in "Edit Mode" via the toast, so don't reset.
      resetForm();
    }
  };

  const handleInsert = async () => {
    if (!name || !phone) {
      toast.error(t("customers.error"));
      return;
    }
    const body = {
      name,
      phone,
    };
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/customer/details`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      const newCustomerId = data.customer?._id || data.customer?.id || data.data?._id;

      setOpen(false);
      // Refresh current page
      fetchCustomers(searchTerm, page);

      if (newCustomerId) {
        toast.success(
          <div className="flex flex-col gap-3">
            <span>{t("customers.addCustomer")} succeeded</span>
            <Button
              size="sm"
              className="w-full bg-white text-black hover:bg-gray-100 border border-gray-200"
              onClick={() => {
                const currentName = name;
                const currentPhone = phone;

                setEditingId(newCustomerId);
                setName(currentName);
                setPhone(currentPhone);
                setFullDetailsOpen(true);
                setOpen(true);
                toast.dismiss();
              }}
            >
              Add Details
            </Button>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.success(t("customers.addCustomer") + " succeeded");
      }
      
      resetForm();

    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    const body = {
      name,
      phone,
      alternatePhone,
      address: { street, area, city, pincode },
      idProofType,
      idProofNumber,
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/customer/details/${editingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      
      toast.success("Customer details updated successfully");
      setOpen(false);
      resetForm();
      fetchCustomers(searchTerm, page);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      handleUpdate();
    } else {
      handleInsert();
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE}/customer/details/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      toast.success(t("customers.title") + " deleted");
      fetchCustomers(searchTerm, page);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = searchTerm
    ? customers.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : customers;

  return (
    <div className="flex flex-col flex-1 w-full h-full p-4 gap-4 overflow-auto min-w-0">
      <h1 className="text-2xl font-bold dark:text-white">
        {t("customers.title")}
      </h1>

      <div className="flex items-center justify-between w-full gap-4 flex-wrap">
        <Input
          placeholder={t("customers.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-0 sm:w-1/2"
        />
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              {t("customers.addCustomer")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Add Customer Details" : t("customers.addCustomerTitle")}
              </DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3 mt-2"
              onSubmit={handleFormSubmit}
            >
              <Input
                placeholder={t("customers.name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                placeholder={t("customers.phone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              
              {fullDetailsOpen && (
                <>
                  <Input
                    placeholder={t("customers.altPhone")}
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                  />

                  <Input
                    placeholder={t("customers.street")}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                  />

                  <Input
                    placeholder={t("customers.area")}
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    required
                  />

                  <Input
                    placeholder={t("customers.city")}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />

                  <Input
                    placeholder={t("customers.pincode")}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    required
                  />

                  <select
                    value={idProofType}
                    onChange={(e) => setIdProofType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="">{t("customers.idProof")}</option>
                    <option value="Aadhaar">{t("customers.aadhaar")}</option>
                    <option value="PAN">{t("customers.pan")}</option>
                    <option value="Voter ID">{t("customers.voter")}</option>
                    <option value="Driving License">
                      {t("customers.license")}
                    </option>
                  </select>

                  <Input
                    placeholder={t("customers.idProofNumber")}
                    value={idProofNumber}
                    onChange={(e) => setIdProofNumber(e.target.value)}
                    required
                  />
                </>
              )}
              
              <Button type="submit" className="mt-2 w-full">
                {editingId ? "Update Details" : t("customers.save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="w-full flex flex-col gap-4 flex-1">
        <Card className="w-full">
          <CardContent className="p-4 overflow-auto w-full">
            {loading ? (
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="bg-black">
                    {customerColumns.map((col) => (
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
                      {customerColumns.map((col) => (
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
            ) : error ? (
              <p className="text-red-600 font-medium">{error}</p>
            ) : (
              <>
                <ReTable
                  data={filtered}
                  columns={customerColumns}
                  onDelete={handleDelete}
                  showEditButton={false}
                  onRowClick={(row) => navigate(`/layout/customers/${row._id}`)}
                />
                
                {/* Pagination Controls */}
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium">
                    Page {page} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
