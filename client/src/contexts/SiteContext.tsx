/*
  DESIGN: Dark Forge — Site Context
  Manages the current site selection, site info, and site HTML.
  Provides site data to all child components.
*/
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { convexFetch } from "@/hooks/useConvex";

export interface SiteInfo {
  slug: string;
  name: string;
  domain?: string;
  plan?: string;
  theme?: string;
  lang?: string;
  createdAt?: string;
}

interface SiteContextValue {
  sites: SiteInfo[];
  currentSite: SiteInfo | null;
  siteHtml: string;
  loading: boolean;
  error: string | null;
  selectSite: (slug: string) => void;
  refreshSites: () => Promise<void>;
  refreshHtml: () => Promise<void>;
  saveSiteField: (key: string, value: string) => Promise<boolean>;
  uploadSiteImage: (file: File, folder?: string) => Promise<string | null>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const { getToken, convexHttpUrl, isSignedIn, isLoaded } = useAuth();
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [siteHtml, setSiteHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSite = sites.find((s) => s.slug === currentSlug) ?? null;

  // Fetch user's sites list
  const refreshSites = useCallback(async () => {
    if (!convexHttpUrl) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await convexFetch(convexHttpUrl, "/api/sites", token);
      if (!res.ok) throw new Error(`Failed to load sites: ${res.status}`);
      const data = await res.json();
      const siteList: SiteInfo[] = Array.isArray(data)
        ? data.map((s: any) => ({
            slug: s.slug || s.name || "",
            name: s.name || s.slug || "",
            domain: s.domain,
            plan: s.plan,
            theme: s.theme,
            lang: s.lang,
            createdAt: s.createdAt,
          }))
        : [];
      setSites(siteList);
      // Auto-select first site if none selected
      if (!currentSlug && siteList.length > 0) {
        setCurrentSlug(siteList[0].slug);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sites");
    } finally {
      setLoading(false);
    }
  }, [convexHttpUrl, getToken, currentSlug]);

  // Fetch current site's HTML
  const refreshHtml = useCallback(async () => {
    if (!convexHttpUrl || !currentSlug) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await convexFetch(convexHttpUrl, `/api/getSiteHtml?slug=${encodeURIComponent(currentSlug)}`, token);
      if (!res.ok) throw new Error(`Failed to load site HTML: ${res.status}`);
      const html = await res.text();
      setSiteHtml(html);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load site HTML");
    } finally {
      setLoading(false);
    }
  }, [convexHttpUrl, currentSlug, getToken]);

  // Save a field value to the site
  const saveSiteField = useCallback(
    async (key: string, value: string): Promise<boolean> => {
      if (!convexHttpUrl || !currentSlug) return false;
      try {
        const token = await getToken();
        const res = await convexFetch(convexHttpUrl, "/api/updateSiteField", token, {
          method: "POST",
          body: { slug: currentSlug, key, value },
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        return true;
      } catch (err) {
        console.error(`[Site] Save field "${key}" failed:`, err);
        return false;
      }
    },
    [convexHttpUrl, currentSlug, getToken]
  );

  // Upload an image for the site
  const uploadSiteImage = useCallback(
    async (file: File, folder?: string): Promise<string | null> => {
      if (!convexHttpUrl || !currentSlug) return null;
      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("slug", currentSlug);
        if (folder) formData.append("folder", folder);

        const res = await convexFetch(convexHttpUrl, "/api/uploadImage", token, {
          method: "POST",
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
    [convexHttpUrl, currentSlug, getToken]
  );

  const selectSite = useCallback((slug: string) => {
    setCurrentSlug(slug);
  }, []);

  // Load sites on auth
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      refreshSites();
    }
  }, [isLoaded, isSignedIn, refreshSites]);

  // Load HTML when site changes
  useEffect(() => {
    if (currentSlug) {
      refreshHtml();
    }
  }, [currentSlug, refreshHtml]);

  return (
    <SiteContext.Provider
      value={{
        sites,
        currentSite,
        siteHtml,
        loading,
        error,
        selectSite,
        refreshSites,
        refreshHtml,
        saveSiteField,
        uploadSiteImage,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}
