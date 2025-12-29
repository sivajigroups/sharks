import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";

// ---------- FORMATTERS ----------
const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});
const DT = new Intl.DateTimeFormat("en-IN", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default function BillDetailPage() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE;

  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const [err, setErr] = useState("");

  // ---------- FETCH SINGLE BILL ----------
  // ---------- FETCH SINGLE BILL ----------
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fetchBill = async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(`${API}/bills/${billId}`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Failed to fetch bill details");

        const payload = await res.json();
        if (isMounted) {
          setBill(payload.data ?? payload);
        }
      } catch (e) {
        if (e.name !== "AbortError" && isMounted) {
          setErr(e.message || "Something went wrong");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBill();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [billId, API]);

  // ---------- DOWNLOAD PDF ----------
  const downloadPdf = async () => {
    try {
      toast.message("Preparing PDF…");

      // Try backend PDF first
      const res = await fetch(`${API}/bills/${billId}/pdf`, {
        credentials: "include",
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Bill-${bill.billNo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Downloaded");
        return;
      }

      // Fallback → client PDF
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      doc.text("INVOICE", 14, 20);

      doc.setFontSize(11);
      doc.text(`Bill No: ${bill.billNo}`, 14, 30);
      doc.text(`Customer: ${bill.customer?.name}`, 14, 38);
      doc.text(`Phone: ${bill.customer?.phone}`, 14, 46);
      doc.text(`Date: ${DT.format(new Date(bill.billingDate))}`, 14, 54);

      autoTable(doc, {
        startY: 65,
        head: [["Item", "Qty", "Rate", "Amount"]],
        body: bill.items.map((i) => [
          i.productName || i.name,
          i.quantity || i.qty,
          INR.format(i.unitPrice || i.price),
          INR.format((i.quantity || i.qty) * (i.unitPrice || i.price)),
        ]),
      });

      doc.text(
        `Total: ${INR.format(bill.totalAmount)}`,
        14,
        doc.lastAutoTable.finalY + 15
      );

      doc.save(`Bill-${bill.billNo}.pdf`);
      toast.success("Downloaded");
    } catch {
      toast.error("PDF download failed");
    }
  };

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="m-3 p-4 bg-white rounded-lg shadow-md space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Customer Skeleton */}
        <div className="border rounded-lg p-4 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

      
        {/* Table Skeleton */}
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={`sk-${i}`}>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-5 w-8 ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-5 w-16 ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-5 w-20 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totals Skeleton */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="m-3 p-4 bg-white rounded-lg shadow-md">
        <p className="text-red-600">{err}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-6">
        <p>No bill data found.</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="m-3 p-4 bg-white rounded-lg shadow-md space-y-6 ">
      {/* Header */}
      <div className="flex justify-between items-start ">
        <div>
          <h1 className="text-2xl font-bold">Bill #{bill.billNo}</h1>
          <p className="text-gray-500">
            {DT.format(new Date(bill.billingDate))}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button onClick={downloadPdf}>Download PDF</Button>
        </div>
      </div>

      {/* Customer */}
      <div className="border rounded-lg p-4">
        <p className="font-medium">{bill.customer?.name}</p>
        <p className="text-sm text-gray-500">{bill.customer?.phone}</p>
        <Badge className="mt-2">{bill.paymentMode}</Badge>
      </div>

      {/* Items */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bill.items.map((i, idx) => (
            <TableRow key={idx}>
              <TableCell>{i.productName || i.name}</TableCell>
              <TableCell className="text-right">
                {i.quantity || i.qty}
              </TableCell>
              <TableCell className="text-right">
                {INR.format(i.unitPrice || i.price)}
              </TableCell>
              <TableCell className="text-right">
                {INR.format((i.quantity || i.qty) * (i.unitPrice || i.price))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{INR.format(bill.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{INR.format(bill.tax)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{INR.format(bill.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
