/*
  DESIGN: Dark Forge — Store Management
  Clients manage their Stripe Connect account, products (with inventory + shipping),
  orders, and Printify integration.
*/
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingBag, Package, ReceiptText, Printer, ExternalLink,
  RefreshCw, Plus, Edit2, Trash2, Check, X, ToggleLeft, ToggleRight,
  TrendingUp, ShoppingCart, DollarSign, ChevronDown, ChevronUp,
  Link as LinkIcon, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import EmptyStateGuide from "@/components/EmptyStateGuide";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Product {
  _id: string;
  name: string;
  description?: string;
  amount: number; // cents
  inventory?: number;
  sold?: number;
  shippingCost?: number; // cents
  active: boolean;
  source?: string; // "manual" | "printify"
  imageUrl?: string;
  stripeProductId: string;
  stripePriceId: string;
  createdAt: number;
}

interface Order {
  _id: string;
  amount: number; // cents
  currency: string;
  customerEmail?: string;
  status: string;
  createdAt: number;
}

interface StripeConnectStatus {
  connected: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  accountId?: string;
}

interface PrintifyStatus {
  connected: boolean;
  shopId?: string | null;
}

// ── Small helpers ──────────────────────────────────────────────────────────────

const fmt$ = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gold" />
      </div>
      <div>
        <h2 className="text-base font-heading font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-5 ${className}`}>
      {children}
    </div>
  );
}

// ── Add Product Modal ──────────────────────────────────────────────────────────

function AddProductModal({
  onClose,
  onAdded,
  authFetch,
}: {
  onClose: () => void;
  onAdded: () => void;
  authFetch: (path: string, opts?: RequestInit) => Promise<Response>;
}) {
  const [form, setForm] = useState({
    name: "", description: "", price: "", inventory: "", shipping: "", imageUrl: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price.trim()) return;
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        amount: Math.round(priceNum * 100),
        currency: "usd",
        type: "one_time",
      };
      if (form.inventory.trim()) {
        const inv = parseInt(form.inventory);
        if (!isNaN(inv)) body.inventory = inv;
      }
      if (form.shipping.trim()) {
        const ship = parseFloat(form.shipping);
        if (!isNaN(ship)) body.shippingCost = Math.round(ship * 100);
      }
      if (form.imageUrl.trim()) body.imageUrl = form.imageUrl.trim();

      const res = await authFetch("/api/stripe/connect/create-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Product added");
      onAdded();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e) || "Failed to add product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[oklch(0.14_0.005_250)] border border-border rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Add Product</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Product Name *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Flash Design Print"
              required
              className="w-full bg-[oklch(0.18_0.005_250)] border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Optional product description"
              className="w-full bg-[oklch(0.18_0.005_250)] border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Price (USD) *</label>
              <input
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="29.99"
                type="number"
                min="0.01"
                step="0.01"
                required
                className="w-full bg-[oklch(0.18_0.005_250)] border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Shipping (USD)</label>
              <input
                value={form.shipping}
                onChange={(e) => set("shipping", e.target.value)}
                placeholder="Free if blank"
                type="number"
                min="0"
                step="0.01"
                className="w-full bg-[oklch(0.18_0.005_250)] border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Inventory</label>
            <input
              value={form.inventory}
              onChange={(e) => set("inventory", e.target.value)}
              placeholder="Leave blank for unlimited"
              type="number"
              min="0"
              step="1"
              className="w-full bg-[oklch(0.18_0.005_250)] border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Image URL</label>
            <input
              value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="https://..."
              className="w-full bg-[oklch(0.18_0.005_250)] border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-[oklch(0.18_0.005_250)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-md bg-gold text-[oklch(0.12_0.005_250)] text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {saving ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Product Row ────────────────────────────────────────────────────────────────

function ProductRow({
  product,
  authFetch,
  onUpdated,
  onDeleted,
}: {
  product: Product;
  authFetch: (path: string, opts?: RequestInit) => Promise<Response>;
  onUpdated: (updated: Partial<Product>) => void;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editInventory, setEditInventory] = useState(String(product.inventory ?? ""));
  const [editShipping, setEditShipping] = useState(
    product.shippingCost != null ? String((product.shippingCost / 100).toFixed(2)) : ""
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patchProduct = async (fields: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await authFetch("/api/store/products/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id, ...fields }),
      });
      if (!res.ok) throw new Error(await res.text());
      onUpdated(fields as Partial<Product>);
      return true;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e) || "Update failed");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const ok = await patchProduct({ active: !product.active });
    if (ok) toast.success(product.active ? "Product deactivated" : "Product activated");
  };

  const handleSaveEdit = async () => {
    const rawInv = editInventory.trim() === "" ? NaN : parseInt(editInventory);
    const inv = isNaN(rawInv) ? undefined : rawInv;
    const rawShip = editShipping.trim() === "" ? NaN : parseFloat(editShipping);
    const ship = isNaN(rawShip) ? undefined : Math.round(rawShip * 100);
    const ok = await patchProduct({ inventory: inv, shippingCost: ship });
    if (ok) {
      toast.success("Product updated");
      setExpanded(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const res = await authFetch("/api/store/products/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Product deleted");
      onDeleted();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e) || "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const inventoryLabel = () => {
    if (product.inventory == null) return "∞";
    const left = product.inventory - (product.sold ?? 0);
    return `${left < 0 ? 0 : left} / ${product.inventory}`;
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${product.active ? "border-border" : "border-border/50 opacity-60"}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-3 bg-[oklch(0.16_0.005_250)]">
        {product.imageUrl && (
          <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{product.name}</span>
            {product.source === "printify" && (
              <span className="text-[10px] text-muted-foreground bg-muted/20 border border-border px-1.5 py-0.5 rounded-full flex-shrink-0">Printify</span>
            )}
            {!product.active && (
              <span className="text-[10px] text-muted-foreground bg-muted/20 border border-border px-1.5 py-0.5 rounded-full flex-shrink-0">Inactive</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{fmt$(product.amount)}</span>
            <span>Stock: {inventoryLabel()}</span>
            <span>Sold: {product.sold ?? 0}</span>
            <span>Ship: {product.shippingCost ? fmt$(product.shippingCost) : "Free"}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleToggleActive}
            disabled={saving}
            title={product.active ? "Deactivate" : "Activate"}
            className="p-1.5 rounded hover:bg-[oklch(0.20_0.005_250)] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {product.active
              ? <ToggleRight className="w-4 h-4 text-emerald-400" />
              : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setExpanded((v) => !v); setConfirmDelete(false); }}
            className="p-1.5 rounded hover:bg-[oklch(0.20_0.005_250)] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
              confirmDelete
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "hover:bg-[oklch(0.20_0.005_250)] text-muted-foreground hover:text-red-400"
            }`}
            title={confirmDelete ? "Click again to confirm delete" : "Delete"}
          >
            {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="p-1.5 rounded hover:bg-[oklch(0.20_0.005_250)] text-muted-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline edit */}
      {expanded && (
        <div className="border-t border-border p-3 bg-[oklch(0.14_0.005_250)] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Inventory (blank = unlimited)</label>
              <input
                value={editInventory}
                onChange={(e) => setEditInventory(e.target.value)}
                type="number"
                min="0"
                step="1"
                placeholder="Unlimited"
                className="w-full bg-[oklch(0.18_0.005_250)] border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-gold/40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Shipping USD (blank = free)</label>
              <input
                value={editShipping}
                onChange={(e) => setEditShipping(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="Free"
                className="w-full bg-[oklch(0.18_0.005_250)] border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors text-xs font-medium disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Store() {
  const { getToken, convexHttpUrl } = useAuth();

  const authFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const token = await getToken();
      const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string>),
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(`${convexHttpUrl}${path}`, { ...options, headers });
    },
    [getToken, convexHttpUrl]
  );

  // ── Stripe Connect ──
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);

  const loadStripeStatus = useCallback(async () => {
    setStripeLoading(true);
    try {
      const res = await authFetch("/api/stripe/connect/status", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStripeStatus(data);
    } catch {
      setStripeStatus({ connected: false });
    } finally {
      setStripeLoading(false);
    }
  }, [authFetch]);

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const res = await authFetch("/api/stripe/connect/onboard", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e) || "Failed to start Stripe onboarding");
      setConnectingStripe(false);
    }
  };

  // ── Products ──
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await authFetch("/api/store/products");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  }, [authFetch]);

  // ── Orders ──
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await authFetch("/api/store/orders");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  }, [authFetch]);

  // ── Printify ──
  const [printifyStatus, setPrintifyStatus] = useState<PrintifyStatus | null>(null);
  const [printifyLoading, setPrintifyLoading] = useState(true);
  const [printifyKey, setPrintifyKey] = useState("");
  const [connectingPrintify, setConnectingPrintify] = useState(false);
  const [syncingPrintify, setSyncingPrintify] = useState(false);

  const loadPrintifyStatus = useCallback(async () => {
    setPrintifyLoading(true);
    try {
      const res = await authFetch("/api/printify/status", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPrintifyStatus(data);
    } catch {
      setPrintifyStatus({ connected: false });
    } finally {
      setPrintifyLoading(false);
    }
  }, [authFetch]);

  const handleConnectPrintify = async () => {
    if (!printifyKey.trim()) { toast.error("Enter your Printify API key"); return; }
    setConnectingPrintify(true);
    try {
      const res = await authFetch("/api/printify/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: printifyKey.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Printify connected");
      setPrintifyKey("");
      await loadPrintifyStatus();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e) || "Failed to connect Printify");
    } finally {
      setConnectingPrintify(false);
    }
  };

  const handleSyncPrintify = async () => {
    setSyncingPrintify(true);
    try {
      const res = await authFetch("/api/printify/sync", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(`Synced ${data.synced ?? 0} products from Printify`);
      await loadProducts();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e) || "Sync failed");
    } finally {
      setSyncingPrintify(false);
    }
  };

  const handleDisconnectPrintify = async () => {
    try {
      const res = await authFetch("/api/printify/disconnect", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Printify disconnected");
      setPrintifyStatus({ connected: false });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e) || "Failed to disconnect");
    }
  };

  // Initial load
  useEffect(() => {
    loadStripeStatus();
    loadProducts();
    loadOrders();
    loadPrintifyStatus();
  }, [loadStripeStatus, loadProducts, loadOrders, loadPrintifyStatus]);

  // ── Order stats ──
  const stats = useMemo(() => {
    const total = orders.reduce((sum, o) => sum + o.amount, 0);
    const count = orders.length;
    const avg = count > 0 ? total / count : 0;
    return { total, count, avg };
  }, [orders]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ─── Section 1: Stripe Connect ─────────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={LinkIcon}
          title="Stripe Connect"
          subtitle="Connect your Stripe account to accept payments on your store"
        />

        {stripeLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Checking Stripe status…
          </div>
        ) : stripeStatus?.connected ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-sm text-foreground font-medium">Stripe Connected</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className={`flex items-center gap-1 ${stripeStatus.chargesEnabled ? "text-emerald-400" : "text-amber-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${stripeStatus.chargesEnabled ? "bg-emerald-400" : "bg-amber-400"}`} />
                {stripeStatus.chargesEnabled ? "Charges enabled" : "Charges pending"}
              </span>
              <span className={`flex items-center gap-1 ${stripeStatus.payoutsEnabled ? "text-emerald-400" : "text-amber-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${stripeStatus.payoutsEnabled ? "bg-emerald-400" : "bg-amber-400"}`} />
                {stripeStatus.payoutsEnabled ? "Payouts enabled" : "Payouts pending"}
              </span>
            </div>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80 transition-colors ml-auto"
            >
              Open Stripe Dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              Not connected — connect Stripe to sell products
            </div>
            <button
              onClick={handleConnectStripe}
              disabled={connectingStripe}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-gold text-[oklch(0.12_0.005_250)] text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50 sm:ml-auto"
            >
              {connectingStripe ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
              {connectingStripe ? "Redirecting…" : "Connect Stripe"}
            </button>
          </div>
        )}
      </Card>

      {/* ─── Section 2: Products ────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <SectionHeader
            icon={Package}
            title="Products"
            subtitle={`${products.length} product${products.length !== 1 ? "s" : ""}`}
          />
          <div className="flex items-center gap-2 -mt-5">
            <button
              onClick={loadProducts}
              disabled={productsLoading}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground border border-border hover:bg-[oklch(0.18_0.005_250)] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${productsLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={!stripeStatus?.connected}
              title={!stripeStatus?.connected ? "Connect Stripe first" : "Add product"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product
            </button>
          </div>
        </div>

        {productsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading products…
          </div>
        ) : products.length === 0 ? (
          <EmptyStateGuide
            icon={Package}
            title="No products yet"
            description={stripeStatus?.connected
              ? "Your store is connected and ready to go. Add your first product to start selling."
              : "Connect your Stripe account above to start accepting payments and adding products."}
            steps={stripeStatus?.connected
              ? [
                  { label: "Click \"Add Product\" above to create a listing", detail: "Set a name, price, and optional image" },
                  { label: "Products appear on your site's store page automatically" },
                  { label: "Track orders and revenue here as sales come in" },
                ]
              : [
                  { label: "Connect Stripe to accept payments", detail: "Click the Connect button in the Stripe section above" },
                  { label: "Add products with pricing and images" },
                  { label: "Customers purchase directly from your site" },
                ]
            }
          />
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <ProductRow
                key={p._id}
                product={p}
                authFetch={authFetch}
                onUpdated={(fields) =>
                  setProducts((prev) =>
                    prev.map((prod) => prod._id === p._id ? { ...prod, ...fields } : prod)
                  )
                }
                onDeleted={() => setProducts((prev) => prev.filter((prod) => prod._id !== p._id))}
              />
            ))}
          </div>
        )}
      </Card>

      {/* ─── Section 3: Orders ──────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <SectionHeader
            icon={ReceiptText}
            title="Orders"
            subtitle={`${stats.count} order${stats.count !== 1 ? "s" : ""}`}
          />
          <button
            onClick={loadOrders}
            disabled={ordersLoading}
            className="-mt-5 p-1.5 rounded text-muted-foreground hover:text-foreground border border-border hover:bg-[oklch(0.18_0.005_250)] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: DollarSign, label: "Total Revenue", value: fmt$(stats.total) },
            { icon: ShoppingCart, label: "Orders", value: String(stats.count) },
            { icon: TrendingUp, label: "Avg Order", value: fmt$(stats.avg) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[oklch(0.14_0.005_250)] border border-border rounded-lg p-3 text-center">
              <Icon className="w-4 h-4 text-gold mx-auto mb-1" />
              <p className="text-base font-bold text-foreground">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {ordersLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading orders…
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <ReceiptText className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No orders yet</p>
            <p className="text-xs text-muted-foreground/60">Orders will appear here when customers purchase from your site.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left pb-2 font-medium">Date</th>
                  <th className="text-left pb-2 font-medium">Customer</th>
                  <th className="text-right pb-2 font-medium">Amount</th>
                  <th className="text-right pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-2 text-foreground">{o.customerEmail || "—"}</td>
                    <td className="py-2 text-right text-foreground font-medium">{fmt$(o.amount)}</td>
                    <td className="py-2 text-right">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        o.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ─── Section 4: Printify ────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={Printer}
          title="Printify"
          subtitle="Sync print-on-demand products from your Printify shop"
        />

        {printifyLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Checking Printify status…
          </div>
        ) : printifyStatus?.connected ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-sm text-foreground font-medium">Printify Connected</span>
              {printifyStatus.shopId && (
                <span className="text-xs text-muted-foreground">Shop #{printifyStatus.shopId}</span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <button
                onClick={handleSyncPrintify}
                disabled={syncingPrintify}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors text-xs font-medium disabled:opacity-50"
              >
                {syncingPrintify ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {syncingPrintify ? "Syncing…" : "Sync Products"}
              </button>
              <button
                onClick={handleDisconnectPrintify}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-xs font-medium"
              >
                <X className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Enter your Printify API key to sync print-on-demand products to your store.
            </p>
            <div className="flex gap-2">
              <input
                value={printifyKey}
                onChange={(e) => setPrintifyKey(e.target.value)}
                type="password"
                placeholder="Printify API Key"
                className="flex-1 bg-[oklch(0.18_0.005_250)] border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40"
              />
              <button
                onClick={handleConnectPrintify}
                disabled={connectingPrintify || !printifyKey.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {connectingPrintify ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                Connect
              </button>
            </div>
            <p className="text-xs text-muted-foreground/60">
              Find your API key in Printify → My Account → Connections → API access token.
            </p>
          </div>
        )}
      </Card>

      {/* Add product modal */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onAdded={loadProducts}
          authFetch={authFetch}
        />
      )}
    </div>
  );
}
