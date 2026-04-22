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
  Sparkles,
  Square,
  Circle,
} from "lucide-react";

/* ── Preset Themes ── */
interface ThemePreset {
  id: string;
  name: string;
  colors: { bg: string; accent: string; text: string; card: string };
}

const PRESETS: ThemePreset[] = [
  // — Dark moody —
  { id: "midnight",   name: "Midnight",   colors: { bg: "#0a0a0a", accent: "#C9A84C", text: "#e8e0d0", card: "#141414" } },
  { id: "obsidian",   name: "Obsidian",   colors: { bg: "#121212", accent: "#D4A843", text: "#f0e8d8", card: "#1a1a1a" } },
  { id: "slate",      name: "Slate",      colors: { bg: "#0f1419", accent: "#8899aa", text: "#c8d0d8", card: "#1a2028" } },
  { id: "crimson",    name: "Crimson",    colors: { bg: "#0e0a0a", accent: "#c0392b", text: "#e8d8d8", card: "#1a1212" } },
  { id: "forest",     name: "Forest",     colors: { bg: "#0a0e0a", accent: "#6b8f5e", text: "#d8e0d8", card: "#121a12" } },
  { id: "wine",       name: "Wine",       colors: { bg: "#110a0f", accent: "#a45673", text: "#ead7dd", card: "#1a1017" } },
  { id: "cyber",      name: "Cyber",      colors: { bg: "#08080f", accent: "#00e5ff", text: "#d8e4ff", card: "#12121f" } },
  { id: "ember",      name: "Ember",      colors: { bg: "#0f0806", accent: "#ff6b35", text: "#f0dccc", card: "#1a0f0b" } },
  { id: "emerald",    name: "Emerald",    colors: { bg: "#061211", accent: "#10b981", text: "#d4ebe5", card: "#0d1c1a" } },
  { id: "royal",      name: "Royal",      colors: { bg: "#0a0a1a", accent: "#7c3aed", text: "#e0d8f0", card: "#14142a" } },

  // — Light & clean —
  { id: "ivory",      name: "Ivory",      colors: { bg: "#f5f0e8", accent: "#B8942F", text: "#1a1a1a", card: "#ffffff" } },
  { id: "paper",      name: "Paper",      colors: { bg: "#fafaf5", accent: "#1f2937", text: "#111111", card: "#ffffff" } },
  { id: "sand",       name: "Sand",       colors: { bg: "#f0e8d8", accent: "#8b6f3f", text: "#2a2418", card: "#fcf8ee" } },
  { id: "linen",      name: "Linen",      colors: { bg: "#f4eee4", accent: "#b4513a", text: "#2d1f1a", card: "#ffffff" } },
  { id: "minimal",    name: "Minimal",    colors: { bg: "#ffffff", accent: "#000000", text: "#111111", card: "#f6f6f6" } },
  { id: "rose",       name: "Rose",       colors: { bg: "#fdf2f0", accent: "#c7526a", text: "#3a1f2a", card: "#ffffff" } },

  // — Warm / boutique —
  { id: "sunset",     name: "Sunset",     colors: { bg: "#1a0f0a", accent: "#ff8c42", text: "#f0e0d0", card: "#241610" } },
  { id: "coastal",    name: "Coastal",    colors: { bg: "#eaf3f4", accent: "#3b7a80", text: "#12252a", card: "#ffffff" } },
  { id: "mocha",      name: "Mocha",      colors: { bg: "#1a130e", accent: "#d2956b", text: "#ece0d0", card: "#241c14" } },
  { id: "boutique",   name: "Boutique",   colors: { bg: "#f5eee4", accent: "#8b6c42", text: "#2a1f16", card: "#ffffff" } },
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
  "Abril Fatface",
  "Anton",
  "Bodoni Moda",
  "Crimson Text",
  "EB Garamond",
  "Fraunces",
  "Italiana",
  "Marcellus",
  "Old Standard TT",
  "Prata",
  "Rozha One",
  "Tenor Sans",
  "Unna",
  "Yeseva One",
  "Bangers",
  "Chakra Petch",
  "Dela Gothic One",
  "Righteous",
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
  "Manrope",
  "Karla",
  "Figtree",
  "Plus Jakarta Sans",
  "Public Sans",
  "Rubik",
  "Red Hat Display",
  "Hind",
  "Mulish",
  "Quicksand",
  "Barlow",
  "Cabin",
  "IBM Plex Sans",
  "Noto Sans",
  "Fira Sans",
  "PT Sans",
  "Sora",
  "Urbanist",
];

/* ── Helpers ── */
/** Escape single quotes / backslashes in a string for safe CSS interpolation. */
function escapeCssString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

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
  const { currentSite, siteHtml, applyTheme, generateTheme, refreshHtml, refreshInfo } = useSite();

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

  // ── Typography scale (0.9 = compact, 1.0 = normal, 1.15 = large) ──
  const [fontScale, setFontScale] = useState<number>(1.0);

  // ── Button style (border-radius in px; 9999 = pill) ──
  const [buttonRadius, setButtonRadius] = useState<number>(8);

  // ── AI generator state ──
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

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
  const [debouncedScale, setDebouncedScale] = useState(fontScale);
  const [debouncedRadius, setDebouncedRadius] = useState(buttonRadius);

  // Debounce color/font/scale/radius changes for preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedColors({ ...colors });
      setDebouncedHeading(headingFont);
      setDebouncedBody(bodyFont);
      setDebouncedScale(fontScale);
      setDebouncedRadius(buttonRadius);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [colors, headingFont, bodyFont, fontScale, buttonRadius]);

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

    const radiusCss = debouncedRadius >= 9999 ? "9999px" : `${debouncedRadius}px`;

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
  h1, h2, h3, h4, h5, h6,
  .nav-logo, .footer-logo, .stat-num, .stat-number,
  .hero-title, .section-title,
  .style-card h3, .service-card h3,
  .testimonial-placeholder p {
    font-family: '${escapeCssString(debouncedHeading)}', serif !important;
  }
  body, p, a, span, li, td, input, textarea, select, button,
  .book-float, .section-label, .hero-eyebrow, .hero-sub, .hero-cta,
  .btn-gold, .btn-outline {
    font-family: '${escapeCssString(debouncedBody)}', sans-serif !important;
  }
  /* Typography scale */
  html { font-size: ${Math.round(16 * debouncedScale)}px !important; }
  h1, .hero-title { font-size: calc(2.8em * 1) !important; }
  h2, .section-title { font-size: calc(2.2em * 1) !important; }
  h3 { font-size: calc(1.5em * 1) !important; }
  /* Button radius override */
  .btn-gold, .btn-outline, .book-btn, .hero-cta, .btn, button.cta, a.cta,
  .float-book, .lang-toggle, input[type="submit"], input[type="button"] {
    border-radius: ${radiusCss} !important;
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

  // ── AI Generator handler ──
  const handleGenerate = async () => {
    if (generating || !aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const result = await generateTheme(aiPrompt.trim());
      if (!result.ok) {
        toast.error(result.error || "Couldn't generate theme");
        return;
      }
      const d = result.theme!;
      if (d.colors) {
        setColors(d.colors);
        setActivePreset(null);
      }
      if (d.headingFont && HEADING_FONTS.includes(d.headingFont)) {
        setHeadingFont(d.headingFont);
      }
      if (d.bodyFont && BODY_FONTS.includes(d.bodyFont)) {
        setBodyFont(d.bodyFont);
      }
      if (typeof d.fontScale === "number") setFontScale(d.fontScale);
      if (typeof d.buttonRadius === "number") setButtonRadius(d.buttonRadius);
      toast.success("Theme generated! Preview the look, then click Apply.");
    } catch {
      toast.error("Generator unavailable — try again in a moment.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Apply handler ──
  const handleApply = async () => {
    if (applying) return;
    setApplying(true);
    try {
      // applyTheme handles colors (all pages) + fonts + scale + buttonRadius
      const ok = await applyTheme(
        activePreset || "custom",
        colors,
        {
          heading: headingFont,
          body: bodyFont,
        },
        {
          fontScale,
          buttonRadius,
        }
      );
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

          {/* Typography Scale */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Type className="w-4 h-4 text-gold" />
              <span className="text-sm font-semibold text-foreground">Text Size</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Compact", value: 0.9 },
                { label: "Normal", value: 1.0 },
                { label: "Large", value: 1.15 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setFontScale(opt.value)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    Math.abs(fontScale - opt.value) < 0.01
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border text-muted-foreground hover:border-gold-dim hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Button Style */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Square className="w-4 h-4 text-gold" />
              <span className="text-sm font-semibold text-foreground">Button Shape</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Square", value: 0, Icon: Square },
                { label: "Rounded", value: 8, Icon: Square },
                { label: "Pill", value: 9999, Icon: Circle },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setButtonRadius(opt.value)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                    buttonRadius === opt.value
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border text-muted-foreground hover:border-gold-dim hover:text-foreground"
                  }`}
                >
                  <div
                    className="w-10 h-5 border-2"
                    style={{
                      borderRadius: opt.value >= 9999 ? "9999px" : `${opt.value}px`,
                      borderColor: "currentColor",
                    }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Theme Generator */}
          <div className="bg-gradient-to-br from-gold/5 to-transparent border border-gold/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-sm font-semibold text-foreground">AI Theme Generator</span>
              <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded-full font-medium ml-auto">
                New
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Describe a vibe and let AI pick colors, fonts, and styling.
            </p>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !generating && aiPrompt.trim()) handleGenerate();
              }}
              placeholder="e.g. moody & romantic, bright minimalist, coastal warm"
              disabled={generating}
              className="w-full bg-[oklch(0.16_0.005_250)] border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors placeholder:text-muted-foreground"
            />
            <Button
              onClick={handleGenerate}
              disabled={generating || !aiPrompt.trim()}
              className="w-full bg-gold/20 border border-gold/40 text-gold hover:bg-gold/30 font-semibold"
              size="sm"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Generate Theme
                </>
              )}
            </Button>
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
