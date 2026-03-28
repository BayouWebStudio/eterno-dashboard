/*
  DESIGN: Dark Forge — Overview Page
  Shows site info card, live preview iframe, and quick stats.
  When no site is found, shows the onboarding flow (Instagram handle input + build).
*/
import { useState } from "react";
import { useSite } from "@/contexts/SiteContext";
import { ExternalLink, RefreshCw, Globe, Calendar, Palette, Languages, Loader2 } from "lucide-react";
import BuildStatusIndicator from "@/components/BuildStatusIndicator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Overview() {
  const {
    currentSite,
    siteHtml,
    loading,
    refreshHtml,
    refreshInfo,
    onboardingStatus,
    buildProgress,
    setupSite,
    error,
  } = useSite();

  // ── Onboarding: no site found ──
  if (onboardingStatus === "none") {
    return <OnboardingPrompt setupSite={setupSite} error={error} />;
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
  const domain = currentSite.domain || `${currentSite.slug}.eternowebstudio.com`;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Site Info Card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground mb-1">
              {currentSite.name}
            </h2>
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gold-dim hover:text-gold transition-colors flex items-center gap-1.5 font-mono"
            >
              {domain}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshHtml()}
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
              <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
                <Globe className="w-3.5 h-3.5 mr-1.5" />
                Visit Site
              </a>
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Globe} label="Domain" value={domain} />
          <StatCard icon={Palette} label="Theme" value={currentSite.theme || "Default"} />
          <StatCard icon={Languages} label="Language" value={currentSite.lang || "EN"} />
          <StatCard icon={Calendar} label="Plan" value={currentSite.plan || "Standard"} />
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Live Preview</h3>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
        </div>
        <div className="relative bg-[oklch(0.08_0.005_250)]">
          {siteHtml ? (
            <iframe
              srcDoc={siteHtml}
              title="Site Preview"
              className="w-full h-[500px] border-0"
              sandbox="allow-scripts"
            />
          ) : (
            <div className="h-[500px] flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading preview...</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-muted-foreground text-sm mb-3">No preview available</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshHtml()}
                    className="border-gold-dim text-gold hover:bg-gold/10"
                  >
                    Load Preview
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickAction
          title="Edit Sections"
          description="Update hero, about, booking, and more"
          href="/sections"
          icon="🦸"
        />
        <QuickAction
          title="Manage Gallery"
          description="Add, remove, or reorder photos"
          href="/gallery"
          icon="📷"
        />
        <QuickAction
          title="Change Theme"
          description="Switch colors and visual style"
          href="/themes"
          icon="🎨"
        />
      </div>
    </div>
  );
}

/* ── Country options ── */
const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "MX", name: "Mexico" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "ES", name: "Spain" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "IT", name: "Italy" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CO", name: "Colombia" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Peru" },
  { code: "AU", name: "Australia" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "IN", name: "India" },
  { code: "PH", name: "Philippines" },
  { code: "TH", name: "Thailand" },
  { code: "NL", name: "Netherlands" },
  { code: "PT", name: "Portugal" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "PL", name: "Poland" },
  { code: "PR", name: "Puerto Rico" },
  { code: "CR", name: "Costa Rica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "GT", name: "Guatemala" },
  { code: "HN", name: "Honduras" },
  { code: "SV", name: "El Salvador" },
  { code: "NI", name: "Nicaragua" },
  { code: "PA", name: "Panama" },
  { code: "EC", name: "Ecuador" },
  { code: "VE", name: "Venezuela" },
  { code: "UY", name: "Uruguay" },
  { code: "PY", name: "Paraguay" },
  { code: "BO", name: "Bolivia" },
  { code: "CU", name: "Cuba" },
  { code: "ZA", name: "South Africa" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
];

/* ── Onboarding Prompt ── */
function OnboardingPrompt({
  setupSite,
  error,
}: {
  setupSite: (handle: string, country: string) => Promise<boolean>;
  error: string | null;
}) {
  const [handle, setHandle] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const cleaned = handle.trim().replace(/^@/, "");
    if (!cleaned) {
      toast.error("Enter your Instagram handle");
      return;
    }
    if (!country) {
      toast.error("Select your country");
      return;
    }
    setSubmitting(true);
    const ok = await setupSite(cleaned, country);
    if (!ok) {
      setSubmitting(false);
      if (error) toast.error(error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center px-6">
        <div className="text-5xl mb-5">🌿</div>
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
          Welcome to Eterno Web Studio
        </h2>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Enter your Instagram handle and country, and we'll build your free website in under 5 minutes.
        </p>

        <div className="flex flex-col gap-3 max-w-sm mx-auto mb-6">
          {/* Instagram handle */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              @
            </span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="yourhandle"
              disabled={submitting}
              className="w-full bg-input border border-border rounded-lg pl-8 pr-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Country selector */}
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={submitting}
            className="w-full bg-input border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors disabled:opacity-50 appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          >
            <option value="" disabled>Select your country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !handle.trim() || !country}
            className="w-full bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-bold px-6 py-3 disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Build My Site →"
            )}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-4">{error}</p>
        )}

        <p className="text-xs text-muted-foreground/60">
          Once your site is live, you can pick your custom .com domain from the Overview tab.
        </p>
      </div>
    </div>
  );
}

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
    <a
      href={href}
      className="block bg-card border border-border rounded-lg p-4 hover:border-gold-dim transition-all duration-150 group"
    >
      <span className="text-xl mb-2 block">{icon}</span>
      <h4 className="text-sm font-semibold text-foreground group-hover:text-gold transition-colors mb-1">
        {title}
      </h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </a>
  );
}
