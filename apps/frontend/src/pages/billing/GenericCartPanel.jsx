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

const TAX_RATE = 0;

// ── Utility: compute toDate from start date + days
function computeToDateISO(fromDateStr, days) {
  if (!fromDateStr || !days || days < 1) return "";
  const d = new Date(fromDateStr);
  d.setUTCHours(12, 0, 0, 0); // Use noon UTC to avoid timezone shifts
  d.setUTCDate(d.getUTCDate() + (Number(days) - 1));
  return d.toISOString().slice(0, 10);
}

export default function GenericCartPanel({
  cartItems,
  setCartItems,
  role,
  userBranch,
  selectedBranch,
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

  // ── Auto-detect cart contents
  const hasSaleItems = useMemo(
    () => cartItems.some((item) => item.itemType === "sale"),
    [cartItems],
  );
  const hasRentalItems = useMemo(
    () => cartItems.some((item) => item.itemType === "rental"),
    [cartItems],
  );

  // ── Separate totals
  const saleSubtotal = useMemo(() => {
    return cartItems
      .filter((item) => item.itemType === "sale")
      .reduce((acc, it) => acc + (it.price || 0) * (it.qty || 0), 0);
  }, [cartItems]);

  const rentalSubtotal = useMemo(() => {
    return cartItems
      .filter((item) => item.itemType === "rental")
      .reduce(
        (acc, it) =>
          acc + (it.pricePerDay || 0) * (it.days || 0) * (it.qty || 0),
        0,
      );
  }, [cartItems]);

  const subtotal = saleSubtotal + rentalSubtotal;
  const taxAmount = +(subtotal * TAX_RATE).toFixed(2);
  const totalAmount = useMemo(() => {
    // const base = subtotal + taxAmount;
    const base = subtotal;
    return +(base + (hasRentalItems ? Number(rentalDeposit || 0) : 0)).toFixed(
      2,
    );
  }, [subtotal, taxAmount, rentalDeposit, hasRentalItems]);

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

  // ── Bill Success Popup State
  const [billSuccessData, setBillSuccessData] = useState(null);

  // ── Payment handler
  const handlePayment = async (paymentStatus = "Paid") => {
    if (!cartItems.length) return toast.error("Cart is empty");

    // If rental items present, customer is required (no walk-in)
    if (hasRentalItems && !selectedCustomer?._id) {
      return toast.error("Customer required for rental items");
    }

    // If only sale items, customer can be walk-in
    if (!selectedCustomer?._id && !isWalkIn) {
      return toast.error("Select a customer first");
    }

    setSaving(true);
    try {
      const customerId = isWalkIn ? null : selectedCustomer?._id;
      const pdfCustomer = isWalkIn
        ? { name: "Walk-in Customer", phone: "", address: {} }
        : selectedCustomer;

      const branch =
        role.toLowerCase() === "admin"
          ? selectedBranch?.id || selectedBranch?._id
          : userBranch?.id || userBranch?._id;

      // ── Separate sale and rental items
      const saleItems = cartItems
        .filter((item) => item.itemType === "sale")
        .map((i) => ({
          inventoryId: i.inventoryId,
          variantId: i.variantId,
          quantity: i.qty,
        }));

      const rentalItems = cartItems
        .filter((item) => item.itemType === "rental")
        .map((item) => {
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

      let billNo = "";
      let modeTitle = "";

      // ── Determine which API to call
      if (hasSaleItems && hasRentalItems) {
        // COMBINED BILL - both types
        modeTitle = "Combined Bill";
        const payload = {
          customerId,
          branch,
          saleItems,
          rentalItems,
          deposit: Number(rentalDeposit || 0),
          discount: 0,
          tax: taxAmount,
          paymentMode,
          paymentStatus,
        };

        const res = await fetch(`${API}/combined-bills`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to create combined bill");

        // toast.success(`Combined Bill ${json.data.billNo} created`);
        billNo = json.data.billNo;
      } else if (hasSaleItems) {
        // SALE ONLY - use existing sale bill API
        modeTitle = "Sale Bill";
        const payload = {
          customerId,
          paymentMode,
          paymentStatus,
          discount: 0,
          tax: taxAmount,
          branch,
          items: saleItems,
        };

        const res = await fetch(`${API}/bills`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to create sale bill");

        // toast.success(`Sale Bill ${json.data.billNo} created`);
        billNo = json.data.billNo;
      } else if (hasRentalItems) {
        // RENTAL ONLY - use existing rental API
        modeTitle = "Rental Bill";
        const res = await fetch(`${API}/transaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            customer: customerId,
            items: rentalItems,
            branch,
            deposit: Number(rentalDeposit || 0),
            paymentMode,
            paymentStatus,
          }),
        });

        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to create rental order");

        // toast.success(`Rental Order ${json.data.billNo} created`);
        billNo = json.data.billNo;
      }

      // Store success data for popup
      setBillSuccessData({
        billNo,
        modeTitle,
        customer: pdfCustomer,
        items: [...cartItems], // copy needed as we clear cart
        saleSubtotal,
        rentalSubtotal,
        subtotal,
        taxAmount,
        totalAmount,
        paymentMode,
        paymentStatus,
        rentalDeposit: hasRentalItems ? rentalDeposit : 0,
      });

      // Clear cart
      setCartItems([]);
      setRentalDeposit(0); // clear deposit too
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Render UI
  return (
    <>
      {/* ── Bill Success Dialog ── */}
      <Dialog
        open={!!billSuccessData}
        onOpenChange={(open) => {
          if (!open) setBillSuccessData(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <span>Bill Created Successfully!</span>
            </DialogTitle>
            <DialogDescription className="text-center">
              {billSuccessData?.modeTitle} #{billSuccessData?.billNo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-medium">
                  {billSuccessData?.customer?.name || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Items:</span>
                <span className="font-medium">
                  {billSuccessData?.items?.length || 0}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-semibold">Total Amount:</span>
                <span className="font-bold text-lg">
                  ₹{billSuccessData?.totalAmount?.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-black text-white hover:bg-gray-800"
                onClick={() => {
                  generateBillPDF(billSuccessData);
                }}
              >
                🖨️ Print Bill
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setBillSuccessData(null)}
              >
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="w-[340px] bg-white shadow-md rounded-md p-4 text-sm flex flex-col h-full max-h-screen">
        <h2 className="text-lg font-semibold mb-2">Billing Cart</h2>

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
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        item.itemType === "sale"
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : "bg-blue-100 text-blue-700 border border-blue-300"
                      }`}
                    >
                      {item.itemType === "sale" ? "SALE" : "RENTAL"}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {item.variant?.brand} • {item.variant?.size}
                    {item.variant?.color ? ` • ${item.variant.color}` : ""}
                  </div>
                  {item.itemType === "rental" ? (
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
                    {item.itemType === "sale"
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
                  {item.itemType === "rental" && (
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
          {hasSaleItems && hasRentalItems && (
            <>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Sale Items:</span>
                <span>₹{saleSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Rental Items:</span>
                <span>₹{rentalSubtotal.toFixed(2)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between font-semibold text-base">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          {hasRentalItems && (
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

          {/* <div className="flex justify-between text-xs text-gray-500">
            <span>Tax (13%):</span>
            <span>₹{taxAmount.toFixed(2)}</span>
          </div> */}

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
            {!hasRentalItems && (
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
                        <div className="text-xs text-gray-500">
                          📞 {c.phone}
                        </div>
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

          {/* Payment Buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300"
              onClick={() => handlePayment("Pending")}
              disabled={
                !cartItems.length ||
                (!selectedCustomer && !isWalkIn) ||
                saving ||
                isWalkIn
              }
            >
              {saving ? "..." : "Pay Later"}
            </Button>
            <Button
              className="flex-1 bg-black text-white hover:bg-gray-800"
              onClick={() => handlePayment("Paid")}
              disabled={
                !cartItems.length || (!selectedCustomer && !isWalkIn) || saving
              }
            >
              {saving ? "Processing..." : "Pay Now"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------
   ✅ PDF BILL GENERATOR FUNCTION
------------------------------------------------------------------ */

import { generateBillPDF } from "@/utils/pdfGenerator";
