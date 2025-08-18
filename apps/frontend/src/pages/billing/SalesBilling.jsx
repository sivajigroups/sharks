import React, { useEffect, useState } from "react";
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
import LeftCartPanel from "./LeftCartPanel ";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    const fetchInventories = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}/inventory/sales`,
          { credentials: "include" }
        );
        const data = await res.json();
        setInventories(data.data || []);

        // collect unique brands from variants
        const uniqueBrands = [
          ...new Set(
            (data.data || []).flatMap((tool) =>
              (tool.variants || []).map((v) => v.brand)
            )
          ),
        ].filter(Boolean);
        setBrands(["All", ...uniqueBrands]);
      } catch {
        toast.error("Failed to fetch inventory");
      } finally {
        setLoading(false);
      }
    };
    fetchInventories();
  }, []);
  const clearFilters = () => {
    setSelectedCategory("All");
    setSelectedBrand("All");
  };

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

  // 🔎 Apply category + brand filters
  const filteredInventories = inventories.filter((tool) => {
    const matchCategory =
      selectedCategory === "All" || tool.category === selectedCategory;
    const matchBrand =
      selectedBrand === "All" ||
      (tool.variants || []).some((v) => v.brand === selectedBrand);
    return matchCategory && matchBrand;
  });

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
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            {/* Category Filter */}
            <div className="flex flex-col w-full md:w-1/2">
              <Label className="mb-1 text-sm font-medium">
                Filter by Category
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full">
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

            {/* Brand Filter */}
            <div className="flex flex-col w-full md:w-1/2">
              <Label className="mb-1 text-sm font-medium">
                Filter by Brand
              </Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
