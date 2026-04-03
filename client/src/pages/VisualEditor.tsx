/*
  DESIGN: Dark Forge — Visual Editor Page
  Inline visual editor: renders site HTML in a same-origin iframe with
  injected edit controls. Users click directly on text, images, and sections
  to edit them. Changes are communicated via postMessage.
*/
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useSite, getPageLabel } from "@/contexts/SiteContext";
import { injectEditor } from "@/lib/editInjector";
import { compressImage } from "@/lib/compressImage";
import PageSelector from "@/components/PageSelector";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Pencil,
  Eye,
  Loader2,
  AlertCircle,
  Plus,
  RefreshCw,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";

export default function VisualEditor() {
  const {
    siteHtml,
    loading,
    htmlLoading,
    currentSite,
    saveSiteField,
    uploadSiteImage,
    deleteSiteSection,
    deleteArtist,
    addSiteSection,
    deleteGalleryImage,
    saveGalleryOrder,
    refreshHtml,
    isSignatureSite,
    availablePages,
    currentPage,
    switchPage,
  } = useSite();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [editMode, setEditMode] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [pendingImageSwap, setPendingImageSwap] = useState<{ sectionId: string; key: string } | null>(null);
  const [pendingGalleryUpload, setPendingGalleryUpload] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ── Add Section state ──
  const [showAddSection, setShowAddSection] = useState(false);
  const [addSectionType, setAddSectionType] = useState("services");
  const [addSectionTitle, setAddSectionTitle] = useState("");
  const [addSectionContent, setAddSectionContent] = useState("");
  const [adding, setAdding] = useState(false);

  // Build the base URL for resolving relative paths (e.g. img/photo.jpg → full URL)
  const siteBaseUrl = useMemo(() => {
    if (!currentSite) return "";
    const slug = currentSite.slug || "";
    // Use GitHub raw content URL for the dedicated repo — this always works
    // regardless of custom domains, CDN caching, or monorepo routing
    if (slug) {
      return `https://raw.githubusercontent.com/BayouWebStudio/${slug}/main`;
    }
    // Fallback: construct from domain
    const domain = currentSite.domain || "";
    if (!domain) return "";
    const base = domain.startsWith("http") ? domain : `https://${domain}`;
    return base;
  }, [currentSite]);

  // Build the srcdoc with injected editor
  const srcdoc = useMemo(() => {
    if (!siteHtml) return "";
    return injectEditor(siteHtml, siteBaseUrl);
  }, [siteHtml, siteBaseUrl]);

  // Toggle edit mode in iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "toggle-edit", enabled: editMode },
        "*"
      );
    }
  }, [editMode]);

  // ── Handle messages from iframe ──
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      // Only accept messages from the same origin (our iframe) or the dashboard itself
      if (e.origin !== window.location.origin && e.origin !== "null") return;
      const data = e.data;
      if (!data || !data.type) return;

      switch (data.type) {
        case "editor-ready":
          // Editor script initialized
          break;

        case "text-edit":
          handleTextEditRef.current(data);
          break;

        case "image-swap":
          setPendingImageSwap({ sectionId: data.sectionId, key: data.key });
          fileInputRef.current?.click();
          break;

        case "gallery-upload":
          setPendingGalleryUpload(data.sectionId);
          galleryInputRef.current?.click();
          break;

        case "gallery-delete":
          handleGalleryDeleteRef.current(data);
          break;

        case "gallery-reorder":
          handleGalleryReorderRef.current(data);
          break;

        case "section-delete":
          handleSectionDeleteRef.current(data);
          break;

        case "artist-delete":
          handleArtistDeleteRef.current(data);
          break;

        case "request-refresh":
          refreshHtmlRef.current();
          break;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []); // empty array is correct — listener registered once, refs always stay current

  // ── Text edit handler ──
  const handleTextEdit = useCallback(
    async (data: { sectionId: string; key: string; value: string }) => {
      try {
        const ok = await saveSiteField(data.key, data.value);
        if (ok) {
          toast.success("Text updated. Allow 3\u20135 min for live site.");
        } else {
          toast.error("Failed to save text change.");
        }
      } catch {
        toast.error("Failed to save text change.");
      }
    },
    [saveSiteField]
  );

  // ── Image swap handler ──
  const handleImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !pendingImageSwap) return;

      setUploading(true);
      try {
        const result = await compressImage(file);
        const folder = pendingImageSwap.key.includes("hero") ? "hero" : "img";
        const url = await uploadSiteImage(result.file, folder);
        if (url) {
          await saveSiteField(pendingImageSwap.key, url);
          toast.success("Image updated. Allow 3\u20135 min for live site.");
          refreshHtml();
        } else {
          toast.error("Failed to upload image.");
        }
      } catch {
        toast.error("Failed to upload image.");
      } finally {
        setUploading(false);
        setPendingImageSwap(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [pendingImageSwap, uploadSiteImage, saveSiteField, refreshHtml]
  );

  // ── Gallery upload handler ──
  const handleGalleryFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      let uploaded = 0;
      try {
        for (const file of Array.from(files)) {
          const result = await compressImage(file);
          const url = await uploadSiteImage(result.file, "gallery");
          if (url) uploaded++;
        }
        if (uploaded > 0) {
          toast.success(`${uploaded} photo${uploaded > 1 ? "s" : ""} added. Allow 3\u20135 min for live site.`);
          refreshHtml();
        } else {
          toast.error("Failed to upload photos.");
        }
      } catch {
        toast.error("Failed to upload photos.");
      } finally {
        setUploading(false);
        setPendingGalleryUpload(null);
        if (galleryInputRef.current) galleryInputRef.current.value = "";
      }
    },
    [uploadSiteImage, refreshHtml]
  );

  // ── Gallery reorder handler ──
  const handleGalleryReorder = useCallback(
    async (data: { sectionId: string; filenames: string[] }) => {
      try {
        const sectionId = data.sectionId === "tattoo-gallery" ? "gallery" : data.sectionId;
        const ok = await saveGalleryOrder(data.filenames, sectionId);
        if (ok) {
          toast.success("Gallery order saved! Allow 3\u20135 min for live site.");
        } else {
          toast.error("Failed to save gallery order.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Gallery save failed: ${msg}`, { duration: 8000 });
      }
    },
    [saveGalleryOrder]
  );

  // ── Gallery delete handler ──
  const handleGalleryDelete = useCallback(
    async (data: { sectionId: string; filename: string }) => {
      try {
        const sectionId = data.sectionId === "tattoo-gallery" ? "gallery" : data.sectionId;
        const ok = await deleteGalleryImage(data.filename, sectionId);
        if (ok) {
          toast.success("Photo removed. Allow 3\u20135 min for live site.");
          refreshHtml();
        } else {
          toast.error("Failed to remove photo.");
        }
      } catch {
        toast.error("Failed to remove photo.");
      }
    },
    [deleteGalleryImage, refreshHtml]
  );

  // ── Section delete handler ──
  const handleSectionDelete = useCallback(
    async (data: { sectionId: string }) => {
      try {
        const ok = await deleteSiteSection(data.sectionId);
        if (ok) {
          toast.success("Section removed. Allow 3\u20135 min for live site.");
          refreshHtml();
        } else {
          toast.error("Failed to remove section.");
        }
      } catch {
        toast.error("Failed to remove section.");
      }
    },
    [deleteSiteSection, refreshHtml]
  );

  // ── Artist delete handler ──
  const handleArtistDelete = useCallback(
    async (data: { artistName: string }) => {
      try {
        const ok = await deleteArtist(data.artistName);
        if (ok) {
          toast.success("Artist removed from booking. Allow 3–5 min for live site.");
          refreshHtml();
        } else {
          toast.error("Failed to remove artist.");
        }
      } catch {
        toast.error("Failed to remove artist.");
      }
    },
    [deleteArtist, refreshHtml]
  );

  // ── Refs to hold latest handler versions (avoids stale closures in the message listener) ──
  const handleTextEditRef = useRef(handleTextEdit);
  const handleGalleryDeleteRef = useRef(handleGalleryDelete);
  const handleGalleryReorderRef = useRef(handleGalleryReorder);
  const handleSectionDeleteRef = useRef(handleSectionDelete);
  const handleArtistDeleteRef = useRef(handleArtistDelete);
  const refreshHtmlRef = useRef(refreshHtml);
  useEffect(() => { handleTextEditRef.current = handleTextEdit; }, [handleTextEdit]);
  useEffect(() => { handleGalleryDeleteRef.current = handleGalleryDelete; }, [handleGalleryDelete]);
  useEffect(() => { handleGalleryReorderRef.current = handleGalleryReorder; }, [handleGalleryReorder]);
  useEffect(() => { handleSectionDeleteRef.current = handleSectionDelete; }, [handleSectionDelete]);
  useEffect(() => { handleArtistDeleteRef.current = handleArtistDelete; }, [handleArtistDelete]);
  useEffect(() => { refreshHtmlRef.current = refreshHtml; }, [refreshHtml]);

  // ── Page switch handler ──
  const handlePageSwitch = useCallback(
    async (page: string) => {
      await switchPage(page);
    },
    [switchPage]
  );

  // ── Add section handler ──
  const handleAddSection = useCallback(async () => {
    if (!addSectionTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (addSectionType !== "photo-gallery" && !addSectionContent.trim()) {
      toast.error("Content is required");
      return;
    }
    setAdding(true);
    try {
      const contentToSend =
        addSectionType === "photo-gallery" ? "Gallery section" : addSectionContent.trim();
      const ok = await addSiteSection(addSectionType, addSectionTitle.trim(), contentToSend);
      if (ok) {
        toast.success("Section added! Allow 3\u20135 min for live site.");
        setShowAddSection(false);
        setAddSectionType("services");
        setAddSectionTitle("");
        setAddSectionContent("");
        await refreshHtml();
      } else {
        toast.error("Failed to add section.");
      }
    } catch {
      toast.error("Failed to add section.");
    } finally {
      setAdding(false);
    }
  }, [addSiteSection, addSectionType, addSectionTitle, addSectionContent, refreshHtml]);

  // ── Loading states ──
  if (loading && !siteHtml) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!siteHtml && !htmlLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground">No site HTML loaded. Select a site first.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${fullscreen ? "fixed inset-0 z-50 bg-background" : "h-[calc(100vh-6rem)]"}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Page selector */}
          {isSignatureSite && availablePages.length > 1 && (
            <PageSelector
              availablePages={availablePages}
              currentPage={currentPage}
              onSwitch={handlePageSwitch}
              disabled={htmlLoading}
            />
          )}

          {/* Edit mode toggle */}
          <div className="flex items-center bg-[oklch(0.14_0.005_250)] rounded-lg border border-border p-0.5">
            <button
              onClick={() => setEditMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                editMode
                  ? "bg-gold text-black shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => setEditMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                !editMode
                  ? "bg-gold text-black shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload indicator */}
          {uploading && (
            <span className="flex items-center gap-1.5 text-xs text-gold animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Uploading...
            </span>
          )}

          {htmlLoading && (
            <span className="flex items-center gap-1.5 text-xs text-gold animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading...
            </span>
          )}

          {/* Add Section */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddSection(true)}
            className="border-border text-muted-foreground hover:text-gold hover:border-gold-dim"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Section
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshHtml()}
            disabled={htmlLoading}
            className="border-border text-muted-foreground hover:text-gold hover:border-gold-dim"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${htmlLoading ? "animate-spin" : ""}`} />
          </Button>

          {/* Fullscreen toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullscreen(!fullscreen)}
            className="border-border text-muted-foreground hover:text-gold hover:border-gold-dim"
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Edit mode hint */}
      {editMode && (
        <div className="px-4 py-1.5 bg-[oklch(0.75_0.12_85/8%)] border-b border-gold-dim/25 flex-shrink-0">
          <p className="text-xs text-gold-dim">
            <strong className="text-gold">Edit Mode</strong> — Click any text to edit it. Hover images to swap them. Hover sections for controls.
          </p>
        </div>
      )}

      {/* iframe */}
      <div className="flex-1 min-h-0 bg-white relative">
        {htmlLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading {getPageLabel(currentPage)}...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          srcDoc={srcdoc}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Visual Editor"
        />
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGalleryFiles}
      />

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-heading text-lg font-bold text-foreground">Add New Section</h2>
              <button
                onClick={() => {
                  setShowAddSection(false);
                  setAddSectionType("services");
                  setAddSectionTitle("");
                  setAddSectionContent("");
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Section Type
                </label>
                <select
                  value={addSectionType}
                  onChange={(e) => setAddSectionType(e.target.value)}
                  className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                >
                  <option value="photo-gallery">Photo Gallery</option>
                  <option value="services">Services / Pricing</option>
                  <option value="faq">FAQ</option>
                  <option value="testimonials">Testimonials</option>
                  <option value="hours">Hours</option>
                  <option value="team">Team</option>
                  <option value="custom">Custom Text</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Title
                </label>
                <input
                  type="text"
                  value={addSectionTitle}
                  onChange={(e) => setAddSectionTitle(e.target.value)}
                  placeholder="e.g. Our Services"
                  className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                />
              </div>
              {addSectionType !== "photo-gallery" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Content
                  </label>
                  <textarea
                    value={addSectionContent}
                    onChange={(e) => setAddSectionContent(e.target.value)}
                    placeholder="Describe the section content..."
                    rows={5}
                    className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[100px]"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddSection(false);
                  setAddSectionType("services");
                  setAddSectionTitle("");
                  setAddSectionContent("");
                }}
                disabled={adding}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSection}
                disabled={adding}
                className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold"
                size="sm"
              >
                {adding ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                )}
                {adding ? "Adding..." : "Add Section"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
