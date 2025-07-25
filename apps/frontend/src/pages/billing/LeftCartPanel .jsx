import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const customerList = [
  {
    name: "Anita Oliver",
    address: "123 MG Road, Chennai",
    mobilenumber: "9876543210",
  },
  {
    name: "John Doe",
    address: "56 Anna Salai, Chennai",
    mobilenumber: "9012345678",
  },
  {
    name: "Sundar P",
    address: "78 GST Road, Trichy",
    mobilenumber: "9087654321",
  },
];

const LeftCartPanel = ({ cartItems }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const total = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const tax = +(total * 0.13).toFixed(2);
  const loyaltyPoints = Math.floor(total / 10);
  const newTotal = total + tax;

 const generateInvoice = () => {
  const doc = new jsPDF();
  const primary = "#6366F1";
  const gray = "#6B7280";
  const green = "#10B981";

  // Header
  doc.setFillColor(primary);
  doc.rect(0, 0, 210, 25, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor("#fff");
  doc.text("Sivaji Groups", 16, 17);
  doc.setFontSize(12);
  doc.text("Invoice", 180, 17, { align: "right" });

  let y = 30;

  // Customer Details
  if (selectedCustomer) {
    doc.setFontSize(11);
    doc.setTextColor("#000");
    doc.setFont("helvetica", "normal");
    doc.text(`Customer: ${selectedCustomer.name}`, 16, y);
    y += 6;
    doc.text(`Address: ${selectedCustomer.address}`, 16, y);
    y += 6;
    doc.text(`Mobile: ${selectedCustomer.mobilenumber}`, 16, y);
    y += 10;
  }

  // Table Headers
  doc.setFillColor("#F3F4F6");
  doc.rect(16, y, 178, 10, "F");
  doc.setTextColor(primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Item", 18, y + 7);
  doc.text("Qty", 110, y + 7, { align: "right" });
  doc.text("Price", 140, y + 7, { align: "right" });
  doc.text("Total", 190, y + 7, { align: "right" });
  y += 12;

  // Table Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#000");

  cartItems.forEach((item) => {
    doc.text(item.name, 18, y);
    doc.text(String(item.qty), 110, y, { align: "right" });
    doc.text(`₹${item.price}`, 140, y, { align: "right" });
    doc.text(`₹${(item.qty * item.price).toFixed(2)}`, 190, y, { align: "right" });
    y += 7;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  });

  // Totals
  y += 8;
  doc.setLineWidth(0.3);
  doc.setDrawColor("#E5E7EB");
  doc.line(16, y, 200, y);
  y += 8;

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

  // Loyalty
  y += 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(green);
  doc.text(`+${loyaltyPoints} Loyalty Points Earned`, 16, y);

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(gray);
  doc.text("Thank you for your business!", 16, 285);

  // Open print preview
  const pdfUrl = doc.output("bloburl");
  const printWindow = window.open(pdfUrl, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
};


  return (
    <div className="w-[340px] bg-white shadow-md rounded-md p-4 text-sm flex flex-col h-full max-h-screen">
      <h2 className="text-lg font-semibold mb-2">Cart Preview testing</h2>

      {/* Scrollable Cart List */}
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

      {/* Summary & Buttons */}
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
          <DialogContent>
            <DialogTitle>Select a Customer</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose from the list below.
            </DialogDescription>
            {customerList.map((customer, index) => (
              <DialogClose asChild key={index}>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="text-left">
                    <div className="font-semibold">{customer.name}</div>
                    <div className="text-xs text-gray-500">
                      {customer.address}
                    </div>
                    <div className="text-xs text-gray-500">
                      📞 {customer.mobilenumber}
                    </div>
                  </div>
                </Button>
              </DialogClose>
            ))}
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
