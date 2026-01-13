import React, { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

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

export default function RentalOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`${API}/transaction/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch rental details");
      const json = await res.json();
      setData(json.data || json);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Error loading rental details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [paidDialogOpen, setPaidDialogOpen] = useState(false);
  const [markPaidChecked, setMarkPaidChecked] = useState(false);

  const handleReturnConfirm = async () => {
    try {
      setLoading(true); // show generic loading or local state
      const res = await fetch(`${API}/transaction/${id}/return`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update status");

      if (markPaidChecked) {
        const resPaid = await fetch(`${API}/transaction/${id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!resPaid.ok)
          throw new Error("Returned, but failed to mark as paid");
      }

      toast.success(markPaidChecked ? "Returned & Paid" : "Marked as Returned");
      setReturnDialogOpen(false);
      fetchData(); // reload
    } catch (e) {
      toast.error(e.message);
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/transaction/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to mark as paid");
      toast.success("Marked as Paid");
      setPaidDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.message);
      setLoading(false);
    }
  };

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

        {/* Rent Info Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Table Skeleton */}
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Days</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2].map((i) => (
              <TableRow key={`sk-${i}`}>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-5 w-8 ml-auto" />
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
            <div className="flex justify-between font-bold">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="m-3 p-4 bg-white rounded-lg shadow-md">
        <div className="text-red-500 mb-4">{err || "No data found"}</div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  const {
    billNo,
    customer,
    items = [],
    totalAmount,
    subtotal,
    deposit,
    status,
    paymentStatus,
    createdAt,
  } = data;

  const isPending = status?.toLowerCase() === "pending";

  return (
    <div className="m-3 p-4 bg-white rounded-lg shadow-md space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">
            Rental Order #{billNo || id.slice(-6).toUpperCase()}
          </h1>
          <p className="text-gray-500">
            Created: {createdAt ? DT.format(new Date(createdAt)) : "-"}
          </p>
        </div>

        <div className="flex gap-2">
          {isPending && (
            <Button
              variant="destructive"
              onClick={() => setReturnDialogOpen(true)}
            >
              Return All Items
            </Button>
          )}

          {status === "Returned" && paymentStatus !== "Paid" && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setPaidDialogOpen(true)}
            >
              Mark as Paid
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>

      {/* Customer */}
      <div className="border rounded-lg p-4 relative">
        <p className="font-medium text-lg">
          {customer?.name || "Unknown Customer"}
        </p>
        <p className="text-sm text-gray-500">{customer?.phone || "-"}</p>
        {customer?.address && (
          <p className="text-sm text-gray-400 mt-1">
            {typeof customer.address === "string"
              ? customer.address
              : `${customer.address.street || ""}, ${customer.address.city || ""}`}
          </p>
        )}

        <div className="absolute top-4 right-4">
          <Badge
            className={
              paymentStatus === "Paid"
                ? "bg-green-100 text-green-800 hover:bg-green-200"
                : status === "Returned"
                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            }
          >
            {paymentStatus === "Paid" ? "Paid" : status || "Pending"}
          </Badge>
        </div>
      </div>

      {/* Items Table */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Days</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="text-right">Rate / Day</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-center w-[100px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={idx}>
              <TableCell>
                <div>
                  <p className="font-medium">{item.itemName}</p>
                  <p className="text-xs text-gray-400">
                    {item.inventory?.category || "Rental"}
                  </p>
                  {item.sku && (
                    <p className="text-[10px] text-gray-500">SKU: {item.sku}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">{item.days}</TableCell>
              <TableCell>
                <div className="text-xs">
                  <div>
                    Fr:{" "}
                    {item.rentDate
                      ? new Date(item.rentDate).toLocaleDateString()
                      : "-"}
                  </div>
                  <div>
                    To:{" "}
                    {item.returnDate
                      ? new Date(item.returnDate).toLocaleDateString()
                      : "-"}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {INR.format(item.pricePerDay || 0)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {INR.format(item.amount || 0)}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="text-xs">
                  {item.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{INR.format(subtotal || 0)}</span>
          </div>
          {deposit > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Deposit (Refundable)</span>
              <span>{INR.format(deposit)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span>
            <span>{INR.format(totalAmount || 0)}</span>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Return</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark all items in this rental order as
              Returned? This action updates inventory stock.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <input
              type="checkbox"
              id="markPaid"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={markPaidChecked}
              onChange={(e) => setMarkPaidChecked(e.target.checked)}
            />
            <label
              htmlFor="markPaid"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Also mark as Paid
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReturnDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReturnConfirm}>
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark As Paid Dialog */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this order as Paid?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleMarkAsPaid}
            >
              Confirm Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
