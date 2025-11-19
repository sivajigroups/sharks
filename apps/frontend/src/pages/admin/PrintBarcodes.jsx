import React, { useEffect, useState } from "react";
import bwipjs from "bwip-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function PrintBarcodes() {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const [inventories, setInventories] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchSku, setSearchSku] = useState("");

  // ── Fetch inventories ──
  useEffect(() => {
    const fetchInventories = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/inventory/sales`, {
          credentials: "include",
        });
        const json = await res.json();
        const list = json?.data || json || [];
        setInventories(list);
        setFiltered(list);
      } catch {
        toast.error("Failed to fetch inventory");
      } finally {
        setLoading(false);
      }
    };
    fetchInventories();
  }, [API_BASE]);

  // ── Filter by SKU or Name ──
  useEffect(() => {
    const term = searchSku.trim().toLowerCase();
    if (!term) {
      setFiltered(inventories);
    } else {
      const f = inventories
        .map((tool) => ({
          ...tool,
          variants: (tool.variants || []).filter(
            (v) =>
              v.sku?.toLowerCase().includes(term) ||
              tool.name?.toLowerCase().includes(term)
          ),
        }))
        .filter((t) => t.variants.length > 0);
      setFiltered(f);
    }
  }, [searchSku, inventories]);

  const handlePrint = () => window.print();

  // ──────────────────────────────────────────────
  // Layout (same as InventoryManager/BillingPage)
  // ──────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden  bg-gray-50">
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 print:hidden gap-3">
          <h1 className="text-2xl font-bold">Barcode Stickers</h1>

          <div className="flex gap-2 w-full sm:w-auto">
            <Input
              placeholder="Filter by SKU or Name..."
              value={searchSku}
              onChange={(e) => setSearchSku(e.target.value)}
              className="sm:w-72 w-full"
            />
            <Button onClick={handlePrint}>🖨️ Print</Button>
          </div>
        </div>

        {/* Content */}
        <Card className="shadow-sm border">
          <CardContent className="p-0">
            <Table className="w-full table-fixed print:table border-separate border-spacing-0">
              {/* Header (hidden in print) */}
              <TableHeader className="print:hidden">
                <TableRow className="bg-black">
                  <TableHead className="text-white py-3">
                    {loading ? <Skeleton className="h-4 w-24" /> : "Item"}
                  </TableHead>

                  <TableHead className="text-white py-3">
                    {loading ? <Skeleton className="h-4 w-24" /> : "Variant"}
                  </TableHead>

                  <TableHead className="text-white py-3 text-center">
                    {loading ? <Skeleton className="h-4 w-24" /> : "Barcode"}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6">
                      Loading inventory...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6">
                      No matching items
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tool) =>
                    (tool.variants || []).map((variant) => (
                      <TableRow
                        key={variant._id}
                        className="hover:bg-gray-50 print:hover:bg-transparent border-b"
                      >
                        {/* ITEM NAME */}
                        <TableCell className="py-4 px-4 align-top font-semibold text-[15px]">
                          {tool.name}
                        </TableCell>

                        {/* VARIANT DETAILS */}
                        <TableCell className="py-4 px-4 align-top">
                          <div className="text-sm font-medium">
                            {variant.brand}
                          </div>
                          <div className="text-xs text-gray-600">
                            {variant.size} • {variant.color}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            SKU: {variant.sku}
                          </div>
                        </TableCell>

                        {/* BARCODE */}
                        <TableCell className="py-4 px-4 align-middle text-center">
                          <div className="inline-flex justify-center">
                            <BarcodeCard tool={tool} variant={variant} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- BARCODE CARD ---------------- */
function BarcodeCard({ tool, variant }) {
  const canvasId = `barcode-${variant._id}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      try {
        bwipjs.toCanvas(canvas, {
          bcid: "code128",
          text: variant.sku,
          scale: 3,
          height: 12,
          includetext: true,
          textxalign: "center",
        });
      } catch (err) {
        console.error("Barcode render error:", err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [variant.sku, canvasId]);

  return (
    <div
      className="
        w-[90mm]
        h-[50mm]
        border border-gray-300
        rounded-md
        bg-white
        shadow-sm
        flex flex-col
        items-center
        justify-center
        text-center
        p-3
        page-break-inside-avoid
        print:shadow-none
        print:border-gray-200
      "
    >
      <canvas id={canvasId} className="w-full h-auto mb-1" />
      <p className="text-[11px] font-semibold leading-tight">{tool.name}</p>
      <p className="text-[10px] text-gray-700">
        {variant.brand} • {variant.size} • {variant.color}
      </p>
      <p className="text-[9px] text-gray-500">{variant.sku}</p>
    </div>
  );
}
