/*
  DESIGN: Dark Forge — Section Editor Page
  Master-detail layout: section list on left, editor panel on right.
  Uses Optimistic Queue with Batch + Lock for safe rapid saves.
  Supports multi-page editing with a page selector dropdown.
*/
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSite, getPageLabel } from "@/contexts/SiteContext";
import { parseSections, type SectionField, type FormFieldDef } from "@/lib/parseHtml";
import { useSaveQueue } from "@/hooks/useSaveQueue";
import GalleryEditor from "@/components/GalleryEditor";
import PageSelector from "@/components/PageSelector";
import { useUnsavedWarning } from "@/hooks/useUnsavedWarning";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Save,
  ChevronRight,
  Upload,
  Loader2,
  AlertCircle,
  Check,
  AlertTriangle,
  Clock,
  Trash2,
  Plus,
  X,
  GripVertical,
  ArrowUpDown,
} from "lucide-react";

/** Status badge shown next to the Save button */
function SaveStatusBadge({ status, dirtyCount }: { status: string; dirtyCount: number }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-gold animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving...
      </span>
    );
  }
  if (status === "queued") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-gold-dim">
        <Clock className="w-3 h-3" />
        Queued ({dirtyCount})
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
        <Check className="w-3 h-3" />
        Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertTriangle className="w-3 h-3" />
        Some fields failed
      </span>
    );
  }
  return null;
}

export default function SectionEditor() {
  const {
    siteHtml,
    loading,
    htmlLoading,
    saveSiteField,
    uploadSiteImage,
    refreshHtml,
    deleteSiteSection,
    addSiteSection,
    reorderSections,
    isSignatureSite,
    availablePages,
    currentPage,
    switchPage,
  } = useSite();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Add Section state ──
  const [showAddSection, setShowAddSection] = useState(false);
  const [addSectionType, setAddSectionType] = useState("services");
  const [addSectionTitle, setAddSectionTitle] = useState("");
  const [addSectionContent, setAddSectionContent] = useState("");
  const [adding, setAdding] = useState(false);

  // ── Reorder state ──
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderedSections, setReorderedSections] = useState<typeof sections>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // ── Save Queue ──
  const {
    markDirty,
    flush,
    reset,
    status,
    isDirty,
    isSaving,
    dirtyCount,
  } = useSaveQueue({
    saveFn: saveSiteField,
    autoFlushDelay: 0,
    onFlushComplete: (result) => {
      if (result.failed.length === 0 && result.succeeded.length > 0) {
        toast.success(`Saved ${result.succeeded.length} field${result.succeeded.length > 1 ? "s" : ""} successfully`);
        refreshHtml();
      } else if (result.failed.length > 0) {
        toast.error(`${result.failed.length} field${result.failed.length > 1 ? "s" : ""} failed to save. They'll be retried on next save.`);
      }
    },
  });

  // ── Unsaved changes warning ──
  useUnsavedWarning(isDirty);

  // ── Page switch handler ──
  const handlePageSwitch = useCallback(async (page: string) => {
    // Flush any pending changes before switching pages
    if (isDirty) {
      await flush();
    }
    reset();
    setActiveSection(null);
    await switchPage(page);
  }, [isDirty, flush, reset, switchPage]);

  const sections = useMemo(() => {
    if (!siteHtml) return [];
    return parseSections(siteHtml);
  }, [siteHtml]);

  // Auto-select first section
  const activeSec = sections.find((s) => s.id === activeSection) || sections[0] || null;

  // Reset save queue when switching sections
  const prevSectionRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeSec && activeSec.id !== prevSectionRef.current) {
      if (isDirty && prevSectionRef.current !== null) {
        flush();
      }
      prevSectionRef.current = activeSec.id;
    }
  }, [activeSec, isDirty, flush]);

  // ── Field change handler ──
  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      markDirty(key, value);
    },
    [markDirty]
  );

  // ── Manual save button handler ──
  const handleSave = useCallback(async () => {
    await flush();
  }, [flush]);

  // ── Enter/exit reorder mode ──
  const enterReorderMode = useCallback(() => {
    setReorderedSections([...sections]);
    setReorderMode(true);
    setActiveSection(null);
  }, [sections]);

  const exitReorderMode = useCallback(() => {
    setReorderMode(false);
    setReorderedSections([]);
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  // ── Drag handlers ──
  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragOverIdx(null);
      return;
    }
    setReorderedSections(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIdx, 1);
      updated.splice(idx, 0, moved);
      return updated;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  // ── Move up/down helpers ──
  const moveSection = useCallback((idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= reorderedSections.length) return;
    setReorderedSections(prev => {
      const updated = [...prev];
      [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
      return updated;
    });
  }, [reorderedSections.length]);

  // ── Save reorder ──
  const handleSaveOrder = useCallback(async () => {
    setSavingOrder(true);
    try {
      const sectionOrder = reorderedSections.map(s => s.id);
      const ok = await reorderSections(sectionOrder);
      if (ok) {
        toast.success("Section order saved! Allow 3\u20135 minutes to show on your website.");
        exitReorderMode();
        await refreshHtml();
      } else {
        toast.error("Failed to save section order. Please try again.");
      }
    } catch {
      toast.error("Failed to save section order. Please try again.");
    } finally {
      setSavingOrder(false);
    }
  }, [reorderedSections, reorderSections, exitReorderMode, refreshHtml]);

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
      const contentToSend = addSectionType === "photo-gallery"
            ? "Gallery section"
            : addSectionContent.trim();
          const ok = await addSiteSection(addSectionType, addSectionTitle.trim(), contentToSend);
      if (ok) {
        // Compute the section ID that the backend assigned (mirrors backend logic)
        const newSectionId = addSectionType === "custom"
          ? addSectionTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
          : addSectionType;
        toast.success("Section added! Allow 3\u20135 minutes to show on your website.");
        setShowAddSection(false);
        setAddSectionType("services");
        setAddSectionTitle("");
        setAddSectionContent("");
        // HTML was already updated directly in the context — auto-select the new section
        setActiveSection(newSectionId);
        // Refresh in background to sync available pages etc.
        refreshHtml();
      } else {
        toast.error("Failed to add section. Please try again.");
      }
    } catch {
      toast.error("Failed to add section. Please try again.");
    } finally {
      setAdding(false);
    }
  }, [addSiteSection, addSectionType, addSectionTitle, addSectionContent, refreshHtml]);

  // ── Delete section handler ──
  const handleDeleteSection = useCallback(async (sectionId: string) => {
    setDeleting(true);
    try {
      const ok = await deleteSiteSection(sectionId);
      if (ok) {
        toast.success("Section removed! Allow 3\u20135 minutes to show on your website.");
        setActiveSection(null);
        setDeleteConfirm(null);
        // Refresh HTML to update the section list
        await refreshHtml();
      } else {
        toast.error("Failed to remove section. Please try again.");
      }
    } catch {
      toast.error("Failed to remove section. Please try again.");
    } finally {
      setDeleting(false);
    }
  }, [deleteSiteSection, refreshHtml]);

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
    <div className="space-y-4">
      {/* Page Selector Bar */}
      {isSignatureSite && availablePages.length > 1 && (
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Editing Page:
          </span>
          <PageSelector
            availablePages={availablePages}
            currentPage={currentPage}
            onSwitch={handlePageSwitch}
            disabled={htmlLoading || isSaving}
            showSlug
          />
          {htmlLoading && (
            <span className="flex items-center gap-1.5 text-xs text-gold animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading page...
            </span>
          )}
        </div>
      )}

      {/* Loading state while switching pages */}
      {htmlLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading {getPageLabel(currentPage)}...</p>
        </div>
      ) : (
        <div className="flex gap-6 max-w-6xl">
          {/* Section List (left panel) */}
          <div className="w-64 flex-shrink-0 space-y-1">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Sections ({sections.length})
              </p>
              {sections.length >= 2 && !reorderMode && (
                <button
                  onClick={enterReorderMode}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-gold/60 hover:text-gold font-medium transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  Rearrange
                </button>
              )}
            </div>

            {reorderMode ? (
              /* ── Reorder Mode ── */
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground px-1 mb-2">
                  Drag sections to reorder, or use the arrow buttons.
                </p>
                {reorderedSections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={`
                      flex items-center gap-2 px-2 py-2 rounded-md border transition-all duration-150 cursor-grab active:cursor-grabbing
                      ${dragIdx === idx
                        ? "opacity-40 border-gold/40 bg-[oklch(0.19_0.005_250)]"
                        : dragOverIdx === idx
                          ? "border-gold bg-[oklch(0.19_0.005_250)] shadow-[0_0_8px_oklch(0.75_0.12_85/20%)]"
                          : "border-border bg-card hover:border-gold/30"
                      }
                    `}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-base flex-shrink-0">{sec.icon}</span>
                    <span className="text-sm font-medium truncate flex-1 text-foreground">{sec.title}</span>
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveSection(idx, -1)}
                        disabled={idx === 0}
                        className="p-0.5 rounded text-muted-foreground hover:text-gold disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <ChevronRight className="w-3 h-3 -rotate-90" />
                      </button>
                      <button
                        onClick={() => moveSection(idx, 1)}
                        disabled={idx === reorderedSections.length - 1}
                        className="p-0.5 rounded text-muted-foreground hover:text-gold disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <ChevronRight className="w-3 h-3 rotate-90" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Save / Cancel buttons */}
                <div className="flex gap-2 mt-4 px-1">
                  <Button
                    onClick={handleSaveOrder}
                    disabled={savingOrder}
                    size="sm"
                    className="flex-1 bg-gold hover:bg-gold/90 text-black font-semibold"
                  >
                    {savingOrder ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...</>
                    ) : (
                      <><Save className="w-3.5 h-3.5 mr-1.5" /> Save Order</>
                    )}
                  </Button>
                  <Button
                    onClick={exitReorderMode}
                    disabled={savingOrder}
                    size="sm"
                    variant="outline"
                    className="border-border text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Normal Mode ── */
              <>
                {sections.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">No editable sections found on this page.</p>
                )}
                {/* Add Section button */}
                <button
                  onClick={() => setShowAddSection(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-gold/70 hover:text-gold hover:bg-[oklch(0.19_0.005_250)] transition-all duration-150 border border-dashed border-gold/20 hover:border-gold/40 mb-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Section
                </button>

                {sections.map((sec) => {
                  const isActive = sec.id === (activeSec?.id ?? "");
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSection(sec.id)}
                      className={`
                        relative w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md
                        transition-all duration-150
                        ${isActive
                          ? "bg-[oklch(0.19_0.005_250)] text-gold"
                          : "text-muted-foreground hover:bg-[oklch(0.16_0.005_250)] hover:text-foreground"
                        }
                      `}
                    >
                      <div
                        className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full transition-all duration-150 ${
                          isActive ? "bg-gold shadow-[0_0_8px_oklch(0.75_0.12_85/30%)]" : "bg-transparent"
                        }`}
                      />
                      <span className="text-base flex-shrink-0">{sec.icon}</span>
                      <span className="text-sm font-medium truncate">{sec.title}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Editor Panel (right) */}
          <div className="flex-1 min-w-0">
            {activeSec ? (
              <div className="bg-card border border-border rounded-lg">
                {/* Section Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{activeSec.icon}</span>
                    <div>
                      <h2 className="font-heading text-lg font-bold text-foreground">{activeSec.title}</h2>
                      <span className="text-[10px] text-muted-foreground font-mono">{currentPage}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <SaveStatusBadge status={status} dirtyCount={dirtyCount} />
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !isDirty}
                      className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold disabled:opacity-40"
                      size="sm"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {isSaving ? "Saving..." : isDirty ? `Save (${dirtyCount})` : "Saved"}
                    </Button>
                  </div>
                </div>

                {/* Fields */}
                <div className="p-5 space-y-5">
                  {/* Booking warning */}
                  {activeSec.id === "booking" && (
                    <div className="flex gap-3 p-3 rounded-md bg-[oklch(0.75_0.12_85/8%)] border border-gold-dim/25">
                      <span className="text-base flex-shrink-0">⚠️</span>
                      <div className="text-xs text-gold-dim leading-relaxed">
                        <strong className="block mb-0.5 text-gold">Activate your booking form first</strong>
                        Booking emails won't arrive until activated. Submit a test booking from your site — formsubmit.co will email you a confirmation link. Click it to activate.
                      </div>
                    </div>
                  )}

                  {/* Regular fields */}
                  {activeSec.fields.map((field) => (
                    <FieldRenderer
                      key={field.key}
                      field={field}
                      onChange={(val) => handleFieldChange(field.key, val)}
                      onUpload={uploadSiteImage}
                    />
                  ))}

                  {/* Inline Gallery Editor for gallery sections */}
                  {activeSec.isGallery && (
                    <GalleryEditor sectionId={activeSec.id} />
                  )}

                  {/* FAQ pairs */}
                  {activeSec.faqPairs && (
                    <div className="space-y-4">
                      {activeSec.faqPairs.map((pair, i) => (
                        <div key={i} className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                              Question {i + 1}
                            </label>
                            <textarea
                              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[60px]"
                              defaultValue={pair.question}
                              onChange={(e) => handleFieldChange(`faq_q_${i}`, e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                              Answer {i + 1}
                            </label>
                            <textarea
                              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[60px]"
                              defaultValue={pair.answer}
                              onChange={(e) => handleFieldChange(`faq_a_${i}`, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unsaved indicator bar */}
                {isDirty && !isSaving && (
                  <div className="px-5 py-3 border-t border-border bg-[oklch(0.75_0.12_85/5%)] flex items-center justify-between">
                    <p className="text-xs text-gold-dim">
                      {dirtyCount} unsaved change{dirtyCount > 1 ? "s" : ""}
                    </p>
                    <button
                      onClick={handleSave}
                      className="text-xs text-gold hover:text-gold/80 font-medium transition-colors"
                    >
                      Save now
                    </button>
                  </div>
                )}

                {/* Saving progress bar */}
                {isSaving && (
                  <div className="px-5 py-3 border-t border-border bg-[oklch(0.75_0.12_85/5%)]">
                    <div className="h-1 bg-[oklch(0.19_0.005_250)] rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full animate-pulse" style={{ width: "60%" }} />
                    </div>
                    <span className="text-[10px] text-gold-dim">Saving...</span>
                  </div>
                )}

                {/* Delete Section */}
                <div className="px-5 py-4 border-t border-border">
                  {deleteConfirm === activeSec.id ? (
                    <div className="flex items-center gap-3 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-destructive font-medium">Permanently remove this section?</p>
                        <p className="text-xs text-muted-foreground mt-0.5">This cannot be undone. The section will be removed from your live site.</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(null)}
                          disabled={deleting}
                          className="border-border text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSection(activeSec.id)}
                          disabled={deleting}
                        >
                          {deleting ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {deleting ? "Removing..." : "Remove"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(activeSec.id)}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete this section
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Select a section to edit
              </div>
            )}
          </div>
        </div>
      )}
      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md mx-4">
            {/* Header */}
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

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Section Type */}
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

              {/* Hint for custom */}
              {addSectionType === "custom" && (
                <div className="flex gap-2 p-3 rounded-md bg-[oklch(0.75_0.12_85/8%)] border border-gold-dim/25">
                  <span className="text-sm flex-shrink-0">💡</span>
                  <p className="text-xs text-gold-dim leading-relaxed">
                    Want to add photos? Use <strong className="text-gold">Photo Gallery</strong> instead — it creates a proper photo grid you can upload to.
                  </p>
                </div>
              )}

              {/* Title */}
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

              {/* Content (hidden for photo-gallery) */}
              {addSectionType !== "photo-gallery" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Content
                  </label>
                  <textarea
                    value={addSectionContent}
                    onChange={(e) => setAddSectionContent(e.target.value)}
                    placeholder={
                      addSectionType === "services" || addSectionType === "pricing"
                        ? "e.g. Haircut - $30, Beard Trim - $25"
                        : addSectionType === "faq"
                          ? "e.g. Q: How long does it take? A: 2-3 hours"
                          : addSectionType === "testimonials"
                            ? "e.g. John: Great experience!, Sarah: Amazing work!"
                            : addSectionType === "hours"
                              ? "e.g. Mon-Fri: 9am-7pm, Sat: 10am-5pm, Sun: Closed"
                              : addSectionType === "team"
                                ? "e.g. Alex (Lead Stylist), Maria (Colorist)"
                                : "Describe the section content..."
                    }
                    rows={5}
                    className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[100px]"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
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

/* ── Field Renderer ── */
function FieldRenderer({
  field,
  onChange,
  onUpload,
}: {
  field: SectionField;
  onChange: (val: string) => void;
  onUpload: (file: File, folder?: string) => Promise<string | null>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  if (field.type === "photo") {
    const currentVal = photoPreview ?? (typeof field.value === "string" ? field.value : "");
    return (
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {field.label}
        </label>
        {currentVal ? (
          <img
            src={currentVal}
            alt={field.label}
            className="w-full max-w-xs h-32 object-cover rounded-md border border-border"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full max-w-xs h-20 bg-[oklch(0.19_0.005_250)] rounded-md border border-border flex items-center justify-center text-xs text-muted-foreground">
            No photo
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="border-border text-muted-foreground hover:text-gold hover:border-gold-dim"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 mr-1.5" />
          )}
          {currentVal ? "Change Photo" : "Upload Photo"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            const url = await onUpload(file, field.key.includes("hero") ? "hero" : "img");
            if (url) {
              setPhotoPreview(url);
              onChange(url);
            }
            setUploading(false);
          }}
        />
      </div>
    );
  }

  if (field.type === "form_fields") {
    const fields = Array.isArray(field.value) ? (field.value as FormFieldDef[]) : [];
    return (
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Form Fields
        </label>
        <p className="text-xs text-muted-foreground">
          Edit the placeholder text that clients see on your booking form.
        </p>
        <div className="space-y-2">
          {fields.map((f, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 flex-shrink-0 font-mono">
                {f.name}
              </span>
              <input
                type="text"
                className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                defaultValue={f.placeholder}
                placeholder="Placeholder text..."
                onChange={(e) => onChange(e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "style_options") {
    const optsText = Array.isArray(field.value)
      ? (field.value as string[]).join("\n")
      : typeof field.value === "string"
        ? field.value
        : "";
    return (
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {field.label}
        </label>
        <p className="text-xs text-muted-foreground">One option per line.</p>
        <textarea
          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[120px]"
          defaultValue={optsText}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {field.label}
        </label>
        <textarea
          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[80px]"
          defaultValue={typeof field.value === "string" ? field.value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      </div>
    );
  }

  // Default: text input
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {field.label}
      </label>
      <input
        type="text"
        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
        defaultValue={typeof field.value === "string" ? field.value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
