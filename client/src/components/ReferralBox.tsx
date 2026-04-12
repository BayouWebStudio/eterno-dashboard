/*
  DESIGN: Dark Forge — Referral Program Box
  Shows the user's referral link, copy button, and credit stats.
  Fetches from GET /api/dashboard/referral-info on mount.
*/
import { useState, useEffect, useCallback } from "react";
import { Gift, Copy, Check, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  referralCount: number;
  pendingCount: number;
  creditsEarned: number;
  creditsApplied: number;
}

export default function ReferralBox() {
  const { getToken, convexHttpUrl } = useAuth();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const res = await fetch(`${convexHttpUrl}/api/dashboard/referral-info`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setInfo(data);
      } catch {
        /* silently fail — don't break the dashboard */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken, convexHttpUrl]);

  const handleCopy = useCallback(async () => {
    if (!info?.referralLink) return;
    try {
      await navigator.clipboard.writeText(info.referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [info]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 animate-pulse">
        <div className="h-4 bg-border/40 rounded w-32 mb-3" />
        <div className="h-8 bg-border/40 rounded w-full mb-3" />
        <div className="h-3 bg-border/40 rounded w-48" />
      </div>
    );
  }

  if (!info) return null;

  const pendingCredits = info.creditsEarned - info.creditsApplied;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Gift className="w-3.5 h-3.5 text-gold" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Refer & Earn</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
        Share your link — earn 1 free month ($25) for every friend who upgrades to Pro.
      </p>

      {/* Referral link + copy */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-xs font-mono text-muted-foreground truncate">
          {info.referralLink}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gold/10 border border-gold/20 rounded-md text-gold hover:bg-gold/20 transition-colors flex-shrink-0"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="w-3 h-3 text-gold/60" />
          <span>
            <span className="text-foreground font-medium">{info.referralCount}</span> paid referral{info.referralCount !== 1 ? "s" : ""}
          </span>
        </div>
        {info.pendingCount > 0 && (
          <div className="text-muted-foreground/60">
            {info.pendingCount} signed up (waiting to upgrade)
          </div>
        )}
        {info.creditsEarned > 0 && (
          <div className="text-muted-foreground">
            <span className="text-gold font-medium">${info.creditsEarned * 25}</span> earned
          </div>
        )}
        {pendingCredits > 0 && (
          <div className="text-muted-foreground/60">
            ${pendingCredits * 25} credit not yet applied
          </div>
        )}
      </div>
    </div>
  );
}
