import React, { useState } from "react";
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
import LeftCartPanel from "./LeftCartPanel ";
import spanner from "../../assets/spanner.jpg";
import cutter from "../../assets/cutter.jpg";

const tools = [
  {
    name: "Angle Grinder",
    category: "Cutting Tools",
    description: "Multi-brand angle grinder with variant options.",
    variants: [
      {
        sku: "AG-MAKITA-10KG",
        brand: "Makita",
        size: "10kg",
        color: null,
        price: 2000,
        stock: 10,
      },
      {
        sku: "AG-MAKITA-13KG",
        brand: "Makita",
        size: "13kg",
        color: null,
        price: 2300,
        stock: 5,
      },
      {
        sku: "AG-HITACHI-7KG",
        brand: "Hitachi",
        size: "7kg",
        color: "Black",
        price: 1800,
        stock: 6,
      },
    ],
  },
  {
    name: "Electric Drill",
    category: "Power Tools",
    description: "Cordless and corded drills for multiple use cases.",
    variants: [
      {
        sku: "ED-BOSCH-500W",
        brand: "Bosch",
        size: "500W",
        color: "Blue",
        price: 3200,
        stock: 8,
      },
      {
        sku: "ED-DEWALT-650W",
        brand: "DeWalt",
        size: "650W",
        color: "Yellow",
        price: 3700,
        stock: 4,
      },
    ],
  },
  {
    name: "Welding Machine",
    category: "Fabrication Tools",
    description: "Compact inverter welding machines for field and shop use.",
    variants: [
      {
        sku: "WM-RILAND-200A",
        brand: "Riland",
        size: "200A",
        color: "Blue",
        price: 6500,
        stock: 3,
      },
      {
        sku: "WM-ESAB-250A",
        brand: "ESAB",
        size: "250A",
        color: "Yellow",
        price: 8200,
        stock: 2,
      },
    ],
  },
  {
    name: "Tile Cutter",
    category: "Construction Tools",
    description: "Manual and electric tile cutters for clean finish.",
    variants: [
      {
        sku: "TC-MANUAL-600MM",
        brand: "Sigma",
        size: "600mm",
        color: "Red",
        price: 1800,
        stock: 7,
      },
      {
        sku: "TC-ELEC-1000MM",
        brand: "Bosun",
        size: "1000mm",
        color: "Gray",
        price: 4500,
        stock: 4,
      },
    ],
  },
  {
    name: "Concrete Vibrator",
    category: "Civil Tools",
    description: "Petrol and electric types for compacting concrete.",
    variants: [
      {
        sku: "CV-PETROL-1.5HP",
        brand: "Honda",
        size: "1.5HP",
        color: "Red",
        price: 7800,
        stock: 2,
      },
      {
        sku: "CV-ELECTRIC-2HP",
        brand: "Makita",
        size: "2HP",
        color: "Blue",
        price: 7200,
        stock: 3,
      },
    ],
  },
  {
    name: "Air Compressor",
    category: "Pneumatic Tools",
    description: "Portable air compressors for industrial applications.",
    variants: [
      {
        sku: "AC-PORTABLE-25L",
        brand: "Elgi",
        size: "25L",
        color: "Green",
        price: 5600,
        stock: 5,
      },
      {
        sku: "AC-HEAVY-50L",
        brand: "Crompton",
        size: "50L",
        color: "Gray",
        price: 8500,
        stock: 2,
      },
    ],
  },
];

const SalesBilling = () => {
  const [cartItems, setCartItems] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);

  const handleAddToCart = (tool, variant) => {
    const toolWithVariant = {
      ...tool,
      selectedVariant: variant,
      id: `${tool.id}-${variant.size}`, // unique ID per variant
      price: variant.price,
    };

    setCartItems((prevCart) => {
      const existing = prevCart.find((item) => item.id === toolWithVariant.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === toolWithVariant.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prevCart, { ...toolWithVariant, qty: 1 }];
      }
    });

    setSelectedTool(null); // Close dialog
  };

  return (
    <div className="flex h-full overflow-hidden m">
      {/* Left Panel - Fixed */}
      <div className="w-[360px] shrink-0 bg-white border-r p-2">
        <LeftCartPanel cartItems={cartItems} />
      </div>

      {/* Right Panel - Scrollable with hidden scrollbar and smooth scroll */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide scroll-smooth">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tools.map((tool) => (
            <Dialog key={tool.id}>
              <DialogTrigger asChild>
                <Card
                  onClick={() => setSelectedTool(tool)}
                  className="min-w-[180px] rounded-xl shadow-sm overflow-hidden cursor-pointer"
                >
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
                  {(tool.variants ?? [{ size: "Default", price: tool.price }]).map(
                    (variant, index) => (
                      <DialogClose asChild key={index}>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => handleAddToCart(tool, variant)}
                        >
                          <span>{variant.size}</span>
                          <span>₹{variant.price}</span>
                        </Button>
                      </DialogClose>
                    )
                  )}
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
