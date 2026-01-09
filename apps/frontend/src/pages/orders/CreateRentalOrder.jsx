import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const CreateRentalOrder = () => {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]); // Rental Inventory Items
  const [loadingItems, setLoadingItems] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [selectedItem, setSelectedItem] = useState(null); // Full Item Object
  const [selectedVariant, setSelectedVariant] = useState(null); // Full Variant Object

  // Local Date YYYY-MM-DD
  const today = new Date();
  const initialDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Search State
  const [customerSearch, setCustomerSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showItemList, setShowItemList] = useState(false);

  // Computed
  const startD = startDate ? new Date(startDate) : null;
  const endD = endDate ? new Date(endDate) : null;

  const days =
    startD && endD
      ? Math.max(1, Math.ceil((endD - startD) / (1000 * 60 * 60 * 24)))
      : 0;

  const dailyRate = selectedVariant?.pricePerDay || 0;
  const totalAmount = days * dailyRate * quantity;

  // Click outside listener refs
  const customerRef = useRef(null);
  const itemRef = useRef(null);

  useEffect(() => {
    // Fetch Customers
    fetch(`${import.meta.env.VITE_API_BASE}/customer/details`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Customer fetch error", err));

    // Fetch Rental Items
    setLoadingItems(true);
    fetch(`${import.meta.env.VITE_API_BASE}/rental-inventory`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data.data) ? data.data : []))
      .catch((err) => console.error("Item fetch error", err))
      .finally(() => setLoadingItems(false));

    // Outside click handler
    const handleClickOutside = (event) => {
      if (customerRef.current && !customerRef.current.contains(event.target)) {
        setShowCustomerList(false);
      }
      if (itemRef.current && !itemRef.current.contains(event.target)) {
        setShowItemList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setItemSearch(item.name);
    setShowItemList(false);
    // Auto-select variant if only one exists
    if (item.variants && item.variants.length === 1) {
      setSelectedVariant(item.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  };

  const handleCustomerSelect = (c) => {
    setCustomerId(c._id);
    setCustomerSearch(c.name);
    setShowCustomerList(false);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!customerId || !selectedItem || !startDate || !endDate) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!selectedVariant) {
      toast.error("Please select a variant.");
      return;
    }
    if (quantity > selectedVariant.stock) {
      toast.error(
        `Insufficient stock. Only ${selectedVariant.stock} available.`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer: customerId,
          inventory: selectedItem._id,
          itemName: selectedItem.name,
          rentDate: startD,
          returnDate: endD,
          days,
          amount: totalAmount,
          quantity,
          sku: selectedVariant.sku,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Rental Order Created!");
        // Reset
        setSelectedItem(null);
        setSelectedVariant(null);
        setItemSearch("");
        setEndDate("");
        setQuantity(1);
      } else {
        toast.error(data.message || "Failed to create order");
      }
    } catch (error) {
      toast.error("Error submitting order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Create Rental Order
        </h1>
        <p className="text-gray-500 mt-2">
          Book tools and equipment for customers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Form */}
        <div className="space-y-6">
          {/* Customer Selector */}
          <div className="space-y-2 relative" ref={customerRef}>
            <Label>Customer</Label>
            <Input
              placeholder="Search Customer..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerList(true);
              }}
              onFocus={() => setShowCustomerList(true)}
            />
            {showCustomerList && (
              <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <div
                      key={c._id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                      onClick={() => handleCustomerSelect(c)}
                    >
                      <span>
                        {c.name}{" "}
                        <span className="text-gray-400 text-sm">
                          ({c.phone})
                        </span>
                      </span>
                      {customerId === c._id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-400">
                    No customers found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Item Selector */}
          <div className="space-y-2 relative" ref={itemRef}>
            <Label>Equipment / Tool</Label>
            <Input
              placeholder={
                loadingItems ? "Loading items..." : "Search Equipment..."
              }
              value={itemSearch}
              onChange={(e) => {
                setItemSearch(e.target.value);
                setShowItemList(true);
              }}
              onFocus={() => setShowItemList(true)}
              disabled={loadingItems}
            />
            {showItemList && (
              <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <div
                      key={item._id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                      onClick={() => handleItemSelect(item)}
                    >
                      <span>{item.name}</span>
                      {selectedItem?._id === item._id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-400">No items found</div>
                )}
              </div>
            )}
          </div>

          {/* Variant Selector (If applicable) */}
          {selectedItem &&
            (selectedItem.variants.length > 1 || selectedVariant) && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label>Size / Variant</Label>
                <Select
                  value={selectedVariant?.sku}
                  onValueChange={(sku) =>
                    setSelectedVariant(
                      selectedItem.variants.find((v) => v.sku === sku)
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedItem.variants.map((v) => (
                      <SelectItem key={v.sku} value={v.sku}>
                        {v.size || v.color || v.brand || "Standard"}
                        <span className="ml-2 text-gray-400">
                          — Stock: {v.stock}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          {/* Date Picker */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Return Date</Label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              max={selectedVariant ? selectedVariant.stock : 999}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            {selectedVariant && (
              <p className="text-xs text-gray-500">
                Available Stock:{" "}
                <span
                  className={cn(
                    selectedVariant.stock < 5
                      ? "text-red-500 font-bold"
                      : "text-green-600"
                  )}
                >
                  {selectedVariant.stock}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Summary */}
        <Card className="h-fit bg-gray-50/50">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedItem ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Item</span>
                  <span className="font-medium">{selectedItem.name}</span>
                </div>
                {selectedVariant && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Variant</span>
                    <span className="font-medium">
                      {selectedVariant.size ||
                        selectedVariant.color ||
                        "Standard"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Daily Rate</span>
                  <span className="font-medium">₹{dailyRate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium">{days} Days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quantity</span>
                  <span className="font-medium">{quantity}</span>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-400 py-4">
                Select an item to see summary
              </p>
            )}

            <div className="border-t pt-4 flex justify-between items-center">
              <span className="font-semibold text-lg">Total Amount</span>
              <span className="font-bold text-2xl text-primary">
                ₹{totalAmount}
              </span>
            </div>

            <Button
              className="w-full mt-6"
              size="lg"
              onClick={handleSubmit}
              disabled={loading || !selectedVariant}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Order
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateRentalOrder;
