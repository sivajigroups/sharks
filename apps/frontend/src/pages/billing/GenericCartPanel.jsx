import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TAX_RATE = 0.13;

// ── Utility: compute toDate from start date + days
function computeToDateISO(fromDateStr, days) {
  if (!fromDateStr || !days || days < 1) return "";
  const d = new Date(fromDateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (Number(days) - 1));
  return d.toISOString().slice(0, 10);
}

export default function GenericCartPanel({
  mode,
  cartItems,
  setCartItems,
  role, // ⭐ new
  userBranch, // ⭐ new
  selectedBranch, // ⭐ new
}) {
  const API = import.meta.env.VITE_API_BASE;

  // ── Customer dialog state
  const [selectOpen, setSelectOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [rentalDeposit, setRentalDeposit] = useState(0);
  const limit = 10;

  // ── Add-customer form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [idProofType, setIdProofType] = useState("");
  const [idProofNumber, setIdProofNumber] = useState("");
  const [isWalkIn, setIsWalkIn] = useState(false); // ⭐ New Walk-in state

  // ── Totals
  const subtotal = useMemo(() => {
    if (mode === "sale") {
      return cartItems.reduce(
        (acc, it) => acc + (it.price || 0) * (it.qty || 0),
        0,
      );
    }
    return cartItems.reduce(
      (acc, it) => acc + (it.pricePerDay || 0) * (it.days || 0) * (it.qty || 0),
      0,
    );
  }, [mode, cartItems]);

  const taxAmount = +(subtotal * TAX_RATE).toFixed(2);
  const totalAmount = useMemo(() => {
    const base = subtotal + taxAmount;
    return +(
      mode === "rental" ? base + Number(rentalDeposit || 0) : base
    ).toFixed(2);
  }, [mode, subtotal, taxAmount, rentalDeposit]);

  // ── Fetch customers
  const fetchCustomers = async (q = "", pageNum = 1) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/customer/details?search=${encodeURIComponent(
          q,
        )}&page=${pageNum}&limit=${limit}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch customers");
      const json = await res.json();
      // Allow blocked customers, but they will be marked in UI
      const allCustomers = json.data || [];
      setCustomers(allCustomers);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(searchTerm, 1), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Add customer
  const handleInsertCustomer = async () => {
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
      toast.error("Please fill all the fields");
      return;
    }

    if (phone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }
    if (alternatePhone && alternatePhone.length !== 10) {
      toast.error("Alternate phone must be exactly 10 digits");
      return;
    }

    try {
      setSaving(true);
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

      toast.success("Customer added");
      setSelectedCustomer(data.data || body);
      setAddOpen(false);
      setSelectOpen(false);
      await fetchCustomers("", 1);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Payment handler
  const handlePayment = async () => {
    if (!cartItems.length) return toast.error("Cart is empty");
    if (!selectedCustomer?._id && !isWalkIn)
      return toast.error("Select a customer first");

    setSaving(true);
    try {
      let billNo = "";
      let modeTitle = mode === "sale" ? "Sale Bill" : "Rental Bill";

      // If Walk-in, we use null for customer ID
      const customerId = isWalkIn ? null : selectedCustomer?._id;

      // For PDF generation, create a dummy object if walk-in
      const pdfCustomer = isWalkIn
        ? { name: "Walk-in Customer", phone: "", address: {} }
        : selectedCustomer;

      if (mode === "sale") {
        // --- Sale Bill ---
        const tax = +(
          cartItems.reduce(
            (acc, it) => acc + (it.price || 0) * (it.qty || 0),
            0,
          ) * TAX_RATE
        ).toFixed(2);

        const payload = {
          customerId: customerId, // Can be null
          paymentMode,
          discount: 0,
          tax,

          // ⭐ FIX — SEND ONLY BRANCH ID, NOT OBJECT
          branch:
            role.toLowerCase() === "admin"
              ? selectedBranch?.id || selectedBranch?._id
              : userBranch?.id || userBranch?._id,

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

        toast.success(`Sale Bill ${json.data.billNo} created`);
        billNo = json.data.billNo;
        setCartItems([]);

        // Generate PDF
        generateBillPDF({
          billNo,
          modeTitle,
          customer: pdfCustomer,
          items: cartItems,
          subtotal,
          taxAmount,
          totalAmount,
          paymentMode,
        });
      } else {
        // --- Rental Transaction (Multi-Item) ---
        // Prepare rental items
        const rentalItems = cartItems.map((item) => {
          // Calculate dates
          const rentDate = new Date(item.fromDate);
          const returnDate = new Date(rentDate);
          returnDate.setDate(rentDate.getDate() + (Number(item.days || 1) - 1));

          return {
            inventory: item.inventoryId,
            itemName: item.name,
            sku: item.variant?.sku || item.sku,
            rentDate: rentDate,
            returnDate: returnDate,
            days: item.days,
            quantity: item.qty,
            pricePerDay: item.pricePerDay,
            amount: item.pricePerDay * item.days * item.qty,
          };
        });

        // Send SINGLE request
        const res = await fetch(`${API}/transaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            customer: selectedCustomer._id,
            items: rentalItems,
            branch:
              role.toLowerCase() === "admin"
                ? selectedBranch?.id || selectedBranch?._id
                : userBranch?.id || userBranch?._id,
            deposit: Number(rentalDeposit || 0),
            paymentMode,
          }),
        });

        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to create rental order");

        toast.success(`Rental Order ${json.data.billNo} Created!`);
        setCartItems([]);

        // Generate PDF
        generateBillPDF({
          billNo: json.data.billNo || `R-${Date.now()}`,
          modeTitle,
          customer: selectedCustomer,
          items: cartItems,
          subtotal,
          taxAmount,
          totalAmount,
          paymentMode,
          rentalDeposit,
        });
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Render UI
  return (
    <div className="w-[340px] bg-white shadow-md rounded-md p-4 text-sm flex flex-col h-full max-h-screen">
      <h2 className="text-lg font-semibold mb-2">
        {mode === "sale" ? "Sale Cart" : "Rental Cart"}
      </h2>

      {/* Cart items */}
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
                <div className="text-[10px] text-gray-500">
                  {item.variant?.brand} • {item.variant?.size}
                  {item.variant?.color ? ` • ${item.variant.color}` : ""}
                </div>
                {mode === "rental" ? (
                  <div className="text-xs text-gray-600 mt-1">
                    {item.fromDate} → {item.toDate} ({item.days}{" "}
                    {item.days > 1 ? "days" : "day"}) • Qty {item.qty} • ₹
                    {item.pricePerDay}/day
                  </div>
                ) : (
                  <div className="text-xs text-gray-600">
                    {item.qty} x ₹{(item.price || 0).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Quantity controls */}
              <div className="flex flex-col items-center">
                <div className="font-semibold">
                  ₹
                  {mode === "sale"
                    ? ((item.qty || 0) * (item.price || 0)).toFixed(2)
                    : (
                        (item.qty || 0) *
                        (item.days || 0) *
                        (item.pricePerDay || 0)
                      ).toFixed(2)}
                </div>
                <div className="flex items-center gap-2 border rounded px-2 mt-1">
                  <button
                    className="px-2 py-1 font-bold text-lg"
                    onClick={() =>
                      setCartItems((prev) =>
                        prev
                          .map((i) =>
                            i.id === item.id
                              ? { ...i, qty: Math.max(0, (i.qty || 1) - 1) }
                              : i,
                          )
                          .filter((i) => (i.qty || 0) > 0),
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
                        prev.map((i) =>
                          i.id === item.id
                            ? { ...i, qty: (i.qty || 0) + 1 }
                            : i,
                        ),
                      )
                    }
                  >
                    +
                  </button>
                </div>

                {/* rental date quick edit */}
                {mode === "rental" && (
                  <div className="mt-1 text-[10px] text-gray-500">
                    <div className="flex gap-1 items-center">
                      <input
                        type="date"
                        value={item.fromDate}
                        onChange={(e) => {
                          const newFrom = e.target.value;
                          setCartItems((prev) =>
                            prev.map((i) =>
                              i.id === item.id
                                ? {
                                    ...i,
                                    fromDate: newFrom,
                                    toDate: computeToDateISO(
                                      newFrom,
                                      Math.max(1, Number(i.days || 1)),
                                    ),
                                  }
                                : i,
                            ),
                          );
                        }}
                        className="border rounded px-1 py-0.5"
                      />
                      <span>•</span>
                      <input
                        type="number"
                        min={1}
                        value={item.days}
                        onChange={(e) => {
                          const d = Math.max(1, Number(e.target.value || 1));
                          setCartItems((prev) =>
                            prev.map((i) =>
                              i.id === item.id
                                ? {
                                    ...i,
                                    days: d,
                                    toDate: computeToDateISO(i.fromDate, d),
                                  }
                                : i,
                            ),
                          );
                        }}
                        className="w-14 border rounded px-1 py-0.5"
                      />
                      <span>day{(item.days || 1) > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals & customer section */}
      <div className="pt-2 space-y-1 border-t mt-2">
        <div className="flex justify-between font-semibold text-base">
          <span>Subtotal:</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>

        {mode === "rental" && (
          <div className="flex justify-between text-xs text-gray-600">
            <span>Deposit:</span>
            <span className="flex items-center gap-2">
              <Input
                type="number"
                value={rentalDeposit}
                onChange={(e) => setRentalDeposit(e.target.value)}
                className="h-7 w-24"
              />
            </span>
          </div>
        )}

        <div className="flex justify-between text-xs text-gray-500">
          <span>Tax (13%):</span>
          <span>₹{taxAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="font-semibold">Total:</span>
          <span className="font-bold">₹{totalAmount.toFixed(2)}</span>
        </div>

        {/* --- SELECT CUSTOMER --- */}
        <Dialog open={selectOpen} onOpenChange={setSelectOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setSelectOpen(true)}
            >
              {selectedCustomer ? (
                <span className="flex items-center gap-2">
                  Customer: {selectedCustomer.name}
                  {selectedCustomer.blocked && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-bold">
                      BLOCKED
                    </span>
                  )}
                </span>
              ) : (
                "Select Customer"
              )}
            </Button>
          </DialogTrigger>

          {/* ⭐ WALK-IN TOGGLE (Sales Only) */}
          {mode === "sale" && (
            <div className="flex items-center gap-2 mt-2">
              <Switch
                checked={isWalkIn}
                onCheckedChange={(checked) => {
                  setIsWalkIn(checked);
                  if (checked) setSelectedCustomer(null); // Clear selection
                }}
              />
              <span className="text-xs font-medium">Walk-in Customer</span>
            </div>
          )}

          <DialogContent className="h-[80vh] flex flex-col">
            <DialogTitle>Select a Customer</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Search and choose from customer list.
            </DialogDescription>

            <div className="mt-2">
              <Button
                variant="default"
                onClick={() => {
                  setSelectOpen(false);
                  setAddOpen(true);
                }}
              >
                + Add Customer
              </Button>
            </div>

            <input
              type="text"
              placeholder="Search by name, city or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm my-2"
            />

            {loading && (
              <p className="text-sm text-gray-500">Loading customers...</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex-1 overflow-y-auto space-y-1">
              {customers.map((c) => (
                <DialogClose asChild key={c._id}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto py-2"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <div className="text-left w-full">
                      <div className="flex justify-between items-center">
                        <div className="font-semibold flex items-center gap-2">
                          {c.name}
                          {c.blocked && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-wider font-bold">
                              Blocked
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.address &&
                          `${c.address.street}, ${c.address.area}, ${c.address.city} - ${c.address.pincode}`}
                      </div>
                      <div className="text-xs text-gray-500">📞 {c.phone}</div>
                    </div>
                  </Button>
                </DialogClose>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* --- ADD CUSTOMER --- */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3 mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleInsertCustomer();
              }}
            >
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                placeholder="Phone"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 10) setPhone(val);
                }}
                required
              />
              <Input
                placeholder="Alt Phone"
                value={alternatePhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 10) setAlternatePhone(val);
                }}
              />
              <Input
                placeholder="Street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
              />
              <Input
                placeholder="Area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                required
              />
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <Input
                placeholder="Pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                required
              />
              <select
                value={idProofType}
                onChange={(e) => setIdProofType(e.target.value)}
                class
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">ID Proof</option>
                <option value="Aadhaar">Aadhaar</option>
                <option value="PAN">PAN</option>
                <option value="Voter ID">Voter ID</option>
                <option value="Driving License">Driving License</option>
              </select>

              <Input
                placeholder="ID Proof Number"
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                required
              />

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Payment Mode */}
        <div className="mt-2">
          <label className="block text-xs text-gray-500 mb-1">
            Payment Mode
          </label>
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

        {/* Payment Button */}
        <Button
          className="w-full bg-black text-white mt-3"
          onClick={handlePayment}
          disabled={
            !cartItems.length || (!selectedCustomer && !isWalkIn) || saving
          }
        >
          {saving
            ? "Processing..."
            : mode === "sale"
              ? "Payment (Sale)"
              : "Payment (Rental)"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   ✅ PDF BILL GENERATOR FUNCTION
------------------------------------------------------------------ */

export function generateBillPDF({
  billNo,
  modeTitle,
  customer,
  items,
  subtotal,
  taxAmount,
  totalAmount,
  paymentMode,
  rentalDeposit,
}) {
  // Thermal printer config (80mm width) ~ 3.15 inches
  // Standard thermal height is dynamic (roll), but PDF needs a fixed height.
  // We'll calculate a rough height: Header (40) + Customer (30) + Items (N*10) + Totals (30) + Footer (20)
  // Or just set a safe large height (e.g., 297mm like A4 height, or more)
  const estimatedHeight = 120 + items.length * 15;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, Math.max(200, estimatedHeight)],
  });

  const pageWidth = 80;
  const marginLeft = 4;
  const marginRight = 76; // 80 - 4
  const centerX = pageWidth / 2;

  let currentY = 10;

  // --- HEADER ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Sivaji Power Tools", centerX, currentY, { align: "center" });
  currentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Power Tools • Rentals • Services", centerX, currentY, {
    align: "center",
  });
  currentY += 5;

  // Divider
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.line(marginLeft, currentY, marginRight, currentY);
  currentY += 5;

  // --- TITLE ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(modeTitle, centerX, currentY, { align: "center" });
  currentY += 5;

  // --- BILL INFO ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Bill No: ${billNo}`, marginLeft, currentY);
  currentY += 4;
  doc.text(
    `Date: ${new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    marginLeft,
    currentY,
  );
  currentY += 4;
  doc.text(`Mode: ${paymentMode}`, marginLeft, currentY);
  currentY += 6;

  // --- CUSTOMER INFO ---
  doc.setFont("helvetica", "bold");
  doc.text("Customer:", marginLeft, currentY);
  currentY += 4;

  doc.setFont("helvetica", "normal");
  const customerName = customer?.name || "Guest";
  const customerPhone = customer?.phone ? `Ph: ${customer.phone}` : "";
  const addressLine = customer?.address?.city ? `${customer.address.city}` : "";

  doc.text(customerName, marginLeft, currentY);
  if (addressLine) {
    doc.text(addressLine, marginRight, currentY, { align: "right" });
  }
  currentY += 4;
  if (customerPhone) {
    doc.text(customerPhone, marginLeft, currentY);
    currentY += 4;
  }

  currentY += 2;
  doc.line(marginLeft, currentY, marginRight, currentY);
  currentY += 5;

  // --- ITEMS TABLE HEADERS ---
  // --- ITEMS TABLE HEADERS ---
  const colX = [marginLeft, marginLeft + 46, marginRight]; // Item, Qty (center), Amt (right)

  doc.setFont("helvetica", "bold");
  doc.text("Item", colX[0], currentY);
  doc.text("Qty", colX[1], currentY, { align: "center" });
  doc.text("Amt", colX[2], currentY, { align: "right" });
  currentY += 4;
  doc.setLineWidth(0.2);
  doc.line(marginLeft, currentY, marginRight, currentY);
  currentY += 3;

  // --- ITEMS LIST ---
  doc.setFont("helvetica", "normal");

  items.forEach((item) => {
    // 1. Details string (dates etc)
    let details = "";
    if (modeTitle.includes("Rental")) {
      details = `${item.days}d @ ${item.pricePerDay}`;
    }

    // 2. Split item name to fit width
    const maxItemWidth = 42; // Allow slightly more space
    const nameLines = doc.splitTextToSize(item.name, maxItemWidth);

    // 3. Draw Name
    doc.text(nameLines, colX[0], currentY);

    // 4. Draw Qty (Centered)
    doc.text(String(item.qty), colX[1], currentY, { align: "center" });

    // 5. Draw Amount (Right)
    const amount = modeTitle.includes("Rental")
      ? (item.qty * item.days * item.pricePerDay).toFixed(2)
      : (item.qty * (item.price || 0)).toFixed(2);

    doc.text(amount, colX[2], currentY, { align: "right" });

    // Calculate new Y based on name height (minimum 4mm spacing if single line)
    const lineHeight = 4;
    currentY += Math.max(lineHeight, nameLines.length * lineHeight);

    // 6. Draw details if any (indented)
    if (details) {
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(details, colX[0], currentY - 1);
      doc.setFontSize(8);
      doc.setTextColor(0);
      currentY += 3;
    }

    currentY += 1;
  });

  doc.line(marginLeft, currentY, marginRight, currentY);
  currentY += 5;

  // --- TOTALS ---
  // Align labels to the left of the amount column
  const totalsLabelX = 45;

  doc.text("Subtotal:", totalsLabelX, currentY);
  doc.text(subtotal.toFixed(2), marginRight, currentY, { align: "right" });
  currentY += 4;

  if (rentalDeposit) {
    doc.text("Deposit:", totalsLabelX, currentY);
    doc.text(Number(rentalDeposit).toFixed(2), marginRight, currentY, {
      align: "right",
    });
    currentY += 4;
  }

  doc.text("Tax (13%):", totalsLabelX, currentY);
  doc.text(taxAmount.toFixed(2), marginRight, currentY, { align: "right" });
  currentY += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL:", totalsLabelX, currentY);
  doc.text(`Rs. ${totalAmount}`, marginRight, currentY, { align: "right" });
  currentY += 8;

  // --- FOOTER ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Thank you for your business!", centerX, currentY, {
    align: "center",
  });

  doc.save(`${billNo}.pdf`);
}
