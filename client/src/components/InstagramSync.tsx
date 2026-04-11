/*
  DESIGN: Dark Forge — Instagram Auto-Sync
  Toggle Instagram auto-sync for a client's gallery.
  Weekly cron pulls latest posts and adds them to the site.
*/
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { Instagram, RefreshCw, Check, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

function formatLastRun(ts: number | null | undefined): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function InstagramSync() {
  const { getToken, convexHttpUrl } = useAuth();
  const { currentSite, refreshInfo } = useSite();

  const [igHandleInput, setIgHandleInput] = useState(currentSite?.igHandle || "");
  const [savingHandle, setSavingHandle] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const authFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const token = await getToken();
      const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(`${convexHttpUrl}${path}`, { ...options, headers });
    },
    [getToken, convexHttpUrl]
  );

  const saveIgHandle = useCallback(async () => {
    if (!igHandleInput.trim()) {
      toast.error("Please enter an Instagram handle");
      return;
    }
    setSavingHandle(true);
    try {
      const res = await authFetch("/api/client/ig-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ igHandle: igHandleInput.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Instagram handle saved");
      await refreshInfo();
    } catch {
      toast.error("Failed to save Instagram handle");
    } finally {
      setSavingHandle(false);
    }
  }, [igHandleInput, authFetch, refreshInfo]);

  const toggleAutoGallery = useCallback(async () => {
    if (!currentSite?.slug) return;
    setToggling(true);
    try {
      const res = await authFetch("/api/client/auto-gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: currentSite.slug }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === "upgrade_required") {
          toast.error("Auto-sync requires a Pro plan");
        } else {
          throw new Error(err.error || "Failed to toggle");
        }
        return;
      }
      const data = await res.json();
      toast.success(data.autoGallery ? "Auto-sync enabled" : "Auto-sync disabled");
      await refreshInfo();
    } catch {
      toast.error("Failed to toggle auto-sync");
    } finally {
      setToggling(false);
    }
  }, [currentSite?.slug, authFetch, refreshInfo]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await authFetch("/api/client/auto-gallery/run-now", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Sync failed");
      }
      const data = await res.json();
      if (data.newPhotos === 0) {
        toast.success("Already up to date — no new photos found");
      } else {
        toast.success(`Added ${data.newPhotos} new photo${data.newPhotos === 1 ? "" : "s"}`);
      }
      await refreshInfo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [authFetch, refreshInfo]);

  const hasHandle = !!currentSite?.igHandle;
  const isEnabled = currentSite?.autoGallery;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Instagram className="w-4 h-4 text-gold" />
          <h3 className="text-sm font-heading font-bold text-foreground">Instagram Auto-Sync</h3>
        </div>
        {isEnabled && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Automatically pulls your latest Instagram posts and adds them to your site gallery. Runs weekly on Sundays.
      </p>

      {/* IG Handle — locked once set */}
      <div className="mb-4">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
          Instagram Handle
        </label>
        {hasHandle ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm bg-[oklch(0.14_0.005_250)] border border-border rounded-md">
            <span className="text-foreground">@{currentSite?.igHandle}</span>
            <span className="text-[10px] text-muted-foreground">Locked to registered handle</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <input
                type="text"
                value={igHandleInput}
                onChange={(e) => setIgHandleInput(e.target.value.replace(/^@/, ""))}
                placeholder="yourhandle"
                className="w-full pl-7 pr-3 py-2 text-sm bg-[oklch(0.14_0.005_250)] border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 transition-colors"
              />
            </div>
            <button
              onClick={saveIgHandle}
              disabled={savingHandle || !igHandleInput.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-border hover:border-gold/30 hover:bg-[oklch(0.16_0.005_250)] text-foreground transition-colors disabled:opacity-50"
            >
              {savingHandle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        )}
      </div>

      {/* Toggle + Sync Now */}
      {hasHandle && (
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <button
            onClick={toggleAutoGallery}
            disabled={toggling}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 ${
              isEnabled
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-[oklch(0.16_0.005_250)] text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {toggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {isEnabled ? "Auto-sync enabled" : "Enable auto-sync"}
          </button>
          <button
            onClick={syncNow}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-gold border border-gold/20 hover:bg-gold/10 rounded-md transition-colors disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {syncing ? "Syncing..." : "Sync now"}
          </button>
          <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            Last run: {formatLastRun(currentSite?.autoGalleryLastRun)}
          </div>
        </div>
      )}
    </div>
  );
}
