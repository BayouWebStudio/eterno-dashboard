/*
  DESIGN: Dark Forge — Analytics Card
  Shows page view metrics: total, today, last 7 days, and a mini bar chart.
*/
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Eye, TrendingUp, RefreshCw } from "lucide-react";

interface DailyData {
  date: string;
  views: number;
}

interface AnalyticsData {
  totalViews: number;
  todayViews: number;
  last7Days: number;
  daily: DailyData[];
}

export default function AnalyticsCard() {
  const { getToken, convexHttpUrl } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${convexHttpUrl}/api/dashboard/analytics`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [getToken, convexHttpUrl]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-gold" />
          <h3 className="text-sm font-heading font-bold text-foreground">Site Analytics</h3>
        </div>
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          <span className="text-xs">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxViews = Math.max(...(data.daily?.map((d) => d.views) ?? [1]), 1);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gold" />
          <h3 className="text-sm font-heading font-bold text-foreground">Site Analytics</h3>
        </div>
        <button
          onClick={load}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metric Pills */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <MetricPill icon={Eye} label="Total Views" value={formatNum(data.totalViews)} />
        <MetricPill icon={TrendingUp} label="Today" value={formatNum(data.todayViews)} />
        <MetricPill icon={BarChart3} label="Last 7 Days" value={formatNum(data.last7Days)} />
      </div>

      {/* Mini Bar Chart */}
      {data.daily && data.daily.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Daily Views</p>
          <div className="flex items-end gap-1 h-16">
            {data.daily.map((d) => {
              const height = maxViews > 0 ? Math.max((d.views / maxViews) * 100, 4) : 4;
              const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm bg-gold/20 hover:bg-gold/40 transition-colors relative group"
                    style={{ height: `${height}%`, minHeight: "3px" }}
                    title={`${dayLabel}: ${d.views} views`}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block text-[10px] text-foreground bg-[oklch(0.2_0.005_250)] border border-border rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                      {d.views}
                    </div>
                  </div>
                  <span className="text-[9px] text-muted-foreground/60">{dayLabel.charAt(0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-[oklch(0.13_0.005_250)] rounded-md p-2.5 border border-border/50 text-center">
      <Icon className="w-3.5 h-3.5 text-gold-dim mx-auto mb-1" />
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}
