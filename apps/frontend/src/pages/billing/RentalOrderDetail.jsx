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
  const [selectedItems, setSelectedItems] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState({}); // { itemId: { quantity, days } }
  const [editDiscount, setEditDiscount] = useState(0);

  // Filter only pending items for selection
  const pendingItems = data?.items?.filter((i) => i.status === "Pending") || [];
  const isAllSelected =
    pendingItems.length > 0 && selectedItems.length === pendingItems.length;

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(pendingItems.map((i) => i._id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, id]);
    } else {
      setSelectedItems((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleReturnConfirm = async () => {
    try {
      setLoading(true); // show generic loading or local state
      const res = await fetch(`${API}/transaction/${id}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ itemIds: selectedItems }),
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
      setSelectedItems([]); // Reset selection
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

  const startEdit = () => {
    const initial = {};
    data.items.forEach((i) => {
      initial[i._id] = { quantity: i.quantity, days: i.days };
    });
    setEditItems(initial);
    setEditDiscount(data.discount || 0);
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
      setLoading(true);
      const itemsToUpdate = Object.entries(editItems).map(([itemId, val]) => ({
        _id: itemId,
        ...val,
      }));

      const res = await fetch(`${API}/transaction/${id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: itemsToUpdate, discount: editDiscount }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Update failed");

      toast.success("Order updated successfully");
      setIsEditing(false);
      fetchData();
    } catch (e) {
      toast.error(e.message);
      setLoading(false);
    }
  };

  // ---------- DOWNLOAD PDF ----------
  // ---------- DOWNLOAD PDF ----------
  const downloadPdf = () => {
    if (!data) return;
    try {
      toast.message("Preparing PDF…");

      const items = (data.items || []).map((item) => ({
        ...item,
        name: item.itemName, // Map itemName to name for utility
        qty: item.quantity,
        price: item.pricePerDay, // For completeness
        itemType: "rental", // Enforce rental type for formatting
      }));

      generateBillPDF({
        billNo: data.billNo || id.slice(-6).toUpperCase(),
        modeTitle: "RENTAL ORDER",
        customer: data.customer,
        items,
        subtotal: data.subtotal,
        rentalSubtotal: data.subtotal,
        taxAmount: 0, // Rental usually has no tax in this system? Or it's calculated? GenericCartPanel has tax. RentalOrderDetail usage in step 16 didn't show tax line explicitly in total calc??
        // Wait, step 16 code: `doc.text("Total:", ... data.totalAmount)`. It had tax?
        // Step 16 `GenericCartPanel`: `const taxAmount = +(subtotal * TAX_RATE).toFixed(2);`
        // Step 16 `RentalOrderDetail` *did not* have tax line in PDF generation! It had Subtotal, Deposit, Discount, Total.
        // The shared utility *has* Tax line.
        // If I pass taxAmount=0, it prints "Tax (13%): 0.00".
        // Does Rental have tax?
        // In `RentalOrderDetail.jsx` snapshot: "Subtotal" -> "Deposit" -> "Discount" -> "Total".
        // There is NO tax line in the *existing* RentalOrderDetail PDF logic.
        // However, `GenericCartPanel` *always* adds tax 13%.
        // The user said "want same format in sale , rental...".
        // If GenericCartPanel has tax, and user wants that format, maybe they want tax on rental too?
        // But if the *data* doesn't have tax, printing 0 tax might be confusing if the total doesn't add up or if it's not applicable.
        // `totalAmount` in `RentalOrderDetail` seems to be `subtotal + deposit - discount`.
        // If I use the shared utility, it will print Tax line.
        // If I want to *hide* tax line in shared utility if 0, I might need to update utility.
        // Let's check `pdfGenerator.js` again.
        // `doc.text("Tax (13%):", ...)` is always executed.
        // I should probably make tax line conditional in `pdfGenerator` if taxAmount is 0?
        // But `GenericCartPanel` always has tax (TAX_RATE = 0.13).
        // Does `CombinedBill` have tax? Yes `bill.tax`.
        // Does `SaleBill` have tax? Yes `bill.tax`.
        // Only `Rental` seems to be missing tax in the *old* file.
        // But `GenericCartPanel` *calculates* tax for rentals too: `const taxAmount = +(subtotal * TAX_RATE).toFixed(2);`.
        // So `GenericCartPanel` *does* charge tax on rentals.
        // Why `RentalOrderDetail` didn't show tax? Maybe `data` doesn't have it stored/calculated?
        // `RentalOrderDetail` uses `data.totalAmount`.
        // If I strictly follow "Same format as GenericCartPanel", I should probably align with GenericCartPanel which shows tax.
        // But if `data` (backend) doesn't have tax, I can't invent it without changing the total.
        // Use `data.tax || 0`. If it prints 0.00, it's consistent with "Standard Format" even if value is 0.
        // I will stick to passing parameters.
        totalAmount: data.totalAmount,
        rentalDeposit: data.deposit,
        discount: data.discount,
        paymentMode: data.paymentMode || "Cash", // Default
        paymentStatus: data.paymentStatus,
        date: data.createdAt,
      });

      toast.success("Downloaded");
    } catch (error) {
      console.error(error);
      toast.error("PDF download failed");
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
          {!isEditing && isPending && (
            <Button variant="outline" onClick={startEdit}>
              Edit Bill
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

          {!isEditing && isPending && (
            <Button
              variant="destructive"
              onClick={() => setReturnDialogOpen(true)}
              disabled={selectedItems.length === 0}
            >
              Return Selected ({selectedItems.length})
            </Button>
          )}

          {!isEditing && paymentStatus !== "Paid" && (
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
            <TableHead className="w-[50px]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                disabled={pendingItems.length === 0}
              />
            </TableHead>
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
                {item.status === "Pending" ? (
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selectedItems.includes(item._id)}
                    onChange={(e) =>
                      handleSelectItem(item._id, e.target.checked)
                    }
                  />
                ) : (
                  <div className="h-4 w-4" /> // Placeholder to keep alignment
                )}
              </TableCell>
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
              <TableCell className="text-right">
                {isEditing && item.status === "Pending" ? (
                  <input
                    type="number"
                    className="w-16 border rounded p-1 text-right"
                    value={editItems[item._id]?.quantity ?? item.quantity}
                    onChange={(e) =>
                      handleEditChange(item._id, "quantity", e.target.value)
                    }
                  />
                ) : (
                  item.quantity
                )}
              </TableCell>
              <TableCell className="text-right">
                {isEditing && item.status === "Pending" ? (
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

          {/* Discount Field */}
          {isEditing ? (
            <div className="flex justify-between text-sm items-center py-1">
              <span>Discount / Adj.</span>
              <input
                type="number"
                className="w-20 border rounded p-1 text-right"
                value={editDiscount}
                onChange={(e) => setEditDiscount(Number(e.target.value))}
              />
            </div>
          ) : (
            (data.discount || 0) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{INR.format(data.discount)}</span>
              </div>
            )
          )}

          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span>
            <span>
              {isEditing
                ? INR.format((subtotal || 0) + (deposit || 0) - editDiscount)
                : INR.format(totalAmount || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Return</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark {selectedItems.length} selected
              item(s) as Returned? This action updates inventory stock.
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
