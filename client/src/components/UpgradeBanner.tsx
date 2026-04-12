/*
  DESIGN: Dark Forge — Upgrade Banner
  Persistent banner shown above the site info card on Overview when
  the current client is on the free plan. Takes them through Stripe
  to upgrade to Pro (unlocks custom domain + Pro features).
*/
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, X, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const DISMISS_KEY = "eterno:upgrade-banner-dismissed";

export default function UpgradeBanner() {
  const { getToken, convexHttpUrl } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) === "1";
  });
  const [loading, setLoading] = useState(false);

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${convexHttpUrl}/api/dashboard/upgrade-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not start upgrade");
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Upgrade unavailable — please try again");
        setLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start upgrade");
      setLoading(false);
    }
  }, [getToken, convexHttpUrl]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-gold/10 via-gold/5 to-transparent border border-gold/30 rounded-lg p-4 pr-10">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss upgrade banner"
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
        <div className="w-10 h-10 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-heading font-bold text-foreground mb-0.5">
            Upgrade to Pro
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get a custom domain (<span className="font-mono text-gold-dim">.com</span>, <span className="font-mono text-gold-dim">.ink</span>, etc.), unlock the AI assistant, booking agent, and more.
          </p>
        </div>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              Upgrade to Pro
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
