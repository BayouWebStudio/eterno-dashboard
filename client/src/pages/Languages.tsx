/*
  DESIGN: Dark Forge — Languages Page
  Manage site language settings and toggle i18n.
  Shows available languages with active indicator.
*/
import { useState, useCallback } from "react";
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Loader2, Globe } from "lucide-react";

interface LangOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: LangOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
];

export default function Languages() {
  const { currentSite, saveSiteField, refreshHtml } = useSite();
  const [applying, setApplying] = useState<string | null>(null);
  const currentLang = currentSite?.lang || "en";

  const handleSetLang = useCallback(async (code: string) => {
    setApplying(code);
    try {
      const ok = await saveSiteField("lang", code);
      if (ok) {
        toast.success(`Language set to ${LANGUAGES.find((l) => l.code === code)?.name}`);
        refreshHtml();
      } else {
        toast.error("Failed to set language");
      }
    } catch {
      toast.error("Failed to set language");
    } finally {
      setApplying(null);
    }
  }, [saveSiteField, refreshHtml]);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground">Languages</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set the primary language for your site. Current: <span className="text-gold font-medium">{LANGUAGES.find((l) => l.code === currentLang)?.name || currentLang}</span>
        </p>
      </div>

      {/* Info */}
      <div className="flex gap-3 p-4 rounded-lg bg-[oklch(0.75_0.12_85/8%)] border border-gold-dim/25">
        <Globe className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gold-dim leading-relaxed">
          <strong className="text-gold">How i18n works:</strong> Your Eterno sites use <code className="font-mono text-xs">data-en</code> and <code className="font-mono text-xs">data-es</code> attributes for bilingual content. Setting the language here controls which version visitors see by default. The language toggle on the site lets visitors switch.
        </div>
      </div>

      {/* Language List */}
      <div className="space-y-2">
        {LANGUAGES.map((lang) => {
          const isActive = lang.code === currentLang;
          const isApplying = applying === lang.code;
          return (
            <div
              key={lang.code}
              className={`
                relative flex items-center gap-4 px-4 py-3 rounded-lg border transition-all duration-150
                ${isActive
                  ? "bg-[oklch(0.19_0.005_250)] border-gold"
                  : "bg-card border-border hover:border-gold-dim"
                }
              `}
            >
              {/* Accent bar */}
              <div
                className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-all duration-150 ${
                  isActive ? "bg-gold shadow-[0_0_8px_oklch(0.75_0.12_85/30%)]" : "bg-transparent"
                }`}
              />
              <span className="text-2xl flex-shrink-0">{lang.flag}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isActive ? "text-gold" : "text-foreground"}`}>
                  {lang.name}
                </p>
                <p className="text-xs text-muted-foreground">{lang.nativeName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground uppercase">{lang.code}</span>
                {isActive ? (
                  <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-[oklch(0.13_0.005_250)]" />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetLang(lang.code)}
                    disabled={isApplying}
                    className="border-border text-muted-foreground hover:text-gold hover:border-gold-dim h-7 px-3 text-xs"
                  >
                    {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : "Set"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
