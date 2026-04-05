/*
  DESIGN: Dark Forge — Store Management
  Stripe Connect onboarding, product CRUD, order history.
  All backend endpoints already exist on Convex.
*/
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import {
  ShoppingBag, Plus, RefreshCw, Loader2, CheckCircle2,
  CreditCard, Package, Receipt, ExternalLink, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import ProductModal, { type StoreProduct } from "@/components/ProductModal";

// ── Types ────────────────────────────────────────────────────────────

interface StripeStatus {
  onboardingComplete: boolean;
  stripeAccountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

interface Order {
  _id: string;
  sessionId: string;
  priceId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  siteSlug: string;
  status: string;
  createdAt: number;
}

// ── Main Component ───────────────────────────────────────────────────

export default function Store() {
  const { getToken, convexHttpUrl } = useAuth();
  const { currentSite } = useSite();

  // Stripe Connect state
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  // Tab state
  const [tab, setTab] = useState<"products" | "orders">("products");

  // Products state
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [editProduct, setEditProduct] = useState<StoreProduct | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ── Auth fetch ─────────────────────────────────────────────────────

  const authFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const token = await getToken();
      const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(`${convexHttpUrl}${path}`, { ...options, headers });
    },
    [getToken, convexHttpUrl]
  );

  // ── Stripe Connect ─────────────────────────────────────────────────

  const checkStripeStatus = useCallback(async () => {
    setStripeLoading(true);
    try {
      const res = await authFetch("/api/stripe/connect/status", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStripeStatus(data);
      } else {
        setStripeStatus(null);
      }
    } catch {
      setStripeStatus(null);
    } finally {
      setStripeLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { checkStripeStatus(); }, [checkStripeStatus]);

  const handleConnectStripe = async () => {
    if (!currentSite?.slug) { toast.error("No site found"); return; }
    setOnboarding(true);
    try {
      const res = await authFetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteSlug: currentSite.slug }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      // Validate URL points to Stripe before opening
      try {
        const parsed = new URL(url);
        if (!parsed.hostname.endsWith("stripe.com")) throw new Error("Invalid redirect");
      } catch { toast.error("Invalid Stripe URL received"); return; }
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Stripe onboarding opened in a new tab");
    } catch (e: any) {
      toast.error("Failed to start Stripe onboarding");
    } finally {
      setOnboarding(false);
    }
  };

  const isConnected = stripeStatus?.onboardingComplete === true;

  // Store activation state
  const [storeActivated, setStoreActivated] = useState<boolean | null>(null);
  const [activating, setActivating] = useState(false);

  // Check if shop.html exists via authenticated GitHub API
  useEffect(() => {
    if (!currentSite?.slug) return;
    (async () => {
      try {
        const res = await authFetch(`/api/dashboard/check-page?page=shop.html`);
        if (res.ok) {
          const data = await res.json();
          setStoreActivated(data.exists);
        } else {
          setStoreActivated(false);
        }
      } catch {
        setStoreActivated(false);
      }
    })();
  }, [currentSite?.slug, authFetch]);

  const handleActivateStore = async () => {
    setActivating(true);
    try {
      const res = await authFetch("/api/dashboard/activate-store", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setStoreActivated(true);
      toast.success("Store activated! Shop page is live.");
    } catch {
      toast.error("Failed to activate store");
    } finally {
      setActivating(false);
    }
  };

  // ── Products ───────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    if (!isConnected) return;
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
  }, [authFetch, isConnected]);

  useEffect(() => { if (isConnected) loadProducts(); }, [isConnected, loadProducts]);

  const handleCreateProduct = async (data: {
    name: string; description?: string; price: number;
    type: string; inventory?: number; shippingCost?: number;
  }) => {
    const res = await authFetch("/api/stripe/connect/create-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    loadProducts();
  };

  const handleUpdateProduct = async (data: {
    productId: string; name?: string; description?: string;
    inventory?: number; shippingCost?: number; active?: boolean; imageUrl?: string;
  }) => {
    const res = await authFetch("/api/store/products/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    loadProducts();
  };

  const handleDeleteProduct = async (productId: string) => {
    const res = await authFetch("/api/store/products/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (!res.ok) throw new Error(await res.text());
    loadProducts();
  };

  // ── Orders ─────────────────────────────────────────────────────────

  const loadOrders = useCallback(async () => {
    if (!isConnected) return;
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
  }, [authFetch, isConnected]);

  useEffect(() => { if (tab === "orders" && isConnected) loadOrders(); }, [tab, isConnected, loadOrders]);

  // ── Helpers ────────────────────────────────────────────────────────

  const activeProducts = products.filter((p) => p.active);
  const inactiveProducts = products.filter((p) => !p.active);

  const totalRevenue = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.amount, 0);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <ShoppingBag className="w-4.5 h-4.5 text-gold" />
          </div>
          <div>
            <h2 className="text-base font-heading font-bold text-foreground">Store</h2>
            <p className="text-xs text-muted-foreground">
              {isConnected
                ? `${activeProducts.length} products · $${(totalRevenue / 100).toFixed(2)} revenue`
                : "Connect Stripe to start selling"
              }
            </p>
          </div>
        </div>
        {isConnected && tab === "products" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </button>
        )}
      </div>

      {/* Stripe Connect Banner */}
      {stripeLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Checking Stripe status...
        </div>
      ) : !isConnected ? (
        <div className="bg-[oklch(0.16_0.005_250)] border border-gold/20 rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-gold" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-heading font-bold text-foreground">Connect Stripe to Start Selling</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your Stripe account to accept payments for products and booking deposits.
                You'll be redirected to Stripe to complete the setup — it only takes a few minutes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-14">
            <button
              onClick={handleConnectStripe}
              disabled={onboarding}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {onboarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Connect Stripe
            </button>
            {stripeStatus && !stripeStatus.onboardingComplete && (
              <button
                onClick={checkStripeStatus}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-[oklch(0.18_0.005_250)] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Check Status
              </button>
            )}
          </div>
          {stripeStatus && !stripeStatus.onboardingComplete && (
            <div className="flex items-center gap-2 pl-14 text-xs text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              Stripe account created but onboarding incomplete. Click "Connect Stripe" to continue.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium text-emerald-400">Stripe Connected</span>
          <div className="flex items-center gap-2 ml-auto">
            {stripeStatus?.chargesEnabled && (
              <span className="text-[10px] text-emerald-400/60 bg-emerald-500/10 px-1.5 py-0.5 rounded">Charges Enabled</span>
            )}
            {stripeStatus?.payoutsEnabled && (
              <span className="text-[10px] text-emerald-400/60 bg-emerald-500/10 px-1.5 py-0.5 rounded">Payouts Enabled</span>
            )}
          </div>
        </div>
      )}

      {/* Activate Store (when Stripe connected but no shop.html yet) */}
      {isConnected && storeActivated === false && (
        <div className="bg-[oklch(0.16_0.005_250)] border border-gold/20 rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-gold" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-heading font-bold text-foreground">Activate Your Store</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create a shop page on your live site. This adds a "Shop" link to your navigation
                and a featured products preview on your home page. Products you add here will appear automatically.
              </p>
            </div>
          </div>
          <div className="pl-14">
            <button
              onClick={handleActivateStore}
              disabled={activating}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
              {activating ? "Creating shop page..." : "Activate Store"}
            </button>
          </div>
        </div>
      )}

      {/* Store activated — show link to live shop */}
      {isConnected && storeActivated === true && currentSite?.slug && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Shop page is live</span>
          <a
            href={currentSite.domain ? `https://${currentSite.domain}/shop.html` : `https://eternowebstudio.com/${currentSite.slug}/shop.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gold hover:underline ml-1"
          >
            View Shop <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Tabs (only when connected) */}
      {isConnected && (
        <>
          <div className="flex gap-1 bg-[oklch(0.15_0.005_250)] rounded-lg p-1 w-fit">
            <button
              onClick={() => setTab("products")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "products" ? "bg-[oklch(0.22_0.005_250)] text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Products
              {products.length > 0 && (
                <span className="text-[10px] font-semibold text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full">
                  {activeProducts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("orders")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "orders" ? "bg-[oklch(0.22_0.005_250)] text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Orders
              {orders.length > 0 && (
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted/30 border border-border px-1.5 py-0.5 rounded-full">
                  {orders.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Products Tab ──────────────────────────────────────────── */}
          {tab === "products" && (
            <>
              {productsLoading && products.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Loading products...
                </div>
              ) : products.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-4">
                  <Package className="w-10 h-10 text-muted-foreground/40" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">No products yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add your first product to start selling
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Product
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Active products */}
                  {activeProducts.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {activeProducts.map((p) => (
                        <button
                          key={p._id}
                          onClick={() => setEditProduct(p)}
                          className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-4 text-left hover:border-gold/30 transition-colors space-y-3"
                        >
                          {p.imageUrl && (
                            <div className="w-full h-28 rounded-md overflow-hidden bg-[oklch(0.12_0.005_250)]">
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">{p.name}</h4>
                              {p.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gold">
                              ${(p.amount / 100).toFixed(2)}
                              {p.type === "recurring" && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {p.sold != null && p.sold > 0 && (
                                <span>{p.sold} sold</span>
                              )}
                              {p.inventory != null && (
                                <span className="bg-[oklch(0.12_0.005_250)] px-1.5 py-0.5 rounded">
                                  {p.inventory - (p.sold || 0)} left
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Inactive products */}
                  {inactiveProducts.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Inactive ({inactiveProducts.length})
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {inactiveProducts.map((p) => (
                          <button
                            key={p._id}
                            onClick={() => setEditProduct(p)}
                            className="bg-[oklch(0.14_0.005_250)] border border-border rounded-lg p-4 text-left hover:border-border/60 transition-colors opacity-50 hover:opacity-75 space-y-2"
                          >
                            <h4 className="text-sm font-medium text-foreground truncate">{p.name}</h4>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">${(p.amount / 100).toFixed(2)}</span>
                              <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Inactive</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Orders Tab ────────────────────────────────────────────── */}
          {tab === "orders" && (
            <>
              {ordersLoading && orders.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-4">
                  <Receipt className="w-10 h-10 text-muted-foreground/40" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">No orders yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Orders will appear here when customers make purchases
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Customer</th>
                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Amount</th>
                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o._id} className="border-b border-border/50 last:border-0">
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground">
                            {o.customerEmail || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-foreground">
                            ${(o.amount / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                              o.status === "paid"
                                ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                                : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                            }`}>
                              {o.status === "paid" ? "Paid" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <ProductModal
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        product={editProduct}
        onCreateProduct={handleCreateProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
      />

      <ProductModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        product={null}
        isCreate
        onCreateProduct={handleCreateProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
      />
    </div>
  );
}
