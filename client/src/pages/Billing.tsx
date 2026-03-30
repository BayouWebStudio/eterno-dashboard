/*
  DESIGN: Dark Forge — Billing Management
  Clients view their current plan and open the Stripe Customer Portal
  to manage invoices, update payment info, or cancel.
*/
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { CreditCard, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
};

const PLAN_COLORS: Record<string, string> = {
  free: "text-muted-foreground bg-muted/30 border-border",
  starter: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  pro: "text-gold bg-gold/10 border-gold/20",
};

export default function Billing() {
  const { getToken, convexHttpUrl } = useAuth();
  const { currentSite } = useSite();
  const [loading, setLoading] = useState(false);

  const plan = (currentSite?.plan || "free").toLowerCase();
  const isPaid = plan !== "free";

  const openPortal = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${convexHttpUrl}/api/dashboard/billing-portal`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "no_customer") {
          toast.error("No billing account found. Contact support if this seems wrong.");
        } else {
          toast.error(data.error || "Failed to open billing portal");
        }
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
          <CreditCard className="w-4.5 h-4.5 text-gold" />
        </div>
        <div>
          <h2 className="text-base font-heading font-bold text-foreground">Billing</h2>
          <p className="text-xs text-muted-foreground">Manage your plan and invoices</p>
        </div>
      </div>

      {/* Current Plan Card */}
      <div className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Plan</h3>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${PLAN_COLORS[plan] || PLAN_COLORS.free}`}
          >
            {plan === "pro" && <Sparkles className="w-3.5 h-3.5" />}
            {PLAN_LABELS[plan] || plan.charAt(0).toUpperCase() + plan.slice(1)}
          </span>
          {isPaid && (
            <span className="text-xs text-muted-foreground">Active subscription</span>
          )}
        </div>
      </div>

      {/* Portal / Upgrade Card */}
      {isPaid ? (
        <div className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Manage Billing</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Update your payment method, download invoices, or cancel your subscription
              through the secure Stripe billing portal.
            </p>
          </div>
          <button
            onClick={openPortal}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            {loading ? "Opening…" : "Open Billing Portal"}
          </button>
        </div>
      ) : (
        <div className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Manage Billing</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Access the Stripe billing portal to view invoices or manage a previous subscription.
              You'll be asked to enter your email — Stripe will send a magic link.
            </p>
          </div>
          <a
            href="https://billing.stripe.com/p/login/cNibJ1d9Y9R30XCcFl3Je00"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-gold/40 text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Billing Portal
          </a>
        </div>
      )}
    </div>
  );
}
