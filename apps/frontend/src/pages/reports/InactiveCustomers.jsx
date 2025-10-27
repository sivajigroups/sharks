// src/pages/reports/InactiveCustomers.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// helpers
const toYMD = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const MIN_DELAY = 400;
const FETCH_LIMIT = 500;
const MAX_PAGES_GUARD = 200;
const DAY_MS = 86400000;

export default function InactiveCustomers() {
  const API = import.meta.env.VITE_API_BASE;

  // raw built list from bills (latest activity per customer)
  const [base, setBase] = useState([]); // [{ id, name, phone, lastActivity: Date }]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters / ui
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [days, setDays] = useState(30); // keep configurable; default 30
  const [asOf, setAsOf] = useState(toYMD(new Date())); // YYYY-MM-DD

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const abortRef = useRef(null);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), MIN_DELAY);
    return () => clearTimeout(t);
  }, [q]);

  // reset page when filters change
  useEffect(() => setPage(1), [debouncedQ, days, asOf, limit]);

  // fetch all bills and build latest activity per customer
  const buildBaseFromBills = async () => {
    setLoading(true);
    setErr("");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let allBills = [];
      let pageNo = 1;

      while (pageNo <= MAX_PAGES_GUARD) {
        const url = new URL(`${API}/bills`);
        url.searchParams.set("page", String(pageNo));
        url.searchParams.set("limit", String(FETCH_LIMIT));
        url.searchParams.set("offset", String((pageNo - 1) * FETCH_LIMIT));
        url.searchParams.set("per_page", String(FETCH_LIMIT));
        url.searchParams.set("sort", "-billingDate");

        const res = await fetch(url.toString(), {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Failed to fetch bills (p${pageNo} ${res.status})`);

        const payload = await res.json();
        const list = Array.isArray(payload.data) ? payload.data : [];
        allBills = allBills.concat(list);

        if (list.length < FETCH_LIMIT) break;
        pageNo += 1;
      }

      // build latest activity per customer (from bills only)
      const lastMap = new Map();
      for (const b of allBills) {
        const cid = b?.customer?._id || b?.customerId;
        if (!cid || !b.billingDate) continue;
        const d = new Date(b.billingDate);
        const prev = lastMap.get(cid);
        if (!prev || d > prev.date) {
          lastMap.set(cid, {
            id: cid,
            name: b.customer?.name ?? "Unknown",
            phone: b.customer?.phone ?? "-",
            lastActivity: d,
          });
        }
      }

      setBase(Array.from(lastMap.values()));
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error(e);
        setErr(e.message || "Failed to build inactive list");
      }
    } finally {
      setLoading(false);
    }
  };

  // initial fetch (data doesn’t depend on asOf/days)
  useEffect(() => {
    buildBaseFromBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derive filtered list using asOf + days
  const refDate = useMemo(() => {
    // use end-of-day of selected date so “as of” behaves intuitively
    const d = new Date(asOf + "T23:59:59");
    if (Number.isNaN(d.getTime())) return new Date(); // fallback
    return d;
  }, [asOf]);

  const cutoffTs = useMemo(() => refDate.getTime() - days * DAY_MS, [refDate, days]);

  const inactiveAsOf = useMemo(() => {
    // filter by name/phone first (search)
    const term = debouncedQ.toLowerCase();
    const pre = term
      ? base.filter(
          (c) =>
            (c.name && c.name.toLowerCase().includes(term)) ||
            (c.phone && String(c.phone).toLowerCase().includes(term))
        )
      : base;

    // then apply inactivity filter relative to refDate
    const out = [];
    for (const c of pre) {
      const lastTs = c.lastActivity?.getTime?.() ?? new Date(c.lastActivity).getTime();
      if (!Number.isFinite(lastTs)) continue;
      if (lastTs <= cutoffTs) {
        out.push({
          ...c,
          // show days inactive as of the chosen date
          daysInactiveAsOf: Math.max(
            0,
            Math.floor((refDate.getTime() - lastTs) / DAY_MS)
          ),
        });
      }
    }

    // sort: longest inactive first
    out.sort((a, b) => b.daysInactiveAsOf - a.daysInactiveAsOf);
    return out;
  }, [base, debouncedQ, cutoffTs, refDate]);

  // paginate
  const total = inactiveAsOf.length;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < pageCount;
  const start = (page - 1) * limit;
  const end = Math.min(start + limit, total);
  const paged = inactiveAsOf.slice(start, end);

  // CSV export (as-of aware)
  const exportCSV = () => {
    const header = ["Name", "Phone", `Last Activity`, `Days Inactive (as of ${asOf})`];
    const rows = inactiveAsOf.map((c) =>
      [
        `"${String(c.name ?? "").replace(/"/g, '""')}"`,
        `"${String(c.phone ?? "")}"`,
        c.lastActivity ? DATE_FMT.format(c.lastActivity) : "Never",
        c.daysInactiveAsOf ?? "",
      ].join(",")
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `inactive_customers_asof_${asOf}_${days}d_${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-3 my-3 bg-white rounded-lg shadow-md p-4 w-full">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
        {/* Left: title + search */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <h1 className="text-2xl font-bold whitespace-nowrap">Inactive Customers</h1>
          <div className="flex-1 min-w-[220px] sm:min-w-[300px] max-w-[480px]">
            <Input
              placeholder="Search by Name / Phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Right: filters + actions */}
        <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
          {/* As of date */}
          <input
            type="date"
            className="border rounded-md px-2 py-1 text-sm"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            max={toYMD(new Date())}
            title="As of date"
          />

          {/* Days threshold (defaults to 30, can keep editable) */}
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            title="Inactive threshold"
          >
            {[15,30, 45, 60, 90, 180, 365].map((d) => (
              <option key={d} value={d}>
                Inactive ≥ {d} days
              </option>
            ))}
          </select>

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

          <Button variant="outline" onClick={buildBaseFromBills}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
{/* 
          <Button onClick={exportCSV} disabled={!inactiveAsOf.length || loading}>
            Export CSV
          </Button> */}
        </div>
      </div>

      {/* Error */}
      {err && !loading && (
        <div className="py-3 px-4 mt-4 rounded border border-red-200 bg-red-50 text-red-700 flex items-center justify-between">
          <span>{err}</span>
          <Button size="sm" variant="outline" onClick={buildBaseFromBills}>
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pe-5">Name</TableHead>
              <TableHead className="pe-5">Phone</TableHead>
              <TableHead className="pe-5">Last Activity</TableHead>
              <TableHead className="text-right pe-5">
                Days Inactive <span className="text-gray-400">(as of {asOf})</span>
              </TableHead>
              <TableHead className="pe-5">Notify</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: Math.min(limit, 10) }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell className="pe-5">
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell className="pe-5">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="pe-5">
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell className="text-right pe-5">
                    <Skeleton className="h-4 w-12 ml-auto" />
                  </TableCell>
                  <TableCell className="pe-5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!loading && !paged.length && !err && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                  No customers inactive ≥ {days} days as of {asOf}.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              paged.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pe-5">{c.name}</TableCell>
                  <TableCell className="pe-5">{c.phone}</TableCell>
                  <TableCell className="pe-5">
                    {c.lastActivity ? (
                      DATE_FMT.format(c.lastActivity)
                    ) : (
                      <Badge variant="secondary">Never</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums pe-5">
                    {c.daysInactiveAsOf}
                  </TableCell>
                  <TableCell className="pe-5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => alert(`Notify ${c.name} (${c.phone})`)}
                    >
                      Notify
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {total ? (
            <>
              Showing <span className="font-medium">{start + 1}</span>–
              <span className="font-medium">{end}</span> of{" "}
              <span className="font-medium">{total}</span>
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
            disabled={page <= 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>
          <span className="text-sm tabular-nums">
            Page <strong>{page}</strong> / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(pageCount)}
            disabled={page >= pageCount}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
}
