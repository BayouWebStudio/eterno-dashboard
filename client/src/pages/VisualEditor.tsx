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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Pencil,
  Eye,
  Loader2,
  AlertCircle,
  FileText,
  ChevronDown,
  Check,
  Plus,
  RefreshCw,
  Save,
  X,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";

/** Pages that cannot be deleted (core site pages) */
const PROTECTED_PAGES = new Set(["index.html", "404.html", "privacy.html", "booking.html"]);

/** Page selector dropdown (reused from SectionEditor) */
function PageSelector({
  availablePages,
  currentPage,
  onSwitch,
  onDelete,
  disabled,
}: {
  availablePages: string[];
  currentPage: string;
  onSwitch: (page: string) => void;
  onDelete: (page: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
          {availablePages.map((page) => {
            const isActive = page === currentPage;
            const isDeletable = !PROTECTED_PAGES.has(page.toLowerCase());
            return (
              <div
                key={page}
                className={`
                  group flex items-center gap-2 px-3 py-2 text-sm transition-colors
                  ${isActive
                    ? "bg-[oklch(0.19_0.005_250)] text-gold"
                    : "text-foreground hover:bg-[oklch(0.16_0.005_250)] hover:text-gold"
                  }
                `}
              >
                <button
                  onClick={() => {
                    if (!isActive) onSwitch(page);
                    setOpen(false);
                  }}
                  className="flex-1 text-left flex items-center gap-2 cursor-pointer"
                >
                  <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-gold" : "text-muted-foreground"}`} />
                  <span className="font-medium">{getPageLabel(page)}</span>
                  {isActive && <Check className="w-3.5 h-3.5 ml-auto text-gold" />}
                </button>
                {isDeletable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(page);
                      setOpen(false);
                    }}
                    title={`Delete ${getPageLabel(page)}`}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
    addParagraph,
    deletePage,
    restorePage,
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
  const [pendingImageSwap, setPendingImageSwap] = useState<{ sectionId: string; key: string; currentSrc?: string } | null>(null);
  const [pendingGalleryUpload, setPendingGalleryUpload] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ── Add Section state ──
  const [showAddSection, setShowAddSection] = useState(false);
  const [addSectionType, setAddSectionType] = useState("text-block");
  const [addSectionTitle, setAddSectionTitle] = useState("");
  const [addSectionContent, setAddSectionContent] = useState("");
  const [addSectionPosition, setAddSectionPosition] = useState("bottom");
  const [adding, setAdding] = useState(false);

  // ── Add Text (paragraph inside existing section) state ──
  const [showAddText, setShowAddText] = useState(false);
  const [addTextSectionId, setAddTextSectionId] = useState("");
  const [addTextContent, setAddTextContent] = useState("");
  const [addTextPosition, setAddTextPosition] = useState("bottom");
  const [addingText, setAddingText] = useState(false);

  // ── Parse sections on the current page for position dropdown ──
  const pageSections = useMemo(() => {
    if (!siteHtml) return [] as Array<{ id: string; label: string }>;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(siteHtml, "text/html");
      const sections = Array.from(doc.querySelectorAll("main section[id]"))
        .map((s) => {
          const id = s.id;
          if (!id) return null;
          // Prefer visible heading text, fall back to id
          const heading = s.querySelector("h1, h2, h3");
          const label = heading?.textContent?.trim() || id.replace(/-/g, " ");
          return { id, label: label.length > 40 ? label.slice(0, 40) + "…" : label };
        })
        .filter((s): s is { id: string; label: string } => s !== null);
      return sections;
    } catch {
      return [];
    }
  }, [siteHtml]);

  // Build the base URL for resolving relative paths in the editor iframe.
  // siteUrl from the API already includes the slug path (e.g. https://eternowebstudio.com/weschetattoo/)
  // or the custom domain (e.g. https://tattoosbypaketh.com). Use it directly.
  const siteBaseUrl = useMemo(() => {
    if (!currentSite) return "";
    const siteUrl = currentSite.siteUrl || "";
    if (siteUrl) return siteUrl.replace(/\/$/, "");
    // Fallback: construct from domain
    const domain = currentSite.domain || "";
    if (!domain) return "";
    const base = domain.startsWith("http") ? domain : `https://${domain}`;
    return base.replace(/\/$/, "");
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

  // Trigger save on active edit in iframe
  const triggerSave = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "trigger-save" }, "*");
  }, []);

  // ── Handle messages from iframe ──
  // Use a ref to always call the latest handler versions, avoiding stale closures
  // from the initial render (when currentSite is still null/loading).
  const handlersRef = useRef<Record<string, Function>>({});

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      // Accept messages from same origin OR srcdoc iframes (origin "null")
      if (e.origin !== window.location.origin && e.origin !== "null") return;
      const data = e.data;
      if (!data || !data.type) return;

      switch (data.type) {
        case "editor-ready":
          // Editor script initialized
          break;

        case "text-edit":
          handlersRef.current.handleTextEdit?.(data);
          break;

        case "batch-text-edit":
          handlersRef.current.handleBatchTextEdit?.(data.edits);
          break;

        case "image-swap":
          setPendingImageSwap({ sectionId: data.sectionId, key: data.key, currentSrc: data.currentSrc });
          fileInputRef.current?.click();
          break;

        case "gallery-upload":
          setPendingGalleryUpload(data.sectionId);
          galleryInputRef.current?.click();
          break;

        case "gallery-delete":
          handlersRef.current.handleGalleryDelete?.(data);
          break;

        case "gallery-reorder":
          handlersRef.current.handleGalleryReorder?.(data);
          break;

        case "section-delete":
          handlersRef.current.handleSectionDelete?.(data);
          break;

        case "artist-delete":
          handlersRef.current.handleArtistDelete?.(data);
          break;

        case "request-refresh":
          handlersRef.current.refreshHtml?.();
          break;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ── Text edit handler ──
  const handleTextEdit = useCallback(
    async (data: { sectionId: string; key: string; value: string; originalValue?: string }) => {
      try {
        // Pass originalValue as the value with a separator so the backend can do targeted replacement
        // Format: "newValue|||originalValue" — backend splits on ||| to find the exact element to replace
        const payload = data.originalValue ? `${data.value}|||${data.originalValue}` : data.value;
        const ok = await saveSiteField(data.key, payload);
        if (ok) {
          toast.success("Text updated. Allow 3\u20135 min for live site.");
          refreshHtml();
        } else {
          toast.error(`Save failed for key "${data.key}" in section "${data.sectionId}". Try refreshing the page.`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Save error: ${msg}`);
      }
    },
    [saveSiteField, refreshHtml]
  );

  // ── Batch text edit handler — saves edits sequentially to avoid SHA conflicts ──
  const handleBatchTextEdit = useCallback(
    async (edits: Array<{ sectionId: string; key: string; value: string; originalValue?: string }>) => {
      let succeeded = 0;
      let failed = 0;
      for (const edit of edits) {
        try {
          const payload = edit.originalValue ? `${edit.value}|||${edit.originalValue}` : edit.value;
          const ok = await saveSiteField(edit.key, payload);
          if (ok) {
            succeeded++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }
      if (failed === 0) {
        toast.success(`${succeeded} change${succeeded !== 1 ? "s" : ""} saved. Allow 3\u20135 min for live site.`);
      } else {
        toast.error(`${succeeded} saved, ${failed} failed. Try refreshing and saving again.`);
      }
      refreshHtml();
    },
    [saveSiteField, refreshHtml]
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
          // Pass oldSrc so backend can find the exact image to replace
          const payload = pendingImageSwap.currentSrc ? `${url}|||${pendingImageSwap.currentSrc}` : url;
          await saveSiteField(pendingImageSwap.key, payload);
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
      } catch {
        toast.error("Failed to save gallery order.");
      }
    },
    [saveGalleryOrder]
  );

  // ── Gallery delete handler ──
  // Uses save-gallery-order (rewrite without the deleted image) because
  // delete-gallery-image only works for dashboard-uploaded images, not original template images.
  const handleGalleryDelete = useCallback(
    async (data: { sectionId: string; filename: string }) => {
      try {
        const sectionId = data.sectionId === "tattoo-gallery" ? "gallery" : data.sectionId;

        // Collect all gallery filenames from the iframe, minus the one being deleted
        const doc = iframeRef.current?.contentDocument;
        const galleryEl = doc?.querySelector('.gallery-grid, .masonry-grid, .gallery-body, #gallery .gallery-grid, #gallery .masonry-grid');
        const remaining = galleryEl
          ? Array.from(galleryEl.querySelectorAll('img'))
              .map(img => { const s = img.src.split('?')[0]; return s.split('/').pop() || s; })
              .filter(name => name !== data.filename)
          : null;

        if (remaining !== null) {
          const ok = await saveGalleryOrder(remaining, sectionId);
          if (ok) {
            toast.success("Photo removed. Allow 3\u20135 min for live site.");
            refreshHtml();
          } else {
            toast.error("Failed to remove photo.");
          }
        } else {
          // Fallback to direct delete
          const ok = await deleteGalleryImage(data.filename, sectionId);
          if (ok) {
            toast.success("Photo removed. Allow 3\u20135 min for live site.");
            refreshHtml();
          } else {
            toast.error("Failed to remove photo.");
          }
        }
      } catch (err: any) {
        toast.error(err?.message ? `Failed to remove photo: ${err.message}` : "Failed to remove photo.");
      }
    },
    [deleteGalleryImage, saveGalleryOrder, refreshHtml]
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
          toast.success("Artist removed. Allow 3–5 min for live site.");
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

  // Keep handlersRef in sync so the message listener always calls the latest versions
  handlersRef.current = { handleTextEdit, handleBatchTextEdit, handleGalleryDelete, handleGalleryReorder, handleSectionDelete, handleArtistDelete, refreshHtml };

  // ── Page switch handler ──
  const handlePageSwitch = useCallback(
    async (page: string) => {
      await switchPage(page);
    },
    [switchPage]
  );

  // ── Delete page handler ──
  const [deletingPage, setDeletingPage] = useState<string | null>(null);

  const handleDeletePage = useCallback(
    async (page: string) => {
      const label = getPageLabel(page);
      const confirmed = window.confirm(
        `Delete the "${label}" page?\n\nThis will remove the page and all links to it from other pages.\n\nYou'll have 30 seconds to undo.`
      );
      if (!confirmed) return;
      setDeletingPage(page);
      try {
        const result = await deletePage(page);
        if (result.ok) {
          // If the deleted page was the current one, switch to index.html
          if (page === currentPage) {
            await switchPage("index.html");
          }
          await refreshHtml();
          toast.success(`"${label}" deleted.`, {
            duration: 30000,
            action: {
              label: "Undo",
              onClick: async () => {
                const restoreResult = await restorePage(page);
                if (restoreResult.ok) {
                  toast.success(`"${label}" restored. Allow 3\u20135 min for live site.`);
                  await refreshHtml();
                } else {
                  toast.error(restoreResult.error || "Failed to restore page.");
                }
              },
            },
          });
        } else {
          toast.error(result.error || "Failed to delete page.");
        }
      } catch {
        toast.error("Failed to delete page.");
      } finally {
        setDeletingPage(null);
      }
    },
    [deletePage, restorePage, currentPage, switchPage, refreshHtml]
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
      // Position only matters for text-block type
      const positionToSend = addSectionType === "text-block" ? addSectionPosition : undefined;
      const ok = await addSiteSection(addSectionType, addSectionTitle.trim(), contentToSend, positionToSend);
      if (ok) {
        toast.success("Section added! Allow 3\u20135 min for live site.");
        setShowAddSection(false);
        setAddSectionType("text-block");
        setAddSectionTitle("");
        setAddSectionContent("");
        setAddSectionPosition("bottom");
        await refreshHtml();
      } else {
        toast.error("Failed to add section.");
      }
    } catch {
      toast.error("Failed to add section.");
    } finally {
      setAdding(false);
    }
  }, [addSiteSection, addSectionType, addSectionTitle, addSectionContent, addSectionPosition, refreshHtml]);

  // ── Add Text (paragraph to existing section) handler ──
  const handleAddText = useCallback(async () => {
    if (!addTextSectionId) {
      toast.error("Pick which section to add text to");
      return;
    }
    if (!addTextContent.trim()) {
      toast.error("Text is required");
      return;
    }
    setAddingText(true);
    try {
      const result = await addParagraph(addTextSectionId, addTextContent.trim(), addTextPosition);
      if (result.ok) {
        toast.success("Text added! Allow 3\u20135 min for live site.");
        setShowAddText(false);
        setAddTextSectionId("");
        setAddTextContent("");
        setAddTextPosition("bottom");
        await refreshHtml();
      } else {
        toast.error(result.error || "Failed to add text.");
      }
    } catch {
      toast.error("Failed to add text.");
    } finally {
      setAddingText(false);
    }
  }, [addParagraph, addTextSectionId, addTextContent, addTextPosition, refreshHtml]);

  // Pre-select the first section when opening the Add Text modal
  useEffect(() => {
    if (showAddText && !addTextSectionId && pageSections.length > 0) {
      setAddTextSectionId(pageSections[0].id);
    }
  }, [showAddText, addTextSectionId, pageSections]);

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
              onDelete={handleDeletePage}
              disabled={htmlLoading || deletingPage !== null}
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

          {/* Save button — visible in edit mode, with attention bubble */}
          {editMode && (
            <div className="relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gold text-black text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg animate-[fadeOut_4s_ease-in-out_forwards] pointer-events-none">
                Click here to save!
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gold" />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={triggerSave}
                className="border-gold/40 text-gold hover:bg-gold hover:text-black transition-all"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save
              </Button>
            </div>
          )}
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

          {/* Add Text — adds a paragraph inside an existing section */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddText(true)}
            disabled={pageSections.length === 0}
            className="border-gold/50 text-gold hover:bg-gold hover:text-black transition-all"
            title={pageSections.length === 0 ? "No sections on this page" : "Add text to an existing section"}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Text
          </Button>

          {/* Add Section — styled prominently so users notice it */}
          <div className="relative">
            <Button
              size="sm"
              onClick={() => setShowAddSection(true)}
              className="bg-gold text-black hover:bg-gold/90 font-semibold shadow-md hover:shadow-lg transition-all animate-[pulse_2.5s_ease-in-out_infinite]"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Section
            </Button>
          </div>

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
            <strong className="text-gold">Edit Mode</strong> — Click any text to edit. Make all your changes, then click <strong className="text-gold">Save</strong> when you're done.
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
                  setAddSectionType("text-block");
                  setAddSectionTitle("");
                  setAddSectionContent("");
                  setAddSectionPosition("bottom");
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
                  <option value="text-block">Text Block (on current page)</option>
                  <option value="photo-gallery">Photo Gallery (new page)</option>
                  <option value="services">Services / Pricing (new page)</option>
                  <option value="faq">FAQ (new page)</option>
                  <option value="testimonials">Testimonials (new page)</option>
                  <option value="hours">Hours (new page)</option>
                  <option value="team">Team (new page)</option>
                  <option value="custom">Custom Text (new page)</option>
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
                  placeholder={addSectionType === "text-block" ? "e.g. About Me" : "e.g. Our Services"}
                  className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                />
              </div>
              {addSectionType !== "photo-gallery" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {addSectionType === "text-block" ? "Text" : "Content"}
                  </label>
                  <textarea
                    value={addSectionContent}
                    onChange={(e) => setAddSectionContent(e.target.value)}
                    placeholder={addSectionType === "text-block" ? "Write your text here. Leave a blank line between paragraphs." : "Describe the section content..."}
                    rows={5}
                    className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[100px]"
                  />
                </div>
              )}
              {addSectionType === "text-block" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Where on the page?
                    </label>
                    <select
                      value={addSectionPosition}
                      onChange={(e) => setAddSectionPosition(e.target.value)}
                      className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                    >
                      <option value="top">At the top (before everything)</option>
                      {pageSections.map((s) => (
                        <option key={s.id} value={`after:${s.id}`}>
                          After "{s.label}"
                        </option>
                      ))}
                      <option value="bottom">At the bottom (end of page)</option>
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Adds a text section to <span className="font-semibold text-gold">{getPageLabel(currentPage)}</span> — no new page created.
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddSection(false);
                  setAddSectionType("text-block");
                  setAddSectionTitle("");
                  setAddSectionContent("");
                  setAddSectionPosition("bottom");
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

      {/* Add Text modal — add paragraph inside an existing section */}
      {showAddText && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Add Text to a Section</h3>
              <button
                onClick={() => {
                  setShowAddText(false);
                  setAddTextSectionId("");
                  setAddTextContent("");
                  setAddTextPosition("bottom");
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Which section?
                </label>
                <select
                  value={addTextSectionId}
                  onChange={(e) => setAddTextSectionId(e.target.value)}
                  className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                >
                  {pageSections.length === 0 && <option value="">No sections on this page</option>}
                  {pageSections.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Text
                </label>
                <textarea
                  value={addTextContent}
                  onChange={(e) => setAddTextContent(e.target.value)}
                  placeholder="Type your text. Leave a blank line between paragraphs."
                  rows={5}
                  className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[100px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Where in the section?
                </label>
                <select
                  value={addTextPosition}
                  onChange={(e) => setAddTextPosition(e.target.value)}
                  className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                >
                  <option value="top">At the top of the section</option>
                  <option value="bottom">At the bottom of the section</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Adds a paragraph inside the existing section — not a new section.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddText(false);
                  setAddTextSectionId("");
                  setAddTextContent("");
                  setAddTextPosition("bottom");
                }}
                disabled={addingText}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddText}
                disabled={addingText || pageSections.length === 0}
                className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold"
                size="sm"
              >
                {addingText ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                )}
                {addingText ? "Adding..." : "Add Text"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
