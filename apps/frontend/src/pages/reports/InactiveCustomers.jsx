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

  const [base, setBase] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [days, setDays] = useState(30);
  const [asOf, setAsOf] = useState(toYMD(new Date()));

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const abortRef = useRef(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), MIN_DELAY);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => setPage(1), [debouncedQ, days, asOf, limit]);

  // Fetch & build list
  const fetchFromBills = async () => {
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
        url.searchParams.set("sort", "-billingDate");

        const res = await fetch(url.toString(), {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Fetch failed page ${pageNo}`);

        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : [];
        allBills = allBills.concat(list);

        if (list.length < FETCH_LIMIT) break;
        pageNo++;
      }

      const map = new Map();
      for (const b of allBills) {
        const cid = b.customer?._id;
        if (!cid) continue;

        const d = new Date(b.billingDate);
        const prev = map.get(cid);
        if (!prev || d > prev.date) {
          map.set(cid, {
            id: cid,
            name: b.customer?.name ?? "Unknown",
            phone: b.customer?.phone ?? "-",
            lastActivity: d,
          });
        }
      }

      setBase(Array.from(map.values()));
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err);
        setErr("Failed to load inactive customers");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFromBills();
  }, []);

  const refDate = useMemo(() => new Date(asOf + "T23:59:59"), [asOf]);
  const cutoff = useMemo(() => refDate.getTime() - days * DAY_MS, [refDate, days]);

  const inactive = useMemo(() => {
    const t = debouncedQ.toLowerCase();
    const searchFiltered = t
      ? base.filter(
          (c) =>
            c.name.toLowerCase().includes(t) ||
            String(c.phone).toLowerCase().includes(t)
        )
      : base;

    const final = [];
    for (const c of searchFiltered) {
      const ts = c.lastActivity?.getTime?.() || new Date(c.lastActivity).getTime();
      if (ts <= cutoff) {
        final.push({
          ...c,
          daysInactive:
            Math.floor((refDate.getTime() - ts) / DAY_MS) || 0,
        });
      }
    }

    final.sort((a, b) => b.daysInactive - a.daysInactive);
    return final;
  }, [base, debouncedQ, days, cutoff, refDate]);

  const total = inactive.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const end = Math.min(start + limit, total);
  const paged = inactive.slice(start, end);

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 w-full overflow-auto">

      {/* TITLE */}
      <h1 className="text-2xl font-bold flex items-center justify-between w-full">
        Inactive Customers
        <span className="text-sm text-gray-500">
          {inactive.length} record{inactive.length !== 1 && "s"}
        </span>
      </h1>

      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-md border shadow-sm">

        <Input
          placeholder="Search by Name or Phone..."
          className="min-w-[240px] max-w-[360px]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <input
          type="date"
          max={toYMD(new Date())}
          className="border rounded p-2 text-sm"
          value={asOf}
          onChange={(e) => setAsOf(e.target.value)}
        />

        <select
          className="border rounded p-2 text-sm"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {[15, 30, 45, 60, 90, 180, 365].map((d) => (
            <option key={d} value={d}>
              Inactive ≥ {d} days
            </option>
          ))}
        </select>

        <select
          className="border rounded p-2 text-sm"
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

        <Button variant="outline" onClick={fetchFromBills}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* ERROR */}
      {err && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded">
          {err}
        </div>
      )}

      {/* TABLE */}
      <div className="w-full bg-white rounded-md shadow-sm border">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed        ">
            <TableHeader>
              <TableRow className="bg-black">
                <TableHead className="text-white">Name</TableHead>
                <TableHead className="text-white">Phone</TableHead>
                <TableHead className="text-white">Last Activity</TableHead>
                <TableHead className="text-white text-right">
                  Days Inactive
                </TableHead>
                <TableHead className="text-white text-right">Notify</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading &&
                Array.from({ length: limit }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!loading && paged.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-gray-500"
                  >
                    No inactive customers found
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                paged.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>
                      {c.lastActivity ? (
                        DATE_FMT.format(c.lastActivity)
                      ) : (
                        <Badge variant="secondary">Never</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {c.daysInactive}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => alert(`Notify ${c.name}`)}
                      >
                        Notify
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center py-4">
        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage(1)}
        >
          First
        </Button>
        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </Button>

        <span>
          Page <strong>{page}</strong> of {pages}
        </span>

        <Button
          variant="outline"
          disabled={page === pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
        <Button
          variant="outline"
          disabled={page === pages}
          onClick={() => setPage(pages)}
        >
          Last
        </Button>
      </div>
    </div>
  );
}
