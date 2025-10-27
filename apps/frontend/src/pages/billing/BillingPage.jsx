import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { X, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import GenericCartPanel from "./GenericCartPanel";

const categories = ["All", "Power Tools", "Hand Tools", "Safety Gear", "Electrical", "Cleaning", "Plumbing"];

// util in this file too
function computeToDateISO(fromDateStr, days) {
  if (!fromDateStr || !days || days < 1) return "";
  const d = new Date(fromDateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (Number(days) - 1));
  return d.toISOString().slice(0, 10);
}

export default function BillingPage() {
  const API_BASE = import.meta.env.VITE_API_BASE;

  // ── Mode: "sale" | "rental"
  const [mode, setMode] = useState("sale");

  const [loading, setLoading] = useState(false);
  const [inventories, setInventories] = useState([]);

  // carts
  const [saleCart, setSaleCart] = useState([]);
  const [rentalCart, setRentalCart] = useState([]);

  // filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedSize, setSelectedSize] = useState("All");

  // ── Fetch inventories by mode
  useEffect(() => {
    const fetchInventories = async () => {
      setLoading(true);
      try {
        const url = mode === "sale" ? `${API_BASE}/inventory/sales` : `${API_BASE}/inventory/rental`;
        const res = await fetch(url, { credentials: "include" });
        const json = await res.json();
        setInventories(json?.data || []);
      } catch (e) {
        toast.error("Failed to fetch inventory");
      } finally {
        setLoading(false);
      }
    };
    fetchInventories();
  }, [mode, API_BASE]);

  // ── Dependent options
  const toolsForCategory = useMemo(() => {
    if (selectedCategory === "All") return inventories;
    return inventories.filter((t) => t.category === selectedCategory);
  }, [inventories, selectedCategory]);

  const brandOptions = useMemo(() => {
    const set = new Set();
    for (const tool of toolsForCategory) {
      for (const v of tool.variants || []) if (v?.brand) set.add(v.brand);
    }
    return ["All", ...Array.from(set)];
  }, [toolsForCategory]);

  const sizeOptions = useMemo(() => {
    if (selectedBrand === "All") return ["All"];
    const set = new Set();
    for (const tool of toolsForCategory) {
      for (const v of tool.variants || [])
        if (v?.brand === selectedBrand && v?.size) set.add(v.size);
    }
    return ["All", ...Array.from(set)];
  }, [toolsForCategory, selectedBrand]);

  useEffect(() => {
    if (!brandOptions.includes(selectedBrand)) {
      setSelectedBrand("All");
      setSelectedSize("All");
    }
  }, [brandOptions, selectedBrand]);

  useEffect(() => {
    if (!sizeOptions.includes(selectedSize)) setSelectedSize("All");
  }, [sizeOptions, selectedSize]);

  const clearFilters = () => {
    setSelectedCategory("All");
    setSelectedBrand("All");
    setSelectedSize("All");
  };

  // ── Add to cart handlers
  const handleAddSale = (tool, variant) => {
    const id = `sale-${tool._id}-${variant._id}`;
    setSaleCart((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          id,
          mode: "sale",
          name: tool.name,
          inventoryId: tool._id,
          variantId: variant._id,
          variant,
          qty: 1,
          price: variant.price, // sale price
        },
      ];
    });
  };

  // rental: Start Date + Days + Qty dialog
  const [pendingRental, setPendingRental] = useState(null); // {tool, variant}
  const [rentStart, setRentStart] = useState("");
  const [rentDays, setRentDays] = useState(1);
  const [rentQty, setRentQty] = useState(1);
  const [openRentDlg, setOpenRentDlg] = useState(false);

  const startAddRental = (tool, variant) => {
    setPendingRental({ tool, variant });
    setRentStart("");
    setRentDays(1);
    setRentQty(1);
    setOpenRentDlg(true);
  };

  const confirmAddRental = () => {
    const d = Math.max(1, Number(rentDays || 1));
    if (!rentStart) return toast.error("Choose a start date");
    const toDate = computeToDateISO(rentStart, d);

    const { tool, variant } = pendingRental || {};
    const id = `rent-${tool._id}-${variant._id}-${rentStart}-${d}`;

    setRentalCart((prev) => [
      ...prev,
      {
        id,
        mode: "rental",
        name: tool.name,
        inventoryId: tool._id,
        variantId: variant._id,
        variant,
        qty: Number(rentQty),
        fromDate: rentStart,
        toDate,
        days: d,
        pricePerDay: variant.rentPrice ?? variant.pricePerDay ?? 0,
      },
    ]);
    setOpenRentDlg(false);
    setPendingRental(null);
  };

  // ── Final filtered grid
  const filtered = useMemo(() => {
    return inventories.filter((tool) => {
      const matchCat = selectedCategory === "All" || tool.category === selectedCategory;
      const matchBrand =
        selectedBrand === "All" || (tool.variants || []).some((v) => v.brand === selectedBrand);
      const matchSize =
        selectedSize === "All" ||
        (tool.variants || []).some(
          (v) =>
            v.brand === (selectedBrand === "All" ? v.brand : selectedBrand) &&
            v.size === selectedSize
        );
      return matchCat && matchBrand && matchSize;
    });
  }, [inventories, selectedCategory, selectedBrand, selectedSize]);

  // cart binding by mode
  const cartItems = mode === "sale" ? saleCart : rentalCart;
  const setCartItems = mode === "sale" ? setSaleCart : setRentalCart;

  return (
    <div className="flex flex-1 min-w-0 h-full overflow-hidden">
      {/* Left: Cart */}
      <div className="w-[360px] shrink-0 bg-white border-r p-2">
        <GenericCartPanel mode={mode} cartItems={cartItems} setCartItems={setCartItems} />
      </div>

      {/* Right: Filters + Grid */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 scrollbar-hide scroll-smooth">
        {/* Mode toggle */}
        <Card className="mb-4">
          <CardContent className="p-4 flex items-center gap-2">
            <span className="text-sm font-medium">Billing Type:</span>
            <div className="inline-flex rounded-md border">
              <button
                className={`px-3 py-1 text-sm ${mode === "sale" ? "bg-black text-white" : "bg-white"}`}
                onClick={() => setMode("sale")}
              >
                Sale
              </button>
              <button
                className={`px-3 py-1 text-sm border-l ${mode === "rental" ? "bg-black text-white" : "bg-white"}`}
                onClick={() => setMode("rental")}
              >
                Rent
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-4 shadow-sm">
          <CardContent className="p-4 space-y-3">
            {/* Pills */}
            <div className="min-h-[36px]">
              <div className="flex flex-wrap items-center gap-2">
                {selectedCategory !== "All" && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs bg-green-100 text-green-800 border-green-200">
                    <span className="font-medium">Category:</span>
                    <span className="font-semibold">{selectedCategory}</span>
                    <button
                      className="ml-1 rounded-full p-0.5 hover:bg-green-200/70"
                      onClick={() => setSelectedCategory("All")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
                {selectedBrand !== "All" && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs bg-blue-100 text-blue-800 border-blue-200">
                    <span className="font-medium">Brand:</span>
                    <span className="font-semibold">{selectedBrand}</span>
                    <button
                      className="ml-1 rounded-full p-0.5 hover:bg-blue-200/70"
                      onClick={() => setSelectedBrand("All")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
                {selectedSize !== "All" && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                    <span className="font-medium">Size:</span>
                    <span className="font-semibold">{selectedSize}</span>
                    <button
                      className="ml-1 rounded-full p-0.5 hover:bg-yellow-200/70"
                      onClick={() => setSelectedSize("All")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
                {(selectedCategory !== "All" || selectedBrand !== "All" || selectedSize !== "All") && (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearFilters}>
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <Label className="mb-1 text-sm font-medium">Filter by Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label className="mb-1 text-sm font-medium">Filter by Brand</Label>
                <Select
                  value={selectedBrand}
                  onValueChange={(v) => {
                    setSelectedBrand(v);
                    setSelectedSize("All");
                  }}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label className="mb-1 text-sm font-medium">Filter by Size</Label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select a size" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid */}
        <div className="flex flex-wrap gap-2">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={`sk-${i}`} className="min-w-[180px] h-[100px] rounded-xl shadow-sm">
                  <CardHeader className="p-3 space-y-2">
                    <div className="w-2/3 h-4 bg-muted rounded" />
                    <div className="w-full h-3 bg-muted rounded" />
                  </CardHeader>
                </Card>
              ))
            : filtered.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={`gh-${i}`} aria-hidden className="min-w-[180px] h-[100px] rounded-xl shadow-sm invisible" />
              ))
            : filtered.map((tool) => (
                <Dialog key={tool._id}>
                  <DialogTrigger asChild>
                    <Card className="min-w-[180px] h-[100px] rounded-xl shadow-sm cursor-pointer">
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm font-semibold line-clamp-1">{tool.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2">{tool.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {mode === "sale" ? "Select Variant for Sale" : "Select Variant to Rent"} — {tool.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      {(tool.variants || []).map((variant) => {
                        const rightPrice =
                          mode === "sale" ? variant.price ?? 0 : variant.rentPrice ?? variant.pricePerDay ?? 0;

                        return (
                          <div key={variant._id} className="flex items-center gap-2">
                            {mode === "sale" ? (
                              <DialogClose asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-between"
                                  onClick={() => handleAddSale(tool, variant)}
                                >
                                  <span>
                                    {variant.brand} – {variant.size}
                                    {variant.color && ` – ${variant.color}`}
                                  </span>
                                  <span>₹{rightPrice}</span>
                                </Button>
                              </DialogClose>
                            ) : (
                              <Button
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => startAddRental(tool, variant)}
                              >
                                <span>
                                  {variant.brand} – {variant.size}
                                  {variant.color && ` – ${variant.color}`} • /day
                                </span>
                                <span>₹{rightPrice}</span>
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
        </div>
      </div>

      {/* Rental quick dialog: Start Date + Days + Qty */}
      <Dialog open={openRentDlg} onOpenChange={setOpenRentDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              Choose Start Date & Days
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Start Date</Label>
              <input
                type="date"
                className="w-full border rounded px-2 py-1 text-sm"
                value={rentStart}
                onChange={(e) => setRentStart(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Days</Label>
              <input
                type="number"
                min={1}
                className="w-full border rounded px-2 py-1 text-sm"
                value={rentDays}
                onChange={(e) => setRentDays(Math.max(1, Number(e.target.value || 1)))}
              />
            </div>
            <div>
              <Label className="text-xs">Qty</Label>
              <input
                type="number"
                min={1}
                className="w-full border rounded px-2 py-1 text-sm"
                value={rentQty}
                onChange={(e) => setRentQty(Math.max(1, Number(e.target.value || 1)))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={() => setOpenRentDlg(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAddRental}>Add to Cart</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
