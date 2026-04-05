import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

interface TourStep {
  title: string;
  description: string;
  target?: string; // CSS selector
}

const STEPS: TourStep[] = [
  { title: "Welcome to Eterno!", description: "Let's show you around your dashboard. This quick tour will help you get started." },
  { title: "Overview", description: "Your home base \u2014 see analytics, SEO score, and a live preview of your site.", target: '[data-tour="nav-overview"]' },
  { title: "Visual Editor", description: "Edit your site content, images, and sections. Click any text to change it, swap images, and rearrange galleries.", target: '[data-tour="nav-editor"]' },
  { title: "Store", description: "Connect Stripe and sell products directly from your site with a full shopping cart.", target: '[data-tour="nav-store"]' },
  { title: "Themes & Colors", description: "Customize your site's colors, fonts, and overall look with live preview.", target: '[data-tour="nav-themes"]' },
  { title: "Bookings", description: "View and manage booking requests, set up your calendar, and configure deposit payments.", target: '[data-tour="nav-bookings"]' },
  { title: "Testimonials", description: "Review and approve client testimonials before they go live on your site.", target: '[data-tour="nav-testimonials"]' },
  { title: "You're all set!", description: "Explore your dashboard and make it yours. You can replay this tour anytime from the Overview page." },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Filter steps: keep steps whose target exists in DOM, or that have no target
  const filteredSteps = useRef<TourStep[]>([]);

  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);

    if (mobile) {
      // On mobile, only show welcome + done (first and last)
      filteredSteps.current = STEPS.filter((s) => !s.target);
    } else {
      filteredSteps.current = STEPS.filter((s) => {
        if (!s.target) return true;
        return !!document.querySelector(s.target);
      });
    }
  }, []);

  const steps = filteredSteps.current.length > 0 ? filteredSteps.current : STEPS.filter((s) => !s.target);
  const step = steps[currentStep];

  // Recalculate target rect
  const updateRect = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onComplete();
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        if (currentStep < steps.length - 1) {
          setCurrentStep((s) => s + 1);
        } else {
          onComplete();
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) {
          setCurrentStep((s) => s - 1);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentStep, steps.length, onComplete]);

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const hasTarget = !!step?.target && !!targetRect;

  // Tooltip positioning
  const getTooltipStyle = (): React.CSSProperties => {
    if (!hasTarget || !targetRect) {
      // Centered for welcome/done steps
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10001,
      };
    }
    // Position to the right of the target
    const pad = 16;
    let top = targetRect.top + targetRect.height / 2;
    const left = targetRect.right + pad;

    // If tooltip would go off-screen right, position below instead
    if (left + 320 > window.innerWidth) {
      return {
        position: "fixed",
        top: targetRect.bottom + pad,
        left: Math.max(pad, targetRect.left),
        transform: "translateY(0)",
        zIndex: 10001,
      };
    }

    // Clamp top so tooltip doesn't go off-screen
    top = Math.max(pad, Math.min(top - 60, window.innerHeight - 240));

    return {
      position: "fixed",
      top,
      left,
      zIndex: 10001,
    };
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      {/* Backdrop / Spotlight */}
      {hasTarget && targetRect ? (
        <div
          style={{
            position: "fixed",
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            zIndex: 10000,
            pointerEvents: "none",
          }}
        />
      ) : (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 10000,
          }}
        />
      )}

      {/* Click catcher (so clicking backdrop advances or closes) */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 10000, cursor: "default" }}
        onClick={(e) => {
          // Only if clicking the backdrop itself (not the tooltip)
          if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
            // Do nothing, just block clicks
          }
        }}
      />

      {/* Tooltip Card */}
      <div ref={tooltipRef} style={getTooltipStyle()}>
        <div
          style={{
            background: "oklch(0.16 0.005 250)",
            border: "1px solid rgba(201,168,76,0.2)",
            borderRadius: 8,
            padding: 20,
            maxWidth: 320,
            minWidth: 260,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* Step counter */}
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 500 }}>
            Step {currentStep + 1} of {steps.length}
          </p>

          {/* Title */}
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "oklch(0.81 0.1 85)", marginBottom: 6 }}>
            {step?.title}
          </h3>

          {/* Description */}
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 20 }}>
            {step?.description}
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {!isFirst && !isLast && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.4)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                Back
              </button>
            )}

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {!isLast && (
                <button
                  onClick={onComplete}
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.4)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 12px",
                  }}
                >
                  Skip
                </button>
              )}
              <button
                onClick={() => {
                  if (isLast) {
                    onComplete();
                  } else {
                    setCurrentStep((s) => s + 1);
                  }
                }}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "oklch(0.13 0.005 250)",
                  background: "oklch(0.81 0.1 85)",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 18px",
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {isLast ? "Get Started" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
