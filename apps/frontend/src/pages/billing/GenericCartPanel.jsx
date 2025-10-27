import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TAX_RATE = 0.13;

// util: compute toDate from start date + days
function computeToDateISO(fromDateStr, days) {
  if (!fromDateStr || !days || days < 1) return "";
  const d = new Date(fromDateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (Number(days) - 1));
  return d.toISOString().slice(0, 10);
}

export default function GenericCartPanel({ mode, cartItems, setCartItems }) {
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

  // ── Totals
  const subtotal = useMemo(() => {
    if (mode === "sale") {
      return cartItems.reduce(
        (acc, it) => acc + (it.price || 0) * (it.qty || 0),
        0
      );
    }
    return cartItems.reduce(
      (acc, it) =>
        acc + (it.pricePerDay || 0) * (it.days || 0) * (it.qty || 0),
      0
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
        `${API}/customer/details?search=${encodeURIComponent(q)}&page=${pageNum}&limit=${limit}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch customers");
      const json = await res.json();
      setCustomers(json.data || []);
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
    if (!selectedCustomer?._id) return toast.error("Select a customer first");

    setSaving(true);
    try {
      if (mode === "sale") {
        // --- Sale Bill ---
        const tax = +(
          cartItems.reduce(
            (acc, it) => acc + (it.price || 0) * (it.qty || 0),
            0
          ) * TAX_RATE
        ).toFixed(2);

        const payload = {
          customerId: selectedCustomer._id,
          paymentMode,
          discount: 0,
          tax,
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
        setCartItems([]);
      } else {
        // --- Rental Transaction ---
        for (const item of cartItems) {
          const rentDate = new Date(item.fromDate);
          const returnDate = new Date(rentDate);
          returnDate.setDate(rentDate.getDate() + (Number(item.days || 1) - 1));

          const res = await fetch(`${API}/transaction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              customer: selectedCustomer._id,
              inventory: item.inventoryId,
              itemName: item.name,
              rentDate,
              returnDate,
              days: item.days,
              quantity: item.qty,
              amount: item.pricePerDay * item.days * item.qty,
              deposit: Number(rentalDeposit || 0),
            }),
          });

          const json = await res.json();
          if (!res.ok)
            throw new Error(json?.message || "Failed to create rental transaction");

          console.log("Rental saved:", json.rental);
        }

        toast.success("Rental transactions created successfully");
        setCartItems([]);
        setRentalDeposit(0);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Render
  return (
    <div className="w-[340px] bg-white shadow-md rounded-md p-4 text-sm flex flex-col h-full max-h-screen">
      <h2 className="text-lg font-semibold mb-2">
        {mode === "sale" ? "Sale Cart" : "Rental Cart"}
      </h2>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide scroll-smooth space-y-2">
        {cartItems.length === 0 ? (
          <div className="text-sm text-gray-400">Click a tool to add to cart...</div>
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
              {/* qty controls */}
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
                              : i
                          )
                          .filter((i) => (i.qty || 0) > 0)
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
                          i.id === item.id ? { ...i, qty: (i.qty || 0) + 1 } : i
                        )
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
                                      Math.max(1, Number(i.days || 1))
                                    ),
                                  }
                                : i
                            )
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
                                : i
                            )
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

      {/* Totals & Customer */}
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
                    className="w-full justify-start"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <div className="text-left">
                      <div className="font-semibold">{c.name}</div>
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
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <Input placeholder="Alt Phone" value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} />
              <Input placeholder="Street" value={street} onChange={(e) => setStreet(e.target.value)} required />
              <Input placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} required />
              <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
              <Input placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} required />
              <select
                value={idProofType}
                onChange={(e) => setIdProofType(e.target.value)}
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
          disabled={!cartItems.length || !selectedCustomer || saving}
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
