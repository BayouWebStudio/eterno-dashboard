/*
  Shared PageSelector dropdown component.
  Used by SectionEditor and VisualEditor for multi-page site navigation.
*/
import { useState, useRef, useEffect } from "react";
import { getPageLabel } from "@/contexts/SiteContext";
import { FileText, ChevronDown, Check } from "lucide-react";

interface PageSelectorProps {
  availablePages: string[];
  currentPage: string;
  onSwitch: (page: string) => void;
  disabled: boolean;
  /** Show page slug beneath the label (used in SectionEditor) */
  showSlug?: boolean;
}

export default function PageSelector({
  availablePages,
  currentPage,
  onSwitch,
  disabled,
  showSlug = false,
}: PageSelectorProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (availablePages.length <= 1) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150 text-sm
          ${open
            ? "border-gold bg-[oklch(0.19_0.005_250)] text-gold"
            : "border-border bg-card text-foreground hover:border-gold-dim hover:text-gold"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <FileText className="w-3.5 h-3.5 text-gold flex-shrink-0" />
        <span className="font-medium">{getPageLabel(currentPage)}</span>
        {showSlug && (
          <span className="text-[10px] text-muted-foreground font-mono">{currentPage}</span>
        )}
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
          {showSlug && (
            <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Pages ({availablePages.length})
            </p>
          )}
          {availablePages.map((page) => {
            const isActive = page === currentPage;
            return (
              <button
                key={page}
                onClick={() => {
                  if (!isActive) onSwitch(page);
                  setOpen(false);
                }}
                className={`
                  w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition-colors
                  ${isActive
                    ? "bg-[oklch(0.19_0.005_250)] text-gold"
                    : "text-foreground hover:bg-[oklch(0.16_0.005_250)] hover:text-gold"
                  }
                `}
              >
                <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-gold" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{getPageLabel(page)}</span>
                  {showSlug && (
                    <span className="text-[10px] text-muted-foreground font-mono block">{page}</span>
                  )}
                </div>
                {isActive && <Check className="w-3.5 h-3.5 ml-auto text-gold flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
