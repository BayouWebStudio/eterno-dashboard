/*
  DESIGN: Dark Forge — Themes Page (v2)
  Custom color picker, font selector, and live preview.
  - 6 presets as starting points
  - 4 color pickers (bg, accent, text, card) populate from preset or freehand
  - Heading + body font dropdowns with Google Fonts
  - Live iframe preview with CSS overrides
  - Calls save-theme (colors → all pages) + apply-theme (fonts → index.html)
*/
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Check,
  Palette,
  Loader2,
  ChevronDown,
  ChevronUp,
  Type,
  Eye,
} from "lucide-react";

/* ── Preset Themes ── */
interface ThemePreset {
  id: string;
  name: string;
  colors: { bg: string; accent: string; text: string; card: string };
}

const PRESETS: ThemePreset[] = [
  { id: "midnight",  name: "Midnight",  colors: { bg: "#0a0a0a", accent: "#C9A84C", text: "#e8e0d0", card: "#141414" } },
  { id: "obsidian",  name: "Obsidian",  colors: { bg: "#121212", accent: "#D4A843", text: "#f0e8d8", card: "#1a1a1a" } },
  { id: "slate",     name: "Slate",     colors: { bg: "#0f1419", accent: "#8899aa", text: "#c8d0d8", card: "#1a2028" } },
  { id: "ivory",     name: "Ivory",     colors: { bg: "#f5f0e8", accent: "#B8942F", text: "#1a1a1a", card: "#ffffff" } },
  { id: "crimson",   name: "Crimson",   colors: { bg: "#0e0a0a", accent: "#c0392b", text: "#e8d8d8", card: "#1a1212" } },
  { id: "forest",    name: "Forest",    colors: { bg: "#0a0e0a", accent: "#6b8f5e", text: "#d8e0d8", card: "#121a12" } },
];

/* ── Font Options ── */
const HEADING_FONTS = [
  "Cormorant Garamond",
  "Bebas Neue",
  "Playfair Display",
  "Libre Baskerville",
  "Syne",
  "Cinzel",
  "Oswald",
  "Lora",
  "Montserrat",
  "Outfit",
  "DM Serif Display",
  "Archivo Black",
];

const BODY_FONTS = [
  "Inter",
  "DM Sans",
  "Source Sans 3",
  "Nunito",
  "Lato",
  "Roboto",
  "Work Sans",
  "Outfit",
  "Montserrat",
  "Open Sans",
  "Raleway",
  "Poppins",
];

/* ── Helpers ── */
/** Normalize any hex string to 6-digit lowercase (handles 3-digit shorthand). */
function normalizeHex(hex: string): string {
  let h = hex.replace("#", "").toLowerCase();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6 || !/^[0-9a-f]{6}$/.test(h)) return "000000"; // fallback
  return h;
}
function computeDim(text: string): string {
  return `#${normalizeHex(text)}99`; // 8-digit hex with 60% alpha
}
function computeBorder(card: string): string {
  const hex = normalizeHex(card);
  const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + 30);
  const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + 30);
  const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + 30);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
/** Check if a hex string is a valid complete color. */
function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

function buildGoogleFontsUrl(heading: string, body: string): string {
  const families = new Set([heading, body]);
  const params = Array.from(families)
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700;800;900`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/* ── Preload Google Fonts ── */
function usePreloadFonts() {
  useEffect(() => {
    const allFonts = [...new Set([...HEADING_FONTS, ...BODY_FONTS])];
    const params = allFonts
      .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;700`)
      .join("&");
    const url = `https://fonts.googleapis.com/css2?${params}&display=swap`;

    // Don't add duplicate links
    const existing = document.querySelector(`link[href="${url}"]`);
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, []);
}

/* ── Color Input Component ── */
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Separate text state so partial hex input doesn't break the preview
  const [textValue, setTextValue] = useState(value);
  // Sync text when parent value changes (e.g. preset selection)
  useEffect(() => { setTextValue(value); }, [value]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={isValidHex(value) ? value : "#000000"}
          onChange={(e) => {
            onChange(e.target.value);
            setTextValue(e.target.value);
          }}
          className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground">{label}</div>
        <input
          type="text"
          value={textValue}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
              setTextValue(v);
              // Only propagate to color state when it's a valid complete hex
              if (isValidHex(v)) onChange(v);
            }
          }}
          onBlur={() => {
            // On blur, snap back to the last valid color if incomplete
            if (!isValidHex(textValue)) setTextValue(value);
          }}
          className="text-[11px] text-muted-foreground bg-transparent border-none outline-none w-20 font-mono"
          maxLength={7}
        />
      </div>
    </div>
  );
}

/* ── Font Select Component ── */
function FontSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground mb-1.5 block">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[oklch(0.16_0.005_250)] border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors cursor-pointer"
        style={{ fontFamily: value }}
      >
        {options.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ══════════════════════════════════════
   Main Component
   ══════════════════════════════════════ */
export default function Themes() {
  const { currentSite, siteHtml, applyTheme, refreshHtml, refreshInfo } = useSite();

  // Build base URL for resolving relative paths in srcdoc iframe
  const siteBaseUrl = currentSite?.domain
    ? `https://${currentSite.domain}/`
    : currentSite?.slug
      ? `https://eternowebstudio.com/${currentSite.slug}/`
      : "";
  const currentTheme = currentSite?.theme || "midnight";

  usePreloadFonts();

  // ── Color state ──
  const defaultPreset = PRESETS.find((p) => p.id === currentTheme) || PRESETS[0];
  const [colors, setColors] = useState(defaultPreset.colors);
  const [activePreset, setActivePreset] = useState<string | null>(defaultPreset.id);

  // ── Font state ──
  const [headingFont, setHeadingFont] = useState("Cormorant Garamond");
  const [bodyFont, setBodyFont] = useState("Inter");

  // Sync colors when site/theme changes (e.g. user switches sites)
  useEffect(() => {
    const preset = PRESETS.find((p) => p.id === currentTheme);
    if (preset) {
      setColors({ ...preset.colors });
      setActivePreset(preset.id);
    }
  }, [currentTheme]);

  // ── UI state ──
  const [applying, setApplying] = useState(false);
  const [showPresets, setShowPresets] = useState(true);

  // Debounce ref for live preview
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedColors, setDebouncedColors] = useState(colors);
  const [debouncedHeading, setDebouncedHeading] = useState(headingFont);
  const [debouncedBody, setDebouncedBody] = useState(bodyFont);

  // Debounce color/font changes for preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedColors({ ...colors });
      setDebouncedHeading(headingFont);
      setDebouncedBody(bodyFont);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [colors, headingFont, bodyFont]);

  // ── Preset click handler ──
  const selectPreset = useCallback((preset: ThemePreset) => {
    setColors({ ...preset.colors });
    setActivePreset(preset.id);
  }, []);

  // ── Color change handler ──
  const updateColor = useCallback(
    (key: keyof typeof colors, value: string) => {
      setColors((prev) => ({ ...prev, [key]: value }));
      setActivePreset(null); // custom = no preset active
    },
    []
  );

  // ── Build preview HTML with CSS overrides ──
  const previewHtml = useMemo(() => {
    if (!siteHtml) return "";

    const dim = computeDim(debouncedColors.text);
    const border = computeBorder(debouncedColors.card);

    const baseTag = siteBaseUrl ? `<base href="${siteBaseUrl}">` : "";

    const overrideBlock = `${baseTag}
<link rel="stylesheet" href="${buildGoogleFontsUrl(debouncedHeading, debouncedBody)}">
<style>
  :root {
    --black: ${debouncedColors.bg} !important;
    --charcoal: ${debouncedColors.card} !important;
    --gold: ${debouncedColors.accent} !important;
    --white: ${debouncedColors.text} !important;
    --dim: ${dim} !important;
    --border: ${border} !important;
  }
  .hero-title, .section-title, .nav-logo, .stat-number, .style-card h3, .service-card h3 {
    font-family: '${debouncedHeading}', serif !important;
  }
  body, p, a, span, li, td, input, textarea, select, button {
    font-family: '${debouncedBody}', sans-serif !important;
  }
</style>`;

    // Remove any existing <base> tag to avoid conflicts
    let html = siteHtml.replace(/<base[^>]*>/gi, "");

    // Inject after <head> (case-insensitive; base tag must come first so relative URLs resolve)
    if (/<head>/i.test(html)) {
      return html.replace(/<head>/i, "$&\n" + overrideBlock);
    }
    // Fallback: inject before </head>
    if (/<\/head>/i.test(html)) {
      return html.replace(/<\/head>/i, overrideBlock + "\n$&");
    }
    return overrideBlock + html;
  }, [siteHtml, siteBaseUrl, debouncedColors, debouncedHeading, debouncedBody]);

  // ── Apply handler ──
  const handleApply = async () => {
    if (applying) return;
    setApplying(true);
    try {
      // applyTheme now handles both colors (all pages) + fonts (index.html)
      const ok = await applyTheme(activePreset || "custom", colors, {
        heading: headingFont,
        body: bodyFont,
      });
      if (ok) {
        toast.success("Theme applied! Allow 3–5 min for live site.");
        refreshInfo();
        refreshHtml();
      } else {
        toast.error("Failed to apply theme.");
      }
    } catch {
      toast.error("Failed to apply theme.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground">
          Themes
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customize your site&apos;s colors and fonts. Changes preview instantly
          below.
        </p>
      </div>

      {/* Two-column layout: Controls + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── LEFT: Controls (~40%) ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Preset Themes */}
          <div className="bg-card border border-border rounded-lg p-4">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-gold" />
                <span className="text-sm font-semibold text-foreground">
                  Preset Themes
                </span>
              </div>
              {showPresets ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {showPresets && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {PRESETS.map((preset) => {
                  const isActive = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => selectPreset(preset)}
                      className={`relative rounded-lg border overflow-hidden transition-all ${
                        isActive
                          ? "border-gold shadow-[0_0_8px_oklch(0.75_0.12_85/15%)]"
                          : "border-border hover:border-gold-dim"
                      }`}
                    >
                      <div
                        className="h-12 flex items-end p-1.5"
                        style={{ backgroundColor: preset.colors.bg }}
                      >
                        <div className="flex gap-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: preset.colors.accent }}
                          />
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: preset.colors.text }}
                          />
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: preset.colors.card }}
                          />
                        </div>
                      </div>
                      <div className="px-2 py-1.5 bg-card">
                        <span className="text-[11px] font-medium text-foreground">
                          {preset.name}
                        </span>
                      </div>
                      {isActive && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gold flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-[oklch(0.13_0.005_250)]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Colors */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-4 h-4 rounded-full border border-border"
                style={{
                  background: `linear-gradient(135deg, ${colors.accent}, ${colors.bg})`,
                }}
              />
              <span className="text-sm font-semibold text-foreground">
                Colors
              </span>
              {!activePreset && (
                <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded-full font-medium">
                  Custom
                </span>
              )}
            </div>
            <ColorPicker
              label="Background"
              value={colors.bg}
              onChange={(v) => updateColor("bg", v)}
            />
            <ColorPicker
              label="Accent"
              value={colors.accent}
              onChange={(v) => updateColor("accent", v)}
            />
            <ColorPicker
              label="Text"
              value={colors.text}
              onChange={(v) => updateColor("text", v)}
            />
            <ColorPicker
              label="Card"
              value={colors.card}
              onChange={(v) => updateColor("card", v)}
            />
          </div>

          {/* Fonts */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Type className="w-4 h-4 text-gold" />
              <span className="text-sm font-semibold text-foreground">
                Fonts
              </span>
            </div>
            <FontSelect
              label="Heading Font"
              value={headingFont}
              options={HEADING_FONTS}
              onChange={setHeadingFont}
            />
            <FontSelect
              label="Body Font"
              value={bodyFont}
              options={BODY_FONTS}
              onChange={setBodyFont}
            />
            {/* Font preview */}
            <div
              className="rounded-lg p-3 mt-2"
              style={{ backgroundColor: colors.bg }}
            >
              <div
                className="text-base font-bold mb-1"
                style={{ fontFamily: headingFont, color: colors.accent }}
              >
                Heading Preview
              </div>
              <div
                className="text-xs leading-relaxed"
                style={{ fontFamily: bodyFont, color: colors.text }}
              >
                Body text preview — this is how your site content will look with
                the selected fonts and colors.
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <Button
            onClick={handleApply}
            disabled={applying}
            className="w-full bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold h-11"
          >
            {applying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying…
              </>
            ) : (
              <>
                <Palette className="w-4 h-4 mr-2" />
                Apply Theme
              </>
            )}
          </Button>
        </div>

        {/* ── RIGHT: Live Preview (~60%) ── */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
              <Eye className="w-4 h-4 text-gold" />
              <span className="text-sm font-semibold text-foreground">
                Live Preview
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                Changes preview instantly
              </span>
            </div>
            <div className="relative" style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  title="Site Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  style={{ backgroundColor: colors.bg }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading site preview…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
