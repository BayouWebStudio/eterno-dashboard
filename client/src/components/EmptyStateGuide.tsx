/*
  DESIGN: Dark Forge — Empty State with Setup Guide
  Shows an icon, title, description, and numbered setup steps.
  Used on Bookings, Testimonials, Store, and other pages when no data exists yet.
*/
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface Step {
  label: string;
  detail?: string;
}

interface EmptyStateGuideProps {
  icon: LucideIcon;
  title: string;
  description: string;
  steps: Step[];
  action?: ReactNode;
}

export default function EmptyStateGuide({
  icon: Icon,
  title,
  description,
  steps,
  action,
}: EmptyStateGuideProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6 text-center max-w-md mx-auto">
      {/* Icon */}
      <div className="w-14 h-14 rounded-full bg-[oklch(0.18_0.005_250)] border border-border flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>

      {/* Title & description */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-heading font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground/70 leading-relaxed">{description}</p>
      </div>

      {/* Steps */}
      <div className="w-full space-y-2.5 text-left">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[oklch(0.15_0.005_250)] border border-border/50"
          >
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-[10px] font-bold text-gold mt-0.5">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{step.label}</p>
              {step.detail && (
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Optional action button */}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
