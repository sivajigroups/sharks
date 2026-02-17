import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

// ---------- ONE-TIME FORMATTERS ----------
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

// ---------- CONFIG ----------
const PAGE_SIZE_DEFAULT = 25;
const MIN_TYPING_DELAY_MS = 400;

// Cache key helper
const keyOf = (q, page, limit) => `${q}::${page}::${limit}`;

export default function OrderList() {
  const API = import.meta.env.VITE_API_BASE;
  const navigate = useNavigate();

  // ---------- STATE ----------
  const [rows, setRows] = useState([]); // current page rows
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_DEFAULT);
  const [total, setTotal] = useState(0);

  const [hasPagination, setHasPagination] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Abort stale requests
  const abortRef = useRef(null);
  const cacheRef = useRef(new Map());

  // ---------- DEBOUNCE SEARCH ----------
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), MIN_TYPING_DELAY_MS);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, limit]);

  // ---------- FETCH ----------
  const readFromCache = (k) => cacheRef.current.get(k);
  const writeToCache = (k, value) =>
    cacheRef.current.set(k, { ...value, timestamp: Date.now() });

  const fetchBillingOrders = async (
    { pageArg = page, limitArg = limit, qArg = debouncedQ } = {},
    useCache = true,
  ) => {
    const cacheKey = keyOf(qArg, pageArg, limitArg);

    if (useCache) {
      const cached = readFromCache(cacheKey);
      if (cached) {
        setRows(cached.rows);
        setTotal(
          typeof cached.total === "number" ? cached.total : cached.rows.length,
        );
        setHasPagination(!!cached.hasPagination);
        setHasMore(
          cached.hasPagination
            ? pageArg * limitArg < (cached.total ?? cached.rows.length)
            : cached.rows.length === limitArg,
        );
        setErr("");
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
      const url = new URL(`${API}/bills`);
      url.searchParams.set("page", String(pageArg));
      url.searchParams.set("limit", String(limitArg));
      url.searchParams.set("offset", String((pageArg - 1) * limitArg));
      url.searchParams.set("per_page", String(limitArg));
      if (qArg) url.searchParams.set("q", qArg);
      url.searchParams.set("sort", "-billingDate");

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
      });

      if (!res.ok)
        throw new Error(`Failed to fetch billing orders (${res.status})`);

      const payload = await res.json();
      const list = Array.isArray(payload.data) ? payload.data : [];
      const serverHasTotal =
        payload.pagination && typeof payload.pagination.total === "number";

      if (serverHasTotal) {
        const serverTotal = payload.pagination.total ?? list.length;
        setRows(list);
        setTotal(serverTotal);
        setHasPagination(true);
        setHasMore(pageArg * limitArg < serverTotal);
        writeToCache(cacheKey, {
          rows: list,
          total: serverTotal,
          hasPagination: true,
        });
      } else {
        setRows(list);
        setTotal(list.length);
        setHasPagination(false);
        setHasMore(list.length === limitArg);
        writeToCache(cacheKey, {
          rows: list,
          total: list.length,
          hasPagination: false,
        });
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      console.error("Error fetching billing orders:", e);
      setErr(e.message || "Failed to fetch billing orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingOrders(
      { pageArg: page, limitArg: limit, qArg: debouncedQ },
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedQ]);

  // ---------- UI ACTIONS ----------
  const onRefresh = () => {
    cacheRef.current.delete(keyOf(debouncedQ, page, limit));
    startTransition(() =>
      fetchBillingOrders(
        { pageArg: page, limitArg: limit, qArg: debouncedQ },
        false,
      ),
    );
  };

  // ---------- DERIVED ----------
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  const formatted = useMemo(() => {
    return rows.map((b) => ({
      id: b._id,
      billNo: b.billNo ?? "",
      customer: b.customer?.name ?? (b.customer ? "" : "Walk-in"),
      phone: b.customer?.phone ?? "-",
      itemsCount: b.items?.length ?? 0,
      subtotal: INR.format(Number(b.subtotal || 0)),
      tax: INR.format(Number(b.tax || 0)),
      totalAmount: INR.format(Number(b.totalAmount || 0)),
      paymentStatus: b.paymentStatus || "Paid",
      paymentMode: b.paymentMode ?? "-",
      date: b.billingDate ? DT.format(new Date(b.billingDate)) : "-",
    }));
  }, [rows]);

  const canPrev = page > 1;
  const canNext = hasPagination ? page < pageCount : hasMore;

  const startIdx = (page - 1) * limit + 1;
  const endIdx = startIdx + rows.length - 1;

  // ---------- RENDER ----------
  return (
    <div className="w-full h-full overflow-auto bg-gray-50">
      <div className="p-6">
        {/* Title + Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Sales Orders
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search Bill No / Customer / Phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-64"
            />
            <select
              className="border rounded-md px-2 py-1 text-sm"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading || isPending}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border">
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
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      {Array(8)
                        .fill(0)
                        .map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}

                {!loading && formatted.length === 0 && !err && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-gray-500"
                    >
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  formatted.map((b) => {
                    const renderDate = (str) => {
                      if (!str || str === "-") return "-";
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
                        key={b.id}
                        onClick={() => navigate(`../billing/${b.id}`)}
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        <TableCell className="font-medium">
                          {b.billNo}
                        </TableCell>
                        <TableCell>{renderDate(b.date)}</TableCell>
                        <TableCell className="font-medium">
                          {b.customer}
                        </TableCell>
                        <TableCell>{b.phone}</TableCell>
                        <TableCell className="text-right">
                          {b.itemsCount}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {b.totalAmount}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              b.paymentStatus === "Paid"
                                ? "bg-green-100 text-green-800 border-none"
                                : b.paymentStatus === "Pending"
                                  ? "bg-red-100 text-red-800 border-none"
                                  : "bg-yellow-100 text-yellow-800 border-none"
                            }
                            variant="outline"
                          >
                            {b.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{/* Actions placeholder */}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
            <span>
              {loading ? (
                <Skeleton className="h-4 w-40" />
              ) : hasPagination ? (
                <>
                  Showing{" "}
                  <span className="font-medium">{(page - 1) * limit + 1}</span>–
                  <span className="font-medium">
                    {Math.min(page * limit, total)}
                  </span>{" "}
                  of <span className="font-medium">{total}</span>
                </>
              ) : rows.length ? (
                <>
                  Showing <span className="font-medium">{startIdx}</span>–
                  <span className="font-medium">{endIdx}</span> (total unknown)
                </>
              ) : (
                "—"
              )}
            </span>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(1)}
                disabled={!canPrev}
              >
                First
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev}
              >
                Prev
              </Button>
              <span className="text-gray-800">
                Page <strong>{page}</strong>
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Error state */}
        {err && !loading && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded flex items-center justify-between">
            <span>{err}</span>
            <Button size="sm" variant="outline" onClick={onRefresh}>
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
