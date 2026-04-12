/*
  DESIGN: Dark Forge — Build Wizard / Step 2: Theme picker
  6 themes matching backend STYLE_MAP + 1 "Let us pick" auto card.
  Color swatches use the exact hex values from signatureCreateV2.ts so
  the preview matches the real site the user will get.
*/
import { useEffect } from "react";
import { Sparkles, Check } from "lucide-react";
import type { ThemeKey, WizardState } from "./types";

interface ThemePreview {
  key: Exclude<ThemeKey, "auto">;
  label: string;
  pitch: string;
  accent: string;
  bg: string;
  charcoal: string;
  headlineFont: string;
  bodyFont: string;
  // Just the font names for a preview word
  headlineFontFamily: string;
  bodyFontFamily: string;
}

const THEMES: ThemePreview[] = [
  {
    key: "geometric",
    label: "Geometric",
    pitch: "Clean lines, serif elegance, gold accents",
    accent: "#C9A84C",
    bg: "#0a0a0a",
    charcoal: "#141414",
    headlineFont: "'Cormorant Garamond', Georgia, serif",
    bodyFont: "'Inter', sans-serif",
    headlineFontFamily: "Cormorant Garamond",
    bodyFontFamily: "Inter",
  },
  {
    key: "neo_traditional",
    label: "Neo Traditional",
    pitch: "Bold reds, Bebas Neue display",
    accent: "#C0392B",
    bg: "#0a0505",
    charcoal: "#1a0a0a",
    headlineFont: "'Bebas Neue', cursive",
    bodyFont: "'DM Sans', sans-serif",
    headlineFontFamily: "Bebas Neue",
    bodyFontFamily: "DM Sans",
  },
  {
    key: "blackwork",
    label: "Blackwork",
    pitch: "Silver on black, editorial serif",
    accent: "#C0C0C0",
    bg: "#050508",
    charcoal: "#0f0f14",
    headlineFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Inter', sans-serif",
    headlineFontFamily: "Playfair Display",
    bodyFontFamily: "Inter",
  },
  {
    key: "realism",
    label: "Realism",
    pitch: "Copper tones, classic serif",
    accent: "#B87333",
    bg: "#0a0603",
    charcoal: "#160e06",
    headlineFont: "'Libre Baskerville', Georgia, serif",
    bodyFont: "'Source Sans 3', sans-serif",
    headlineFontFamily: "Libre Baskerville",
    bodyFontFamily: "Source Sans 3",
  },
  {
    key: "new_school",
    label: "New School",
    pitch: "Vivid blue, modern sans",
    accent: "#2563EB",
    bg: "#05050a",
    charcoal: "#0f0f1a",
    headlineFont: "'Syne', sans-serif",
    bodyFont: "'DM Sans', sans-serif",
    headlineFontFamily: "Syne",
    bodyFontFamily: "DM Sans",
  },
  {
    key: "watercolor",
    label: "Watercolor",
    pitch: "Teal + soft serif, airy",
    accent: "#0D9488",
    bg: "#050a09",
    charcoal: "#0a1410",
    headlineFont: "'Cormorant Garamond', Georgia, serif",
    bodyFont: "'Nunito', sans-serif",
    headlineFontFamily: "Cormorant Garamond",
    bodyFontFamily: "Nunito",
  },
];

// All Google Fonts used across the 6 themes, loaded lazily on mount.
const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Inter:wght@400;500&family=Bebas+Neue&family=DM+Sans:wght@400;500&family=Playfair+Display:wght@600&family=Libre+Baskerville:wght@700&family=Source+Sans+3:wght@400&family=Syne:wght@600&family=Nunito:wght@400&display=swap";

interface StepThemeProps {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

export default function StepTheme({ state, onChange }: StepThemeProps) {
  // Lazy-load Google Fonts only when this step mounts
  useEffect(() => {
    const LINK_ID = "wizard-theme-fonts";
    if (document.getElementById(LINK_ID)) return;
    const link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-1">
          Pick your style
        </h2>
        <p className="text-sm text-muted-foreground">
          This sets your fonts and accent color. You can change it anytime from the Themes page.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto">
        {THEMES.map((t) => {
          const selected = state.themeKey === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange({ themeKey: t.key })}
              className={`relative text-left rounded-xl border p-4 transition-all duration-150 ${
                selected
                  ? "border-gold ring-2 ring-gold/30 bg-gold/5"
                  : "border-border bg-card hover:border-gold/40"
              }`}
            >
              {selected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                  <Check className="w-3 h-3 text-[oklch(0.13_0.005_250)]" strokeWidth={3} />
                </div>
              )}
              {/* 3-stripe color swatch */}
              <div className="h-14 rounded-md overflow-hidden border border-border/50 mb-3 flex">
                <div className="flex-1" style={{ background: t.bg }} />
                <div className="flex-1" style={{ background: t.charcoal }} />
                <div className="flex-1" style={{ background: t.accent }} />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-0.5">{t.label}</h3>
              <p className="text-[11px] text-muted-foreground leading-tight mb-3">{t.pitch}</p>
              {/* Font previews */}
              <div className="flex items-baseline gap-2">
                <span
                  className="text-lg"
                  style={{ fontFamily: t.headlineFont, color: t.accent }}
                >
                  Aa
                </span>
                <span
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: t.bodyFont }}
                >
                  {t.headlineFontFamily} · {t.bodyFontFamily}
                </span>
              </div>
            </button>
          );
        })}

        {/* "Let us pick" — auto option */}
        <button
          type="button"
          onClick={() => onChange({ themeKey: "auto" })}
          className={`relative text-left rounded-xl border p-4 transition-all duration-150 ${
            state.themeKey === "auto"
              ? "border-gold ring-2 ring-gold/30 bg-gold/5"
              : "border-border border-dashed bg-card hover:border-gold/40"
          }`}
        >
          {state.themeKey === "auto" && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
              <Check className="w-3 h-3 text-[oklch(0.13_0.005_250)]" strokeWidth={3} />
            </div>
          )}
          <div className="h-14 rounded-md overflow-hidden border border-border/50 mb-3 flex items-center justify-center bg-[oklch(0.13_0.005_250)]">
            <Sparkles className="w-6 h-6 text-gold" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-0.5">Let us pick</h3>
          <p className="text-[11px] text-muted-foreground leading-tight">
            We'll detect the right style from your Instagram photos.
          </p>
        </button>
      </div>
    </div>
  );
}
