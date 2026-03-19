import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useNavigate } from "react-router-dom";

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

// ---------- CONSTANTS ----------
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

const PAGE_SIZE_DEFAULT = 25;
const MIN_TYPING_DELAY_MS = 400;

// Map Combined Bill "status" to colors
const STATUS_META = {
  Active: { label: "Active", cls: "bg-yellow-200 text-yellow-800" },
  Closed: { label: "Closed", cls: "bg-gray-200 text-gray-800" },
  "Partially Returned": {
    label: "Partially Returned",
    cls: "bg-blue-100 text-blue-800",
  },
  Paid: { label: "Paid", cls: "bg-green-200 text-green-800" }, // For payment status if needed
};

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "Active", label: "Active" },
  { value: "Closed", label: "Closed" },
  { value: "Partially Returned", label: "Partially Returned" },
];

const keyOf = (q, page, limit, status) => `${q}::${page}::${limit}::${status}`;

// ---------- COMPONENT ----------
export default function CombinedOrderList() {
  const API = import.meta.env.VITE_API_BASE;
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_DEFAULT);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  const abortRef = useRef(null);
  const cacheRef = useRef(new Map());

  // ---------- DEBOUNCE ----------
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), MIN_TYPING_DELAY_MS);
    return () => clearTimeout(id);
  }, [q]);

  // ---------- FETCH ----------
  const readCache = (k) => cacheRef.current.get(k);
  const writeCache = (k, val) => cacheRef.current.set(k, val);

  const fetchOrders = async (
    {
      pageArg = page,
      limitArg = limit,
      qArg = debouncedQ,
      statusArg = status,
    } = {},
    useCache = true,
  ) => {
    const cacheKey = keyOf(qArg, pageArg, limitArg, statusArg);
    if (useCache && readCache(cacheKey)) {
      const c = readCache(cacheKey);
      setRows(c.rows);
      setTotal(c.total);
      setHasMore(c.hasMore);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setErr("");

    try {
      const url = new URL(`${API}/combined-bills`);
      url.searchParams.set("page", pageArg);
      url.searchParams.set("limit", limitArg);
      if (qArg) url.searchParams.set("search", qArg); // NOTE: Combined API uses 'search'
      if (statusArg) url.searchParams.set("status", statusArg);

      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      const list = data.data || [];
      const totalCount = data.total ?? list.length; // API returns 'total'

      setRows(list);
      setTotal(totalCount);
      setHasMore(pageArg * limitArg < totalCount);

      writeCache(cacheKey, {
        rows: list,
        total: totalCount,
        hasMore: pageArg * limitArg < totalCount,
      });
    } catch (e) {
      if (e.name !== "AbortError") setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders({
      pageArg: page,
      limitArg: limit,
      qArg: debouncedQ,
      statusArg: status,
    });
  }, [page, limit, debouncedQ, status]);

  // ---------- UI ACTIONS ----------
  const refresh = () => {
    cacheRef.current.clear();
    startTransition(() => fetchOrders({}, false));
  };

  // ---------- FORMAT ----------
  const formatted = useMemo(
    () =>
      rows.map((r) => ({
        id: r._id,
        billNo: r.billNo || "—",
        customer: r.customer?.name ?? (r.customer ? "" : "Walk-in"),
        phone: r.customer?.phone ?? "-",
        itemsCount: (r.saleItems?.length || 0) + (r.rentalItems?.length || 0),
        total: INR.format(r.totalAmount ?? 0),
        status: r.status ?? "-", // Use 'status' (Active/Closed)
        paymentStatus: r.paymentStatus || "Paid",
        date: r.createdAt ? DT.format(new Date(r.createdAt)) : "-",
      })),
    [rows],
  );

  const startIdx = (page - 1) * limit + 1;
  const endIdx = startIdx + rows.length - 1;

  // ---------- RENDER ----------
  return (
    <div className="w-full h-full overflow-auto bg-gray-50/50">
      <div className="p-2 pb-6">
        {/* Title + Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 bg-white p-3 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] ring-1 ring-gray-900/5 transition-all">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 hidden sm:block ml-2">
            Combined Orders
          </h1>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto ml-auto">
            <Input
              placeholder="Search Bill No / Customer"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full sm:w-60 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors rounded-xl h-10 px-4 text-sm font-medium"
            />
            <select
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium bg-gray-50/50 hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer h-10 min-w-[120px]"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium bg-gray-50/50 hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer h-10 min-w-[110px]"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <Button
              variant="default"
              className="rounded-xl h-10 px-6 bg-[#0f172a] hover:bg-[#1e293b] text-white shadow-md transition-all font-medium whitespace-nowrap"
              onClick={refresh}
              disabled={loading || isPending}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden ring-1 ring-gray-900/5 cursor-default">
          <div className="overflow-x-auto">
            <Table className="table-fixed">
              <TableHeader className="sticky top-0 bg-gray-100 z-10">
                <TableRow>
                  <TableHead className="w-[140px]">Bill No</TableHead>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead className="w-[180px]">Customer</TableHead>
                  <TableHead className="w-[120px]">Phone</TableHead>
                  <TableHead className="text-right w-[80px]">Items</TableHead>
                  <TableHead className="text-right w-[120px]">
                    Total Amount
                  </TableHead>
                  <TableHead className="w-[100px]">Payment</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array(8)
                        .fill(0)
                        .map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                {!loading && formatted.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-gray-500"
                    >
                      No combined orders found.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  formatted.map((r) => {
                    const meta = STATUS_META[r.status] || {
                      label: r.status,
                      cls: "bg-gray-100 text-gray-800",
                    };

                    const renderDate = (str) => {
                      if (!str || str === "-") return "-";
                      // Try to split logic if format matches "DD MMM YYYY, HH:mm"
                      // Default DT.format produces "DD MMM YYYY, HH:mm"
                      const parts = str.split(", ");
                      if (parts.length < 2) return str;
                      return (
                        <div className="flex flex-col text-xs">
                          <span className="font-medium">{parts[0]}</span>
                          <span className="text-gray-500">{parts[1]}</span>
                        </div>
                      );
                    };

                    return (
                      <TableRow
                        key={r.id}
                        onClick={() => navigate(`../combined-bill/${r.id}`)}
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        <TableCell className="font-medium">
                          {r.billNo}
                        </TableCell>
                        <TableCell>{renderDate(r.date)}</TableCell>
                        <TableCell className="font-medium">
                          {r.customer}
                        </TableCell>
                        <TableCell>{r.phone}</TableCell>
                        <TableCell className="text-right">
                          {r.itemsCount}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {r.total}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              r.paymentStatus === "Paid"
                                ? "bg-green-100 text-green-800 border-none"
                                : r.paymentStatus === "Pending"
                                  ? "bg-red-100 text-red-800 border-none"
                                  : "bg-yellow-100 text-yellow-800 border-none"
                            }
                            variant="outline"
                          >
                            {r.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={meta.cls}
                            variant="outline"
                            style={{ border: "none" }}
                          >
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{/* Actions placeholder */}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
            <span>
              {loading
                ? "Loading..."
                : rows.length
                  ? `Showing ${startIdx}-${endIdx} of ${total}`
                  : "—"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                First
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span className="text-gray-800">
                Page <strong>{page}</strong>
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {err}{" "}
            <Button
              size="sm"
              variant="outline"
              className="ml-2"
              onClick={refresh}
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
