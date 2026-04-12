/*
  DESIGN: Dark Forge — Build Wizard / Step 1: Identity
  Collects the minimum required to seed a build — IG handle + country.
  Plus optional display name override.
*/
import { COUNTRIES } from "./countries";
import type { WizardState } from "./types";

interface StepIdentityProps {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}

export default function StepIdentity({ state, onChange }: StepIdentityProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-1">
          Let's start with the basics
        </h2>
        <p className="text-sm text-muted-foreground">
          Your Instagram handle tells us what to pull — we scrape your photos, bio, and services.
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {/* Instagram handle */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
            Instagram Handle <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <input
              type="text"
              value={state.igHandle}
              onChange={(e) => onChange({ igHandle: e.target.value.replace(/^@/, "") })}
              placeholder="yourhandle"
              className="w-full bg-input border border-border rounded-lg pl-8 pr-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
            />
          </div>
        </div>

        {/* Country */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
            Country <span className="text-destructive">*</span>
          </label>
          <select
            value={state.country}
            onChange={(e) => onChange({ country: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            <option value="" disabled>Select your country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
            Affects language detection and how we phrase your site copy.
          </p>
        </div>

        {/* Display name (optional) */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
            Display Name <span className="text-muted-foreground/60 normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={state.artistName}
            onChange={(e) => onChange({ artistName: e.target.value })}
            placeholder="Leave blank to use the name from your Instagram"
            className="w-full bg-input border border-border rounded-lg px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
          />
        </div>

      </div>
    </div>
  );
}

/** Validate whether step 1 is complete enough to advance. */
export function isStepIdentityValid(state: WizardState): boolean {
  return state.igHandle.trim().length > 0 && state.country.length > 0;
}
