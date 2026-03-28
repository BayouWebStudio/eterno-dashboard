/*
  DESIGN: Dark Forge — Site Context
  Manages the current site selection, site info, and site HTML.
  Uses the real Convex HTTP action endpoints from the original dashboard:
    - GET  /api/dashboard/info          → site info (slug, plan, domain, etc.)
    - GET  /api/dashboard/site-html     → full HTML of the site
    - POST /api/dashboard/save-section  → save a field
    - POST /api/dashboard/upload-hero-bg → upload images
    - POST /api/signature/create         → onboarding: create site from IG handle
*/
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

export interface SiteInfo {
  slug: string;
  name: string;
  domain?: string;
  plan?: string;
  theme?: string;
  lang?: string;
  igHandle?: string;
  siteUrl?: string;
  siteBuilt?: boolean;
}

type OnboardingStatus = "idle" | "none" | "building" | "ready";

interface SiteContextValue {
  currentSite: SiteInfo | null;
  siteHtml: string;
  loading: boolean;
  error: string | null;
  onboardingStatus: OnboardingStatus;
  buildProgress: string;
  refreshInfo: () => Promise<void>;
  refreshHtml: () => Promise<void>;
  saveSiteField: (key: string, value: string) => Promise<boolean>;
  uploadSiteImage: (file: File, folder?: string) => Promise<string | null>;
  setupSite: (igHandle: string) => Promise<boolean>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const { getToken, convexHttpUrl, isSignedIn, isLoaded } = useAuth();
  const [currentSite, setCurrentSite] = useState<SiteInfo | null>(null);
  const [siteHtml, setSiteHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>("idle");
  const [buildProgress, setBuildProgress] = useState("");

  // ── Helper: authenticated fetch to Convex HTTP actions ──
  const authFetch = useCallback(
    async (path: string, options?: RequestInit): Promise<Response> => {
      const token = await getToken();
      const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string> || {}),
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(`${convexHttpUrl}${path}`, { ...options, headers });
    },
    [convexHttpUrl, getToken]
  );

  // ── Fetch site info from /api/dashboard/info ──
  const refreshInfo = useCallback(async () => {
    if (!convexHttpUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/dashboard/info");
      const data = await res.json();

      if (!data.found || !data.siteSlug || !data.siteBuilt || data.siteSlug.endsWith("_pending")) {
        setOnboardingStatus("none");
        setCurrentSite(null);
        return;
      }

      setCurrentSite({
        slug: data.siteSlug,
        name: data.siteSlug,
        domain: data.domain || `${data.siteSlug}.eternowebstudio.com`,
        plan: data.plan || "free",
        theme: data.theme,
        lang: data.lang,
        igHandle: data.igHandle,
        siteUrl: data.siteUrl,
        siteBuilt: data.siteBuilt,
      });
      setOnboardingStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load site info");
    } finally {
      setLoading(false);
    }
  }, [convexHttpUrl, authFetch]);

  // ── Fetch site HTML from /api/dashboard/site-html ──
  const refreshHtml = useCallback(async () => {
    if (!convexHttpUrl || !currentSite?.slug) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/dashboard/site-html?page=index`);
      if (!res.ok) throw new Error(`Failed to load site HTML: ${res.status}`);
      const data = await res.json();
      // The endpoint returns { html: "..." } or just the HTML string
      const html = typeof data === "string" ? data : data.html || "";
      setSiteHtml(html);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load site HTML");
    } finally {
      setLoading(false);
    }
  }, [convexHttpUrl, currentSite?.slug, authFetch]);

  // ── Save a field via /api/dashboard/save-section ──
  const saveSiteField = useCallback(
    async (key: string, value: string): Promise<boolean> => {
      if (!convexHttpUrl || !currentSite?.slug) return false;
      try {
        const res = await authFetch("/api/dashboard/save-section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        return true;
      } catch (err) {
        console.error(`[Site] Save field "${key}" failed:`, err);
        return false;
      }
    },
    [convexHttpUrl, currentSite?.slug, authFetch]
  );

  // ── Upload image via /api/dashboard/upload-hero-bg ──
  const uploadSiteImage = useCallback(
    async (file: File, folder?: string): Promise<string | null> => {
      if (!convexHttpUrl) return null;
      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append("file", file);
        if (folder) formData.append("folder", folder);

        const res = await fetch(`${convexHttpUrl}/api/dashboard/upload-hero-bg`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const data = await res.json();
        return data.url || data.path || null;
      } catch (err) {
        console.error("[Site] Upload image failed:", err);
        return null;
      }
    },
    [convexHttpUrl, getToken]
  );

  // ── Onboarding: setup site from Instagram handle ──
  const setupSite = useCallback(
    async (igHandle: string): Promise<boolean> => {
      if (!convexHttpUrl) return false;
      setOnboardingStatus("building");
      setBuildProgress("Starting build...");
      try {
        const res = await authFetch("/api/signature/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ igHandle }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Build failed — try again");
          setOnboardingStatus("none");
          return false;
        }

        // Poll for completion
        const steps = [
          "Scraping Instagram...",
          "Classifying your photos...",
          "Building your site...",
          "Deploying...",
          "Almost there...",
        ];
        let stepIdx = 0;
        setBuildProgress(steps[0]);

        const stepTimer = setInterval(() => {
          stepIdx = Math.min(stepIdx + 1, steps.length - 1);
          setBuildProgress(steps[stepIdx]);
        }, 12000);

        let pollCount = 0;
        const poll = (): Promise<boolean> =>
          new Promise((resolve) => {
            const pollTimer = setInterval(async () => {
              pollCount++;
              if (pollCount > 24) {
                clearInterval(pollTimer);
                clearInterval(stepTimer);
                resolve(false);
                return;
              }
              try {
                const chkRes = await authFetch("/api/dashboard/info");
                const info = await chkRes.json();
                if (info.found && info.siteSlug && info.siteBuilt && !info.siteSlug.endsWith("_pending")) {
                  clearInterval(pollTimer);
                  clearInterval(stepTimer);
                  setBuildProgress("Site is live!");
                  resolve(true);
                }
              } catch {
                // keep polling
              }
            }, 5000);
          });

        const success = await poll();
        if (success) {
          // Reload site info
          await refreshInfo();
          return true;
        } else {
          setError("Build timed out — please refresh the page");
          setOnboardingStatus("none");
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setOnboardingStatus("none");
        return false;
      }
    },
    [convexHttpUrl, authFetch, refreshInfo]
  );

  // ── Load site info on auth ──
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      refreshInfo();
    }
  }, [isLoaded, isSignedIn, refreshInfo]);

  // ── Load HTML when site is available ──
  useEffect(() => {
    if (currentSite?.slug) {
      refreshHtml();
    }
  }, [currentSite?.slug, refreshHtml]);

  return (
    <SiteContext.Provider
      value={{
        currentSite,
        siteHtml,
        loading,
        error,
        onboardingStatus,
        buildProgress,
        refreshInfo,
        refreshHtml,
        saveSiteField,
        uploadSiteImage,
        setupSite,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}
