import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import LeftCartPanel from "./LeftCartPanel "; // ✅ remove stray space
import { Skeleton } from "@/components/ui/skeleton";

const SalesBilling = () => {
  const [loading, setLoading] = useState(false);
  const [inventories, setInventories] = useState([]);
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const fetchInventories = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/inventory/sales`, {
          credentials: "include",
        });
        const data = await res.json();
        setInventories(data.data || []);
      } catch {
        toast.error("Failed to fetch inventory");
      } finally {
        setLoading(false);
      }
    };
    fetchInventories();
  }, []);

  const handleAddToCart = (tool, variant) => {
    // Use variant._id to avoid collisions; keep both references for backend
    const id = `${tool._id}-${variant._id}`;
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) =>
          i.id === id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id,
          name: tool.name,
          inventoryId: tool._id,     // ✅ used by /api/bills
          variantId: variant._id,    // ✅ used by /api/bills
          variant,                   // keep full snapshot for display
          qty: 1,
          price: variant.price,      // current unit price used in cart view
        },
      ];
    });
  };

  return (
    <div className="flex flex-1 min-w-0 h-full overflow-hidden">
      {/* Left Panel */}
      <div className="w-[360px] shrink-0 bg-white border-r p-2">
        <LeftCartPanel cartItems={cartItems} setCartItems={setCartItems} />
      </div>

      {/* Right Panel */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 scrollbar-hide scroll-smooth">
        <div className="flex flex-wrap gap-2">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Card
                  key={i}
                  className="min-w-[180px] rounded-xl shadow-sm overflow-hidden animate-pulse bg-gray-200 dark:bg-gray-700"
                >
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </Card>
              ))
            : inventories.map((tool) => (
                <Dialog key={tool._id}>
                  <DialogTrigger asChild>
                    <Card className="min-w-[180px] rounded-xl shadow-sm overflow-hidden cursor-pointer">
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm font-semibold">
                          {tool.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {tool.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select Variant for {tool.name}</DialogTitle>
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
        </div>
      </div>
    </div>
  );
};

export default SalesBilling;
