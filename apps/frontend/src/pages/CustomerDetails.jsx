import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  ArrowLeft,
  MapPin,
  Pencil,
  IdCard,
  Smartphone,
  Hash,
  User2,
  Receipt,
  RefreshCw,
  Search,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Info, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ===================== COMPONENT ===================== */
export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE;

  const [customer, setCustomer] = useState(null);
  const [form, setForm] = useState(normalizeForm()); // ✅ safe default
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsError, setBillsError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  // --- data loaders
  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/customer/details/${id}`, {
        method: "GET",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load customer");
      const data = json.data || json;
      setCustomer(data);
      setForm(normalizeForm(data));
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // helper
  async function fetchJSON(url, opts) {
    const res = await fetch(url, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.message || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  }

  const fetchBills = async () => {
    try {
      setBillsLoading(true);
      setBillsError("");

      const urlQuery = `${API}/bills?customerId=${encodeURIComponent(id)}`;
      const urlParam = `${API}/bills/customer/${encodeURIComponent(id)}`;

      let json;
      try {
        json = await fetchJSON(urlQuery, {
          method: "GET",
          credentials: "include",
        });
      } catch (err) {
        if (err.status === 400 || err.status === 404) {
          json = await fetchJSON(urlParam, {
            method: "GET",
            credentials: "include",
          });
        } else {
          throw err;
        }
      }

      // --- robust client-side filter by this customer id ---
      const asString = (v) => (v == null ? "" : String(v));
      const billCustomerId = (c) => {
        // c can be: string ObjectId, {_id}, {id}, {$oid}, or fully populated doc
        if (typeof c === "string") return c;
        if (!c || typeof c !== "object") return "";
        return asString(c._id || c.id || c.$oid || c.value || c); // last c for weird drivers
      };

      const raw = json.data || json || [];
      const mineOnly = raw.filter(
        (b) => asString(billCustomerId(b.customer)) === asString(id)
      );

      const list = mineOnly.map((b) => ({
        id: b._id || b.id,
        billNo: b.billNo || b.number || b.invoiceNo || "-",
        date: b.createdAt || b.date || b.issuedAt || b.billingDate || null,
        total: Number(
          b.total ??
            b.grandTotal ??
            b.totalAmount ??
            b.amount ??
            (Array.isArray(b.items)
              ? b.items.reduce(
                  (sum, it) =>
                    sum +
                    Number(it.unitPrice ?? it.price ?? 0) *
                      Number(it.quantity ?? it.qty ?? 0),
                  0
                )
              : 0)
        ),
        items: Array.isArray(b.items) ? b.items : [],
        itemsCount: Array.isArray(b.items) ? b.items.length : b.itemsCount || 0,
        status: (b.status || "Paid").toString(),
      }));

      setBills(list);
    } catch (e) {
      setBillsError(e.message || "Something went wrong");
    } finally {
      setBillsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchCustomer();
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- handlers
  const handleBack = () => {
    if (window.history.length <= 1) navigate("/customers");
    else navigate(-1);
  };

  const onChange = (path, value) => {
    setForm((f) => {
      const next = structuredClone(f ?? {});
      setByPath(next, path, value);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!id) return;

    // const ok = window.confirm(
    //   "Are you sure you want to delete this customer? This action cannot be undone."
    // );

    // if (!ok) return;

    try {
      await fetch(`${API}/customer/details/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      toast.success("Customer deleted successfully");
      navigate("/layout/customers"); // go back to list
    } catch (err) {
      toast.error(err.message || "Failed to delete customer");
    }
  };

  const validate = (f) => {
    const e = {};

    if (!f.name?.trim()) {
      e.name = "Name is required";
    }

    if (!f.phone?.trim()) {
      e.phone = "Phone is required";
    } else if (!/^\d{10}$/.test(f.phone)) {
      e.phone = "Phone number must be exactly 10 digits";
    }

    if (f.alternatePhone && !/^\d{10}$/.test(f.alternatePhone)) {
      e.alternatePhone = "Alternate phone must be exactly 10 digits";
    }

    if (f.idProofType && !f.idProofNumber) {
      e.idProofNumber = "ID number required for selected ID proof";
    }

    return e;
  };

  const startEdit = () => {
    setForm(normalizeForm(customer));
    setErrors({});
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setForm(normalizeForm(customer));
    setErrors({});
    setIsEditing(false);
  };

  const save = async () => {
    if (!form) return;
    const ve = validate(form);
    setErrors(ve);
    if (Object.keys(ve).length) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API}/customer/details/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(denormalizeForm(form)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to save");
      setCustomer(json.data || { ...customer, ...denormalizeForm(form) });
      toast.success("Customer updated");
      setIsEditing(false);
    } catch (e) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // --- client filters
  const filteredBills = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...bills];
    if (status !== "all")
      list = list.filter((b) => b.status.toLowerCase() === status);
    if (q) {
      list = list.filter((b) => {
        const inBill =
          (b.billNo || "").toLowerCase().includes(q) ||
          (formatDate(b.date) || "").toLowerCase().includes(q);
        const inItems = b.items?.some((it) =>
          (it.name || it.item || it.title || "")
            .toString()
            .toLowerCase()
            .includes(q)
        );
        return inBill || inItems;
      });
    }
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [bills, query, status]);

  /* ===================== RENDER ===================== */
  if (loading) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={handleBack} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {/* Full-width skeleton card */}
        <Card className="border border-border rounded-2xl w-full">
          <CardContent className="p-6 space-y-6">
            {/* Header placeholder */}
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-muted rounded-full animate-pulse" />
              <div className="h-5 w-40 bg-muted rounded animate-pulse" />
            </div>

            {/* Grid of fake fields */}
            <div className="flex flex-wrap gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 flex-1 min-w-[240px] bg-muted rounded-xl animate-pulse"
                />
              ))}
            </div>

            <Separator />

            {/* Address placeholder */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 bg-muted rounded-full animate-pulse" />
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              </div>
              <div className="flex flex-wrap gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 flex-1 min-w-[200px] bg-muted rounded-xl animate-pulse"
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">{String(error)}</div>
            <Button onClick={fetchCustomer} className="mt-3">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Delete
          </Button>

          {!isEditing ? (
            <Button onClick={startEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={cancelEdit}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Save
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this customer?
            <br />
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDeleteOpen(false);
                handleDelete();
              }}
            >
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Details
          </TabsTrigger>

          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* ===================== DETAILS TAB ===================== */}
        <TabsContent value="details" className="space-y-6">
          <Card className="border border-border rounded-2xl">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <User2 className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-medium tracking-tight">
                    Customer Details
                  </h3>
                </div>
                {customer?.idProofType && (
                  <Badge variant="outline" className="text-xs">
                    {customer.idProofType}
                  </Badge>
                )}
              </div>

              {/* Horizontal fields */}
              <div className="mt-4 flex flex-wrap gap-4">
                <Detail
                  icon={<User2 className="h-4 w-4" />}
                  label="Name"
                  editing={isEditing}
                  value={form?.name ?? ""}
                  onChange={(v) => onChange("name", v)}
                  error={errors?.name}
                  className="min-w-[240px] flex-1"
                />
                <Detail
                  icon={<Smartphone className="h-4 w-4" />}
                  label="Phone"
                  editing={isEditing}
                  value={form?.phone ?? ""}
                  onChange={(v) => {
                    const val = v.replace(/\D/g, "");
                    if (val.length <= 10) onChange("phone", val);
                  }}
                  error={errors?.phone}
                  className="min-w-[240px] flex-1"
                />
                <Detail
                  icon={<Smartphone className="h-4 w-4" />}
                  label="Alt Phone"
                  editing={isEditing}
                  value={form?.alternatePhone ?? ""}
                  onChange={(v) => {
                    const val = v.replace(/\D/g, "");
                    if (val.length <= 10) onChange("alternatePhone", val);
                  }}
                  error={errors?.alternatePhone}
                  placeholder="Optional"
                  className="min-w-[240px] flex-1"
                />
                <Detail
                  icon={<IdCard className="h-4 w-4" />}
                  label="ID Proof Type"
                  editing={isEditing}
                  value={form?.idProofType ?? ""}
                  onChange={(v) => onChange("idProofType", v)}
                  type="select"
                  options={[
                    "",
                    "Aadhaar",
                    "PAN",
                    "Voter ID",
                    "Driving License",
                  ]}
                  className="min-w-[240px] flex-1"
                />
                <Detail
                  icon={<Hash className="h-4 w-4" />}
                  label="ID Number"
                  editing={isEditing}
                  value={form?.idProofNumber ?? ""}
                  onChange={(v) => onChange("idProofNumber", v)}
                  error={errors?.idProofNumber}
                  className="min-w-[240px] flex-1"
                />
                <Detail
                  icon={<Hash className="h-4 w-4" />}
                  label="ID Number"
                  editing={isEditing}
                  value={form?.idProofNumber ?? ""}
                  onChange={(v) => onChange("idProofNumber", v)}
                  error={errors?.idProofNumber}
                  className="min-w-[240px] flex-1 invisible"
                />
              </div>

              <Separator className="my-6" />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-medium">Address</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Detail
                    label="Street"
                    editing={isEditing}
                    value={form?.address?.street ?? ""}
                    onChange={(v) => onChange("address.street", v)}
                    className="min-w-[260px] flex-1"
                  />
                  <Detail
                    label="Area"
                    editing={isEditing}
                    value={form?.address?.area ?? ""}
                    onChange={(v) => onChange("address.area", v)}
                    className="min-w-[200px] flex-1"
                  />
                  {/* <Detail
                    label="City"
                    editing={isEditing}
                    value={form?.address?.city ?? ""}
                    onChange={(v) => onChange("address.city", v)}
                    className="min-w-[200px] flex-1"
                  />
                  <Detail
                    label="Pincode"
                    editing={isEditing}
                    value={form?.address?.pincode ?? ""}
                    onChange={(v) => onChange("address.pincode", v)}
                    error={errors?.["address.pincode"]}
                    className="min-w-[160px] flex-1"
                  /> */}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== HISTORY TAB ===================== */}
        <TabsContent value="history" className="space-y-4">
          <Card className="w-full border border-border rounded-2xl min-h-[520px]">
            {" "}
            {/* <- w-full + min-h */}
            <CardContent className="p-6 space-y-4 h-full w-full">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-medium tracking-tight">Bills</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search bills or items"
                      className="pl-8 pr-3 py-2 rounded-md border bg-background border-input text-sm w-[240px] focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-foreground/10"
                    />
                  </div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="px-3 py-2 rounded-md border bg-background border-input text-sm w-[260px] focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-foreground/10"
                  >
                    <option value="all">All</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <Button variant="outline" onClick={fetchBills}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  {/* 
                  duplicate invisible buttons for layout allignments */}
                  <Button variant="outline" className="invisible">
                    Show
                  </Button>
                  <Button variant="outline" className="invisible">
                    Show
                  </Button>
                  <Button variant="outline" className="invisible">
                    Show
                  </Button>
                  <Button variant="outline" className="invisible">
                    Show
                  </Button>
                  <Button variant="outline" className="invisible">
                    Show
                  </Button>
                  <Button variant="outline" className="invisible">
                    Show
                  </Button>
                  <Button variant="outline" className="invisible">
                    Show
                  </Button>
                  <Button variant="outline" className="invisible">
                    Show
                  </Button>
                  <Button variant="outline" className="invisible">
                    Show
                  </Button>
                  <Button variant="outline" className="invisible">
                    Show
                  </Button>
                </div>
              </div>

              {billsLoading ? (
                <MonoSkeletonRows rows={6} />
              ) : billsError ? (
                <div className="text-red-600">{billsError}</div>
              ) : filteredBills.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No bills found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBills.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">
                            {b.billNo}
                          </TableCell>
                          <TableCell>{formatDate(b.date)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(b.total)}
                          </TableCell>
                          <TableCell>{b.itemsCount}</TableCell>
                          <TableCell>
                            <StatusBadge value={b.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ===================== UI BITS ===================== */
function StatusBadge({ value }) {
  const v = (value || "").toLowerCase();
  if (v === "paid")
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Paid</Badge>;
  if (v === "unpaid")
    return <Badge className="bg-red-600 hover:bg-red-600">Unpaid</Badge>;
  if (v === "pending")
    return <Badge className="bg-amber-600 hover:bg-amber-600">Pending</Badge>;
  if (v === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  return <Badge variant="secondary">{value}</Badge>;
}

function MonoSkeleton() {
  return (
    <Card className="border border-border rounded-2xl">
      <CardContent className="p-6 space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-36 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MonoSkeletonRows({ rows = 6 }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-muted rounded" />
      ))}
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
  onChange,
  editing,
  error,
  placeholder,
  type = "text",
  options = [],
  className = "",
}) {
  return (
    <div
      className={`rounded-xl border border-border p-4 bg-background min-w-0 ${className}`}
    >
      {label && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
      )}
      <div className="mt-1">
        {editing ? (
          type === "select" ? (
            <select
              className={`w-full px-3 py-2 rounded-md border bg-background ${error ? "border-red-500" : "border-input"}`}
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
            >
              {options.map((opt) => (
                <option key={opt || "empty"} value={opt}>
                  {opt || "Select"}
                </option>
              ))}
            </select>
          ) : (
            <Field
              value={value ?? ""}
              onChange={(v) => onChange(v)}
              placeholder={placeholder}
              error={error}
            />
          )
        ) : (
          <div className="font-medium truncate">{value || "—"}</div>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function Field({ value, onChange, placeholder, error }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className={[
        "w-full px-3 py-2 rounded-md outline-none",
        "bg-background text-foreground",
        "border",
        error ? "border-red-500" : "border-input",
        "focus:ring-2 focus:ring-offset-0 focus:ring-foreground/10",
      ].join(" ")}
    />
  );
}

/* ===================== UTILS ===================== */
function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function normalizeForm(data = {}) {
  return {
    name: data?.name || "",
    phone: data?.phone || "",
    alternatePhone: data?.alternatePhone || "",
    idProofType: data?.idProofType || "",
    idProofNumber: data?.idProofNumber || "",
    address: {
      street: data?.address?.street || "",
      area: data?.address?.area || "",
      city: data?.address?.city || "",
      pincode: data?.address?.pincode || "",
    },
  };
}

function denormalizeForm(f) {
  return {
    name: f.name?.trim(),
    phone: f.phone?.trim(),
    alternatePhone: f.alternatePhone?.trim() || undefined,
    idProofType: f.idProofType || undefined,
    idProofNumber: f.idProofNumber?.trim() || undefined,
    address: {
      street: f.address?.street?.trim() || "",
      area: f.address?.area?.trim() || "",
      city: f.address?.city?.trim() || "",
      pincode: f.address?.pincode?.trim() || "",
    },
  };
}

function formatCurrency(n) {
  if (Number.isNaN(Number(n))) return "₹0.00";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(n));
  } catch {
    return `₹${Number(n).toFixed(2)}`;
  }
}

function formatDate(d) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}
