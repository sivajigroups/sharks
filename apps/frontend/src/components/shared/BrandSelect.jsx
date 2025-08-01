import * as Select from "@radix-ui/react-select";
import { ChevronDown, Trash2 } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils"; // optional: Tailwind helper

const BrandSelect = ({ brands, value, onSelect, onDelete }) => {
  return (
    <Select.Root value={value} onValueChange={onSelect}>
      <Select.Trigger className="flex items-center justify-between px-3 py-2 border rounded w-full text-left">
        <Select.Value placeholder="Select Brand" />
        <Select.Icon>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="z-50 bg-white rounded border shadow-lg">
          <Select.ScrollUpButton />
          <Select.Viewport className="p-1 max-h-60 overflow-y-auto">
            {brands.map((brand) => (
              <Select.Item
                key={brand}
                value={brand}
                className={cn(
                  "flex justify-between items-center px-2 py-1 hover:bg-gray-100 rounded cursor-pointer"
                )}
              >
                <Select.ItemText>{brand}</Select.ItemText>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(brand);
                  }}
                  className="text-red-500 hover:text-red-700 ml-2"
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </Select.Item>
            ))}

            <Select.Item
              value="__add_brand__"
              className="px-2 py-1 text-blue-500 hover:bg-blue-50 rounded"
            >
              ➕ Add Brand
            </Select.Item>
          </Select.Viewport>
          <Select.ScrollDownButton />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

export default BrandSelect;
