// OrderList.jsx
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

  // ---------- STATE ----------
  const [rows, setRows] = useState([]); // current page rows
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_DEFAULT);
  const [total, setTotal] = useState(0);

  // Keep transitions smooth on paging
  const [isPending, startTransition] = useTransition();

  // Abort stale requests
  const abortRef = useRef(null);

  // Simple in-memory page cache
  const cacheRef = useRef(new Map()); // key -> { rows, total, timestamp }

  // ---------- DEBOUNCE SEARCH ----------
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), MIN_TYPING_DELAY_MS);
    return () => clearTimeout(id);
  }, [q]);

  // Always reset to first page when query changes
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, limit]);

  // ---------- FETCH ----------
  const readFromCache = (k) => cacheRef.current.get(k);
  const writeToCache = (k, value) =>
    cacheRef.current.set(k, { ...value, timestamp: Date.now() });

  const fetchBillingOrders = async (
    { pageArg = page, limitArg = limit, qArg = debouncedQ } = {},
    useCache = true
  ) => {
    const cacheKey = keyOf(qArg, pageArg, limitArg);

    // Serve fast from cache if available
    if (useCache) {
      const cached = readFromCache(cacheKey);
      if (cached) {
        setRows(cached.rows);
        setTotal(
          typeof cached.total === "number" ? cached.total : cached.rows.length
        );
        setErr("");
        setLoading(false);
        return;
      }
    }

    // cancel any previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setErr("");

    try {
      // Prefer server-side pagination if supported
      const url = new URL(`${API}/bills`);
      url.searchParams.set("page", String(pageArg));
      url.searchParams.set("limit", String(limitArg));
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
      const hasPagination =
        payload.pagination && typeof payload.pagination.total === "number";

      if (hasPagination) {
        setRows(list);
        setTotal(payload.pagination.total ?? list.length);
        writeToCache(cacheKey, {
          rows: list,
          total: payload.pagination.total ?? list.length,
        });
      } else {
        // Fallback: emulate pagination client-side
        const all = list;
        const start = (pageArg - 1) * limitArg;
        const slice = all.slice(start, start + limitArg);
        setRows(slice);
        setTotal(all.length);
        writeToCache(cacheKey, { rows: slice, total: all.length });
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      console.error("Error fetching billing orders:", e);
      setErr(e.message || "Failed to fetch billing orders");
    } finally {
      setLoading(false);
    }
  };

  // Initial + whenever deps change
  useEffect(() => {
    fetchBillingOrders(
      { pageArg: page, limitArg: limit, qArg: debouncedQ },
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedQ]);

  // ---------- PREFETCH NEIGHBOR PAGES ----------
  useEffect(() => {
    const prefetch = async () => {
      const neighbors = [page + 1, page - 1].filter((p) => p >= 1);
      for (const p of neighbors) {
        const cacheKey = keyOf(debouncedQ, p, limit);
        if (readFromCache(cacheKey)) continue;
        // fire-and-forget; don't clobber UI state
        try {
          const url = new URL(`${API}/bills`);
          url.searchParams.set("page", String(p));
          url.searchParams.set("limit", String(limit));
          if (debouncedQ) url.searchParams.set("q", debouncedQ);
          url.searchParams.set("sort", "-billingDate");

          const res = await fetch(url.toString(), {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });
          if (!res.ok) continue;
          const payload = await res.json();
          const list = Array.isArray(payload.data) ? payload.data : [];
          const hasPagination =
            payload.pagination && typeof payload.pagination.total === "number";

          if (hasPagination) {
            writeToCache(cacheKey, {
              rows: list,
              total: payload.pagination.total ?? list.length,
            });
          } else {
            // If fallback, we can't know slice reliably without all rows; skip caching
          }
        } catch {
          /* ignore prefetch errors */
        }
      }
    };
    prefetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedQ]);

  // ---------- DERIVED ----------
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  const formatted = useMemo(() => {
    return rows.map((b) => ({
      id: b._id,
      billNo: b.billNo ?? "",
      customer: b.customer?.name ?? "",
      phone: b.customer?.phone ?? "",
      itemsCount: b.items?.length ?? 0,
      subtotal: INR.format(Number(b.subtotal || 0)),
      tax: INR.format(Number(b.tax || 0)),
      totalAmount: INR.format(Number(b.totalAmount || 0)),
      paymentMode: b.paymentMode ?? "-",
      date: b.billingDate ? DT.format(new Date(b.billingDate)) : "-",
    }));
  }, [rows]);

  const canPrev = page > 1;
  const canNext = page < pageCount;

  const onRefresh = () => {
    // Bust cache for current key then refetch
    cacheRef.current.delete(keyOf(debouncedQ, page, limit));
    startTransition(() =>
      fetchBillingOrders(
        { pageArg: page, limitArg: limit, qArg: debouncedQ },
        false
      )
    );
  };

  // ---------- RENDER ----------
  return (
    <div className="m-3 p-4 bg-white rounded-lg shadow-md">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full">
          <h1 className="text-2xl font-bold mx-1">Billing Orders</h1>
          <Input
            placeholder="Search by Bill No / Customer / Phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-72 pr-10"
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
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Button variant="outline" className="invisible">
            Refresh
          </Button>
          <Button variant="outline" className="invisible">
            {" "}
            Refresh
          </Button>
          <Button variant="outline" className="invisible">
            Refresh
          </Button>{" "}
          <Button variant="outline" className="invisible">
            Refresh
          </Button>
          <Button variant="outline" className="invisible">
            Refresh
          </Button>
          <Button variant="outline" className="invisible">
            Refresh
          </Button>
          <Button variant="outline" className="invisible">
            Refresh
          </Button>
          <Button variant="outline" className="invisible">
            Refresh
          </Button>
          <Button variant="outline" className="invisible">
            Refresh
          </Button>
          <div className="relative mx-1">
            {/* tiny typing indicator */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {q !== debouncedQ ? "…" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {err && !loading && (
        <div className="py-3 px-4 mt-4 rounded border border-red-200 bg-red-50 text-red-700 flex items-center justify-between">
          <span>{err}</span>
          <Button size="sm" variant="outline" onClick={onRefresh}>
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="">Bill No</TableHead>
              <TableHead className="pe-5">Customer</TableHead>
              <TableHead className="pe-5">Phone</TableHead>
              <TableHead className="text-right pe-5">Items</TableHead>
              <TableHead className="text-right pe-5" >Subtotal</TableHead>
              <TableHead className="text-right pe-5">Tax</TableHead>
              <TableHead className="text-right pe-5">Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Skeleton header shadow — optional, but looks slick */}
            {loading &&
              Array.from({ length: Math.min(limit, 10) }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-8 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                </TableRow>
              ))}

            {!loading && formatted.length === 0 && !err && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-gray-500"
                >
                  No orders found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              formatted.map((b) => (
                <TableRow key={b.id} >
                  <TableCell className="font-mono pe-5">{b.billNo}</TableCell>
                  <TableCell className="pe-5">{b.customer}</TableCell>
                  <TableCell className="pe-5">{b.phone}</TableCell>
                  <TableCell className="text-right pe-5">{b.itemsCount}</TableCell>
                  <TableCell className="text-right pe-5">{b.subtotal}</TableCell>
                  <TableCell className="text-right pe-5">{b.tax}</TableCell>
                  <TableCell className="text-right font-semibold pe-5">
                    {b.totalAmount}
                  </TableCell>
                  <TableCell className="pe-5">
                    <Badge>{b.paymentMode}</Badge>
                  </TableCell>
                  <TableCell className="pe-5">{b.date}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {total > 0 ? (
            <>
              Showing{" "}
              <span className="font-medium">{(page - 1) * limit + 1}</span>–
              <span className="font-medium">
                {Math.min(page * limit, total)}
              </span>{" "}
              of <span className="font-medium">{total}</span>
            </>
          ) : loading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            "—"
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(1)}
            disabled={!canPrev}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
          >
            Prev
          </Button>
          <span className="text-sm tabular-nums">
            Page{" "}
            {loading ? (
              <Skeleton className="inline-block h-4 w-10 align-middle" />
            ) : (
              <strong>{page}</strong>
            )}{" "}
            /{" "}
            {loading ? (
              <Skeleton className="inline-block h-4 w-10 align-middle" />
            ) : (
              pageCount
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
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
    </div>
  );
}

// <div className="flex flex-wrap items-center gap-2 w-[100%]">
//           <h1 className="text-2xl font-bold mx-3">Billing Orders</h1>
//           {/* <p className="text-gray-600">List of all billing orders.</p> */}
//           <Input
//             placeholder="Search by Bill No / customer / phone…"
//             value={q}
//             onChange={(e) => setQ(e.target.value)}
//             className="w-72 mx-3"
//           />
//           <Button variant="outline" onClick={fetchBillingOrders}>
//             Refresh
//           </Button>
//           <Button variant="outline" className="invisible">
//             Refresh
//           </Button>
//           <Button variant="outline" className="invisible">
//             Refresh
//           </Button>
//           <Button variant="outline" className="invisible">
//             Refresh
//           </Button>
//           <Button variant="outline" className="invisible">
//             Refresh
//           </Button>
//           <Button variant="outline" className="invisible">
//             Refresh
//           </Button>
//           <Button variant="outline" className="invisible">
//             Refresh
//           </Button>
//           <Button variant="outline" className="invisible">
//             Refresh
//           </Button>
//           <Button variant="outline" className="invisible">
//             Refresh
//           </Button>
//           <Button variant="outline" className="invisible">
//             Refresh
//           </Button>
//           <Button variant="outline" className="invisible">
//             Refresh
//           </Button>
//           <Button variant="outline" className="invisible">
//             Refresh
//           </Button>

//           {/* <Button variant="outline" onClick={fetchBillingOrders}>Refresh</Button> */}
//         </div>
