import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { X, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import GenericCartPanel from "./GenericCartPanel";

// ── Constants ──
const categories = [
  "All",
  "Power Tools",
  "Hand Tools",
  "Safety Gear",
  "Electrical",
  "Cleaning",
  "Plumbing",
];

// ── Utility ──
function computeToDateISO(fromDateStr, days) {
  if (!fromDateStr || !days || days < 1) return "";
  const d = new Date(fromDateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (Number(days) - 1));
  return d.toISOString().slice(0, 10);
}

// ── Main Component ──
export default function BillingPage() {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const role = useSelector((state) => state.auth.role) || "";
  const userBranch = useSelector((state) => state.auth.branch) || null;

  const [mode, setMode] = useState("sale");
  const [inventories, setInventories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [saleCart, setSaleCart] = useState([]);
  const [rentalCart, setRentalCart] = useState([]);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedSize, setSelectedSize] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");

  // ── Fetch inventories ──
  useEffect(() => {
    const fetchInventories = async () => {
      setLoading(true);
      try {
        const url =
          mode === "sale"
            ? `${API_BASE}/inventory/sales`
            : `${API_BASE}/inventory/rental`;
        const res = await fetch(url, { credentials: "include" });
        const json = await res.json();
        setInventories(json?.data || json || []);
      } catch (err) {
        toast.error("Failed to fetch inventory");
      } finally {
        setLoading(false);
      }
    };
    fetchInventories();
  }, [mode, API_BASE]);

  // ── Fetch branches (Admin only) ──
  useEffect(() => {
    if (role.toLowerCase() === "admin") {
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/branch/all`, {
            credentials: "include",
          });
          if (!res.ok) throw new Error("Could not load branches");
          const arr = await res.json();
          setBranches([{ _id: "All", name: "All" }, ...arr]);
        } catch (err) {
          toast.error("Failed to fetch branches");
        }
      })();
    } else if (userBranch?._id) {
      // Staff: auto-select their branch
      setSelectedBranch(userBranch._id);
    }
  }, [role, API_BASE, userBranch]);

  // ── Filter Options ──
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

  const clearFilters = () => {
    setSelectedCategory("All");
    setSelectedBrand("All");
    setSelectedSize("All");
    if (role.toLowerCase() === "admin") setSelectedBranch("All");
  };

  // ── Cart Handlers ──
  const handleAddSale = (tool, variant) => {
    const id = `sale-${tool._id}-${variant._id}`;
    setSaleCart((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing)
        return prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
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
          price: variant.price,
        },
      ];
    });
  };

  // Rental Logic
  const [pendingRental, setPendingRental] = useState(null);
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
    if (!rentStart) return toast.error("Choose a start date");
    const days = Math.max(1, Number(rentDays || 1));
    const toDate = computeToDateISO(rentStart, days);
    const { tool, variant } = pendingRental || {};
    const id = `rent-${tool._id}-${variant._id}-${rentStart}-${days}`;
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
        days,
        pricePerDay: variant.rentPrice ?? variant.pricePerDay ?? 0,
      },
    ]);
    setOpenRentDlg(false);
    setPendingRental(null);
  };

  // ── Filtered Tools ──
  const filtered = useMemo(() => {
   const extractId = (b) => {
  try {
    if (!b) return "";
    if (typeof b === "string") return b.trim();
    if (b.$oid) return String(b.$oid).trim();

    // 🟢 NEW: handle { id: "..." } for staff user branch
    if (b.id) return String(b.id).trim();

    if (b._id) {
      if (typeof b._id === "string") return b._id.trim();
      if (b._id.$oid) return String(b._id.$oid).trim();
    }

    if (typeof b.toString === "function") {
      const id = b.toString();
      if (id.length === 24 && !id.includes("[object")) return id;
    }

    return "";
  } catch {
    return "";
  }
};


    const unique = new Map();
    inventories.forEach((tool) => {
      const key = `${tool.name}-${extractId(tool.branch)}`;
      if (!unique.has(key)) unique.set(key, tool);
    });

    return Array.from(unique.values()).filter((tool) => {
      const matchCat =
        selectedCategory === "All" || tool.category === selectedCategory;
      const matchBrand =
        selectedBrand === "All" ||
        (tool.variants || []).some((v) => v.brand === selectedBrand);
      const matchSize =
        selectedSize === "All" ||
        (tool.variants || []).some(
          (v) =>
            v.brand === (selectedBrand === "All" ? v.brand : selectedBrand) &&
            v.size === selectedSize
        );

      const branchId = extractId(tool.branch);
      const userBranchId = extractId(userBranch);
      const selectedBranchId = extractId(selectedBranch);

      const matchBranch =
        role.toLowerCase() === "admin"
          ? selectedBranchId === "All" || branchId === selectedBranchId
          : branchId === userBranchId;

      return matchCat && matchBrand && matchSize && matchBranch;
    });
  }, [
    inventories,
    selectedCategory,
    selectedBrand,
    selectedSize,
    selectedBranch,
    role,
    userBranch,
  ]);

  const cartItems = mode === "sale" ? saleCart : rentalCart;
  const setCartItems = mode === "sale" ? setSaleCart : setRentalCart;

  // ── UI ──
  return (
    <div className="flex flex-1 min-w-0 h-full overflow-hidden">
      {/* Left Cart */}
      <div className="w-[360px] shrink-0 bg-white border-r p-2">
        <GenericCartPanel
          mode={mode}
          cartItems={cartItems}
          setCartItems={setCartItems}
        />
      </div>

      {/* Right Filters */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4">
        {/* Billing Type */}
        <Card className="mb-4">
          <CardContent className="p-4 flex items-center gap-2">
            <span className="text-sm font-medium">Billing Type:</span>
            <div className="inline-flex rounded-md border">
              <button
                className={`px-3 py-1 text-sm ${
                  mode === "sale" ? "bg-black text-white" : "bg-white"
                }`}
                onClick={() => setMode("sale")}
              >
                Sale
              </button>
              <button
                className={`px-3 py-1 text-sm border-l ${
                  mode === "rental" ? "bg-black text-white" : "bg-white"
                }`}
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
            <div className="flex flex-wrap gap-2 items-center">
              {selectedCategory !== "All" && (
                <FilterPill
                  label="Category"
                  value={selectedCategory}
                  onClear={() => setSelectedCategory("All")}
                  color="green"
                />
              )}
              {selectedBrand !== "All" && (
                <FilterPill
                  label="Brand"
                  value={selectedBrand}
                  onClear={() => setSelectedBrand("All")}
                  color="blue"
                />
              )}
              {selectedSize !== "All" && (
                <FilterPill
                  label="Size"
                  value={selectedSize}
                  onClear={() => setSelectedSize("All")}
                  color="yellow"
                />
              )}
              {role.toLowerCase() === "admin" && selectedBranch !== "All" && (
                <FilterPill
                  label="Branch"
                  value={
                    branches.find((b) => b._id === selectedBranch)?.name ||
                    "Unknown"
                  }
                  onClear={() => setSelectedBranch("All")}
                  color="purple"
                />
              )}
              {(selectedCategory !== "All" ||
                selectedBrand !== "All" ||
                selectedSize !== "All" ||
                (role.toLowerCase() === "admin" &&
                  selectedBranch !== "All")) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs border"
                  onClick={clearFilters}
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div
              className={`grid ${
                role.toLowerCase() === "admin" ? "grid-cols-4" : "grid-cols-3"
              } gap-4`}
            >
              <FilterSelect
                label="Category"
                value={selectedCategory}
                setValue={setSelectedCategory}
                options={categories}
              />
              <FilterSelect
                label="Brand"
                value={selectedBrand}
                setValue={(v) => {
                  setSelectedBrand(v);
                  setSelectedSize("All");
                }}
                options={brandOptions}
              />
              <FilterSelect
                label="Size"
                value={selectedSize}
                setValue={setSelectedSize}
                options={sizeOptions}
              />
              {role.toLowerCase() === "admin" && (
                <FilterSelect
                  label="Branch"
                  value={selectedBranch}
                  setValue={setSelectedBranch}
                  options={branches.map((b) => ({
                    label: b.name,
                    value: b._id,
                  }))}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Item Grid */}
        <div className="flex flex-wrap gap-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card
                key={i}
                className="min-w-[180px] h-[100px] rounded-xl shadow-sm"
              >
                <CardHeader className="p-3 space-y-2">
                  <div className="w-2/3 h-4 bg-muted rounded" />
                  <div className="w-full h-3 bg-muted rounded" />
                </CardHeader>
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 italic px-2">No tools found</p>
          ) : (
            filtered.map((tool) => (
              <Dialog key={tool._id}>
                <DialogTrigger asChild>
                  <Card className="min-w-[180px] h-[100px] rounded-xl shadow-sm cursor-pointer relative">
                    {(role.toLowerCase() === "admin" ||
                      role.toLowerCase() === "staff") && (
                      <span className="absolute top-1 right-1 text-[10px] bg-purple-100 text-purple-700 px-2 py-[1px] rounded-full">
                        {branches.find(
                          (b) =>
                            b._id === String(tool.branch?._id || tool.branch)
                        )?.name || "—"}
                      </span>
                    )}
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm font-semibold line-clamp-1">
                        {tool.name}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </DialogTrigger>

                {/* Variants */}
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {mode === "sale"
                        ? "Select Variant for Sale"
                        : "Select Variant to Rent"}{" "}
                      — {tool.name}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {(tool.variants || []).map((variant) => {
                      const price =
                        mode === "sale"
                          ? (variant.price ?? 0)
                          : (variant.rentPrice ?? variant.pricePerDay ?? 0);
                      return (
                        <div
                          key={variant._id}
                          className="flex items-center gap-2"
                        >
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
                                <span>₹{price}</span>
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
                              <span>₹{price}</span>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            ))
          )}
        </div>
      </div>

      {/* Rental Dialog */}
      <Dialog open={openRentDlg} onOpenChange={setOpenRentDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              Choose Start Date & Days
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <DateInput
              label="Start Date"
              value={rentStart}
              setValue={setRentStart}
            />
            <NumberInput label="Days" value={rentDays} setValue={setRentDays} />
            <NumberInput label="Qty" value={rentQty} setValue={setRentQty} />
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

/* ── Helper Components ── */
function FilterPill({ label, value, onClear, color }) {
  const colorClasses = {
    green: "bg-green-100 text-green-800 border-green-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${colorClasses[color]}`}
    >
      <span className="font-medium">{label}:</span>
      <span className="font-semibold">{value}</span>
      <button
        className="ml-1 rounded-full p-0.5 hover:bg-black/10"
        onClick={onClear}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function FilterSelect({ label, value, setValue, options }) {
  const optList =
    options[0]?.label !== undefined
      ? options
      : options.map((v) => ({ label: v, value: v }));
  return (
    <div className="flex flex-col">
      <Label className="mb-1 text-sm font-medium">Filter by {label}</Label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-full h-10">
          <SelectValue placeholder={`Select a ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {optList.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DateInput({ label, value, setValue }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <input
        type="date"
        className="w-full border rounded px-2 py-1 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

function NumberInput({ label, value, setValue }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <input
        type="number"
        min={1}
        className="w-full border rounded px-2 py-1 text-sm"
        value={value}
        onChange={(e) => setValue(Math.max(1, Number(e.target.value || 1)))}
      />
    </div>
  );
}
