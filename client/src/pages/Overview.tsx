/*
  DESIGN: Dark Forge — Overview Page
  Shows site info card, live preview iframe, and quick stats.
  When no site is found, shows a two-path onboarding:
    1. "I already have a site" → connect by Instagram handle
    2. "Build a new site" → create from scratch
*/
import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useSite, type SetupSiteInput } from "@/contexts/SiteContext";
import {
  ExternalLink, RefreshCw, Globe, Calendar, Palette, Languages,
  Loader2, Link2, Rocket, ArrowLeft, CheckCircle2, Monitor, Code2, Sparkles
} from "lucide-react";
import BuildStatusIndicator from "@/components/BuildStatusIndicator";
import AnalyticsCard from "@/components/AnalyticsCard";
import SeoScoreCard from "@/components/SeoScoreCard";
import InstagramSync from "@/components/InstagramSync";
import BuildWizard from "@/components/onboarding/BuildWizard";
import UpgradeBanner from "@/components/UpgradeBanner";
import ReferralBox from "@/components/ReferralBox";
import { PENDING_BUILD_KEY } from "@/pages/Start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Overview() {
  const {
    currentSite,
    siteHtml,
    loading,
    htmlLoading,
    refreshHtml,
    refreshInfo,
    onboardingStatus,
    buildProgress,
    setupSite,
    connectSite,
    error,
  } = useSite();

  // ── All hooks MUST be called before any early returns (React Rules of Hooks) ──
  const [previewMode, setPreviewMode] = useState<"live" | "source">("live");
  const [iframeKey, setIframeKey] = useState(0);

  // Handle ?upgraded=1 from Stripe success_url — shown briefly while the webhook
  // catches up. Polls refreshInfo() up to 10 times (every 1s) until plan flips to pro,
  // then clears the query param so it doesn't re-trigger on next reload.
  const [upgradePolling, setUpgradePolling] = useState(false);
  const upgradePollCountRef = useRef(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "1") return;
    setUpgradePolling(true);
    upgradePollCountRef.current = 0;
    const timer = setInterval(async () => {
      upgradePollCountRef.current++;
      await refreshInfo();
      if (upgradePollCountRef.current >= 10) {
        clearInterval(timer);
        setUpgradePolling(false);
        // Clear the query param regardless of outcome
        const url = new URL(window.location.href);
        url.searchParams.delete("upgraded");
        window.history.replaceState({}, "", url.toString());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshInfo]);

  // When the plan flips to pro during polling, stop polling immediately + show success
  useEffect(() => {
    if (!upgradePolling) return;
    if (currentSite?.plan === "pro") {
      setUpgradePolling(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("upgraded");
      window.history.replaceState({}, "", url.toString());
      toast.success("You're now on Pro! Custom domains and Pro features are unlocked.");
    }
  }, [upgradePolling, currentSite?.plan]);

  // Pending build handoff from public /start wizard.
  // When a new user completes the wizard on /start, their input is stashed
  // in localStorage under PENDING_BUILD_KEY. After they sign up and land here,
  // we auto-submit that input and kick off the build.
  const pendingBuildTriggeredRef = useRef(false);
  useEffect(() => {
    if (pendingBuildTriggeredRef.current) return;
    if (onboardingStatus !== "none") return;
    if (typeof window === "undefined") return;
    let raw: string | null = null;
    try { raw = localStorage.getItem(PENDING_BUILD_KEY); } catch { return; }
    if (!raw) return;
    let input: SetupSiteInput;
    try {
      input = JSON.parse(raw) as SetupSiteInput;
    } catch {
      try { localStorage.removeItem(PENDING_BUILD_KEY); } catch {}
      return;
    }
    if (!input?.igHandle || !input?.country) {
      try { localStorage.removeItem(PENDING_BUILD_KEY); } catch {}
      return;
    }
    pendingBuildTriggeredRef.current = true;
    // Don't clear localStorage until setupSite succeeds — if the build
    // fails (network, timeout, etc.) the user can refresh to retry
    // instead of redoing the entire wizard.
    setupSite(input).then((ok) => {
      if (ok) {
        try { localStorage.removeItem(PENDING_BUILD_KEY); } catch {}
      }
    });
  }, [onboardingStatus, setupSite]);

  const handleRefreshPreview = useCallback(() => {
    if (previewMode === "live") {
      setIframeKey((k) => k + 1);
    } else {
      refreshHtml();
    }
  }, [previewMode, refreshHtml]);

  // ── Onboarding: no site found ──
  if (onboardingStatus === "none") {
    return (
      <OnboardingFlow
        setupSite={setupSite}
        connectSite={connectSite}
        error={error}
      />
    );
  }

  // ── Connecting: linking an existing site ──
  if (onboardingStatus === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/10 border border-gold/20">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
        <div className="text-center">
          <h2 className="font-heading text-xl font-bold text-foreground mb-2">
            Connecting Your Site
          </h2>
          <p className="text-sm text-muted-foreground">
            Looking up your site and linking it to your account...
          </p>
        </div>
      </div>
    );
  }

  // ── Building: site is being created ──
  if (onboardingStatus === "building") {
    return <BuildStatusIndicator buildProgress={buildProgress} error={error} />;
  }

  // ── Loading state ──
  if (loading && !currentSite) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Idle / not yet loaded ──
  if (!currentSite) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Loading your site info...</p>
        <Button variant="outline" onClick={() => refreshInfo()} className="border-gold-dim text-gold hover:bg-gold/10">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  // ── Site loaded: show overview ──
  // For custom domains use the domain directly; for default sites use path format
  // Trailing slash is required for GitHub Pages subdirectory URLs to resolve to index.html
  const liveUrl = currentSite.domain
    ? `https://${currentSite.domain}/`
    : `https://eternowebstudio.com/${currentSite.slug}/`;
  const displayDomain = currentSite.domain || `eternowebstudio.com/${currentSite.slug}`;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Upgrade polling loader (Stripe webhook async race) */}
      {upgradePolling && (
        <div className="bg-gold/5 border border-gold/30 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-gold animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Activating Pro...</p>
            <p className="text-xs text-muted-foreground">
              Confirming your upgrade with Stripe. This usually takes just a few seconds.
            </p>
          </div>
        </div>
      )}

      {/* Upgrade banner (free plan only) */}
      {currentSite.plan === "free" && !upgradePolling && <UpgradeBanner />}

      {/* Referral Program */}
      <ReferralBox />

      {/* Site Info Card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground mb-1">
              {currentSite.name}
            </h2>
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gold-dim hover:text-gold transition-colors flex items-center gap-1.5 font-mono"
            >
              {displayDomain}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshPreview}
              disabled={loading}
              className="border-border text-muted-foreground hover:text-foreground hover:border-gold-dim"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold"
            >
              <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                <Globe className="w-3.5 h-3.5 mr-1.5" />
                Visit Site
              </a>
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Globe} label="Domain" value={displayDomain} />
          <StatCard icon={Palette} label="Theme" value={currentSite.theme || "Default"} />
          <StatCard icon={Languages} label="Language" value={currentSite.lang || "EN"} />
          <StatCard icon={Calendar} label="Plan" value={currentSite.plan || "Standard"} />
        </div>
      </div>

      {/* Analytics & SEO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnalyticsCard />
        <SeoScoreCard />
      </div>

      {/* Instagram Auto-Sync */}
      <InstagramSync />

      {/* Live Preview */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-foreground">Live Preview</h3>
            {/* Toggle: Live Site vs Source HTML */}
            <div className="flex items-center bg-[oklch(0.13_0.005_250)] rounded-md p-0.5 border border-border/50">
              <button
                onClick={() => setPreviewMode("live")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  previewMode === "live"
                    ? "bg-gold/15 text-gold border border-gold/30"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <Monitor className="w-3 h-3" />
                Live Site
              </button>
              <button
                onClick={() => { setPreviewMode("source"); if (!siteHtml) refreshHtml(); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  previewMode === "source"
                    ? "bg-gold/15 text-gold border border-gold/30"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <Code2 className="w-3 h-3" />
                Source HTML
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
        </div>
        {/* URL bar */}
        {previewMode === "live" && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-[oklch(0.10_0.005_250)] border-b border-border/50">
            <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground font-mono truncate">{liveUrl}</span>
          </div>
        )}
        <div className="relative bg-[oklch(0.08_0.005_250)]">
          {previewMode === "live" ? (
            <iframe
              key={iframeKey}
              src={`${liveUrl}?_cb=${iframeKey}`}
              title="Live Site Preview"
              className="w-full h-[500px] border-0"
              sandbox="allow-scripts"
            />
          ) : siteHtml ? (
            <iframe
              srcDoc={siteHtml}
              title="Source HTML Preview"
              className="w-full h-[500px] border-0"
              sandbox="allow-scripts"
            />
          ) : (
            <div className="h-[500px] flex items-center justify-center">
              {loading || htmlLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading source HTML...</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-muted-foreground text-sm mb-3">No source HTML available</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshHtml()}
                    className="border-gold-dim text-gold hover:bg-gold/10"
                  >
                    Load Source HTML
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAction
          title="Edit Sections"
          description="Update hero, about, booking, and more"
          href="/sections"
          icon="🦸"
        />
        <QuickAction
          title="Manage Store"
          description="Update shop items and pricing"
          href="/store"
          icon="🛍️"
        />
        <QuickAction
          title="Change Theme"
          description="Switch colors and visual style"
          href="/themes"
          icon="🎨"
        />
        <div
          onClick={() => window.dispatchEvent(new CustomEvent("eterno:start-tour"))}
          className="block bg-card border border-border rounded-lg p-4 hover:border-gold-dim transition-all duration-150 group cursor-pointer"
        >
          <div className="text-2xl mb-2">🗺️</div>
          <div className="text-sm font-medium text-foreground group-hover:text-gold transition-colors">Take the Tour</div>
          <p className="text-xs text-muted-foreground mt-1">Replay the dashboard walkthrough</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ONBOARDING FLOW — Two-path: Connect Existing or Build New
   ═══════════════════════════════════════════════════════════════ */

type OnboardingPath = "choose" | "connect" | "build";

function OnboardingFlow({
  setupSite,
  connectSite,
  error,
}: {
  setupSite: (input: SetupSiteInput) => Promise<boolean>;
  connectSite: (handle: string) => Promise<{ success: boolean; error?: string }>;
  error: string | null;
}) {
  const [path, setPath] = useState<OnboardingPath>("choose");

  if (path === "connect") {
    return <ConnectSiteForm connectSite={connectSite} error={error} onBack={() => setPath("choose")} />;
  }

  if (path === "build") {
    return <BuildWizard setupSite={setupSite} error={error} onBack={() => setPath("choose")} />;
  }

  // ── Choose path ──
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-lg w-full text-center px-6">
        <div className="text-5xl mb-5">🌿</div>
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
          Welcome to Eterno Web Studio
        </h2>
        <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
          Let's get your website set up. Do you already have a site built with us,
          or would you like to create a new one?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
          {/* Connect existing */}
          <button
            onClick={() => setPath("connect")}
            className="group relative bg-card border border-border rounded-xl p-6 text-left hover:border-gold/50 transition-all duration-150 cursor-pointer"
          >
            <div className="absolute top-0 left-0 w-full h-1 rounded-t-xl bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
            <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
              <Link2 className="w-5 h-5 text-gold" />
            </div>
            <h3 className="font-heading text-sm font-bold text-foreground mb-1.5 group-hover:text-gold transition-colors">
              I Already Have a Site
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect your existing Eterno website to this dashboard using your Instagram handle.
            </p>
          </button>

          {/* Build new */}
          <button
            onClick={() => setPath("build")}
            className="group relative bg-card border border-border rounded-xl p-6 text-left hover:border-gold/50 transition-all duration-150 cursor-pointer"
          >
            <div className="absolute top-0 left-0 w-full h-1 rounded-t-xl bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
            <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
              <Rocket className="w-5 h-5 text-gold" />
            </div>
            <h3 className="font-heading text-sm font-bold text-foreground mb-1.5 group-hover:text-gold transition-colors">
              Build a New Site
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create a brand new website from your Instagram. It takes about 5 minutes.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Connect Existing Site Form ── */
function ConnectSiteForm({
  connectSite,
  error,
  onBack,
}: {
  connectSite: (handle: string) => Promise<{ success: boolean; error?: string }>;
  error: string | null;
  onBack: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const cleaned = handle.trim().replace(/^@/, "");
    if (!cleaned) {
      toast.error("Enter your Instagram handle");
      return;
    }
    setSubmitting(true);
    setLocalError(null);

    const result = await connectSite(cleaned);
    if (!result.success) {
      setSubmitting(false);
      setLocalError(result.error || "Could not connect site");
      toast.error(result.error || "Could not connect site");
    }
    // If success, SiteContext will update onboardingStatus to "ready" automatically
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center px-6">
        {/* Back button */}
        <button
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold transition-colors mb-8 disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-5">
          <Link2 className="w-6 h-6 text-gold" />
        </div>

        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
          Connect Your Site
        </h2>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Enter the Instagram handle that was used to build your site.
          We'll find it and link it to your account.
        </p>

        <div className="flex flex-col gap-3 max-w-sm mx-auto mb-6">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              @
            </span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="tattoosbypaketh"
              disabled={submitting}
              className="w-full bg-input border border-border rounded-lg pl-8 pr-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors disabled:opacity-50"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !handle.trim()}
            className="w-full bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-bold px-6 py-3 disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Connect Site
              </>
            )}
          </Button>
        </div>

        {(localError || error) && (
          <div className="max-w-sm mx-auto mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{localError || error}</p>
            <p className="text-xs text-destructive/60 mt-1">
              Make sure you're using the exact Instagram handle that was used when the site was created.
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground/60">
          Example: if your site is <span className="font-mono text-gold-dim">tattoosbypaketh.eternowebstudio.com</span>,
          enter <span className="font-mono text-gold-dim">tattoosbypaketh</span>
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-[oklch(0.13_0.005_250)] rounded-md p-3 border border-border/50">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-gold-dim" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

function QuickAction({ title, description, href, icon }: { title: string; description: string; href: string; icon: string }) {
  return (
    <Link
      href={href}
      className="block bg-card border border-border rounded-lg p-4 hover:border-gold-dim transition-all duration-150 group"
    >
      <span className="text-xl mb-2 block">{icon}</span>
      <h4 className="text-sm font-semibold text-foreground group-hover:text-gold transition-colors mb-1">
        {title}
      </h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}
