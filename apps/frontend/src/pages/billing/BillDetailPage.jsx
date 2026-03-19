import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { generateBillPDF } from "@/utils/pdfGenerator";
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

  const [isEditing, setIsEditing] = useState(false);
  const [editDiscount, setEditDiscount] = useState(0);

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
  const downloadPdf = () => {
    if (!bill) return;
    try {
      toast.message("Preparing PDF…");
      const items = bill.saleItems.map((i) => ({
        name: i.productName || i.name,
        qty: i.quantity || i.qty,
        price: i.unitPrice || i.price,
        itemType: "sale",
      }));

      generateBillPDF({
        billNo: bill.billNo,
        modeTitle: "SALE BILL",
        customer: bill.customer,
        items,
        subtotal: bill.subtotal,
        saleSubtotal: bill.subtotal, // Use subtotal as sale subtotal
        taxAmount: bill.tax,
        totalAmount: bill.totalAmount,
        discount: bill.discount,
        paymentMode: bill.paymentMode,
        paymentStatus: bill.paymentStatus,
        date: bill.billingDate,
      });

      toast.success("Downloaded");
    } catch (e) {
      console.error(e);
      toast.error("PDF download failed");
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/bills/${billId}/pay`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to mark as paid");
      toast.success("Marked as Paid");
      // Reload bill
      const reloadRes = await fetch(`${API}/bills/${billId}`, {
        credentials: "include",
      });
      const reloadJson = await reloadRes.json();
      setBill(reloadJson.data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsUnpaid = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/bills/${billId}/unpay`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to revert payment");
      toast.success("Reverted to Unpaid");
      const reloadRes = await fetch(`${API}/bills/${billId}`, {
        credentials: "include",
      });
      const reloadJson = await reloadRes.json();
      setBill(reloadJson.data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    setEditDiscount(bill.discount || 0);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/bills/${billId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ discount: editDiscount }),
      });

      if (!res.ok) throw new Error("Failed to update bill");

      const json = await res.json();
      setBill(json.data);
      setIsEditing(false);
      toast.success("Bill updated successfully");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
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
          {!isEditing && (
            <Button variant="outline" onClick={startEdit}>
              Edit Bill
            </Button>
          )}

          {isEditing && (
            <>
              <Button variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveChanges}>Save Changes</Button>
            </>
          )}

          {bill.paymentStatus !== "Paid" && !isEditing && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleMarkAsPaid}
            >
              Mark as Paid
            </Button>
          )}
          {bill.paymentStatus === "Paid" && !isEditing && (
            <Button
              variant="outline"
              className="border-red-400 text-red-600 hover:bg-red-50"
              onClick={handleMarkAsUnpaid}
            >
              Mark as Unpaid
            </Button>
          )}
          <Button onClick={downloadPdf} variant="outline">
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>

      {/* Customer */}
      <div className="border rounded-lg p-4 relative">
        <p className="font-medium">{bill.customer?.name}</p>
        <p className="text-sm text-gray-500">{bill.customer?.phone}</p>
        <Badge className="mt-2 mr-2">{bill.paymentMode}</Badge>
        <Badge
          className={
            bill.paymentStatus === "Paid"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }
          variant="outline"
        >
          {bill.paymentStatus || "Paid"}
        </Badge>
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
          {bill.saleItems.map((i, idx) => (
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
          {bill.tax > 0 && (
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{INR.format(bill.tax)}</span>
            </div>
          )}
          {isEditing ? (
            <div className="flex justify-between items-center py-1 text-sm">
              <span>Discount</span>
              <input
                type="number"
                className="w-20 border rounded p-1 text-right"
                value={editDiscount}
                onChange={(e) => setEditDiscount(Number(e.target.value))}
              />
            </div>
          ) : (
            bill.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{INR.format(bill.discount)}</span>
              </div>
            )
          )}
          <div className="flex justify-between font-bold border-t pt-2">
            <span>{isEditing ? "New Total" : "Total"}</span>
            <span>
              {isEditing
                ? INR.format(
                    (bill.subtotal || 0) + (bill.tax || 0) - editDiscount,
                  )
                : INR.format(bill.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
