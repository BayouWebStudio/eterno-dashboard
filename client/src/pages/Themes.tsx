/*
  DESIGN: Dark Forge — Themes Page
  Color themes + font pairing selection with live preview.
*/
import { useState, useEffect, useRef, useCallback } from "react";
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Palette, Loader2, Type } from "lucide-react";

// ── Theme definitions ────────────────────────────────────────────────

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

// ── Font pairing definitions ─────────────────────────────────────────

interface FontPairing {
  id: string;
  name: string;
  heading: string;
  body: string;
  description: string;
}

const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "classic",
    name: "Classic",
    heading: "Cormorant Garamond",
    body: "Inter",
    description: "Elegant serif headings with clean sans-serif body",
  },
  {
    id: "modern",
    name: "Modern",
    heading: "Playfair Display",
    body: "Raleway",
    description: "Bold display headings with geometric body text",
  },
  {
    id: "minimal",
    name: "Minimal",
    heading: "DM Sans",
    body: "DM Sans",
    description: "Clean monofont \u2014 same typeface, different weights",
  },
  {
    id: "editorial",
    name: "Editorial",
    heading: "Libre Baskerville",
    body: "Source Sans 3",
    description: "Traditional editorial style with modern body",
  },
  {
    id: "bold",
    name: "Bold",
    heading: "Oswald",
    body: "Lato",
    description: "Strong condensed headings with neutral body",
  },
  {
    id: "luxury",
    name: "Luxury",
    heading: "Cinzel",
    body: "Montserrat",
    description: "All-caps display serif with versatile sans-serif",
  },
];

// ── Detect current font from site HTML ───────────────────────────────

function detectCurrentFont(html: string): string {
  for (const pairing of FONT_PAIRINGS) {
    if (html.includes(pairing.heading)) return pairing.id;
  }
  return "classic";
}

// ── Load Google Font for preview ─────────────────────────────────────

const loadedFonts = new Set<string>();
function ensureFontLoaded(fontName: string) {
  if (loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

// ── Component ────────────────────────────────────────────────────────

export default function Themes() {
  const { currentSite, applyTheme, refreshHtml, siteHtml } = useSite();
  const currentTheme = currentSite?.theme || "midnight";
  const [applying, setApplying] = useState<string | null>(null);
  const [selectedFont, setSelectedFont] = useState<string>("classic");
  const [applyingFont, setApplyingFont] = useState(false);

  // Detect current font from HTML on load
  useEffect(() => {
    if (siteHtml) {
      setSelectedFont(detectCurrentFont(siteHtml));
    }
  }, [siteHtml]);

  // Preload fonts for preview
  useEffect(() => {
    FONT_PAIRINGS.forEach((p) => {
      ensureFontLoaded(p.heading);
      ensureFontLoaded(p.body);
    });
  }, []);

  const handleApplyTheme = async (theme: ThemeOption) => {
    if (applying) return;
    setApplying(theme.id);
    const ok = await applyTheme(theme.id, theme.colors);
    setApplying(null);
    if (ok) {
      toast.success(`${theme.name} theme applied!`);
      refreshHtml();
    } else {
      toast.error("Failed to apply theme.");
    }
  };

  const handleApplyFont = async (pairing: FontPairing) => {
    if (applyingFont) return;
    setApplyingFont(true);
    const currentColors = THEMES.find((t) => t.id === currentTheme)?.colors || THEMES[0].colors;
    const ok = await applyTheme(currentTheme, currentColors, {
      heading: pairing.heading,
      body: pairing.body,
    });
    setApplyingFont(false);
    if (ok) {
      setSelectedFont(pairing.id);
      toast.success(`${pairing.name} fonts applied!`);
      refreshHtml();
    } else {
      toast.error("Failed to apply fonts.");
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground">Themes</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customize your site's look with colors and fonts
        </p>
      </div>

      {/* ── Colors ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-gold" />
          <h3 className="text-sm font-semibold text-foreground">
            Color Theme
            <span className="ml-2 text-xs font-normal text-gold">
              {THEMES.find((t) => t.id === currentTheme)?.name || currentTheme}
            </span>
          </h3>
        </div>

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
                <div className="h-28 relative" style={{ backgroundColor: theme.colors.bg }}>
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: theme.colors.accent }} />
                    <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: theme.colors.card }} />
                    <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: theme.colors.text }} />
                  </div>
                  {isActive && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-[oklch(0.13_0.005_250)]" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <div className="text-xs font-bold" style={{ color: theme.colors.accent }}>ARTIST NAME</div>
                    <div className="text-[10px] mt-0.5" style={{ color: theme.colors.text }}>Tattoo Studio</div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1">{theme.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{theme.description}</p>
                  <Button
                    variant={isActive ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleApplyTheme(theme)}
                    disabled={isActive || !!applying}
                    className={
                      isActive
                        ? "border-gold text-gold w-full"
                        : "bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold w-full"
                    }
                  >
                    {applying === theme.id ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : isActive ? (
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                    ) : (
                      <Palette className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {applying === theme.id ? "Applying\u2026" : isActive ? "Active" : "Apply Theme"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Fonts ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-gold" />
          <h3 className="text-sm font-semibold text-foreground">
            Font Pairing
            <span className="ml-2 text-xs font-normal text-gold">
              {FONT_PAIRINGS.find((f) => f.id === selectedFont)?.name || "Classic"}
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FONT_PAIRINGS.map((pairing) => {
            const isActive = pairing.id === selectedFont;
            return (
              <div
                key={pairing.id}
                className={`
                  relative bg-card border rounded-lg overflow-hidden transition-all duration-150
                  ${isActive ? "border-gold shadow-[0_0_12px_oklch(0.75_0.12_85/15%)]" : "border-border hover:border-gold-dim"}
                `}
              >
                {/* Font Preview */}
                <div className="h-28 bg-[oklch(0.12_0.005_250)] flex flex-col items-center justify-center gap-2 relative px-4">
                  <span
                    className="text-xl text-foreground leading-tight text-center"
                    style={{ fontFamily: `'${pairing.heading}', serif`, fontWeight: 600 }}
                  >
                    Your Art, Your Story
                  </span>
                  <span
                    className="text-xs text-muted-foreground text-center"
                    style={{ fontFamily: `'${pairing.body}', sans-serif`, fontWeight: 400 }}
                  >
                    Professional tattoo artistry crafted with precision
                  </span>
                  {isActive && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-[oklch(0.13_0.005_250)]" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-0.5">{pairing.name}</h3>
                  <p className="text-[10px] text-muted-foreground/60 mb-1">
                    {pairing.heading} + {pairing.body}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{pairing.description}</p>
                  <Button
                    variant={isActive ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleApplyFont(pairing)}
                    disabled={isActive || applyingFont}
                    className={
                      isActive
                        ? "border-gold text-gold w-full"
                        : "bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold w-full"
                    }
                  >
                    {applyingFont && !isActive ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : isActive ? (
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                    ) : (
                      <Type className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {applyingFont && !isActive ? "Applying\u2026" : isActive ? "Active" : "Apply Fonts"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
