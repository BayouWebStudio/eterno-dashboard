/*
  DESIGN: Dark Forge — Build Wizard shell
  Multi-step onboarding wizard that collects IG handle, country, theme,
  and layout before calling setupSite(). Persists draft to localStorage
  keyed by Clerk user id so page refresh mid-wizard doesn't lose input.
*/
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import StepIdentity, { isStepIdentityValid } from "./StepIdentity";
import StepTheme from "./StepTheme";
import StepLayout from "./StepLayout";
import StepReview from "./StepReview";
import { INITIAL_WIZARD_STATE, type WizardState } from "./types";

export type SetupSiteInput = {
  igHandle: string;
  country: string;
  artistName?: string;
  email?: string;
  themeKey?: string;
  layout?: string;
};

interface BuildWizardProps {
  setupSite: (input: SetupSiteInput) => Promise<boolean>;
  error: string | null;
  onBack: () => void;
}

const DRAFT_PREFIX = "eterno:wizard-draft:";

export default function BuildWizard({ setupSite, error, onBack }: BuildWizardProps) {
  const { userName } = useAuth();
  // Draft key is tied to userName/email so multi-account devices don't collide.
  // We don't have the raw Clerk id in this context — userName is close enough
  // as a session-scoped identifier.
  const draftKey = `${DRAFT_PREFIX}${userName || "anon"}`;

  const [state, setState] = useState<WizardState>(() => {
    if (typeof window === "undefined") return INITIAL_WIZARD_STATE;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WizardState>;
        return { ...INITIAL_WIZARD_STATE, ...parsed };
      }
    } catch {
      /* ignore parse errors */
    }
    return INITIAL_WIZARD_STATE;
  });
  const [submitting, setSubmitting] = useState(false);

  // Persist draft on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(state));
    } catch {
      /* quota exceeded or unavailable — silently ignore */
    }
  }, [state, draftKey]);

  const patch = useCallback((p: Partial<WizardState>) => setState((prev) => ({ ...prev, ...p })), []);

  const next = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, 4) as WizardState["step"] }));
  }, []);
  const prev = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) as WizardState["step"] }));
  }, []);
  const jumpTo = useCallback((step: 1 | 2 | 3) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const submit = useCallback(async () => {
    if (!isStepIdentityValid(state)) {
      toast.error("Please complete step 1");
      jumpTo(1);
      return;
    }
    setSubmitting(true);
    const input: SetupSiteInput = {
      igHandle: state.igHandle.trim(),
      country: state.country,
      artistName: state.artistName.trim() || undefined,
      email: state.email.trim() || undefined,
      themeKey: state.themeKey === "auto" ? undefined : state.themeKey,
      layout: state.layout === "auto" ? undefined : state.layout,
    };
    const ok = await setupSite(input);
    if (ok) {
      // Successful build — clear the draft
      try { localStorage.removeItem(draftKey); } catch {}
    } else {
      setSubmitting(false);
      if (error) toast.error(error);
    }
  }, [state, setupSite, error, draftKey, jumpTo]);

  const canContinue =
    state.step === 1
      ? isStepIdentityValid(state)
      : state.step === 2
        ? true // theme picker always valid (auto is a valid pick)
        : state.step === 3
          ? true // layout picker always valid
          : true;

  const onBackClick = state.step === 1 ? onBack : prev;
  const onContinueClick = state.step === 4 ? submit : next;
  const continueLabel = state.step === 4 ? "Build My Site" : "Continue";

  return (
    <div className="min-h-[60vh] flex flex-col max-w-4xl mx-auto w-full px-4 py-8">
      {/* Top: back + progress pips */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBackClick}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {state.step === 1 ? "Back to options" : "Back"}
        </button>

        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === state.step ? "w-8 bg-gold" : s < state.step ? "w-2 bg-gold/60" : "w-2 bg-border"
              }`}
            />
          ))}
          <span className="text-[10px] text-muted-foreground/60 ml-2 tabular-nums">
            {state.step}/4
          </span>
        </div>
      </div>

      {/* Step body */}
      <div className="flex-1">
        {state.step === 1 && <StepIdentity state={state} onChange={patch} />}
        {state.step === 2 && <StepTheme state={state} onChange={patch} />}
        {state.step === 3 && <StepLayout state={state} onChange={patch} />}
        {state.step === 4 && <StepReview state={state} onJumpTo={jumpTo} />}
      </div>

      {/* Error */}
      {error && state.step === 4 && (
        <div className="max-w-md mx-auto w-full mt-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <button
          onClick={onBackClick}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-[oklch(0.16_0.005_250)] transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <Button
          onClick={onContinueClick}
          disabled={!canContinue || submitting}
          className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-bold px-6 py-2.5 disabled:opacity-40"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : state.step === 4 ? (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              {continueLabel}
            </>
          ) : (
            <>
              {continueLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
