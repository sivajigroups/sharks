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
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { CalendarRange, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import GenericCartPanel from "./GenericCartPanel";
import { Select } from "@/components/ui/select";

function computeToDateISO(fromDateStr, days) {
  if (!fromDateStr || !days || days < 1) return "";
  const d = new Date(fromDateStr);
  d.setUTCHours(12, 0, 0, 0); // Use noon UTC to avoid timezone shifts
  d.setUTCDate(d.getUTCDate() + (Number(days) - 1));
  return d.toISOString().slice(0, 10);
}

export default function BillingPage() {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const RENTAL_ENABLED = import.meta.env.VITE_RENTAL_TRUE === "true"; // import.meta.env.VITE_RENTAL_TRUE === "true";

  const role = useSelector((state) => state.auth.role) || "";
  const userBranch = useSelector((state) => state.auth.branch) || null;

  const [selectedBranch, setSelectedBranch] = useState("All");

  const [mode, setMode] = useState("sale");
  const [inventories, setInventories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [cartItems, setCartItems] = useState([]); // Unified cart state
  const [searchTerm, setSearchTerm] = useState("");

  // ── Fetch inventories ──
  useEffect(() => {
    const fetchInventories = async () => {
      setLoading(true);
      try {
        const url =
          mode === "sale"
            ? `${API_BASE}/inventory/sales`
            : `${API_BASE}/rental-inventory`; // Updated to use the new API we created
        const res = await fetch(url, { credentials: "include" });
        const json = await res.json();
        const items = json?.data || json || [];
        // console.log(
        //   "INVENTORY RAW DATA →",
        //   items.map((t) => ({
        //     name: t.name,
        //     branch: t.branch,
        //     branchType: typeof t.branch,
        //   })),
        // );
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
  // ── Add to cart handlers ──
  const handleAddSale = (tool, variant) => {
    const id = `sale-${tool._id}-${variant._id}`;
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing)
        return prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
      return [
        ...prev,
        {
          id,
          itemType: "sale", // ⭐ NEW
          name: tool.name,
          inventoryId: tool._id,
          variantId: variant._id,
          variant,
          qty: 1,
          price: variant.price ?? 0,
        },
      ];
    });
    toast.success(`${tool.name} added to cart`);
  };

  // Rental logic
  const [pendingRental, setPendingRental] = useState(null);
  const [rentStart, setRentStart] = useState("");
  const [rentDays, setRentDays] = useState(1);
  const [rentQty, setRentQty] = useState(1);
  const [openRentDlg, setOpenRentDlg] = useState(false);

  const startAddRental = (tool, variant) => {
    setPendingRental({ tool, variant });
    // Default to today's date (local time)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setRentStart(`${yyyy}-${mm}-${dd}`);
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
    setCartItems((prev) => [
      ...prev,
      {
        id,
        itemType: "rental", // ⭐ NEW
        name: tool.name,
        inventoryId: tool._id,
        variantId: variant._id,
        variant,
        qty: Number(rentQty),
        fromDate: rentStart,
        toDate,
        days,
        pricePerDay: variant.rentPrice ?? variant.pricePerDay ?? 0,
        sku: variant.sku,
      },
    ]);
    toast.success(`${tool.name} added to cart`);
    setOpenRentDlg(false);
  };

  // --- Unified Input Handler (Search + Barcode) ---
  const handleSearchOrScan = (e) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      const code = searchTerm.trim().toLowerCase();

      const match = inventories
        .flatMap((tool) => tool.variants.map((v) => ({ tool, variant: v })))
        .find(({ variant }) => variant.sku?.toLowerCase() === code);

      if (match) {
        mode === "sale"
          ? handleAddSale(match.tool, match.variant)
          : startAddRental(match.tool, match.variant);
        // toast moved to handlers
        setSearchTerm(""); // clear after successful scan
      } else {
        toast.info("Search mode active");
      }
    }
  };
  const filtered = useMemo(() => {
    let temp = inventories;

    // Normalize branch id from DB record
    const getBranchId = (b) => (typeof b === "object" ? b?._id : b);

    // STAFF → Only their branch
    if (role.toLowerCase() === "staff" && (userBranch?.id || userBranch?._id)) {
      const uBranchId = userBranch.id || userBranch._id;
      temp = temp.filter(
        (t) => String(getBranchId(t.branch)) === String(uBranchId),
      );
    }

    // ADMIN → Filter by selected branch (except "All")
    if (
      role.toLowerCase() === "admin" &&
      selectedBranch?.id &&
      selectedBranch.id !== "All"
    ) {
      temp = temp.filter(
        (t) => String(getBranchId(t.branch)) === String(selectedBranch.id),
      );
    }

    // Search filter
    const search = searchTerm.trim().toLowerCase();

    return temp.filter((tool) => {
      if (!search) return true;

      return (
        tool.name?.toLowerCase().includes(search) ||
        tool.category?.toLowerCase().includes(search) ||
        (tool.variants || []).some((v) => v.sku?.toLowerCase().includes(search))
      );
    });
  }, [inventories, searchTerm, role, userBranch, selectedBranch]);

  // const cartItems = mode === "sale" ? saleCart : rentalCart; // REMOVED
  // const setCartItems = mode === "sale" ? setSaleCart : setRentalCart; // REMOVED

  // ── UI ──
  return (
    <div className="flex flex-1 h-[calc(100vh-70px)] overflow-hidden bg-gray-50">
      {/* Left Cart */}

      {/* left bill pannel */}
      <div className="w-[360px] min-w-[360px] bg-white border-r p-2 flex flex-col">
        <GenericCartPanel
          // mode={mode} // REMOVED
          cartItems={cartItems}
          setCartItems={setCartItems}
          role={role} // ⭐ add this
          userBranch={userBranch} // ⭐ add this
          selectedBranch={selectedBranch} // ⭐ add this
        />
      </div>

      {/* Right Section */}
      <div className="flex-1 flex flex-col p-4 transition-all w-229 duration-300 ease-in-out h-full overflow-hidden">
        {/* Billing Type + Search */}
        <Card className="mb-4 shrink-0">
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
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

            {/* ✅ Unified Input Box (handles search + scan) */}
            <div className="relative">
              <Input
                placeholder="Search by Name, SKU, or Scan Barcode…"
                className="w-96 pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchOrScan}
                autoFocus
              />
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <div>
              {role.toLowerCase() === "admin" && (
                <select
                  value={selectedBranch?.id || "All"}
                  onChange={(e) => {
                    const val = e.target.value;

                    if (val === "All") {
                      setSelectedBranch({ id: "All", name: "All" });
                    } else {
                      const branchObj = branches.find((b) => b._id === val);
                      setSelectedBranch({
                        id: branchObj._id,
                        name: branchObj.name,
                      });
                    }
                  }}
                  className="border px-2 py-1 rounded"
                >
                  <option value="All">All</option>

                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}

              {/* {console.log("ROLE CHECK:", role)}
              {console.log("USER BRANCH CHECK:", selectedBranch)} */}

              {role.toLowerCase() === "staff" && (
                <span className="text-sm px-2 py-1 bg-gray-100 rounded">
                  {userBranch?.name}
                </span>
              )}
              {/* {console.log("USER BRANCH CHECK:", userBranch)} */}
            </div>
          </CardContent>
        </Card>

        {/* Items Grid Container */}
        <div className="flex-1 overflow-y-auto pr-2 pb-2">
          <div
            className="
              grid gap-2 
              sm:grid-cols-2 
              md:grid-cols-2 
              lg:grid-cols-3 
              xl:grid-cols-4
              2xl:grid-cols-6
              auto-rows-[140px]
            "
          >
          {/* console.log(
            "FINAL FILTERED LIST:",
            filtered.map((t) => ({
              name: t.name,
              branch: t.branch,
            })),
          ) */}
          {loading ? (
            <p>Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 italic px-2">No tools found</p>
          ) : (
            filtered.map((tool) => {
              const branchName =
                branches.find(
                  (b) => b._id === String(tool.branch?._id || tool.branch),
                )?.name || "—";

              const totalStock = tool.variants?.reduce(
                (sum, v) => sum + (v.stock || 0),
                0,
              );

              return (
                <Dialog key={tool._id}>
                  <DialogTrigger asChild>
                    <Card
                      className="
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
