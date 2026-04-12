/*
  DESIGN: Dark Forge — Build Wizard / Step 4: Review
  Read-only summary with "Edit" jump-back links. No submit button here;
  the parent BuildWizard shows the "Build My Site" CTA in its footer nav.
*/
import { Pencil } from "lucide-react";
import { COUNTRIES } from "./countries";
import type { WizardState } from "./types";

const THEME_LABELS: Record<string, string> = {
  geometric: "Geometric",
  neo_traditional: "Neo Traditional",
  blackwork: "Blackwork",
  realism: "Realism",
  new_school: "New School",
  watercolor: "Watercolor",
  auto: "Auto-detect from photos",
};

const LAYOUT_LABELS: Record<string, string> = {
  monolith: "Monolith — single column",
  split: "Split — side-by-side",
  showcase: "Showcase — hero + grid",
  raw: "Raw — dense magazine",
  auto: "Random (surprise me)",
};

interface StepReviewProps {
  state: WizardState;
  onJumpTo: (step: 1 | 2 | 3) => void;
}

export default function StepReview({ state, onJumpTo }: StepReviewProps) {
  const countryName =
    COUNTRIES.find((c) => c.code === state.country)?.name || state.country;

  const rows: Array<{ label: string; value: string; step: 1 | 2 | 3 }> = [
    { label: "Instagram", value: `@${state.igHandle}`, step: 1 },
    { label: "Country", value: countryName, step: 1 },
    ...(state.artistName.trim()
      ? [{ label: "Display name", value: state.artistName.trim(), step: 1 as const }]
      : []),
    ...(state.email.trim()
      ? [{ label: "Contact email", value: state.email.trim(), step: 1 as const }]
      : []),
    { label: "Theme", value: THEME_LABELS[state.themeKey] || state.themeKey, step: 2 },
    { label: "Layout", value: LAYOUT_LABELS[state.layout] || state.layout, step: 3 },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-1">
          Ready to build?
        </h2>
        <p className="text-sm text-muted-foreground">
          This takes 2–4 minutes. You can leave this tab open or come back later.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-card border border-border rounded-xl divide-y divide-border/60">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {row.label}
                </p>
                <p className="text-sm text-foreground truncate">{row.value}</p>
              </div>
              <button
                type="button"
                onClick={() => onJumpTo(row.step)}
                className="flex items-center gap-1 text-xs text-gold/80 hover:text-gold transition-colors flex-shrink-0"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground/70 mt-4 text-center leading-relaxed">
          We'll scrape your Instagram posts, build all 5 pages, and deploy the site.
          Your free site will live at <span className="font-mono text-gold-dim">eternowebstudio.com/{state.igHandle || "yourhandle"}/</span>
        </p>
      </div>
    </div>
  );
}
