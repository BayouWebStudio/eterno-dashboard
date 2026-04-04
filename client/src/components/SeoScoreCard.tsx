/*
  DESIGN: Dark Forge — SEO Score Card
  Shows SEO score, PageSpeed Insights metrics, issues list, and a "Run Check" button.
*/
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Search, RefreshCw, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface PsiData {
  performance: number;
  seo: number;
  accessibility: number;
  bestPractices: number;
  lcp?: string;
  cls?: string;
  fcp?: string;
  tbt?: string;
}

interface SeoData {
  score: number;
  issues: string[];
  lastChecked: number | null;
  canRunAgain: boolean;
  canFix: boolean;
  psi: PsiData | null;
}

export default function SeoScoreCard() {
  const { getToken, convexHttpUrl } = useAuth();
  const [data, setData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${convexHttpUrl}/api/seo/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [getToken, convexHttpUrl]);

  useEffect(() => { load(); }, [load]);

  const runCheck = async () => {
    setRunning(true);
    await load();
    setRunning(false);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-gold" />
          <h3 className="text-sm font-heading font-bold text-foreground">SEO Health</h3>
        </div>
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          <span className="text-xs">Checking SEO...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const scoreColor = data.score >= 80 ? "text-emerald-400" : data.score >= 50 ? "text-amber-400" : "text-red-400";
  const scoreBg = data.score >= 80 ? "bg-emerald-400/10 border-emerald-400/20" : data.score >= 50 ? "bg-amber-400/10 border-amber-400/20" : "bg-red-400/10 border-red-400/20";

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gold" />
          <h3 className="text-sm font-heading font-bold text-foreground">SEO Health</h3>
        </div>
        {data.canRunAgain && (
          <button
            onClick={runCheck}
            disabled={running}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded hover:bg-[oklch(0.16_0.005_250)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${running ? "animate-spin" : ""}`} />
            Re-check
          </button>
        )}
      </div>

      {/* Score + PSI Grid */}
      <div className="flex gap-4 mb-4">
        {/* Main Score */}
        <div className={`flex-shrink-0 w-20 h-20 rounded-lg border ${scoreBg} flex flex-col items-center justify-center`}>
          <span className={`text-2xl font-bold ${scoreColor}`}>{data.score}</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">SEO</span>
        </div>

        {/* PSI Scores */}
        {data.psi && (
          <div className="grid grid-cols-2 gap-2 flex-1">
            <PsiPill label="Performance" value={data.psi.performance} />
            <PsiPill label="Accessibility" value={data.psi.accessibility} />
            <PsiPill label="Best Practices" value={data.psi.bestPractices} />
            <PsiPill label="SEO (Google)" value={data.psi.seo} />
          </div>
        )}
      </div>

      {/* Web Vitals */}
      {data.psi && (data.psi.lcp || data.psi.cls || data.psi.fcp) && (
        <div className="flex gap-3 mb-4 text-center">
          {data.psi.lcp && <VitalPill label="LCP" value={data.psi.lcp} />}
          {data.psi.fcp && <VitalPill label="FCP" value={data.psi.fcp} />}
          {data.psi.cls && <VitalPill label="CLS" value={data.psi.cls} />}
          {data.psi.tbt && <VitalPill label="TBT" value={data.psi.tbt} />}
        </div>
      )}

      {/* Issues */}
      {data.issues.length > 0 && (
        <div>
          <button
            onClick={() => setIssuesOpen(!issuesOpen)}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors w-full"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{data.issues.length} issue{data.issues.length !== 1 ? "s" : ""} found</span>
            {issuesOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>
          {issuesOpen && (
            <ul className="mt-2 space-y-1">
              {data.issues.map((issue, i) => (
                <li key={i} className="text-[11px] text-muted-foreground pl-5 relative">
                  <span className="absolute left-1.5 top-1 w-1 h-1 rounded-full bg-amber-400/60" />
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {data.issues.length === 0 && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          <span>No SEO issues detected</span>
        </div>
      )}

      {/* Last checked */}
      {data.lastChecked && (
        <p className="text-[10px] text-muted-foreground/50 mt-3">
          Last checked {new Date(data.lastChecked).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      )}
    </div>
  );
}

function PsiPill({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? "text-emerald-400" : value >= 50 ? "text-amber-400" : "text-red-400";
  return (
    <div className="bg-[oklch(0.13_0.005_250)] rounded px-2 py-1.5 border border-border/50">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground truncate">{label}</p>
    </div>
  );
}

function VitalPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-[oklch(0.13_0.005_250)] rounded px-2 py-1.5 border border-border/50">
      <p className="text-xs font-medium text-foreground">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
