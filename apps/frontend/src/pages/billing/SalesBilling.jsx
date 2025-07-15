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
    name: "Cutter",
    image:cutter,
    description: "Explore tech tools.",
    id: 1,
    variants: [
      { size: "Small", price: 80 },
      { size: "Medium", price: 100 },
      { size: "Large", price: 120 },
    ],
    quantity: 5,
  },
  {
    name: "Hammer",
    image: "https://source.unsplash.com/random/200x120?construction",
    description: "Essential for construction.",
    id: 2,
    variants: [{ size: "Standard", price: 150 }],
    quantity: 3,
  },
  {
    name: "Screwdriver",
    image: "https://source.unsplash.com/random/200x120?tools",
    description: "Versatile tool for repairs.",
    id: 3,
    price: 80,
    quantity: 10,
  },
  {
    name: "Wrench",
    image: spanner,
    description: "Perfect for mechanical tasks.",
    id: 4,
    price: 120,
    quantity: 2,
  },
  {
    name: "Drill",
    image: "https://source.unsplash.com/random/200x120?drill",
    description: "Powerful drilling tool.",
    id: 5,
    price: 200,
    quantity: 4,
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
    <div className="flex w-308 h-screen p-4 gap-4 overflow-hidden">
      {/* Left Panel */}
      <div className="w-[340px] shrink-0">
        <LeftCartPanel cartItems={cartItems} />
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tools.map((tool) => (
            <Dialog key={tool.id}>
              <DialogTrigger asChild>
                <Card
                  onClick={() => setSelectedTool(tool)} // store selected tool only
                  className="min-w-[180px] rounded-xl shadow-sm overflow-hidden cursor-pointer"
                >
                  <img
                    src={tool.image}
                    alt={tool.name}
                    className="w-full h-[120px] object-cover"
                  />
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
                  {(
                    tool.variants ?? [{ size: "Default", price: tool.price }]
                  ).map((variant, index) => (
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
