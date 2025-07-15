import React from "react";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

const LeftCartPanel = ({ cartItems }) => {
  const total = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const tax = +(total * 0.13).toFixed(2);
  const loyaltyPoints = Math.floor(total / 10);
  const newTotal = total + tax;

  return (
    <div className="w-[340px] bg-white shadow-md rounded-md p-4 space-y-4 text-sm">
      <h2 className="text-lg font-semibold">Cart Preview</h2>

      {cartItems.length === 0 ? (
        <div className="text-sm text-gray-400">Click a tool to add to cart...</div>
      ) : (
        <div className="space-y-2">
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between border-b pb-1">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500">
                  {item.qty} x ₹{item.price.toFixed(2)}
                </div>
              </div>
              <div className="font-semibold">
                ₹{(item.qty * item.price).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="border-t pt-2 space-y-1">
        <div className="flex justify-between font-semibold text-base">
          <span>Total:</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Taxes:</span>
          <span>₹{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>New Total:</span>
          <span>₹{newTotal.toFixed(2)}</span>
        </div>
        <div className="text-green-600 text-xs">+{loyaltyPoints} Loyalty Points</div>
      </div>

      {/* Keypad */}
      {/* <div className="grid grid-cols-4 gap-1 text-xs mt-2"> */}
        {/* <div className="col-span-4 flex items-center space-x-2">
          <User className="w-4 h-4" />
          <span className="font-semibold text-blue-700">Anita Oliver</span>
        </div> */}
        {/* {["1", "2", "3", "Qty", "4", "5", "6", "% Disc", "7", "8", "9", "Price", "+/-", "0", ".", "⌫"].map((btn, i) => (
          <Button
            key={i}
            className="h-10 p-0 text-xs"
            variant={["Qty", "% Disc", "Price", "⌫"].includes(btn) ? "outline" : "ghost"}
          >
            {btn}
          </Button>
        ))}
      </div> */}

      <Button className="w-full bg-purple-700 text-white mt-2">Payment</Button>
    </div>
  );
};

export default LeftCartPanel;
