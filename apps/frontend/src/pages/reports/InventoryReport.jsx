import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryReport({ initialType = "sales" }) {
  const API_BASE = import.meta.env.VITE_API_BASE;

  // sales | rental
  const [type, setType] = useState(initialType === "rental" ? "rental" : "sales");
  const isRental = type === "rental";
  const priceKey = isRental ? "pricePerDay" : "price";
  const priceHdr = isRental ? "Price / Day (₹)" : "Price (₹)";
  const pageTitle = isRental ? "Rental Inventory Report" : "Sales Inventory Report";
  const pdfTitle  = isRental ? "Rental Inventory Report" : "Sales Inventory Report";
  const pdfPrefix = isRental ? "RentalInventory" : "SalesInventory";

  // state
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("ALL");
  const [rawInventories, setRawInventories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [category, setCategory] = useState("");

  // fetch branches once
  useEffect(() => {
    (async () => {
      try {
        setLoadingBranches(true);
        const res = await fetch(`${API_BASE}/branch/all`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load branches");
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        setBranches(list);
      } catch (e) {
        setError(e?.message || "Failed to load branches");
      } finally {
        setLoadingBranches(false);
      }
    })();
  }, [API_BASE]);

  // fetch inventory for current type
  const fetchInventories = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inventory/${type}`, { credentials: "include" });
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setRawInventories(data);
    } catch (e) {
      setError(e?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // reset filters on switch if you want; here we just refetch
    fetchInventories();
  }, [type]);

  // helpers & filters
  const branchNameById = useMemo(() => {
    const m = {};
    for (const b of branches) {
      const id = b._id || b.id;
      const nm = b.name || b.branchName || "Unnamed Branch";
      if (id) m[id] = nm;
    }
    return m;
  }, [branches]);

  const branchFiltered = useMemo(() => {
    if (branchId === "ALL") return rawInventories;
    return (rawInventories || []).filter((it) => {
      const bId =
        it?.branch?._id || it?.branch?.id || it?.branch || it?.branchId || "";
      return String(bId) === String(branchId);
    });
  }, [rawInventories, branchId]);

  const categories = useMemo(() => {
    const set = new Set();
    (branchFiltered || []).forEach((it) => it?.category && set.add(it.category));
    return Array.from(set).sort();
  }, [branchFiltered]);

  const flatRows = useMemo(() => {
    const rows = [];
    for (const item of branchFiltered || []) {
      const base = {
        itemName: item?.name || "",
        category: item?.category || "",
        branchLabel:
          item?.branch?.name ||
          item?.branch?.branchName ||
          branchNameById[item?.branch] ||
          "—",
      };

      if (!Array.isArray(item?.variants) || !item.variants.length) {
        const rowStr = `${item?.name} ${item?.category}`.toLowerCase();
        if (search && !rowStr.includes(search.toLowerCase())) continue;
        if (category && (item?.category || "") !== category) continue;

        rows.push({
          ...base,
          sku: "",
          brand: "",
          size: "",
          color: "",
          price: 0,
          stock: 0,
        });
        continue;
      }

      for (const v of item.variants) {
        if (onlyInStock && !(Number(v?.stock) > 0)) continue;

        const rowStr =
          `${item?.name} ${v?.sku} ${v?.brand} ${v?.size} ${v?.color} ${item?.category}`.toLowerCase();
        if (search && !rowStr.includes(search.toLowerCase())) continue;
        if (category && (item?.category || "") !== category) continue;

        rows.push({
          ...base,
          sku: v?.sku || "",
          brand: v?.brand || "",
          size: v?.size || "",
          color: v?.color || "",
          price: Number(v?.[priceKey] || 0), // price or pricePerDay
          stock: Number(v?.stock || 0),
        });
      }
    }
    return rows;
  }, [branchFiltered, branchNameById, search, onlyInStock, category, priceKey]);

  const selectedBranchLabel =
    branchId === "ALL" ? "All branches" : branchNameById[branchId] || "—";

  // PDF export
  const handleDownloadPDF = () => {
    if (!flatRows?.length) {
      setError("No rows to export. Try changing filters or refreshing data.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "A4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const COLORS = {
      primary: [37, 99, 235],
      primaryDark: [30, 64, 175],
      slate700: [51, 65, 85],
      slate500: [100, 116, 139],
      slate300: [203, 213, 225],
      slate100: [241, 245, 249],
      white: [255, 255, 255],
    };

    const nfInt = new Intl.NumberFormat("en-IN");
    const nfAmt = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const branchLabel = (selectedBranchLabel || "ALL Branches") + "";

    const columns = [
      { header: "Item Name", dataKey: "itemName" },
      { header: "SKU", dataKey: "sku" },
      { header: "Brand", dataKey: "brand" },
      { header: "Size", dataKey: "size" },
      { header: "Color", dataKey: "color" },
      { header: isRental ? "Price / Day (INR)" : "Price (INR)", dataKey: "priceTxt" },
      { header: "Stock Qty", dataKey: "stockTxt" },
    ];

    const rows = flatRows.map((r) => {
      const priceNum = Number(r.price || 0);
      const stockNum = Number(r.stock || 0);
      return {
        itemName: r.itemName ?? r.name ?? "",
        sku: r.sku ?? "",
        brand: r.brand ?? "",
        size: r.size ?? "",
        color: r.color ?? "",
        price: priceNum, // numeric for totals
        stock: stockNum,
        priceTxt: nfAmt.format(priceNum),
        stockTxt: nfInt.format(stockNum),
      };
    });

    const totals = {
      items: rows.length,
      qty: rows.reduce((s, r) => s + (Number.isFinite(r.stock) ? r.stock : 0), 0),
      value: rows.reduce(
        (s, r) =>
          s + (Number.isFinite(r.price) && Number.isFinite(r.stock) ? r.price * r.stock : 0),
        0
      ),
    };

    const drawHeaderBand = () => {
      doc.setFillColor(...COLORS.primary);
      doc.roundedRect(32, 28, pageWidth - 64, 92, 10, 10, "F");

      doc.setTextColor(...COLORS.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Sivaji Groups", pageWidth / 2, 58, { align: "center", baseline: "middle" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`${pdfTitle} — ${branchLabel}`, pageWidth / 2, 80, {
        align: "center",
        baseline: "middle",
      });

      doc.setFontSize(10);
      doc.setTextColor(230, 240, 255);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 100, {
        align: "center",
        baseline: "middle",
      });

      // branch chip
      const chipText = branchLabel;
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.primaryDark);
      const padX = 10,
        chipH = 22,
        chipY = 36;
      const textW = doc.getTextWidth(chipText);
      const maxChipW = pageWidth - 64;
      const chipW = Math.min(textW + padX * 2, maxChipW);
      const chipX = pageWidth - 32 - chipW;

      doc.setDrawColor(255, 255, 255);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(chipX, chipY, chipW, chipH, 8, 8, "F");
      doc.text(chipText, chipX + padX, chipY + chipH / 2 + 3, { baseline: "middle" });
    };

    const drawFooter = (pageNumber, pageCount) => {
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.slate500);
      doc.setDrawColor(...COLORS.slate300);
      doc.setLineWidth(0.6);
      doc.line(32, pageHeight - 42, pageWidth - 32, pageHeight - 42);
      doc.text(`Page ${pageNumber} of ${pageCount}`, 32, pageHeight - 22);
      doc.text(
        `© ${new Date().getFullYear()} Sivaji Groups – Confidential`,
        pageWidth / 2,
        pageHeight - 22,
        { align: "center" }
      );
      doc.text(
        "info@sivajigroups.com  |  www.sivajigroups.com",
        pageWidth - 32,
        pageHeight - 22,
        { align: "right" }
      );
    };

    const drawWatermark = () => {
      try {
        if (doc.GState && doc.saveGraphicsState && doc.setGState && doc.restoreGraphicsState) {
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.05 }));
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(110);
        doc.setTextColor(...COLORS.slate700);
        doc.text("Sivaji Groups", pageWidth / 2, pageHeight / 2, {
          align: "center",
          angle: 315,
          baseline: "middle",
        });
        if (doc.restoreGraphicsState) doc.restoreGraphicsState();
      } catch {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(90);
        doc.setTextColor(230, 230, 230);
        doc.text("Sivaji Groups", pageWidth / 2, pageHeight / 2, {
          align: "center",
          angle: 315,
          baseline: "middle",
        });
      }
    };

    const drawStatCard = (x, y, w, h, label, value) => {
      doc.setFillColor(...COLORS.slate100);
      doc.setDrawColor(...COLORS.slate300);
      doc.setLineWidth(0.6);
      doc.roundedRect(x, y, w, h, 10, 10, "FD");

      doc.setTextColor(...COLORS.slate500);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(label, x + 14, y + 22);

      doc.setTextColor(...COLORS.slate700);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(value, x + 14, y + 48);
    };

    // Header & watermark
    drawHeaderBand();
    drawWatermark();

    // column widths sum to content width
    const colWidths = [160, 130, 110, 85, 85, 105, 103];

    autoTable(doc, {
      startY: 140,
      head: [columns.map((c) => c.header)],
      body: rows.map((r) => columns.map((c) => r[c.dataKey] ?? "")),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 6,
        lineWidth: 0.4,
        lineColor: COLORS.slate300,
        textColor: COLORS.slate700,
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: colWidths[0] },
        1: { cellWidth: colWidths[1] },
        2: { cellWidth: colWidths[2] },
        3: { cellWidth: colWidths[3] },
        4: { cellWidth: colWidths[4] },
        5: { cellWidth: colWidths[5], halign: "right" },
        6: { cellWidth: colWidths[6], halign: "right" },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: (data) => {
        drawFooter(data.pageNumber, doc.getNumberOfPages());
        if (data.pageNumber > 1) {
          drawHeaderBand();
          drawWatermark();
        }
      },
      margin: { top: 120, left: 32, right: 32, bottom: 64 },
      pageBreak: "auto",
    });

    // Totals row (three cells): [Totals | Value | Qty]
    autoTable(doc, {
      startY: doc.lastAutoTable?.finalY ?? 140,
      body: [
        [
          {
            content: "Totals",
            styles: { fontStyle: "bold", halign: "left", fillColor: COLORS.slate100 },
          },
          { content: nfAmt.format(totals.value), styles: { halign: "right", fontStyle: "bold" } },
          { content: nfInt.format(totals.qty), styles: { halign: "right", fontStyle: "bold" } },
        ],
      ],
      theme: "plain",
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6, textColor: COLORS.slate700 },
      columnStyles: {
        0: { cellWidth: colWidths.slice(0, 5).reduce((a, b) => a + b, 0) },
        1: { cellWidth: colWidths[5], halign: "right" },
        2: { cellWidth: colWidths[6], halign: "right" },
      },
      margin: { left: 32, right: 32 },
    });

    // Summary cards
    let y = (doc.lastAutoTable?.finalY ?? 180) + 18;
    if (y > pageHeight - 130) {
      doc.addPage();
      drawHeaderBand();
      drawWatermark();
      y = 140;
    }
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.slate700);
    doc.setFont("helvetica", "bold");
    doc.text("Report Summary", 32, y);
    y += 10;

    const gap = 16;
    const cardW = (pageWidth - 32 - 32 - gap * 2) / 3;
    const cardH = 64;
    const cardY = y + 10;

    drawStatCard(32, cardY, cardW, cardH, "Total Items", nfInt.format(totals.items));
    drawStatCard(32 + cardW + gap, cardY, cardW, cardH, "Total Quantity", nfInt.format(totals.qty));
    drawStatCard(
      32 + (cardW + gap) * 2,
      cardY,
      cardW,
      cardH,
      "Total Inventory Value",
      nfAmt.format(totals.value)
    );

    // Unique filename
    const fileSafe = branchLabel.replace(/[^\w\d-_]+/g, "_");
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
      now.getHours()
    )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    doc.save(`${pdfPrefix}_${fileSafe}_${stamp}.pdf`);
  };

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-auto">
      {/* Header + type toggle */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <div className="flex gap-2">
          <Button
            variant={isRental ? "outline" : "default"}
            onClick={() => setType("sales")}
          >
            Sales
          </Button>
          <Button
            variant={isRental ? "default" : "outline"}
            onClick={() => setType("rental")}
          >
            Rental
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="w-full grid gap-3 items-center md:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="p-2 border rounded min-w-[220px] shrink-0"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="ALL">
              {loadingBranches ? "Loading branches…" : "All branches"}
            </option>
            {branches.map((b) => (
              <option key={b._id || b.id} value={b._id || b.id}>
                {b.name || b.branchName || "Unnamed Branch"}
              </option>
            ))}
          </select>

          <Input
            placeholder={`Search in ${selectedBranchLabel}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[240px] grow"
          />

          <select
            className="p-2 border rounded min-w-[180px] shrink-0"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm shrink-0">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
            />
            Only in-stock
          </label>
        </div>

        <div className="flex gap-2 justify-end shrink-0 whitespace-nowrap">
          <Button variant="outline" onClick={fetchInventories} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button onClick={handleDownloadPDF} disabled={!flatRows.length}>
            Download PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="w-full">
        <CardContent className="p-4 overflow-auto">
          <div className="flex items-center justify-between px-1 pb-3">
            <div className="text-sm text-muted-foreground">
              Branch: <b>{selectedBranchLabel}</b>
            </div>
            <div className="text-sm text-muted-foreground">
              Rows: <b>{flatRows.length}</b>
            </div>
          </div>

          {error && (
            <div className="mb-3 p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-black">
                  {[
                    "Item",
                    "SKU",
                    "Brand",
                    "Size",
                    "Color",
                    priceHdr,
                    "Stock",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-white uppercase font-semibold text-sm tracking-wider text-left"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="w-full overflow-auto">
              <Table className="min-w-[1000px] w-full text-sm table-fixed">
                <TableHeader>
                  <TableRow className="bg-black">
                    <TableHead className="text-white uppercase font-semibold text-sm tracking-wider text-left">
                      Item
                    </TableHead>
                    <TableHead className="text-white uppercase font-semibold text-sm tracking-wider text-left">
                      SKU
                    </TableHead>
                    {/* <TableHead className="text-white uppercase font-semibold text-sm tracking-wider text-left">
                      Brand
                    </TableHead>
                    <TableHead className="text-white uppercase font-semibold text-sm tracking-wider text-left">
                      Size
                    </TableHead>
                    <TableHead className="text-white uppercase font-semibold text-sm tracking-wider text-left">
                      Color
                    </TableHead> */}
                    <TableHead className="text-white uppercase font-semibold text-sm tracking-wider text-right">
                      {priceHdr}
                    </TableHead>
                    <TableHead className="text-white uppercase font-semibold text-sm tracking-wider text-right">
                      Stock
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!flatRows.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        No data to display
                      </TableCell>
                    </TableRow>
                  ) : (
                    flatRows.map((r, i) => (
                      <TableRow key={`${r.sku}-${i}`} className="last:border-none">
                        <TableCell className="px-3 py-2 text-left">{r.itemName}</TableCell>
                        <TableCell className="px-3 py-2 text-left">{r.sku}</TableCell>
                        {/* <TableCell className="px-3 py-2 text-left">{r.brand}</TableCell>
                        <TableCell className="px-3 py-2 text-left">{r.size}</TableCell>
                        <TableCell className="px-3 py-2 text-left">{r.color}</TableCell> */}
                        <TableCell className="px-3 py-2 text-right">
                          {Number(r.price || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right">
                          {Number(r.stock || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
