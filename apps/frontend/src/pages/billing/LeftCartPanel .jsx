import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const TAX_RATE = 0.13;

const LeftCartPanel = ({ cartItems, setCartItems }) => {
  const API = import.meta.env.VITE_API_BASE;
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [page] = useState(1);
  const limit = 10;

  // Totals (from cart)
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const taxAmount = +(subtotal * TAX_RATE).toFixed(2);
  const totalAmount = +(subtotal + taxAmount).toFixed(2);

  // -------- Invoice (from saved bill) --------
  const generateInvoiceFromBill = (bill) => {
    const doc = new jsPDF();
    const primary = "#6366F1";
    const gray = "#6B7280";
    const green = "#10B981";
    const lightGray = "#F3F4F6";

    // Header
    doc.setFillColor(primary);
    doc.roundedRect(0, 0, 210, 30, 0, 0, "F");
    doc.setTextColor("#ffffff");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Sivaji Groups", 16, 20);
    doc.setFontSize(12);
    doc.text(`Invoice • ${bill.billNo}`, 180, 20, { align: "right" });

    let y = 40;

    // From + Invoice info
    doc.setTextColor("#000");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("From:", 16, y);
    doc.text("Sivaji Power Tools\n123 Tool Street\nChennai, TN - 600001", 16, y + 5);
    const billDate = bill.billingDate ? new Date(bill.billingDate) : new Date();
    doc.text(`Invoice Date: ${billDate.toLocaleDateString()}`, 150, y, { align: "left" });

    y += 25;

    // Customer
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

    // Table from saved bill snapshots
    const body = bill.items.map((it, i) => ([
      i + 1,
      `${it.productName}${it.size ? ` (${it.size})` : ""}${it.brand ? ` • ${it.brand}` : ""}${it.color ? ` • ${it.color}` : ""}`,
      it.quantity,
      `₹${it.unitPrice.toFixed(2)}`,
      `₹${it.lineTotal.toFixed(2)}`
    ]));

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

    // Totals (from bill)
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

    // Footer & watermark
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

  // -------- API: customers --------
  const fetchCustomers = async (query = "", page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API}/customer/details?search=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
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
    const t = setTimeout(() => { fetchCustomers(searchTerm, 1); }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // -------- API: create bill --------
  const handlePayment = async () => {
    if (!cartItems.length) {
      toast.error("Cart is empty");
      return;
    }
    if (!selectedCustomer?._id) {
      toast.error("Select a customer first");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId: selectedCustomer._id,
        paymentMode,
        discount: 0,
        tax: taxAmount, // numeric amount; your backend expects a number
        items: cartItems.map((i) => ({
          inventoryId: i.inventoryId,   // comes from SalesBilling handleAddToCart
          variantId: i.variantId,
          quantity: i.qty
          // overridePrice: i.price   // optional; omit to use variant price
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
      // Print from saved bill (has snapshots + billNo)
      generateInvoiceFromBill(savedBill);
      // Clear cart
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
                </div>
                <div className="text-[10px] text-gray-400">
                  {item.variant?.brand} • {item.variant?.size}{item.variant?.color ? ` • ${item.variant.color}` : ""}
                </div>
              </div>
              <div className="font-semibold">₹{(item.qty * item.price).toFixed(2)}</div>
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

        {/* customer select */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full mt-2">
              {selectedCustomer ? `Customer: ${selectedCustomer.name}` : "Select Customer"}
            </Button>
          </DialogTrigger>
          <DialogContent className="h-[80vh] flex flex-col">
            <DialogTitle>Select a Customer</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Search and choose from customer list.
            </DialogDescription>

            <input
              type="text"
              placeholder="Search by name, city or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm mb-2"
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
