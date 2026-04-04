/*
  DESIGN: Dark Forge — Site Context
  Manages the current site selection, site info, and site HTML.
  Uses the real Convex HTTP action endpoints from the original dashboard:
    - GET  /api/dashboard/info            → site info (slug, plan, domain, etc.)
    - GET  /api/dashboard/site-html       → full HTML of the site (returns html, isSignature, availablePages, currentPage)
    - POST /api/dashboard/save-section    → save a field (includes page param for non-index pages)
    - POST /api/dashboard/upload-hero-bg  → upload images
    - POST /api/signature/create          → onboarding: create site from IG handle
    - POST /api/dashboard/connect-site    → connect existing site by IG handle
*/
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

/* ── Page name mapping ── */
const PAGE_NAMES: Record<string, string> = {
  "index.html": "Home",
  "about.html": "About",
  "tattoos.html": "Tattoos",
  "booking.html": "Booking",
  "testimonials.html": "Testimonials",
  "reviews.html": "Reviews",
  "gallery.html": "Gallery",
  "jewelry.html": "Jewelry",
  "art.html": "Art",
  "paintings.html": "Paintings",
  "concepts.html": "Concepts",
  "shop.html": "Shop",
  "faq.html": "FAQ",
  "contact.html": "Contact",
  "artists/index.html": "Our Artists",
};

export function getPageLabel(page: string): string {
  if (PAGE_NAMES[page]) return PAGE_NAMES[page];
  // For subdirectory index pages (e.g. "artists/index.html" → "Artists")
  if (page.includes("/") && page.endsWith("/index.html")) {
    const dir = page.split("/")[0];
    return dir.charAt(0).toUpperCase() + dir.slice(1);
  }
  const base = page.replace(/\.html$/i, "");
  return base
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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
  hasAgent?: boolean;
}

type OnboardingStatus = "idle" | "none" | "building" | "connecting" | "ready";

interface SiteContextValue {
  currentSite: SiteInfo | null;
  siteHtml: string;
  loading: boolean;
  htmlLoading: boolean;
  error: string | null;
  onboardingStatus: OnboardingStatus;
  buildProgress: string;
  /* Multi-page support */
  isSignatureSite: boolean;
  availablePages: string[];
  currentPage: string;
  switchPage: (page: string) => Promise<void>;
  /* Actions */
  refreshInfo: () => Promise<void>;
  refreshHtml: (page?: string) => Promise<void>;
  saveSiteField: (key: string, value: string) => Promise<boolean>;
  uploadSiteImage: (file: File, folder?: string) => Promise<string | null>;
  saveGalleryOrder: (filenames: string[], sectionId?: string) => Promise<boolean>;
  deleteGalleryImage: (filename: string, sectionId?: string) => Promise<boolean>;
  deleteSiteSection: (sectionKeyword: string) => Promise<boolean>;
  deleteArtist: (artistName: string) => Promise<boolean>;
  addSiteSection: (sectionType: string, title: string, content: string) => Promise<boolean>;
  reorderSections: (sectionOrder: string[]) => Promise<boolean>;
  setupSite: (igHandle: string, country: string) => Promise<boolean>;
  connectSite: (igHandle: string) => Promise<{ success: boolean; error?: string }>;
  restoreFileFromHistory: (file: string, targetSha?: string) => Promise<{ ok: boolean; error?: string }>;
  applyTheme: (themeId: string, colors: { bg: string; accent: string; text: string; card: string }, fonts?: { heading: string; body: string }) => Promise<boolean>;
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
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>("idle");
  const [buildProgress, setBuildProgress] = useState("");

  /* Multi-page state */
  const [isSignatureSite, setIsSignatureSite] = useState(false);
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState("index.html");

  // Use ref to avoid stale closures in callbacks
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  // AbortController for refreshHtml — cancels previous in-flight request on rapid page switches
  const htmlAbortRef = useRef<AbortController | null>(null);

  // Cancellation flag for setupSite polling — set on unmount to stop leaked timers
  const setupCancelledRef = useRef(false);

  // ── Helper: authenticated fetch to Convex HTTP actions ──
  const authFetch = useCallback(
    async (path: string, options?: RequestInit): Promise<Response> => {
      const token = await getToken();
      if (!token) {
        throw new Error("Session expired — please sign in again");
      }
      const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string> || {}),
        Authorization: `Bearer ${token}`,
      };
      return fetch(`${convexHttpUrl}${path}`, { ...options, headers });
    },
    [convexHttpUrl, getToken]
  );

  // ── Fetch site info from /api/dashboard/info ──
  const refreshInfo = useCallback(async () => {
    if (!convexHttpUrl) {
      // No backend URL configured — treat as new user so onboarding shows
      setOnboardingStatus("none");
      return;
    }
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
        hasAgent: data.hasAgent,
      });
      setOnboardingStatus("ready");
    } catch (err) {
      console.error("[SiteContext] refreshInfo failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load site info");
      // Treat any failure as a new user — shows onboarding rather than infinite "Loading..."
      setOnboardingStatus("none");
    } finally {
      setLoading(false);
    }
  }, [convexHttpUrl, authFetch]);

  // ── Fetch site HTML from /api/dashboard/site-html ──
  const refreshHtml = useCallback(async (page?: string) => {
    if (!convexHttpUrl || !currentSite?.slug) return;
    const pageToLoad = page || currentPageRef.current || "index.html";

    // Cancel any previous in-flight request to avoid out-of-order responses
    htmlAbortRef.current?.abort();
    const controller = new AbortController();
    htmlAbortRef.current = controller;

    setHtmlLoading(true);
    try {
      const res = await authFetch(`/api/dashboard/site-html?page=${encodeURIComponent(pageToLoad)}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Failed to load site HTML: ${res.status}`);
      const data = await res.json();
      const html = typeof data === "string" ? data : data.html || "";
      setSiteHtml(html);

      // Update multi-page state from response
      if (data.isSignature !== undefined) {
        setIsSignatureSite(data.isSignature);
        const pages = data.availablePages || [];
        setAvailablePages(pages);
        const responsePage = data.currentPage || pageToLoad;
        setCurrentPage(responsePage);
      } else {
        // Not a signature site — still set the current page
        setCurrentPage(pageToLoad);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load site HTML");
    } finally {
      setHtmlLoading(false);
    }
  }, [convexHttpUrl, currentSite?.slug, authFetch]);

  // ── Switch to a different page ──
  const switchPage = useCallback(async (page: string) => {
    setCurrentPage(page);
    currentPageRef.current = page;
    setSiteHtml(""); // Clear HTML while loading
    await refreshHtml(page);
  }, [refreshHtml]);

  // ── Save a field via /api/dashboard/save-section ──
  const saveSiteField = useCallback(
    async (key: string, value: string): Promise<boolean> => {
      if (!convexHttpUrl || !currentSite?.slug) return false;
      try {
        // Build payload — include page param for non-index pages on signature sites
        const payload: Record<string, string> = { sectionKey: key, newContent: value };
        if (isSignatureSite && currentPageRef.current && currentPageRef.current !== "index.html") {
          payload.page = currentPageRef.current;
        }

        const res = await authFetch("/api/dashboard/save-section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Save failed: ${res.status}`);
        }
        return true;
      } catch (err) {
        console.error(`[Site] Save field "${key}" failed:`, err);
        return false;
      }
    },
    [convexHttpUrl, currentSite?.slug, authFetch, isSignatureSite]
  );

  // ── Upload image via /api/dashboard/upload-hero-bg ──
  const uploadSiteImage = useCallback(
    async (file: File, folder?: string): Promise<string | null> => {
      if (!convexHttpUrl) return null;
      try {
        // Compress image if it's larger than 5MB to avoid browser limits and GitHub API size limits
        let fileToUpload = file;
        if (file.size > 5 * 1024 * 1024) {
          try {
            const { compressImage } = await import("@/lib/compressImage");
            const result = await compressImage(file, { maxWidth: 3000, maxHeight: 3000, quality: 0.82 });
            fileToUpload = result.file;
          } catch {
            // If compression fails, proceed with original file
          }
        }

        // Convert File to base64 — backend expects JSON, not FormData
        // Use FileReader.readAsDataURL which handles encoding natively and
        // avoids browser-specific btoa() limits on large binary strings.
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            // Strip the "data:<mime>;base64," prefix — backend expects raw base64
            const base64 = dataUrl.split(",")[1] || "";
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(fileToUpload);
        });

        const res = await authFetch("/api/dashboard/upload-hero-bg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64,
            fileName: fileToUpload.name,
            folder,
            page: currentPageRef.current || "index.html",
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `Upload failed: ${res.status}`);
        }
        const data = await res.json();
        return data.imageUrl || data.url || data.path || null;
      } catch (err) {
        console.error("[Site] Upload image failed:", err);
        return null;
      }
    },
    [convexHttpUrl, authFetch]
  );

  // ── Save gallery order via /api/dashboard/save-gallery-order ──
  const saveGalleryOrder = useCallback(
    async (filenames: string[], sectionId?: string): Promise<boolean> => {
      if (!convexHttpUrl) {
        console.error("[Site] saveGalleryOrder: convexHttpUrl is empty!");
        throw new Error("Backend URL not configured");
      }
      console.log(`[Site] saveGalleryOrder: sending ${filenames.length} filenames, sectionId=${sectionId}, page=${currentPageRef.current}, url=${convexHttpUrl}`);
      try {
        const res = await authFetch("/api/dashboard/save-gallery-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageFilenames: filenames,
            sectionId: sectionId || "gallery",
            page: currentPageRef.current || "index.html",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Save gallery order failed: ${res.status}`);
        }
        const data = await res.json();
        if (data.ok !== true) {
          throw new Error(data?.error || "Gallery order save returned unexpected response");
        }
        return true;
      } catch (err) {
        console.error("[Site] Save gallery order failed:", err);
        throw err; // re-throw so GalleryEditor can show the real message
      }
    },
    [convexHttpUrl, authFetch]
  );

  // ── Delete gallery image via /api/dashboard/delete-gallery-image ──
  const deleteGalleryImage = useCallback(
    async (filename: string, sectionId?: string): Promise<boolean> => {
      if (!convexHttpUrl) return false;
      try {
        const res = await authFetch("/api/dashboard/delete-gallery-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename,
            sectionId: sectionId || "gallery",
            page: currentPageRef.current || "index.html",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Delete gallery image failed: ${res.status}`);
        }
        const data = await res.json();
        return data.ok === true;
      } catch (err) {
        console.error("[Site] Delete gallery image failed:", err);
        return false;
      }
    },
    [convexHttpUrl, authFetch]
  );

  // ── Delete a section via /api/dashboard/remove-section ──
  const deleteSiteSection = useCallback(
    async (sectionKeyword: string): Promise<boolean> => {
      if (!convexHttpUrl) return false;
      try {
        const res = await authFetch("/api/dashboard/remove-section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionKeyword, page: currentPageRef.current || "index.html" }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Remove section failed: ${res.status}`);
        }
        return true;
      } catch (err) {
        console.error(`[Site] Delete section "${sectionKeyword}" failed:`, err);
        return false;
      }
    },
    [convexHttpUrl, authFetch]
  );

  // ── Delete an artist from booking page via /api/dashboard/remove-artist ──
  const deleteArtist = useCallback(
    async (artistName: string): Promise<boolean> => {
      if (!convexHttpUrl) return false;
      try {
        const res = await authFetch("/api/dashboard/remove-artist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artistName }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Remove artist failed: ${res.status}`);
        }
        return true;
      } catch (err) {
        console.error(`[Site] Delete artist "${artistName}" failed:`, err);
        return false;
      }
    },
    [convexHttpUrl, authFetch]
  );

  // ── Add a section via /api/dashboard/add-section ──
  const addSiteSection = useCallback(
    async (sectionType: string, title: string, content: string): Promise<boolean> => {
      if (!convexHttpUrl) return false;
      try {
        const res = await authFetch("/api/dashboard/add-section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionType, title, content, page: currentPageRef.current || "index.html" }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Add section failed: ${res.status}`);
        }
        // Apply the updated HTML directly from the response to avoid GitHub cache race
        const data = await res.json().catch(() => null);
        if (data?.html) setSiteHtml(data.html);
        return true;
      } catch (err) {
        console.error(`[Site] Add section "${sectionType}" failed:`, err);
        return false;
      }
    },
    [convexHttpUrl, authFetch, setSiteHtml]
  );

  // ── Reorder sections via /api/dashboard/reorder-sections ──
  const reorderSections = useCallback(
    async (sectionOrder: string[]): Promise<boolean> => {
      if (!convexHttpUrl) return false;
      try {
        const res = await authFetch("/api/dashboard/reorder-sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionOrder, page: currentPageRef.current || "index.html" }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Reorder sections failed: ${res.status}`);
        }
        return true;
      } catch (err) {
        console.error("[Site] Reorder sections failed:", err);
        return false;
      }
    },
    [convexHttpUrl, authFetch]
  );

  // ── Connect existing site by Instagram handle ──
  const connectSite = useCallback(
    async (igHandle: string): Promise<{ success: boolean; error?: string }> => {
      if (!convexHttpUrl) return { success: false, error: "Not connected" };
      setOnboardingStatus("connecting");
      setError(null);
      try {
        const res = await authFetch("/api/dashboard/connect-site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ igHandle }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          const errMsg = data.error || "Could not connect site";
          setError(errMsg);
          setOnboardingStatus("none");
          return { success: false, error: errMsg };
        }

        await refreshInfo();
        return { success: true };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Connection failed";
        setError(errMsg);
        setOnboardingStatus("none");
        return { success: false, error: errMsg };
      }
    },
    [convexHttpUrl, authFetch, refreshInfo]
  );

  // ── Onboarding: setup site from Instagram handle ──
  const setupAbortRef = useRef<AbortController | null>(null);
  const setupTimersRef = useRef<{ stepTimer: ReturnType<typeof setInterval> | null; pollTimer: ReturnType<typeof setInterval> | null }>({ stepTimer: null, pollTimer: null });

  const setupSite = useCallback(
    async (igHandle: string, country: string): Promise<boolean> => {
      if (!convexHttpUrl) return false;

      // Abort any previous setup and clear timers synchronously
      setupAbortRef.current?.abort();
      if (setupTimersRef.current.stepTimer) clearInterval(setupTimersRef.current.stepTimer);
      if (setupTimersRef.current.pollTimer) clearInterval(setupTimersRef.current.pollTimer);
      setupTimersRef.current = { stepTimer: null, pollTimer: null };

      const abortController = new AbortController();
      setupAbortRef.current = abortController;
      setupCancelledRef.current = false;

      setOnboardingStatus("building");
      setBuildProgress("Starting build...");
      try {
        const res = await authFetch("/api/signature/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ igHandle, country }),
          signal: abortController.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Build failed — try again");
          setOnboardingStatus("none");
          return false;
        }

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
          if (abortController.signal.aborted) {
            clearInterval(stepTimer);
            setupTimersRef.current.stepTimer = null;
            return;
          }
          stepIdx = Math.min(stepIdx + 1, steps.length - 1);
          setBuildProgress(steps[stepIdx]);
        }, 12000);
        setupTimersRef.current.stepTimer = stepTimer;

        let pollCount = 0;
        const poll = (): Promise<boolean> =>
          new Promise((resolve) => {
            const pollTimer = setInterval(async () => {
              if (abortController.signal.aborted) {
                clearInterval(pollTimer);
                clearInterval(stepTimer);
                setupTimersRef.current.pollTimer = null;
                setupTimersRef.current.stepTimer = null;
                resolve(false);
                return;
              }
              pollCount++;
              if (pollCount > 60) {
                clearInterval(pollTimer);
                clearInterval(stepTimer);
                setupTimersRef.current.pollTimer = null;
                setupTimersRef.current.stepTimer = null;
                resolve(false);
                return;
              }
              try {
                const chkRes = await authFetch("/api/dashboard/info", {
                  signal: abortController.signal,
                });
                const info = await chkRes.json();
                if (info.found && info.siteSlug && info.siteBuilt && !info.siteSlug.endsWith("_pending")) {
                  clearInterval(pollTimer);
                  clearInterval(stepTimer);
                  setupTimersRef.current.pollTimer = null;
                  setupTimersRef.current.stepTimer = null;
                  if (!abortController.signal.aborted) setBuildProgress("Site is live!");
                  resolve(true);
                }
              } catch (err) {
                // If aborted, stop polling; otherwise keep going
                if (abortController.signal.aborted) {
                  clearInterval(pollTimer);
                  clearInterval(stepTimer);
                  setupTimersRef.current.pollTimer = null;
                  setupTimersRef.current.stepTimer = null;
                  resolve(false);
                }
              }
            }, 5000);
            setupTimersRef.current.pollTimer = pollTimer;
          });

        const success = await poll();
        if (abortController.signal.aborted) return false;
        if (success) {
          await refreshInfo();
          return true;
        } else {
          setError("Build timed out — please refresh the page");
          setOnboardingStatus("none");
          return false;
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof DOMException && err.name === "AbortError") return false;
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

  // ── Clear stale state on sign-out ──
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setCurrentSite(null);
      setSiteHtml("");
      setOnboardingStatus("idle");
      setError(null);
      setIsSignatureSite(false);
      setAvailablePages([]);
      setCurrentPage("index.html");
    }
  }, [isLoaded, isSignedIn]);

  // ── Cancel any in-flight setupSite polling on provider unmount ──
  useEffect(() => {
    return () => {
      setupCancelledRef.current = true;
      // Abort in-flight fetch requests immediately
      setupAbortRef.current?.abort();
      // Clear timers synchronously so no callbacks fire after unmount
      if (setupTimersRef.current.stepTimer) clearInterval(setupTimersRef.current.stepTimer);
      if (setupTimersRef.current.pollTimer) clearInterval(setupTimersRef.current.pollTimer);
      setupTimersRef.current = { stepTimer: null, pollTimer: null };
    };
  }, []);

  // ── Apply a theme (colors → all pages via save-theme, fonts → index.html via apply-theme) ──
  const applyTheme = useCallback(
    async (
      themeId: string,
      colors: { bg: string; accent: string; text: string; card: string },
      fonts?: { heading: string; body: string }
    ): Promise<boolean> => {
      if (!convexHttpUrl) return false;
      try {
        // Helper: normalize hex to 6-digit
        const normHex = (h: string) => {
          let hex = h.replace("#", "").toLowerCase();
          if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
          if (hex.length !== 6 || !/^[0-9a-f]{6}$/.test(hex)) return "000000";
          return hex;
        };

        // Compute derived colors (dim = 60% alpha text, border = card + 30 brightness)
        const dimHex = normHex(colors.text);
        const dim = `#${dimHex}99`;
        const bHex = normHex(colors.card);
        const br = Math.min(255, parseInt(bHex.slice(0, 2), 16) + 30);
        const bg2 = Math.min(255, parseInt(bHex.slice(2, 4), 16) + 30);
        const bb = Math.min(255, parseInt(bHex.slice(4, 6), 16) + 30);
        const border = `#${br.toString(16).padStart(2, "0")}${bg2.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`;

        // 1. Save colors to all pages via save-theme (include dim + border for consistency)
        const colorRes = await authFetch("/api/dashboard/save-theme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ themeId, colors: { ...colors, dim, border } }),
        });
        if (!colorRes.ok) {
          const data = await colorRes.json().catch(() => null);
          throw new Error(data?.error || `Theme save failed: ${colorRes.status}`);
        }

        // 2. If fonts provided, apply fonts + CSS vars to index.html via apply-theme
        if (fonts) {
          // Build just the font family query params (NOT full URL — backend prepends the prefix)
          const families = new Set([fonts.heading, fonts.body]);
          const fontFamilyParams = Array.from(families)
            .map((f) => `${f.replace(/ /g, "+")}:wght@300;400;500;600;700;800;900`)
            .join("&family=");

          const fontRes = await authFetch("/api/dashboard/apply-theme", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              themeVars: {
                "--black": colors.bg,
                "--charcoal": colors.card,
                "--gold": colors.accent,
                "--white": colors.text,
                "--dim": dim,
                "--border": border,
              },
              themeKey: themeId,
              googleFonts: `https://fonts.googleapis.com/css2?family=${fontFamilyParams}&display=swap`,
              fonts: { heading: `'${fonts.heading}', serif`, body: `'${fonts.body}', sans-serif` },
            }),
          });
          if (!fontRes.ok) {
            const data = await fontRes.json().catch(() => null);
            console.warn("[Site] apply-theme (fonts) failed:", data?.error);
            // Colors saved to all pages; fonts failed on index only — warn user
            return true; // partial success
          }
        }

        return true;
      } catch (err) {
        console.error("[Site] Apply theme failed:", err);
        return false;
      }
    },
    [convexHttpUrl, authFetch]
  );

  // ── Restore a file from the previous git commit ──
  const restoreFileFromHistory = useCallback(
    async (file: string, targetSha?: string): Promise<{ ok: boolean; error?: string }> => {
      if (!convexHttpUrl || !currentSite?.slug) return { ok: false, error: "No site loaded" };
      try {
        const res = await authFetch("/api/admin/restore-file-from-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: currentSite.slug, file, ...(targetSha ? { targetSha } : {}) }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data?.error || `Request failed: ${res.status}` };
        return { ok: true };
      } catch (err: unknown) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
    [convexHttpUrl, authFetch, currentSite?.slug]
  );

  // ── Load HTML when site is available ──
  useEffect(() => {
    if (currentSite?.slug) {
      refreshHtml("index.html");
    }
  }, [currentSite?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SiteContext.Provider
      value={{
        currentSite,
        siteHtml,
        loading,
        htmlLoading,
        error,
        onboardingStatus,
        buildProgress,
        isSignatureSite,
        availablePages,
        currentPage,
        switchPage,
        refreshInfo,
        refreshHtml,
        saveSiteField,
        uploadSiteImage,
        saveGalleryOrder,
        deleteGalleryImage,
        deleteSiteSection,
        deleteArtist,
        addSiteSection,
        reorderSections,
        setupSite,
        connectSite,
        restoreFileFromHistory,
        applyTheme,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}
