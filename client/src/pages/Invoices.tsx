/*
  DESIGN: Dark Forge — Invoices
  Create, manage, and download PDF invoices.
*/
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import {
  FileText,
  RefreshCw,
  Plus,
  Download,
  Send,
  Check,
  X as XIcon,
  Trash2,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { generateInvoicePdf, type InvoiceData, type InvoiceLineItem } from "@/lib/generateInvoicePdf";

interface Invoice {
  _id: string;
  siteSlug: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  lineItems: string; // JSON
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  notes?: string;
  dueDate?: string;
  businessName?: string;
  businessEmail?: string;
  createdAt: number;
  paidAt?: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: "bg-[oklch(0.20_0.005_250)]", text: "text-muted-foreground", border: "border-border" },
  sent: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  paid: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  cancelled: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
};

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
      {status}
    </span>
  );
}

// ── Create Invoice Modal ──

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    clientName: string;
    clientEmail?: string;
    lineItems: InvoiceLineItem[];
    taxPercent: number;
    notes?: string;
    dueDate?: string;
    status: string;
  }) => void;
  saving: boolean;
}

function CreateInvoiceModal({ open, onClose, onSave, saving }: CreateModalProps) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const tax = Math.round(subtotal * (taxPercent / 100));
  const total = subtotal + tax;

  const addLine = () => setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems(lineItems.map((li, idx) => idx === i ? { ...li, [field]: value } : li));
  };

  const handleSave = (status: string) => {
    if (!clientName.trim()) { toast.error("Client name is required"); return; }
    if (lineItems.every((li) => !li.description.trim())) { toast.error("At least one line item required"); return; }
    onSave({
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim() || undefined,
      lineItems: lineItems.filter((li) => li.description.trim()),
      taxPercent,
      notes: notes.trim() || undefined,
      dueDate: dueDate || undefined,
      status,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-background border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-heading font-bold text-foreground">New Invoice</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Client info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Client Name *</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[oklch(0.14_0.005_250)] border border-border rounded-md text-foreground focus:outline-none focus:border-gold/40"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Client Email</label>
            <input
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[oklch(0.14_0.005_250)] border border-border rounded-md text-foreground focus:outline-none focus:border-gold/40"
              placeholder="john@example.com"
            />
          </div>
        </div>

        {/* Line items */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Line Items</label>
          <div className="space-y-2">
            {lineItems.map((li, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={li.description}
                  onChange={(e) => updateLine(i, "description", e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-[oklch(0.14_0.005_250)] border border-border rounded-md text-foreground focus:outline-none focus:border-gold/40"
                  placeholder="Description"
                />
                <input
                  type="number"
                  min={1}
                  value={li.quantity}
                  onChange={(e) => updateLine(i, "quantity", parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-2 text-sm text-center bg-[oklch(0.14_0.005_250)] border border-border rounded-md text-foreground focus:outline-none focus:border-gold/40"
                  placeholder="Qty"
                />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={li.unitPrice / 100}
                    onChange={(e) => updateLine(i, "unitPrice", Math.round((parseFloat(e.target.value) || 0) * 100))}
                    className="w-24 pl-5 pr-2 py-2 text-sm bg-[oklch(0.14_0.005_250)] border border-border rounded-md text-foreground focus:outline-none focus:border-gold/40"
                    placeholder="0.00"
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">{formatCurrency(li.quantity * li.unitPrice)}</span>
                {lineItems.length > 1 && (
                  <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-300">
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addLine} className="mt-2 text-xs text-gold hover:text-gold/80 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add line item
          </button>
        </div>

        {/* Tax + Due date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tax %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={taxPercent || ""}
              onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm bg-[oklch(0.14_0.005_250)] border border-border rounded-md text-foreground focus:outline-none focus:border-gold/40"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[oklch(0.14_0.005_250)] border border-border rounded-md text-foreground focus:outline-none focus:border-gold/40"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm bg-[oklch(0.14_0.005_250)] border border-border rounded-md text-foreground focus:outline-none focus:border-gold/40 resize-none"
            placeholder="Payment terms, additional info..."
          />
        </div>

        {/* Totals */}
        <div className="border-t border-border pt-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{formatCurrency(subtotal)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
              <span className="text-foreground">{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span className="text-gold">Total</span>
            <span className="text-gold">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-muted-foreground border border-border rounded-md hover:bg-[oklch(0.16_0.005_250)]"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="px-4 py-2 text-xs text-foreground border border-border rounded-md hover:bg-[oklch(0.16_0.005_250)] disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave("sent")}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Send Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function Invoices() {
  const { getToken, convexHttpUrl } = useAuth();
  const { currentSite } = useSite();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const authFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const token = await getToken();
      const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(`${convexHttpUrl}${path}`, { ...options, headers });
    },
    [getToken, convexHttpUrl]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/dashboard/invoices");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: {
    clientName: string;
    clientEmail?: string;
    lineItems: InvoiceLineItem[];
    taxPercent: number;
    notes?: string;
    dueDate?: string;
    status: string;
  }) => {
    setSaving(true);
    try {
      const subtotal = data.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
      const tax = Math.round(subtotal * (data.taxPercent / 100));
      const total = subtotal + tax;

      const res = await authFetch("/api/dashboard/invoices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          lineItems: JSON.stringify(data.lineItems),
          subtotal,
          tax,
          total,
          notes: data.notes,
          dueDate: data.dueDate,
          status: data.status,
          businessName: currentSite?.name,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(data.status === "draft" ? "Draft saved" : "Invoice created");
      setShowCreate(false);
      load();

      // If "sent" and has email, open mailto
      if (data.status === "sent" && data.clientEmail) {
        const subject = encodeURIComponent(`Invoice from ${currentSite?.name || "us"}`);
        const body = encodeURIComponent(`Hi ${data.clientName},\n\nPlease find your invoice attached.\n\nTotal: $${(total / 100).toFixed(2)}\n\nThank you!`);
        window.open(`mailto:${data.clientEmail}?subject=${subject}&body=${body}`, "_blank");
      }
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await authFetch("/api/dashboard/invoices/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Invoice marked as ${status}`);
      setInvoices((prev) =>
        prev.map((inv) => inv._id === id ? { ...inv, status, ...(status === "paid" ? { paidAt: Date.now() } : {}) } : inv)
      );
    } catch {
      toast.error("Failed to update invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await authFetch("/api/dashboard/invoices/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Invoice deleted");
      setInvoices((prev) => prev.filter((inv) => inv._id !== id));
    } catch {
      toast.error("Failed to delete invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = (inv: Invoice) => {
    let items: InvoiceLineItem[] = [];
    try { items = JSON.parse(inv.lineItems); } catch {}

    const data: InvoiceData = {
      invoiceNumber: inv.invoiceNumber,
      createdAt: inv.createdAt,
      dueDate: inv.dueDate,
      clientName: inv.clientName,
      clientEmail: inv.clientEmail,
      lineItems: items,
      subtotal: inv.subtotal,
      tax: inv.tax,
      total: inv.total,
      currency: inv.currency,
      notes: inv.notes,
      status: inv.status,
      businessName: inv.businessName || currentSite?.name,
    };

    const blob = generateInvoicePdf(data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoiceNumber}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inv of invoices) counts[inv.status] = (counts[inv.status] || 0) + 1;
    return counts;
  }, [invoices]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-gold" />
          </div>
          <div>
            <h2 className="text-base font-heading font-bold text-foreground">Invoices</h2>
            <p className="text-xs text-muted-foreground">
              {invoices.length === 0
                ? "No invoices yet"
                : `${invoices.length} total \u00b7 ${formatCurrency(totalRevenue)} collected`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-[oklch(0.16_0.005_250)] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading invoices...
        </div>
      ) : invoices.length === 0 ? (
        <EmptyStateGuide
          icon={FileText}
          title="No invoices yet"
          description="Create professional invoices for your clients."
          steps={[
            { label: "Create invoice", detail: "Click 'New Invoice' to create a custom invoice" },
            { label: "Add line items", detail: "Add services, products, or custom items" },
            { label: "Download PDF", detail: "Generate a branded PDF to send to your client" },
          ]}
        />
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv._id}
              className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-4 hover:border-gold-dim transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{inv.invoiceNumber}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{inv.clientName}</p>
                  {inv.clientEmail && (
                    <p className="text-xs text-muted-foreground">{inv.clientEmail}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gold">{formatCurrency(inv.total)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</p>
                  {inv.dueDate && <p className="text-xs text-muted-foreground">Due: {inv.dueDate}</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/50">
                <button
                  onClick={() => handleDownloadPdf(inv)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground border border-border hover:bg-[oklch(0.19_0.005_250)] hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </button>
                {inv.status === "draft" && (
                  <button
                    onClick={() => handleStatusUpdate(inv._id, "sent")}
                    disabled={actionLoading === inv._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Mark Sent
                  </button>
                )}
                {(inv.status === "sent" || inv.status === "draft") && (
                  <button
                    onClick={() => handleStatusUpdate(inv._id, "paid")}
                    disabled={actionLoading === inv._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark Paid
                  </button>
                )}
                {inv.status === "draft" && (
                  <button
                    onClick={() => handleDelete(inv._id)}
                    disabled={actionLoading === inv._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateInvoiceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleCreate}
        saving={saving}
      />
    </div>
  );
}
