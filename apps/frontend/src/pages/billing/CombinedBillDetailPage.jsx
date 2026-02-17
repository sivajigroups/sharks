import React, { useEffect, useState } from "react";
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

export default function CombinedBillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE;

  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const [err, setErr] = useState("");

  // Return logic state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [paidDialogOpen, setPaidDialogOpen] = useState(false);
  const [markPaidChecked, setMarkPaidChecked] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState({}); // { itemId: { quantity, days } }
  const [editDiscount, setEditDiscount] = useState(0);

  // ---------- FETCH BILL ----------
  const fetchBill = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`${API}/combined-bills/${id}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.message || "Failed to fetch combined bill");
      setBill(json.data);
      // Reset selections on refetch
      setSelectedItems([]);
      setMarkPaidChecked(false);
    } catch (e) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchBill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, API]);

  // ---------- RETURN LOGIC ----------
  const pendingRentalItems =
    bill?.rentalItems?.filter(
      (i) => i.status === "Pending" || i.status === "Active",
    ) || [];

  const isAllSelected =
    pendingRentalItems.length > 0 &&
    selectedItems.length === pendingRentalItems.length;

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(pendingRentalItems.map((i) => i._id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId, checked) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const handleReturnConfirm = async () => {
    try {
      toast.loading("Processing return...");
      const res = await fetch(`${API}/combined-bills/${id}/return`, {
        method: "POST", // Changed from PATCH to match your potential backend route, verify if needed
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rentalItemIds: selectedItems }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to return items");
      }

      // If user also wants to mark as paid (if applicable)
      // Note: Combined bill 'mark as paid' might need a specific route if the logic differs,
      // but usually we might just update the bill status.
      // For now, let's assume if there's a logic for that, we retain it.
      // If the requirement is just to mark items returned, we stop here.
      // If "markPaidChecked" is true, we might need a separate call or the backend handles it.
      // Assuming we just refresh for now unless we have a specific 'mark paid' endpoint for combined bills.

      toast.dismiss();
      toast.success("Items marked as returned");
      setReturnDialogOpen(false);
      fetchBill();
    } catch (e) {
      toast.dismiss();
      toast.error(e.message);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      toast.loading("Marking as paid...");
      const res = await fetch(`${API}/combined-bills/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to mark as paid");
      }

      toast.dismiss();
      toast.success("Marked as Paid");
      setPaidDialogOpen(false);
      fetchBill();
    } catch (e) {
      toast.dismiss();
      toast.error(e.message);
    }
  };

  const startEdit = () => {
    const initial = {};
    if (bill.rentalItems) {
      bill.rentalItems.forEach((i) => {
        initial[i._id] = { quantity: i.quantity, days: i.days };
      });
    }
    setEditItems(initial);
    setEditDiscount(bill.discount || 0);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditItems({});
  };

  const handleEditChange = (itemId, field, value) => {
    setEditItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: Number(value) },
    }));
  };

  const confirmEdit = async () => {
    try {
      toast.loading("Saving changes...");
      const itemsToUpdate = Object.entries(editItems).map(([itemId, val]) => ({
        _id: itemId,
        ...val,
      }));

      const res = await fetch(`${API}/combined-bills/${id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rentalItems: itemsToUpdate,
          discount: editDiscount,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Update failed");
      }

      toast.dismiss();
      toast.success("Bill updated successfully");
      setIsEditing(false);
      fetchBill();
    } catch (e) {
      toast.dismiss();
      toast.error(e.message);
    }
  };

  // ---------- DOWNLOAD PDF ----------
  const downloadPdf = () => {
    if (!bill) return;
    try {
      toast.message("Preparing PDF…");

      const saleItems = (bill.saleItems || []).map((i) => ({
        name: i.productName,
        qty: i.quantity,
        price: i.unitPrice,
        amount: i.lineTotal,
        itemType: "sale",
      }));

      const rentalItems = (bill.rentalItems || []).map((i) => ({
        name: i.itemName,
        qty: i.quantity,
        days: i.days,
        price: i.pricePerDay, // for reference
        pricePerDay: i.pricePerDay, // for utility
        amount: i.amount,
        rentDate: i.rentDate,
        itemType: "rental",
      }));

      const allItems = [...saleItems, ...rentalItems];

      // Handle customer fallback
      const customerObj = bill.customer || { name: "Walk-in Customer" };

      generateBillPDF({
        billNo: bill.billNo,
        modeTitle: "COMBINED BILL",
        customer: customerObj,
        items: allItems,
        saleSubtotal: bill.saleSubtotal,
        rentalSubtotal: bill.rentalSubtotal,
        subtotal: (bill.saleSubtotal || 0) + (bill.rentalSubtotal || 0),
        rentalDeposit: bill.deposit,
        discount: bill.discount,
        taxAmount: bill.tax,
        totalAmount: bill.totalAmount,
        paymentMode: bill.paymentMode,
        paymentStatus: bill.paymentStatus,
        date: bill.createdAt,
      });

      toast.success("Downloaded");
    } catch (error) {
      console.error(error);
      toast.error("PDF download failed");
    }
  };

  // ---------- UI STATE: LOADING / ERROR ----------
  if (loading) {
    return (
      <div className="m-3 p-4 bg-white rounded-lg shadow-md space-y-6">
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
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (err || !bill) {
    return (
      <div className="m-3 p-4 bg-white rounded-lg shadow-md">
        <p className="text-red-600 mb-4">{err || "Bill not found"}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  const hasRentalItems = bill.rentalItems && bill.rentalItems.length > 0;
  const isPartiallyReturned = bill.rentalItems?.some(
    (i) => i.status === "Returned",
  );
  const isFullyReturned =
    hasRentalItems && bill.rentalItems?.every((i) => i.status === "Returned");

  return (
    <div className="m-3 p-4 bg-white rounded-lg shadow-md space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Bill #{bill.billNo}</h1>
            <Badge variant="secondary">Combined</Badge>
          </div>
          <p className="text-gray-500">{DT.format(new Date(bill.createdAt))}</p>
        </div>

        <div className="flex gap-2">
          {!isEditing && (
            <Button variant="outline" onClick={startEdit}>
              Edit Rentals
            </Button>
          )}

          {isEditing && (
            <>
              <Button variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button onClick={confirmEdit}>Save Changes</Button>
            </>
          )}

          {!isEditing && selectedItems.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setReturnDialogOpen(true)}
            >
              Return Selected ({selectedItems.length})
            </Button>
          )}

          {bill.paymentStatus !== "Paid" && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setPaidDialogOpen(true)}
            >
              Mark as Paid
            </Button>
          )}

          <Button variant="outline" onClick={downloadPdf}>
            Download PDF
          </Button>

          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>

      {/* Customer Info */}
      <div className="border rounded-lg p-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <p className="font-medium text-lg">
              {bill.customer?.name || "Walk-in Customer"}
            </p>
            <p className="text-sm text-gray-500">
              {bill.customer?.phone || "-"}
            </p>
          </div>
          <div className="text-right md:text-left">
            <div className="absolute top-4 right-4 flex gap-2">
              <Badge
                className={
                  bill.paymentStatus === "Paid"
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                }
              >
                {bill.paymentStatus}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 1. SALE ITEMS SECTION */}
      {bill.saleItems?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700 border-b pb-2">
            Sale Items
          </h3>
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
              {bill.saleItems.map((item, idx) => (
                <TableRow key={`sale-${idx}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {INR.format(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {INR.format(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 2. RENTAL ITEMS SECTION */}
      {bill.rentalItems?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700 border-b pb-2">
            Rental Items
          </h3>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                {/* Checkbox Column for Returns */}
                <TableHead className="w-[50px]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={pendingRentalItems.length === 0}
                  />
                </TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Rate/Day</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.rentalItems.map((item, idx) => {
                const isReturnable =
                  item.status === "Pending" || item.status === "Active";
                return (
                  <TableRow key={`rent-${idx}`}>
                    <TableCell>
                      {isReturnable ? (
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedItems.includes(item._id)}
                          onChange={(e) =>
                            handleSelectItem(item._id, e.target.checked)
                          }
                        />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-xs text-gray-400">{item.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing && isReturnable ? (
                        <input
                          type="number"
                          className="w-16 border rounded p-1 text-right"
                          value={editItems[item._id]?.quantity ?? item.quantity}
                          onChange={(e) =>
                            handleEditChange(
                              item._id,
                              "quantity",
                              e.target.value,
                            )
                          }
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing && isReturnable ? (
                        <input
                          type="number"
                          className="w-16 border rounded p-1 text-right"
                          value={editItems[item._id]?.days ?? item.days}
                          onChange={(e) =>
                            handleEditChange(item._id, "days", e.target.value)
                          }
                        />
                      ) : (
                        item.days
                      )}
                      {item.originalDays && item.originalDays !== item.days && (
                        <span className="block text-xs text-gray-400">
                          (Orig: {item.originalDays})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>
                          Fr: {new Date(item.rentDate).toLocaleDateString()}
                        </div>
                        <div>
                          To:{" "}
                          {item.returnDate
                            ? new Date(item.returnDate).toLocaleDateString()
                            : "Active"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {INR.format(item.pricePerDay)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {INR.format(item.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          item.status === "Returned"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary */}
      <div className="flex justify-end pt-4">
        <div className="w-72 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Sale Subtotal</span>
            <span>{INR.format(bill.saleSubtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Rental Subtotal</span>
            <span>{INR.format(bill.rentalSubtotal)}</span>
          </div>
          {bill.deposit > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Deposit</span>
              <span>{INR.format(bill.deposit)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax</span>
            <span>{INR.format(bill.tax)}</span>
          </div>
          {bill.discount > 0 && !isEditing && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{INR.format(bill.discount)}</span>
            </div>
          )}
          {isEditing && (
            <div className="flex justify-between text-sm items-center py-1">
              <span>Discount</span>
              <input
                type="number"
                className="w-20 border rounded p-1 text-right"
                value={editDiscount}
                onChange={(e) => setEditDiscount(Number(e.target.value))}
              />
            </div>
          )}
          <div className="border-t pt-3 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>
              {isEditing
                ? INR.format(
                    bill.saleSubtotal +
                      bill.rentalSubtotal +
                      (bill.tax || 0) -
                      editDiscount +
                      (bill.deposit || 0),
                  )
                : INR.format(bill.totalAmount)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Payment Mode</span>
            <span>{bill.paymentMode}</span>
          </div>
        </div>
      </div>

      {/* RETURN DIALOG */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Return</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark {selectedItems.length} selected
              item(s) as Returned?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will update the stock and mark these specific items as
              returned.
            </p>
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

      {/* MARK AS PAID DIALOG */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Bill as Paid</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this combined bill as successfully
              paid?
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
