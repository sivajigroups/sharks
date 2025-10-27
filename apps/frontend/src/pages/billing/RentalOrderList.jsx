import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ---------- FORMATTERS ----------
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const DT = new Intl.DateTimeFormat("en-IN", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// ---------- CONFIG ----------
const PAGE_SIZE_DEFAULT = 25;
const MIN_TYPING_DELAY_MS = 400;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "Pending", label: "Pending" },
  { value: "Returned", label: "Returned" },
  { value: "Paid", label: "Paid" },
];

const STATUS_META = {
  Pending: { cls: "bg-yellow-100 text-yellow-800", label: "Pending" },
  Returned: { cls: "bg-blue-100 text-blue-800", label: "Returned" },
  Paid: { cls: "bg-green-100 text-green-800", label: "Paid" },
};

const metaOf = (status) =>
  STATUS_META[status] ?? { cls: "bg-gray-100 text-gray-800", label: status || "-" };
const keyOf = (q, page, limit, status) => `${q}::${page}::${limit}::${status}`;

export default function RentalOrderList() {
  const API = import.meta.env.VITE_API_BASE;

  // ---------- STATE ----------
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_DEFAULT);
  const [total, setTotal] = useState(0);
  const [hasPagination, setHasPagination] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  const abortRef = useRef(null);
  const cacheRef = useRef(new Map());

  // ---------- DIALOG STATE ----------
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editAmount, setEditAmount] = useState("");

  // ---------- DEBOUNCE ----------
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), MIN_TYPING_DELAY_MS);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => setPage(1), [debouncedQ, limit, statusFilter]);

  // ---------- FETCH ----------
  const readFromCache = (k) => cacheRef.current.get(k);
  const writeToCache = (k, value) => cacheRef.current.set(k, { ...value, timestamp: Date.now() });

  const fetchRentals = async (
    { pageArg = page, limitArg = limit, qArg = debouncedQ, statusArg = statusFilter } = {},
    useCache = true
  ) => {
    const cacheKey = keyOf(qArg, pageArg, limitArg, statusArg);
    if (useCache) {
      const cached = readFromCache(cacheKey);
      if (cached) {
        setRows(cached.rows);
        setTotal(cached.total);
        setHasPagination(!!cached.hasPagination);
        setHasMore(cached.hasMore);
        setLoading(false);
        return;
      }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setErr("");

    try {
      const url = new URL(`${API}/transaction`);
      url.searchParams.set("page", pageArg);
      url.searchParams.set("limit", limitArg);
      if (qArg) url.searchParams.set("q", qArg);
      if (statusArg) url.searchParams.set("status", statusArg);

      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Failed to fetch rentals (${res.status})`);
      const payload = await res.json();
      const list = payload.data || [];
      const totalCount = payload.pagination?.total || list.length;

      setRows(list);
      setTotal(totalCount);
      setHasPagination(!!payload.pagination);
      setHasMore(pageArg * limitArg < totalCount);

      writeToCache(cacheKey, {
        rows: list,
        total: totalCount,
        hasPagination: !!payload.pagination,
        hasMore: pageArg * limitArg < totalCount,
      });
    } catch (e) {
      if (e.name === "AbortError") return;
      console.error(e);
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals({ pageArg: page, limitArg: limit, qArg: debouncedQ, statusArg: statusFilter }, true);
  }, [page, limit, debouncedQ, statusFilter]);

  const onRefresh = () => {
    cacheRef.current.clear();
    startTransition(() =>
      fetchRentals({ pageArg: page, limitArg: limit, qArg: debouncedQ, statusArg: statusFilter }, false)
    );
  };

  // ---------- ACTIONS ----------
  const handleMarkReturned = async (id) => {
    if (!confirm("Mark this rental as returned?")) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/transaction/${id}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark returned");
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id) => {
    if (!confirm("Mark this rental as fully paid?")) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/transaction/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentDate: new Date() }),
      });
      if (!res.ok) throw new Error("Failed to mark paid");
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (id, amount) => {
    setEditId(id);
    setEditAmount(String(amount).replace(/[₹,]/g, ""));
    setEditOpen(true);
  };

  const handleManualAmountUpdate = async () => {
    if (isNaN(editAmount) || Number(editAmount) < 0) {
      alert("Please enter a valid numeric amount");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API}/transaction/${editId}/amount`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: Number(editAmount) }),
      });
      if (!res.ok) throw new Error("Failed to update amount");
      setEditOpen(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------- FORMAT ----------
  const formatted = useMemo(() => {
    return rows.map((r) => ({
      id: r._id,
      customer: r.customer?.name ?? "-",
      phone: r.customer?.phone ?? "-",
      status: r.status ?? "-",
      inventory: r.inventory?.name ?? "-",
      qty: r.quantity ?? 0,
      days: r.days ?? 0,
      totalAmount: INR.format(r.amount ?? 0),
      fromDate: r.rentDate ? DT.format(new Date(r.rentDate)) : "-",
      toDate: r.returnDate ? DT.format(new Date(r.returnDate)) : "-",
    }));
  }, [rows]);

  // ---------- PAGINATION ----------
  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const canPrev = page > 1;
  const canNext = hasPagination ? page < pageCount : hasMore;
  const startIdx = (page - 1) * limit + 1;
  const endIdx = startIdx + rows.length - 1;

  // ---------- RENDER ----------
  return (
    <div className="m-3 p-4 bg-white rounded-lg shadow-md">
      {/* ── Filters ─────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold">Rental Orders</h1>
        <Input
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
        <select
          className="border rounded-md px-2 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || "ALL"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="border rounded-md px-2 py-1 text-sm"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}/page
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={onRefresh} disabled={loading || isPending}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* ── Table ─────────────────────────── */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Days</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array(10)
                    .fill(0)
                    .map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                </TableRow>
              ))}

            {!loading &&
              formatted.map((r) => {
                const { cls, label } = metaOf(r.status);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.customer}</TableCell>
                    <TableCell>{r.phone}</TableCell>
                    <TableCell>{r.inventory}</TableCell>
                    <TableCell className="text-right">{r.qty}</TableCell>
                    <TableCell className="text-right">{r.days}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {r.totalAmount}
                    </TableCell>
                    <TableCell>
                      <Badge className={cls}>{label}</Badge>
                    </TableCell>
                    <TableCell>{r.fromDate}</TableCell>
                    <TableCell>{r.toDate}</TableCell>
                    <TableCell className="space-x-2">
                      {r.status === "Pending" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleMarkReturned(r.id)}
                        >
                          Mark Returned
                        </Button>
                      )}
                      {r.status === "Returned" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleMarkPaid(r.id)}
                          >
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(r.id, r.totalAmount)}
                          >
                            Edit Amount
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ─────────────────────────── */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {loading
            ? "Loading…"
            : rows.length
            ? `Showing ${startIdx}-${endIdx} of ${total}`
            : "—"}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={!canPrev}>
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={!canPrev}
          >
            Prev
          </Button>
          <span className="text-sm">
            Page <strong>{page}</strong> / {hasPagination ? pageCount : "?"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!canNext}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(pageCount)}
            disabled={!canNext}
          >
            Last
          </Button>
        </div>
      </div>

      {/* ── Edit Amount Dialog ─────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Total Amount</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="amount">New Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="Enter new amount"
            />
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleManualAmountUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
