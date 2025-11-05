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
import { X, CalendarRange, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import GenericCartPanel from "./GenericCartPanel";

const categories = [
  "All",
  "Power Tools",
  "Hand Tools",
  "Safety Gear",
  "Electrical",
  "Cleaning",
  "Plumbing",
];

function computeToDateISO(fromDateStr, days) {
  if (!fromDateStr || !days || days < 1) return "";
  const d = new Date(fromDateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (Number(days) - 1));
  return d.toISOString().slice(0, 10);
}

export default function BillingPage() {
  const API_BASE = import.meta.env.VITE_API_BASE;

  //
  const RENTAL_ENABLED = import.meta.env.VITE_RENTAL_TRUE === "true";

  const role = useSelector((state) => state.auth.role) || "";
  const userBranch = useSelector((state) => state.auth.branch) || null;

  const [mode, setMode] = useState("sale");
  const [inventories, setInventories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [saleCart, setSaleCart] = useState([]);
  const [rentalCart, setRentalCart] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

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
      } catch {
        toast.error("Failed to fetch inventory");
      } finally {
        setLoading(false);
      }
    };
    fetchInventories();
  }, [mode, API_BASE]);

  // ── Fetch branches ──
  useEffect(() => {
    if (role.toLowerCase() === "admin") {
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/branch/all`, {
            credentials: "include",
          });
          const arr = await res.json();
          setBranches([{ _id: "All", name: "All" }, ...arr]);
        } catch {
          toast.error("Failed to fetch branches");
        }
      })();
    } else if (userBranch?._id) setBranches([userBranch]);
  }, [role, API_BASE, userBranch]);

  // ── Add to cart handlers ──
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
          price: variant.price ?? 0,
        },
      ];
    });
  };

  // Rental logic
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
  };

  // ── Filtered list with search ──
  const filtered = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return inventories.filter((tool) => {
      const matchesSearch =
        !search ||
        tool.name?.toLowerCase().includes(search) ||
        tool.category?.toLowerCase().includes(search) ||
        (tool.variants || []).some((v) =>
          v.sku?.toLowerCase().includes(search)
        );
      return matchesSearch;
    });
  }, [inventories, searchTerm]);

  const cartItems = mode === "sale" ? saleCart : rentalCart;
  const setCartItems = mode === "sale" ? setSaleCart : setRentalCart;

  // ── UI ──
  return (
    <div className="flex flex-1 h-[calc(100vh-70px)] overflow-hidden bg-gray-50">
      {/* Left Cart */}
      <div className="w-[360px] min-w-[360px] bg-white border-r p-2 flex flex-col">
        <GenericCartPanel
          mode={mode}
          cartItems={cartItems}
          setCartItems={setCartItems}
        />
      </div>

      {/* Right Section */}
      <div className="flex-1 overflow-y-auto p-4 transition-all duration-300 ease-in-out">
        {/* Billing Type + Search */}
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

              {RENTAL_ENABLED && (
                <button
                  className={`px-3 py-1 text-sm border-l ${
                    mode === "rental" ? "bg-black text-white" : "bg-white"
                  }`}
                  onClick={() => setMode("rental")}
                >
                  Rent
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative ml-3">
              <Input
                placeholder="Search by Name, SKU, or Category…"
                className="w-72 pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <div>
              <Button>
                QR Scan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Items Grid */}
        <div
          className="
            grid gap-2 
            grid-cols-5 
            sm:grid-cols-2 
            md:grid-cols-2 
            lg:grid-cols-2 
            xl:grid-cols-4
            2xl:grid-cols-6
            3xl:grid-cols-6
            auto-rows-[140px]
          "
        >
          {loading ? (
            <p>Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 italic px-2">No tools found</p>
          ) : (
            filtered.map((tool) => {
              const branchName =
                branches.find(
                  (b) => b._id === String(tool.branch?._id || tool.branch)
                )?.name || "—";

              const totalStock = tool.variants?.reduce(
                (sum, v) => sum + (v.stock || 0),
                0
              );

              return (
                <Dialog key={tool._id}>
                  <DialogTrigger asChild>
                    <Card
                      className="
                        min-w-[140px] 
                        h-full
                        rounded-lg 
                        shadow-sm 
                        cursor-pointer 
                        relative 
                        hover:shadow-md 
                        transition-all 
                        flex 
                        flex-col 
                        justify-between 
                      "
                    >
                      {/* 🟣 Branch Indicator */}
                      {(role.toLowerCase() === "admin" ||
                        role.toLowerCase() === "staff") && (
                        <span className="absolute top-1 right-1 text-[10px] bg-purple-100 text-purple-700 px-2 py-[1px] rounded-full">
                          {branchName}
                        </span>
                      )}

                      <CardHeader className="p-3 space-y-1">
                        <CardTitle className="text-sm font-semibold line-clamp-1">
                          {tool.name}
                        </CardTitle>
                        <CardDescription className="text-xs line-clamp-1">
                          {tool.category}
                        </CardDescription>

                        {/* Stock Indicator */}
                        <p
                          className={`text-xs font-medium ${
                            totalStock > 0 ? "text-gray-700" : "text-red-600"
                          }`}
                        >
                          {totalStock > 0
                            ? `${totalStock} item${
                                totalStock > 1 ? "s" : ""
                              } left`
                            : "Out of Stock"}
                        </p>
                      </CardHeader>
                    </Card>
                  </DialogTrigger>

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
                            className="flex flex-col gap-1"
                          >
                            <DialogClose asChild>
                              <Button
                                variant="outline"
                                disabled={variant.stock <= 0}
                                className={`w-full justify-between ${
                                  variant.stock <= 0
                                    ? "opacity-60 cursor-not-allowed"
                                    : ""
                                }`}
                                onClick={() =>
                                  mode === "sale"
                                    ? handleAddSale(tool, variant)
                                    : startAddRental(tool, variant)
                                }
                              >
                                <span>
                                  {variant.brand} – {variant.size}
                                  {variant.color && ` – ${variant.color}`}
                                </span>
                                <span>₹{price}</span>
                              </Button>
                            </DialogClose>

                            <p
                              className={`text-xs ml-1 ${
                                variant.stock > 0
                                  ? "text-gray-500"
                                  : "text-red-600"
                              }`}
                            >
                              Stock: {variant.stock ?? 0} left
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })
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

/* Helper Inputs */
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
