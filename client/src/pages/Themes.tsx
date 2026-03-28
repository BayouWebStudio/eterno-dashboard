/*
  DESIGN: Dark Forge — Themes Page
  Grid of theme cards with preview swatches.
  Theme switching is not yet supported by the Convex backend API,
  so clicking "Apply" shows a coming-soon toast instead of erroring.
*/
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Palette, Info } from "lucide-react";

interface ThemeOption {
  id: string;
  name: string;
  description: string;
  colors: { bg: string; accent: string; text: string; card: string };
}

const THEMES: ThemeOption[] = [
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep black with gold accents \u2014 classic tattoo studio feel",
    colors: { bg: "#0a0a0a", accent: "#C9A84C", text: "#e8e0d0", card: "#141414" },
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Dark charcoal with warm amber highlights",
    colors: { bg: "#121212", accent: "#D4A843", text: "#f0e8d8", card: "#1a1a1a" },
  },
  {
    id: "slate",
    name: "Slate",
    description: "Cool dark blue-gray with silver accents",
    colors: { bg: "#0f1419", accent: "#8899aa", text: "#c8d0d8", card: "#1a2028" },
  },
  {
    id: "ivory",
    name: "Ivory",
    description: "Clean light theme with dark text and gold details",
    colors: { bg: "#f5f0e8", accent: "#B8942F", text: "#1a1a1a", card: "#ffffff" },
  },
  {
    id: "crimson",
    name: "Crimson",
    description: "Dark with deep red accents \u2014 bold and dramatic",
    colors: { bg: "#0e0a0a", accent: "#c0392b", text: "#e8d8d8", card: "#1a1212" },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep green tones with warm earth accents",
    colors: { bg: "#0a0e0a", accent: "#6b8f5e", text: "#d8e0d8", card: "#121a12" },
  },
];

export default function Themes() {
  const { currentSite } = useSite();
  const currentTheme = currentSite?.theme || "midnight";

  const handleApply = (themeId: string) => {
    toast("Theme switching coming soon", {
      description: "This feature requires a backend API endpoint that is not yet available. Contact your developer to enable it.",
      icon: <Info className="w-4 h-4 text-gold" />,
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground">Themes</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Preview available themes for your site. Current:{" "}
          <span className="text-gold font-medium">
            {THEMES.find((t) => t.id === currentTheme)?.name || currentTheme}
          </span>
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 rounded-lg border border-gold/20 bg-gold/5">
        <Info className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Theme switching is coming soon. Once the backend API is ready, you will be able to apply
          any of these themes to your live site with one click.
        </p>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEMES.map((theme) => {
          const isActive = theme.id === currentTheme;
          return (
            <div
              key={theme.id}
              className={`
                relative bg-card border rounded-lg overflow-hidden transition-all duration-150
                ${isActive ? "border-gold shadow-[0_0_12px_oklch(0.75_0.12_85/15%)]" : "border-border hover:border-gold-dim"}
              `}
            >
              {/* Color Preview */}
              <div
                className="h-28 relative"
                style={{ backgroundColor: theme.colors.bg }}
              >
                {/* Swatch dots */}
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <div
                    className="w-5 h-5 rounded-full border border-white/20"
                    style={{ backgroundColor: theme.colors.accent }}
                  />
                  <div
                    className="w-5 h-5 rounded-full border border-white/20"
                    style={{ backgroundColor: theme.colors.card }}
                  />
                  <div
                    className="w-5 h-5 rounded-full border border-white/20"
                    style={{ backgroundColor: theme.colors.text }}
                  />
                </div>
                {/* Active checkmark */}
                {isActive && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-[oklch(0.13_0.005_250)]" />
                  </div>
                )}
                {/* Sample text preview */}
                <div className="absolute top-3 left-3">
                  <div
                    className="text-xs font-bold"
                    style={{ color: theme.colors.accent }}
                  >
                    ARTIST NAME
                  </div>
                  <div
                    className="text-[10px] mt-0.5"
                    style={{ color: theme.colors.text }}
                  >
                    Tattoo Studio
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {theme.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  {theme.description}
                </p>
                <Button
                  variant={isActive ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleApply(theme.id)}
                  disabled={isActive}
                  className={
                    isActive
                      ? "border-gold text-gold w-full"
                      : "bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold w-full"
                  }
                >
                  {isActive ? (
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                  ) : (
                    <Palette className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {isActive ? "Active" : "Apply Theme"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
