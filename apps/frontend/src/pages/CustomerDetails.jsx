import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft, MapPin, Pencil, IdCard, Smartphone, CircleAlert, Check, X, Hash, User2, Receipt, RefreshCw, Search,
} from "lucide-react";
import { toast } from "sonner";

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE;

  const [customer, setCustomer] = useState(null);
  const [form, setForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsError, setBillsError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  // --- data loaders (unchanged)
  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/customer/details/${id}`, { method: "GET", credentials: "include" });
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

  const fetchBills = async () => {
    try {
      setBillsLoading(true);
      setBillsError("");
      const res = await fetch(`${API}/bills?customerId=${encodeURIComponent(id)}`, { method: "GET", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load bills");
      const list = (json.data || json || []).map((b) => ({
        id: b._id || b.id,
        billNo: b.billNo || b.number || b.invoiceNo || "-",
        date: b.createdAt || b.date || b.issuedAt || null,
        total: Number(
          b.total ?? b.grandTotal ?? b.amount ??
          (Array.isArray(b.items) ? b.items.reduce((sum, it) => sum + Number(it.price||0)*Number(it.qty||0), 0) : 0)
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

  // --- handlers (unchanged)
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
  const validate = (f) => {
    const e = {};
    if (!f.name?.trim()) e.name = "Name is required";
    if (!f.phone?.trim()) e.phone = "Phone is required";
    if (f.phone && !/^[0-9+\-\s]{7,15}$/.test(f.phone)) e.phone = "Invalid phone";
    if (f.alternatePhone && !/^[0-9+\-\s]{7,15}$/.test(f.alternatePhone)) e.alternatePhone = "Invalid phone";
    if (f.address?.pincode && !/^\d{6}$/.test(f.address.pincode)) e["address.pincode"] = "Pincode must be 6 digits";
    if (f.idProofType && !f.idProofNumber) e.idProofNumber = "ID number required for selected ID proof";
    return e;
  };
  const startEdit = () => { setForm(normalizeForm(customer)); setErrors({}); setIsEditing(true); };
  const cancelEdit = () => { setForm(normalizeForm(customer)); setErrors({}); setIsEditing(false); };
  const save = async () => {
    if (!form) return;
    const ve = validate(form); setErrors(ve);
    if (Object.keys(ve).length) { toast.error("Please fix the highlighted fields."); return; }
    try {
      setSaving(true);
      const res = await fetch(`${API}/customer/details/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
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
    if (status !== "all") list = list.filter((b) => b.status.toLowerCase() === status);
    if (q) {
      list = list.filter((b) => {
        const inBill = (b.billNo || "").toLowerCase().includes(q) || (formatDate(b.date) || "").toLowerCase().includes(q);
        const inItems = b.items?.some((it) => (it.name || it.item || it.title || "").toString().toLowerCase().includes(q));
        return inBill || inItems;
      });
    }
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [bills, query, status]);

  /* ===================== LAYOUT ===================== */
  return (
    <div className="flex flex-col flex-1 w-full h-full p-4 gap-4 overflow-auto overflow-x-hidden min-w-0">
      {/* Sticky topbar inside the scroll container */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" className="gap-2 hover:bg-muted" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {customer?.name && (
              <div className="text-sm text-muted-foreground truncate">
                Viewing <span className="font-medium text-foreground">{customer.name}</span>
                {customer?.phone ? <span className="hidden sm:inline"> • {customer.phone}</span> : null}
              </div>
            )}
          </div>

          {!isEditing ? (
            <Button size="sm" className="gap-2" onClick={startEdit} disabled={!customer}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Two boxes: use flex so right side flexes when sidebar collapses */}
      <div className="flex flex-col gap-4 md:gap-6 lg:flex-row min-w-0">
        {/* LEFT: fixed-ish width that doesn't grow */}
        <div className="min-w-0 lg:basis-[420px] lg:shrink-0">
          {loading && <MonoSkeleton />}

          {!loading && error && (
            <Card className="border border-destructive/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <CircleAlert className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-destructive">Failed to load customer</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <div className="pt-2">
                      <Button size="sm" variant="outline" onClick={fetchCustomer}>Retry</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && customer && form && (
            <Card className="border border-border shadow-sm rounded-2xl h-full">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User2 className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium tracking-tight">Customer Details</h3>
                  </div>
                  {customer?.idProofType && <Badge variant="outline" className="text-xs">{customer.idProofType}</Badge>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Detail icon={<User2 className="h-4 w-4" />} label="Name" editing={isEditing}
                    value={form.name} onChange={(v) => onChange("name", v)} error={errors.name} />
                  <Detail icon={<Smartphone className="h-4 w-4" />} label="Phone" editing={isEditing}
                    value={form.phone} onChange={(v) => onChange("phone", v)} error={errors.phone} />
                  <Detail icon={<Smartphone className="h-4 w-4" />} label="Alt Phone" editing={isEditing}
                    value={form.alternatePhone} onChange={(v) => onChange("alternatePhone", v)}
                    error={errors.alternatePhone} placeholder="Optional" />
                  <Detail icon={<IdCard className="h-4 w-4" />} label="ID Proof Type" editing={isEditing}
                    value={form.idProofType} onChange={(v) => onChange("idProofType", v)}
                    type="select" options={["", "Aadhaar", "PAN", "Voter ID", "Driving License"]} />
                  <Detail icon={<Hash className="h-4 w-4" />} label="ID Number" editing={isEditing}
                    value={form.idProofNumber} onChange={(v) => onChange("idProofNumber", v)} error={errors.idProofNumber} />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium">Address</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Detail label="Street" editing={isEditing} value={form.address.street}
                      onChange={(v) => onChange("address.street", v)} />
                    <Detail label="Area" editing={isEditing} value={form.address.area}
                      onChange={(v) => onChange("address.area", v)} />
                    <Detail label="City" editing={isEditing} value={form.address.city}
                      onChange={(v) => onChange("address.city", v)} />
                    <Detail label="Pincode" editing={isEditing} value={form.address.pincode}
                      onChange={(v) => onChange("address.pincode", v)} error={errors["address.pincode"]} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: grows with available space */}
        <div className="lg:flex-1 min-w-0">
          <Card className="border border-border shadow-sm rounded-2xl h-full">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-medium tracking-tight">Purchased Items</h3>
                  {bills.length > 0 && <Badge variant="secondary" className="ml-1">{bills.length}</Badge>}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search bill # or item name"
                      className="pl-8 pr-3 py-2 text-sm rounded-md border bg-background w-[260px]"
                    />
                  </div>

                  <select
                    value={status} onChange={(e) => setStatus(e.target.value)}
                    className="px-3 py-2 text-sm rounded-md border bg-background"
                  >
                    <option value="all">All status</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <Button variant="outline" size="sm" className="gap-2" onClick={fetchBills} disabled={billsLoading} title="Refresh">
                    <RefreshCw className="h-4 w-4" /> Refresh
                  </Button>
                </div>
              </div>

              {billsLoading && <MonoSkeletonRows rows={6} />}

              {!billsLoading && billsError && (
                <div className="flex items-start gap-3 p-4 border rounded-lg border-destructive/30">
                  <CircleAlert className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Failed to load bills</p>
                    <p className="text-sm text-muted-foreground">{billsError}</p>
                    <div className="pt-2">
                      <Button size="sm" variant="outline" onClick={fetchBills}>Retry</Button>
                    </div>
                  </div>
                </div>
              )}

              {!billsLoading && !billsError && (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBills.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                            {query || status !== "all" ? "No bills match your filters." : "No purchases yet."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBills.map((b) => (
                          <TableRow key={b.id || b.billNo}>
                            <TableCell className="font-medium">{b.billNo}</TableCell>
                            <TableCell>{formatDate(b.date)}</TableCell>
                            <TableCell className="text-right">{b.itemsCount}</TableCell>
                            <TableCell className="text-right">{formatCurrency(b.total)}</TableCell>
                            <TableCell><StatusBadge value={b.status} /></TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => toast.message("Open bill", { description: `Bill ${b.billNo}` })}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- UI bits ---------- */
function StatusBadge({ value }) {
  const v = (value || "").toLowerCase();
  if (v === "paid") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Paid</Badge>;
  if (v === "unpaid") return <Badge className="bg-red-600 hover:bg-red-600">Unpaid</Badge>;
  if (v === "pending") return <Badge className="bg-amber-600 hover:bg-amber-600">Pending</Badge>;
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

function Detail({ icon, label, value, onChange, editing, error, placeholder, type = "text", options = [] }) {
  return (
    <div className="rounded-xl border border-border p-4 bg-background min-w-0">
      {label && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}<span>{label}</span>
        </div>
      )}
      <div className="mt-1">
        {editing ? (
          type === "select" ? (
            <select
              className={`w-full px-3 py-2 rounded-md border bg-background ${error ? "border-red-500" : "border-input"}`}
              value={value ?? ""} onChange={(e) => onChange(e.target.value)}
            >
              {options.map((opt) => (<option key={opt || "empty"} value={opt}>{opt || "Select"}</option>))}
            </select>
          ) : (
            <Field value={value ?? ""} onChange={(v) => onChange(v)} placeholder={placeholder} error={error} />
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
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off"
      className={[
        "w-full px-3 py-2 rounded-md outline-none",
        "bg-background text-foreground",
        "border", error ? "border-red-500" : "border-input",
        "focus:ring-2 focus:ring-offset-0 focus:ring-foreground/10",
      ].join(" ")}
    />
  );
}

/* ---------- Utils ---------- */
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
    name: data.name || "",
    phone: data.phone || "",
    alternatePhone: data.alternatePhone || "",
    idProofType: data.idProofType || "",
    idProofNumber: data.idProofNumber || "",
    address: {
      street: data.address?.street || "",
      area: data.address?.area || "",
      city: data.address?.city || "",
      pincode: data.address?.pincode || "",
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
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n));
  } catch { return `₹${Number(n).toFixed(2)}`; }
}
function formatDate(d) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch { return "—"; }
}
