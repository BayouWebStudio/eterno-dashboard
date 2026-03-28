/*
  DESIGN: Dark Forge — Overview Page
  Shows site info card, live preview iframe, and quick stats.
  Uses layered dark surfaces with gold accent highlights.
*/
import { useSite } from "@/contexts/SiteContext";
import { ExternalLink, RefreshCw, Globe, Calendar, Palette, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Overview() {
  const { currentSite, siteHtml, loading, refreshHtml, refreshSites } = useSite();

  if (loading && !currentSite) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentSite) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">No sites found for your account.</p>
        <Button variant="outline" onClick={() => refreshSites()} className="border-gold-dim text-gold hover:bg-gold/10">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

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
