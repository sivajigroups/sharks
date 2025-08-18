import React, { useEffect, useMemo, useState } from "react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import LeftCartPanel from "./LeftCartPanel";
import { X } from "lucide-react";

const categories = [
  "All",
  "Power Tools",
  "Hand Tools",
  "Safety Gear",
  "Electrical",
  "Cleaning",
  "Plumbing",
];

const SalesBilling = () => {
  const [loading, setLoading] = useState(false);
  const [inventories, setInventories] = useState([]);
  const [cartItems, setCartItems] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedSize, setSelectedSize] = useState("All");

  // fetch inventories once
  useEffect(() => {
    const fetchInventories = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}/inventory/sales`,
          { credentials: "include" }
        );
        const data = await res.json();
        setInventories(data?.data || []);
      } catch {
        toast.error("Failed to fetch inventory");
      } finally {
        setLoading(false);
      }
    };
    fetchInventories();
  }, []);

  // ----- Dependent filter options -----

  // tools limited by category (for building brand options)
  const toolsForCategory = useMemo(() => {
    if (selectedCategory === "All") return inventories;
    return inventories.filter((t) => t.category === selectedCategory);
  }, [inventories, selectedCategory]);

  // brand options depend on category
  const brandOptions = useMemo(() => {
    const set = new Set();
    for (const tool of toolsForCategory) {
      for (const v of tool.variants || []) {
        if (v?.brand) set.add(v.brand);
      }
    }
    return ["All", ...Array.from(set)];
  }, [toolsForCategory]);

  // size options depend on category + brand
  const sizeOptions = useMemo(() => {
    // Only compute sizes when a specific brand is selected
    if (selectedBrand === "All") return ["All"];
    const set = new Set();
    for (const tool of toolsForCategory) {
      for (const v of tool.variants || []) {
        if (v?.brand === selectedBrand && v?.size) set.add(v.size);
      }
    }
    const arr = Array.from(set);
    return ["All", ...arr];
  }, [toolsForCategory, selectedBrand]);

  // keep selections valid when parent changes
  useEffect(() => {
    // if current selectedBrand not in new brandOptions, reset
    if (!brandOptions.includes(selectedBrand)) {
      setSelectedBrand("All");
      setSelectedSize("All");
    }
  }, [brandOptions, selectedBrand]);

  useEffect(() => {
    // if current selectedSize not in new sizeOptions, reset
    if (!sizeOptions.includes(selectedSize)) {
      setSelectedSize("All");
    }
  }, [sizeOptions, selectedSize]);

  // clear
  const clearFilters = () => {
    setSelectedCategory("All");
    setSelectedBrand("All");
    setSelectedSize("All");
  };

  // cart
  const handleAddToCart = (tool, variant) => {
    const id = `${tool._id}-${variant._id}`;
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          id,
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

  // final filtering for the grid
  const filteredInventories = useMemo(() => {
    return inventories.filter((tool) => {
      const matchCategory =
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

      return matchCategory && matchBrand && matchSize;
    });
  }, [inventories, selectedCategory, selectedBrand, selectedSize]);

  return (
    <div className="flex flex-1 min-w-0 h-full overflow-hidden">
      {/* Left Panel */}
      <div className="w-[360px] shrink-0 bg-white border-r p-2">
        <LeftCartPanel cartItems={cartItems} setCartItems={setCartItems} />
      </div>

      {/* Right Panel */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 scrollbar-hide scroll-smooth">
        {/* Filters */}
        <Card className="mb-4 shadow-sm">
          <CardContent className="p-4 space-y-3">
            {/* Pills row (stable height) */}
            <div className="min-h-[36px]">
              <div className="flex flex-wrap items-center gap-2">
                {selectedCategory !== "All" && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs
                           bg-green-100 text-green-800 border-green-200
                           dark:bg-green-900/30 dark:text-green-200 dark:border-green-800 transition-all"
                  >
                    <span className="font-medium">Category:</span>
                    <span className="font-semibold">{selectedCategory}</span>
                    <button
                      className="ml-1 rounded-full p-0.5 hover:bg-green-200/70 dark:hover:bg-green-800/50 transition"
                      onClick={() => setSelectedCategory("All")}
                      aria-label="Clear category filter"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}

                {selectedBrand !== "All" && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs
               bg-blue-100 text-blue-800 border-blue-200
               dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800 transition-all"
                  >
                    <span className="font-medium">Brand:</span>
                    <span className="font-semibold">{selectedBrand}</span>
                    <button
                      className="ml-1 rounded-full p-0.5 hover:bg-blue-200/70 dark:hover:bg-blue-800/50 transition"
                      onClick={() => setSelectedBrand("All")}
                      aria-label="Clear brand filter"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}

                {selectedSize !== "All" && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs
               bg-yellow-100 text-yellow-800 border-yellow-200
               dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800 transition-all"
                  >
                    <span className="font-medium">Size:</span>
                    <span className="font-semibold">{selectedSize}</span>
                    <button
                      className="ml-1 rounded-full p-0.5 hover:bg-yellow-200/70 dark:hover:bg-yellow-800/50 transition"
                      onClick={() => setSelectedSize("All")}
                      aria-label="Clear size filter"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}

                {selectedCategory !== "All" ||
                selectedBrand !== "All" ||
                selectedSize !== "All" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={clearFilters}
                  >
                    Clear all
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Controls grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category */}
              <div className="flex flex-col">
                <Label className="mb-1 text-sm font-medium">
                  Filter by Category
                </Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-full h-10 transition-none">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brand (depends on category) */}
              <div className="flex flex-col">
                <Label className="mb-1 text-sm font-medium">
                  Filter by Brand
                </Label>
                <Select
                  value={selectedBrand}
                  onValueChange={(val) => {
                    setSelectedBrand(val);
                    // reset size when brand changes
                    setSelectedSize("All");
                  }}
                >
                  <SelectTrigger className="w-full h-10 transition-none">
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

              {/* Size (depends on brand + category) */}
              <div className="flex flex-col">
                <Label className="mb-1 text-sm font-medium">
                  Filter by Size
                </Label>
                <Select
                  value={selectedSize}
                  onValueChange={setSelectedSize}
                  // disabled={selectedBrand === "All"}
                >
                  <SelectTrigger className="w-full h-10 transition-none data-[disabled]:opacity-60">
                    <SelectValue
                      placeholder={
                        selectedBrand === "All"
                          ? "Select brand first"
                          : "Select a size"
                      }
                    />
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

        {/* Tools grid with invisible ghost cards for alignment */}
        <div className="flex flex-wrap gap-2">
          {(() => {
            const list = filteredInventories;
            const MIN_SLOTS = 6;
            const ghostCount = Math.max(
              0,
              MIN_SLOTS - Math.min(list.length, MIN_SLOTS)
            );

            if (loading) {
              return Array.from({ length: MIN_SLOTS }).map((_, i) => (
                <Card
                  key={`skeleton-${i}`}
                  className="min-w-[180px] h-[100px] rounded-xl shadow-sm overflow-hidden"
                >
                  <CardHeader className="p-3 space-y-2">
                    <div className="w-2/3 h-4 bg-muted rounded" />
                    <div className="w-full h-3 bg-muted rounded" />
                  </CardHeader>
                </Card>
              ));
            }

            if (list.length === 0) {
              return Array.from({ length: MIN_SLOTS }).map((_, i) => (
                <Card
                  key={`ghost-empty-${i}`}
                  aria-hidden
                  className="min-w-[180px] h-[100px] rounded-xl shadow-sm overflow-hidden invisible select-none pointer-events-none"
                />
              ));
            }

            return (
              <>
                {list.map((tool) => (
                  <Dialog key={tool._id}>
                    <DialogTrigger asChild>
                      <Card className="min-w-[180px] h-[100px] rounded-xl shadow-sm overflow-hidden cursor-pointer">
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
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Select Variant for {tool.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        {(tool.variants || []).map((variant) => (
                          <DialogClose asChild key={variant._id}>
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                              onClick={() => handleAddToCart(tool, variant)}
                            >
                              <span>
                                {variant.brand} – {variant.size}{" "}
                                {variant.color && `– ${variant.color}`}
                              </span>
                              <span>₹{variant.price}</span>
                            </Button>
                          </DialogClose>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}

                {/* ghosts to lock layout */}
                {/* empty for alignment */}
                {Array.from({ length: ghostCount }).map((_, i) => (
                  <Card
                    key={`ghost-${i}`}
                    aria-hidden
                    className="min-w-[180px] h-[100px] rounded-xl shadow-sm overflow-hidden invisible select-none pointer-events-none"
                  />
                ))}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default SalesBilling;
