/*
  DESIGN: Dark Forge — Build Wizard / Step 3: Layout picker
  4 layout variants matching backend LAYOUT_VARIANTS + 1 "Surprise me" card.
  Each card uses an inline SVG wireframe — no external assets.
*/
import { Shuffle, Check } from "lucide-react";
import type { LayoutKey, WizardState } from "./types";

interface LayoutPreview {
  key: Exclude<LayoutKey, "auto">;
  label: string;
  pitch: string;
  // SVG wireframe — rendered inside a 120×80 viewBox
  wireframe: React.ReactNode;
}

// Reusable block color — matches Dark Forge muted background
const BLOCK = "#3a3a45";
const ACCENT = "#C9A84C";

const LAYOUTS: LayoutPreview[] = [
  {
    key: "monolith",
    label: "Monolith",
    pitch: "Single column, long scroll",
    wireframe: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="10" y="6" width="100" height="10" fill={BLOCK} />
        <rect x="10" y="22" width="100" height="18" fill={BLOCK} opacity="0.6" />
        <rect x="10" y="44" width="100" height="14" fill={BLOCK} />
        <rect x="40" y="64" width="40" height="6" fill={ACCENT} />
      </svg>
    ),
  },
  {
    key: "split",
    label: "Split",
    pitch: "Side-by-side split layout",
    wireframe: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="6" y="6" width="52" height="68" fill={BLOCK} />
        <rect x="62" y="6" width="52" height="28" fill={BLOCK} opacity="0.6" />
        <rect x="62" y="38" width="52" height="20" fill={BLOCK} opacity="0.4" />
        <rect x="62" y="62" width="30" height="6" fill={ACCENT} />
      </svg>
    ),
  },
  {
    key: "showcase",
    label: "Showcase",
    pitch: "Hero image + thumbnail grid",
    wireframe: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="10" y="6" width="100" height="32" fill={BLOCK} />
        <rect x="10" y="44" width="22" height="14" fill={BLOCK} opacity="0.6" />
        <rect x="36" y="44" width="22" height="14" fill={BLOCK} opacity="0.6" />
        <rect x="62" y="44" width="22" height="14" fill={BLOCK} opacity="0.6" />
        <rect x="88" y="44" width="22" height="14" fill={BLOCK} opacity="0.6" />
        <rect x="45" y="64" width="30" height="6" fill={ACCENT} />
      </svg>
    ),
  },
  {
    key: "raw",
    label: "Raw",
    pitch: "Dense magazine-style grid",
    wireframe: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="10" y="6" width="100" height="6" fill={BLOCK} opacity="0.6" />
        <rect x="10" y="18" width="32" height="20" fill={BLOCK} />
        <rect x="46" y="18" width="32" height="20" fill={BLOCK} />
        <rect x="82" y="18" width="28" height="20" fill={BLOCK} />
        <rect x="10" y="42" width="32" height="20" fill={BLOCK} opacity="0.6" />
        <rect x="46" y="42" width="32" height="20" fill={BLOCK} opacity="0.6" />
        <rect x="82" y="42" width="28" height="20" fill={BLOCK} opacity="0.6" />
        <rect x="10" y="66" width="60" height="6" fill={ACCENT} />
      </svg>
    ),
  },
];

interface StepLayoutProps {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

export default function StepLayout({ state, onChange }: StepLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-1">
          Pick your layout
        </h2>
        <p className="text-sm text-muted-foreground">
          Changes how your homepage is structured.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {LAYOUTS.map((l) => {
          const selected = state.layout === l.key;
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => onChange({ layout: l.key })}
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
              <div className="h-20 rounded-md bg-[oklch(0.12_0.005_250)] border border-border/50 mb-3 p-1">
                {l.wireframe}
              </div>
              <h3 className="text-sm font-bold text-foreground mb-0.5">{l.label}</h3>
              <p className="text-[11px] text-muted-foreground leading-tight">{l.pitch}</p>
            </button>
          );
        })}

        {/* "Surprise me" auto layout */}
        <button
          type="button"
          onClick={() => onChange({ layout: "auto" })}
          className={`relative text-left rounded-xl border p-4 transition-all duration-150 sm:col-span-2 ${
            state.layout === "auto"
              ? "border-gold ring-2 ring-gold/30 bg-gold/5"
              : "border-border border-dashed bg-card hover:border-gold/40"
          }`}
        >
          {state.layout === "auto" && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
              <Check className="w-3 h-3 text-[oklch(0.13_0.005_250)]" strokeWidth={3} />
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[oklch(0.12_0.005_250)] border border-border/50 flex items-center justify-center flex-shrink-0">
              <Shuffle className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-0.5">Surprise me</h3>
              <p className="text-[11px] text-muted-foreground leading-tight">
                We'll pick a layout for you at build time.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
