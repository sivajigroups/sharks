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
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [idProofType, setIdProofType] = useState("");
  const [idProofNumber, setIdProofNumber] = useState("");

  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const limit = 10;

  const customerColumns = [
    { key: "name", label: t("customers.name") },
    { key: "phone", label: t("customers.phone") },
    { key: "alternatePhone", label: t("customers.altPhone") },
    { key: "address", label: t("customers.address") },
    { key: "idProofType", label: t("customers.idProof") },
    { key: "idProofNumber", label: t("customers.idProofNumber") },
  ];

  const fetchCustomers = async (query = "", page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/customer/details?search=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to fetch customers");

      const json = await response.json();
      setCustomers(json.data || []);
      setError("");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers(searchTerm, 1);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

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
      address: { street, area, city, pincode },
      idProofType,
      idProofNumber,
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
      if (!response.ok) {
        alert(data.message || "Failed to add customer");
        return;
      }

      toast.success("Customer added successfully!");
      setOpen(false);
      setName("");
      setPhone("");
      setAlternatePhone("");
      setStreet("");
      setArea("");
      setCity("");
      setPincode("");
      setIdProofType("");
      setIdProofNumber("");
      fetchCustomers();
    } catch (error) {
      alert("Error adding customer: " + error.message);
    }
  };

  const handleEdit = async (id, updatedData) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/customer/details/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updatedData),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      toast.success("Customer updated successfully!");
      fetchCustomers();
    } catch (err) {
      toast.error("Error updating: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/customer/details/${id}`,
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
    <div className="flex flex-wrap flex-1 w-full h-full p-4 gap-4 overflow-auto min-w-[1024px]">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        {t("customers.title")}
      </h1>

      <div className="flex justify-between items-center w-full flex-wrap gap-2">
        <Input
          type="text"
          placeholder={t("customers.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-1/2"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("customers.addCustomer")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("customers.addCustomerTitle")}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3 mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleInsert();
              }}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              <Button type="submit" className="mt-2 w-full">
                {t("customers.save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full flex flex-col gap-4 flex-1">
        {loading ? (
          <div className="w-full flex-1 flex flex-col gap-4">
            <div className="flex justify-between items-center w-full flex-wrap gap-2">
              <Skeleton className="h-10 w-full sm:w-1/2" />
              <Skeleton className="h-10 w-[150px]" />
            </div>

            <Card className="w-full min-h-[400px]">
              <CardContent className="p-4 space-y-4 w-full">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : error ? (
          <p className="text-red-600 font-medium">{t("customers.error")}</p>
        ) : (
          <Card className="w-full">
            <CardContent className="p-4 overflow-auto w-full">
              <ReTable
                data={customers}
                columns={customerColumns}
                onDelete={handleDelete}
                onEdit={handleEdit}
                showViewButton={false}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Customers;
