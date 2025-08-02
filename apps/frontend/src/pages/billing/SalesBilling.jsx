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
import LeftCartPanel from "./LeftCartPanel ";

const SalesBilling = () => {
  const [loading, setLoading] = useState(false);
  const [inventories, setInventories] = useState([]);
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const fetchInventories = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}/inventory/sales`,
          {
            method: "GET",
            credentials: "include",
          }
        );
        const data = await res.json();
        setInventories(data.data);
      } catch (err) {
        toast.error("Failed to fetch inventory");
      } finally {
        setLoading(false);
      }
    };
    fetchInventories();
  }, []);

  const handleAddToCart = (tool, variant) => {
    const id = `${tool._id}-${variant.sku}`;

    setCartItems((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      return [
        ...prevCart,
        {
          id,
          name: tool.name,
          variant,
          qty: 1,
          price: variant.price,
        },
      ];
    });
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel - Fixed */}
      <div className="w-[360px] shrink-0 bg-white border-r p-2">
        <LeftCartPanel cartItems={cartItems} />
      </div>

      {/* Right Panel - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide scroll-smooth">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
                      {tool.variants.map((variant) => (
                        <DialogClose asChild key={variant._id}>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => handleAddToCart(tool, variant)}
                          >
                            <span>
                              {variant.brand} - {variant.size}{" "}
                              {variant.color && `- ${variant.color}`}
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
