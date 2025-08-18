import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const TAX_RATE = 0.13;

const LeftCartPanel = ({ cartItems, setCartItems }) => {
  const { t } = useTranslation();
  const API = import.meta.env.VITE_API_BASE;

  // dialogs
  const [selectOpen, setSelectOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // customer states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [page] = useState(1);
  const limit = 10;

  // add customer form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [idProofType, setIdProofType] = useState("");
  const [idProofNumber, setIdProofNumber] = useState("");

  // totals
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const taxAmount = +(subtotal * TAX_RATE).toFixed(2);
  const totalAmount = +(subtotal + taxAmount).toFixed(2);

  // ----------------------------------------
  // Utility: fetch customers
  const fetchCustomers = async (query = "", pageNum = 1) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API}/customer/details?search=${encodeURIComponent(query)}&page=${pageNum}&limit=${limit}`,
        { method: "GET", credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch customers");
      const json = await response.json();
      setCustomers(json.data || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchCustomers(searchTerm, 1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ----------------------------------------
  // Add customer
  const resetAddForm = () => {
    setName("");
    setPhone("");
    setAlternatePhone("");
    setStreet("");
    setArea("");
    setCity("");
    setPincode("");
    setIdProofType("");
    setIdProofNumber("");
  };

const handleInsert = async () => {
  // (optional) minimal checks; you can add more if you want
  if (
    !name || !phone || !street || !area || !city ||
    !pincode || !idProofType || !idProofNumber
  ) {
    toast.error("Please fill all the fields");
    return;
  }

  try {
    setSaving(true);

    // ✅ match Customers page body exactly
    const body = {
      name,
      phone,
      alternatePhone,
      address: { street, area, city, pincode },
      idProofType,
      idProofNumber,
    };

    const res = await fetch(`${API}/customer/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to add customer");

    // pick returned customer object (fallback to body if API doesn’t echo)
    const newCustomer = data.data || body;

    toast.success("Customer added");

    // ✅ select the new customer and close dialogs
    setSelectedCustomer(newCustomer);
    setAddOpen(false);
    setSelectOpen(false);

    // refresh list + reset form
    await fetchCustomers("", 1);
    setName("");
    setPhone("");
    setAlternatePhone("");
    setStreet("");
    setArea("");
    setCity("");
    setPincode("");
    setIdProofType("");
    setIdProofNumber("");
  } catch (err) {
    toast.error(err.message);
  } finally {
    setSaving(false);
  }
};


  // ----------------------------------------
  // Payment / invoice (unchanged logic)
  const generateInvoiceFromBill = (bill) => {
    const doc = new jsPDF();
    const primary = "#6366F1";
    const gray = "#6B7280";
    const green = "#10B981";
    const lightGray = "#F3F4F6";

    doc.setFillColor(primary);
    doc.roundedRect(0, 0, 210, 30, 0, 0, "F");
    doc.setTextColor("#ffffff");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Sivaji Groups", 16, 20);
    doc.setFontSize(12);
    doc.text(`Invoice • ${bill.billNo}`, 180, 20, { align: "right" });

    let y = 40;

    doc.setTextColor("#000");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("From:", 16, y);
    doc.text("Sivaji Power Tools\n123 Tool Street\nChennai, TN - 600001", 16, y + 5);
    const billDate = bill.billingDate ? new Date(bill.billingDate) : new Date();
    doc.text(`Invoice Date: ${billDate.toLocaleDateString()}`, 150, y, { align: "left" });

    y += 25;

    if (bill.customer) {
      const addr = bill.customer.address || {};
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", 16, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${bill.customer.name || ""}`, 16, y + 5);
      doc.text(
        `${addr.street || ""}, ${addr.area || ""}, ${addr.city || ""} - ${addr.pincode || ""}`,
        16,
        y + 10
      );
      if (bill.customer.phone) doc.text(`Mobile: ${bill.customer.phone}`, 16, y + 15);
    }

    y += 25;

    const body = bill.items.map((it, i) => [
      i + 1,
      `${it.productName}${it.size ? ` (${it.size})` : ""}${it.brand ? ` • ${it.brand}` : ""}${it.color ? ` • ${it.color}` : ""}`,
      it.quantity,
      `₹${it.unitPrice.toFixed(2)}`,
      `₹${it.lineTotal.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Item", "Qty", "Price", "Total"]],
      body,
      styles: { font: "helvetica", fontSize: 10, cellPadding: 3, halign: "center" },
      headStyles: { fillColor: primary, textColor: "#fff", fontStyle: "bold" },
      alternateRowStyles: { fillColor: lightGray },
      columnStyles: { 1: { halign: "left" }, 4: { fontStyle: "bold" } },
      didDrawPage: (data) => { y = data.cursor.y; },
      margin: { left: 16, right: 16 },
    });

    y += 10;
    doc.setFontSize(10);
    doc.setTextColor("#000");
    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", 140, y, { align: "right" });
    doc.text(`₹${bill.subtotal.toFixed(2)}`, 190, y, { align: "right" });

    y += 6;
    doc.text("Discount:", 140, y, { align: "right" });
    doc.text(`₹${(bill.discount || 0).toFixed(2)}`, 190, y, { align: "right" });

    y += 6;
    doc.text("Tax:", 140, y, { align: "right" });
    doc.text(`₹${(bill.tax || 0).toFixed(2)}`, 190, y, { align: "right" });

    y += 6;
    doc.setTextColor(green);
    doc.text("Total:", 140, y, { align: "right" });
    doc.text(`₹${bill.totalAmount.toFixed(2)}`, 190, y, { align: "right" });

    y += 10;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(green);
    doc.text(`Payment Mode: ${bill.paymentMode || "N/A"}`, 16, y);

    doc.setTextColor(gray);
    doc.setFontSize(9);
    doc.text("Thank you for your business!", 16, 285);

    doc.setTextColor("#d0d0d0");
    doc.setFontSize(40);
    doc.text("Sivaji", 105, 150, { align: "center", angle: 45 });

    const pdfUrl = doc.output("bloburl");
    const win = window.open(pdfUrl, "_blank");
    if (win) {
      win.onload = () => { win.focus(); win.print(); };
    }
  };

  const handlePayment = async () => {
    if (!cartItems.length) return toast.error("Cart is empty");
    if (!selectedCustomer?._id) return toast.error("Select a customer first");

    setSaving(true);
    try {
      const payload = {
        customerId: selectedCustomer._id,
        paymentMode,
        discount: 0,
        tax: taxAmount,
        items: cartItems.map((i) => ({
          inventoryId: i.inventoryId,
          variantId: i.variantId,
          quantity: i.qty,
        })),
      };

      const res = await fetch(`${API}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to create bill");

      const savedBill = json.data;
      toast.success(`Bill ${savedBill.billNo} created`);
      generateInvoiceFromBill(savedBill);
      setCartItems([]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-[340px] bg-white shadow-md rounded-md p-4 text-sm flex flex-col h-full max-h-screen">
      <h2 className="text-lg font-semibold mb-2">Cart Preview</h2>

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide scroll-smooth space-y-2">
        {cartItems.length === 0 ? (
          <div className="text-sm text-gray-400">Click a tool to add to cart...</div>
        ) : (
          cartItems.map((item) => (
            <div key={item.id} className="flex justify-between border-b pb-1">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500">
                  {item.qty} x ₹{item.price.toFixed(2)}
                  <div className="text-[10px] text-gray-400">
                    {item.variant?.brand} • {item.variant?.size}
                    {item.variant?.color ? ` • ${item.variant.color}` : ""}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="font-semibold">₹{(item.qty * item.price).toFixed(2)}</div>
                <div className="flex items-center gap-2 border rounded px-2 mt-1">
                  <button
                    className="px-2 py-1 font-bold text-lg"
                    onClick={() =>
                      setCartItems((prev) =>
                        prev
                          .map((i) => (i.id === item.id ? { ...i, qty: i.qty - 1 } : i))
                          .filter((i) => i.qty > 0)
                      )
                    }
                  >
                    -
                  </button>
                  <span>{item.qty}</span>
                  <button
                    className="px-2 py-1 font-bold text-lg text-green-500"
                    onClick={() =>
                      setCartItems((prev) =>
                        prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* totals */}
      <div className="pt-2 space-y-1 border-t mt-2">
        <div className="flex justify-between font-semibold text-base">
          <span>Subtotal:</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Tax (13%):</span>
          <span>₹{taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-semibold">Total:</span>
          <span className="font-bold">₹{totalAmount.toFixed(2)}</span>
        </div>

        {/* SELECT CUSTOMER (controlled) */}
        <Dialog open={selectOpen} onOpenChange={setSelectOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full mt-2" onClick={() => setSelectOpen(true)}>
              {selectedCustomer ? `Customer: ${selectedCustomer.name}` : "Select Customer"}
            </Button>
          </DialogTrigger>

          <DialogContent className="h-[80vh] flex flex-col">
            <DialogTitle>Select a Customer</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Search and choose from customer list.
            </DialogDescription>

            {/* Add Customer button: close this dialog, open Add dialog */}
            <div className="mt-2">
              <Button
                variant="default"
                onClick={() => {
                  setSelectOpen(false);
                  setAddOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("customers.addCustomer")}
              </Button>
            </div>

            <input
              type="text"
              placeholder="Search by name, city or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm my-2"
            />

            {loading && <p className="text-sm text-gray-500">Loading customers...</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex-1 overflow-y-auto space-y-1">
              {customers.map((customer) => (
                <DialogClose asChild key={customer._id}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="text-left">
                      <div className="font-semibold">{customer.name}</div>
                      <div className="text-xs text-gray-500">
                        {customer.address &&
                          `${customer.address.street}, ${customer.address.area}, ${customer.address.city} - ${customer.address.pincode}`}
                      </div>
                      <div className="text-xs text-gray-500">📞 {customer.phone}</div>
                    </div>
                  </Button>
                </DialogClose>
              ))}

              {!loading && customers.length === 0 && (
                <p className="text-sm text-gray-400">No matching customers found.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ADD CUSTOMER (controlled, separate dialog) */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
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
              <Input placeholder={t("customers.name")} value={name} onChange={(e) => setName(e.target.value)} required />
              <Input placeholder={t("customers.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <Input placeholder={t("customers.altPhone")} value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} />

              <Input placeholder={t("customers.street")} value={street} onChange={(e) => setStreet(e.target.value)} required />
              <Input placeholder={t("customers.area")} value={area} onChange={(e) => setArea(e.target.value)} required />
              <Input placeholder={t("customers.city")} value={city} onChange={(e) => setCity(e.target.value)} required />
              <Input placeholder={t("customers.pincode")} value={pincode} onChange={(e) => setPincode(e.target.value)} required />

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
                <option value="Driving License">{t("customers.license")}</option>
              </select>

              <Input
                placeholder={t("customers.idProofNumber")}
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                required
              />

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? t("common.saving") : t("customers.save")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAddOpen(false);
                  }}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* payment mode */}
        <div className="mt-2">
          <label className="block text-xs text-gray-500 mb-1">Payment Mode</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            <option>UPI</option>
            <option>Cash</option>
            <option>Card</option>
            <option>EMI</option>
            <option>Others</option>
          </select>
        </div>

        <Button
          className="w-full bg-black text-white mt-3"
          onClick={handlePayment}
          disabled={!cartItems.length || !selectedCustomer || saving}
        >
          {saving ? "Processing..." : "Payment"}
        </Button>
      </div>
    </div>
  );
};

export default LeftCartPanel;
