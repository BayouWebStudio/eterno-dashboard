/*
  DESIGN: Dark Forge — Real-Time Build Status Indicator
  Shows an animated step-by-step timeline with progress bar
  while the user's site is being built after onboarding.
*/
import { useState, useEffect, useRef } from "react";
import { Check, Loader2, Circle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BuildStep {
  id: string;
  label: string;
  description: string;
  icon: string;
  durationEstimate: number; // seconds this step typically takes
}

const BUILD_STEPS: BuildStep[] = [
  {
    id: "scraping",
    label: "Scraping Instagram",
    description: "Fetching your latest posts and profile info",
    icon: "📸",
    durationEstimate: 15,
  },
  {
    id: "classifying",
    label: "Classifying Photos",
    description: "AI is analyzing and categorizing your images",
    icon: "🧠",
    durationEstimate: 20,
  },
  {
    id: "generating",
    label: "Generating Website",
    description: "Building your custom layout and sections",
    icon: "🔨",
    durationEstimate: 30,
  },
  {
    id: "optimizing",
    label: "Optimizing Assets",
    description: "Compressing images and optimizing for speed",
    icon: "⚡",
    durationEstimate: 15,
  },
  {
    id: "deploying",
    label: "Deploying",
    description: "Publishing your site to the web",
    icon: "🚀",
    durationEstimate: 10,
  },
];

type StepStatus = "pending" | "active" | "complete";

interface BuildStatusIndicatorProps {
  buildProgress: string;
  error: string | null;
}

export default function BuildStatusIndicator({ buildProgress, error }: BuildStatusIndicatorProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef(Date.now());
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Map buildProgress text from SiteContext to step index
  useEffect(() => {
    const progressLower = buildProgress.toLowerCase();
    if (progressLower.includes("scraping")) {
      setActiveStepIndex(0);
    } else if (progressLower.includes("classifying")) {
      setActiveStepIndex(1);
    } else if (progressLower.includes("building")) {
      setActiveStepIndex(2);
    } else if (progressLower.includes("deploying") || progressLower.includes("almost")) {
      setActiveStepIndex(3);
    } else if (progressLower.includes("live")) {
      setActiveStepIndex(4);
    }
  }, [buildProgress]);

  // Smooth progress animation
  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));

      setOverallProgress((prev) => {
        // Calculate target progress based on active step
        const stepWeight = 100 / BUILD_STEPS.length;
        const targetProgress = Math.min(
          (activeStepIndex + 0.8) * stepWeight,
          95 // Never reach 100% until truly complete
        );
        // Ease toward target
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.1) return targetProgress;
        return prev + diff * 0.05;
      });
    }, 200);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [activeStepIndex]);

  // Jump to 100% when site is live
  useEffect(() => {
    if (buildProgress.toLowerCase().includes("live")) {
      setOverallProgress(100);
    }
  }, [buildProgress]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getStepStatus = (index: number): StepStatus => {
    if (error) return index <= activeStepIndex ? "active" : "pending";
    if (index < activeStepIndex) return "complete";
    if (index === activeStepIndex) return "active";
    return "pending";
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-lg w-full px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/10 border border-gold/20 mb-4">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
            Building Your Website
          </h2>
          <p className="text-sm text-muted-foreground">
            This usually takes 2-5 minutes. You can stay on this page.
          </p>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Overall Progress
            </span>
            <span className="text-xs font-mono text-gold">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="relative h-2 bg-[oklch(0.19_0.005_250)] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${overallProgress}%`,
                background: "linear-gradient(90deg, oklch(0.55 0.09 85), oklch(0.75 0.12 85))",
                boxShadow: "0 0 12px oklch(0.75 0.12 85 / 40%)",
              }}
            />
            {/* Shimmer effect */}
            {overallProgress < 100 && (
              <div
                className="absolute inset-y-0 left-0 rounded-full animate-pulse opacity-40"
                style={{
                  width: `${overallProgress}%`,
                  background: "linear-gradient(90deg, transparent 0%, oklch(0.85 0.12 85 / 60%) 50%, transparent 100%)",
                }}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground/60">
              Elapsed: {formatTime(elapsedTime)}
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              Est. remaining: ~{formatTime(Math.max(0, 180 - elapsedTime))}
            </span>
          </div>
        </div>

        {/* Step Timeline */}
        <div className="space-y-0">
          {BUILD_STEPS.map((step, index) => {
            const status = getStepStatus(index);
            const isLast = index === BUILD_STEPS.length - 1;

            return (
              <div key={step.id} className="relative">
                <div className="flex items-start gap-4 py-3">
                  {/* Step indicator */}
                  <div className="relative flex-shrink-0 flex flex-col items-center">
                    <div
                      className={`
                        w-9 h-9 rounded-full flex items-center justify-center text-sm
                        transition-all duration-300
                        ${status === "complete"
                          ? "bg-gold/20 border-2 border-gold text-gold"
                          : status === "active"
                          ? "bg-gold/10 border-2 border-gold/60 text-gold animate-pulse"
                          : "bg-[oklch(0.19_0.005_250)] border-2 border-border text-muted-foreground/40"
                        }
                      `}
                    >
                      {status === "complete" ? (
                        <Check className="w-4 h-4" />
                      ) : status === "active" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="text-xs">{step.icon}</span>
                      )}
                    </div>
                    {/* Connector line */}
                    {!isLast && (
                      <div
                        className={`
                          w-0.5 h-6 mt-1 transition-colors duration-300
                          ${status === "complete"
                            ? "bg-gold/40"
                            : "bg-border/40"
                          }
                        `}
                      />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`
                          text-sm font-semibold transition-colors duration-300
                          ${status === "complete"
                            ? "text-gold"
                            : status === "active"
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                          }
                        `}
                      >
                        {step.label}
                      </h4>
                      {status === "active" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                          <span className="text-[10px] font-medium text-gold uppercase tracking-wider">
                            In Progress
                          </span>
                        </span>
                      )}
                      {status === "complete" && (
                        <span className="text-[10px] font-medium text-gold/60 uppercase tracking-wider">
                          Done
                        </span>
                      )}
                    </div>
                    <p
                      className={`
                        text-xs mt-0.5 transition-colors duration-300
                        ${status === "active"
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40"
                        }
                      `}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="text-xs text-destructive/60 mt-1">
                Please refresh the page and try again.
              </p>
            </div>
          </div>
        )}

        {/* Fun fact / tip while waiting */}
        {!error && (
          <div className="mt-6 p-4 rounded-lg bg-[oklch(0.16_0.005_250)] border border-border/50 text-center">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">
              Did you know?
            </p>
            <p className="text-sm text-muted-foreground">
              Your site will be fully editable from this dashboard once it's live.
              You can change text, images, colors, and more — no coding required.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
