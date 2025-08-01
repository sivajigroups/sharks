import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const LeftCartPanel = ({ cartItems }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const total = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const tax = +(total * 0.13).toFixed(2);
  const loyaltyPoints = Math.floor(total / 10);
  const newTotal = total + tax;

  const generateInvoice = () => {
  const doc = new jsPDF();
  const primary = "#6366F1";
  const gray = "#6B7280";
  const green = "#10B981";
  const lightGray = "#F3F4F6";

  // Company Header
  doc.setFillColor(primary);
  doc.roundedRect(0, 0, 210, 30, 0, 0, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Sivaji Groups", 16, 20);
  doc.setFontSize(12);
  doc.text("Invoice", 180, 20, { align: "right" });

  let y = 40;

  // Company + Invoice Info Block
  doc.setTextColor("#000");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("From:", 16, y);
  doc.text("Sivaji Power Tools\n123 Tool Street\nChennai, TN - 600001", 16, y + 5);
  doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 150, y, { align: "left" });

  y += 25;

  // Customer Info Block
  if (selectedCustomer) {
    const addr = selectedCustomer.address || {};
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedCustomer.name}`, 16, y + 5);
    doc.text(
      `${addr.street || ""}, ${addr.area || ""}, ${addr.city || ""} - ${addr.pincode || ""}`,
      16,
      y + 10
    );
    doc.text(`Mobile: ${selectedCustomer.phone}`, 16, y + 15);
  }

  y += 25;

  // Table Headers and Rows
  const tableBody = cartItems.map((item, i) => [
    i + 1,
    item.name,
    item.qty,
    `₹${item.price}`,
    `₹${(item.qty * item.price).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Item", "Qty", "Price", "Total"]],
    body: tableBody,
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 3,
      halign: "center",
    },
    headStyles: {
      fillColor: primary,
      textColor: "#fff",
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: lightGray },
    columnStyles: {
      1: { halign: "left" },
      4: { fontStyle: "bold" },
    },
    didDrawPage: (data) => {
      y = data.cursor.y;
    },
    margin: { left: 16, right: 16 },
  });

  // Totals
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor("#000");
  doc.setFont("helvetica", "bold");
  doc.text("Subtotal:", 140, y, { align: "right" });
  doc.text(`₹${total.toFixed(2)}`, 190, y, { align: "right" });

  y += 6;
  doc.text("Tax (13%):", 140, y, { align: "right" });
  doc.text(`₹${tax.toFixed(2)}`, 190, y, { align: "right" });

  y += 6;
  doc.setTextColor(green);
  doc.text("Total:", 140, y, { align: "right" });
  doc.text(`₹${newTotal.toFixed(2)}`, 190, y, { align: "right" });

  // Loyalty Points
  y += 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(green);
  doc.text(`+${loyaltyPoints} Loyalty Points Earned`, 16, y);

  // Footer and Watermark
  doc.setTextColor(gray);
  doc.setFontSize(9);
  doc.text("Thank you for your business!", 16, 285);

  doc.setTextColor("#d0d0d0");
  doc.setFontSize(40);
  doc.text("Sivaji", 105, 150, { align: "center", angle: 45 });

  // Output
  const pdfUrl = doc.output("bloburl");
  const printWindow = window.open(pdfUrl, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
};


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

  return (
    <div className="w-[340px] bg-white shadow-md rounded-md p-4 text-sm flex flex-col h-full max-h-screen">
      <h2 className="text-lg font-semibold mb-2">Cart Preview</h2>

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide scroll-smooth space-y-2">
        {cartItems.length === 0 ? (
          <div className="text-sm text-gray-400">
            Click a tool to add to cart...
          </div>
        ) : (
          cartItems.map((item) => (
            <div key={item.id} className="flex justify-between border-b pb-1">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500">
                  {item.qty} x ₹{item.price.toFixed(2)}
                </div>
              </div>
              <div className="font-semibold">
                ₹{(item.qty * item.price).toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 space-y-1 border-t mt-2">
        <div className="flex justify-between font-semibold text-base">
          <span>Total:</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Taxes:</span>
          <span>₹{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>New Total:</span>
          <span>₹{newTotal.toFixed(2)}</span>
        </div>
        <div className="text-green-600 text-xs">
          +{loyaltyPoints} Loyalty Points
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full mt-2">
              {selectedCustomer
                ? `Customer: ${selectedCustomer.name}`
                : "Select Customer"}
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

            {loading && (
              <p className="text-sm text-gray-500">Loading customers...</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex-1 overflow-y-auto space-y-1">
              {customers.map((customer, index) => (
                <DialogClose asChild key={index}>
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
                      <div className="text-xs text-gray-500">
                        📞 {customer.phone}
                      </div>
                    </div>
                  </Button>
                </DialogClose>
              ))}

              {!loading && customers.length === 0 && (
                <p className="text-sm text-gray-400">
                  No matching customers found.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button
          className="w-full bg-purple-700 text-white mt-2"
          onClick={generateInvoice}
        >
          Payment
        </Button>
      </div>
    </div>
  );
};

export default LeftCartPanel;
