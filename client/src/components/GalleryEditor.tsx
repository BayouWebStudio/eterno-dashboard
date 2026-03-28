/*
  DESIGN: Dark Forge — Inline Gallery Editor
  Embeds inside the Section Editor panel for gallery-type sections.
  Supports image upload with automatic compression, delete, and drag-to-reorder.
  Uses the real Convex gallery endpoints:
    - Upload:  POST /api/dashboard/upload-hero-bg  (folder: "gallery")
    - Reorder: POST /api/dashboard/save-gallery-order
    - Delete:  POST /api/dashboard/delete-gallery-image
*/
import { useState, useCallback, useRef, useEffect } from "react";
import { useSite } from "@/contexts/SiteContext";
import { parseGalleryImages } from "@/lib/parseHtml";
import { compressImages, formatBytes, type CompressionResult } from "@/lib/compressImage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload,
  Trash2,
  GripVertical,
  Loader2,
  ImageIcon,
  Save,
  Zap,
} from "lucide-react";

interface GalleryEditorProps {
  sectionId: string;
}

/**
 * Extract the filename from an image src path.
 * "img/1.jpg" → "1.jpg"
 * "https://cdn.example.com/img/tattoo-3.jpg?v=123" → "tattoo-3.jpg"
 */
function extractFilename(src: string): string {
  // Strip query params
  const clean = src.split("?")[0];
  // Get the last path segment
  const parts = clean.split("/");
  return parts[parts.length - 1] || src;
}

export default function GalleryEditor({ sectionId }: GalleryEditorProps) {
  const {
    siteHtml,
    uploadSiteImage,
    saveGalleryOrder,
    deleteGalleryImage,
    refreshHtml,
    currentSite,
  } = useSite();

  // Resolve relative image paths (e.g. "img/1.jpg") to full URLs using the site's base URL
  const resolveImageUrl = useCallback(
    (src: string) => {
      if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) return src;
      const siteUrl = currentSite?.siteUrl?.replace(/\/$/, "") || "";
      const slug = currentSite?.slug || "";
      if (siteUrl && slug) return `${siteUrl}/${slug}/${src}`;
      if (siteUrl) return `${siteUrl}/${src}`;
      if (slug) return `https://raw.githubusercontent.com/BayouWebStudio/${slug}/main/${src}`;
      return src;
    },
    [currentSite]
  );

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse gallery images from HTML whenever it changes
  useEffect(() => {
    if (siteHtml) {
      const parsed = parseGalleryImages(siteHtml, sectionId);
      setImages(parsed);
      setHasOrderChanges(false);
    }
  }, [siteHtml, sectionId]);

  // ── Upload handler ──
  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      const fileArray = Array.from(files);
      const count = fileArray.length;

      // Step 1: Compress images
      setUploadProgress(`Compressing ${count} image${count > 1 ? "s" : ""}...`);
      let results: CompressionResult[];
      try {
        results = await compressImages(fileArray, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.82,
        });
      } catch {
        toast.error("Failed to compress images");
        setUploading(false);
        setUploadProgress("");
        return;
      }

      // Calculate compression stats
      const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
      const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0);
      const savedBytes = totalOriginal - totalCompressed;
      const compressedCount = results.filter((r) => r.wasCompressed).length;

      // Step 2: Upload compressed files via /api/dashboard/upload-hero-bg with folder: "gallery"
      setUploadProgress(`Uploading ${count} image${count > 1 ? "s" : ""}...`);
      let successCount = 0;
      const newUrls: string[] = [];
      for (let i = 0; i < results.length; i++) {
        setUploadProgress(`Uploading ${i + 1} of ${count}...`);
        const url = await uploadSiteImage(results[i].file, "gallery");
        if (url) {
          newUrls.push(url);
          successCount++;
        }
      }

      if (successCount > 0) {
        setImages((prev) => [...prev, ...newUrls]);

        // Show compression stats in toast
        if (compressedCount > 0 && savedBytes > 0) {
          const pct = Math.round((1 - totalCompressed / totalOriginal) * 100);
          toast.success(
            `${successCount} image${successCount > 1 ? "s" : ""} uploaded — saved ${formatBytes(savedBytes)} (${pct}% smaller). Allow 3–5 min to show on your site.`,
            { duration: 6000 }
          );
        } else {
          toast.success(
            `${successCount} image${successCount > 1 ? "s" : ""} uploaded. Allow 3–5 min to show on your site.`,
            { duration: 5000 }
          );
        }

        // Refresh HTML after a brief delay to pick up new images
        setTimeout(() => refreshHtml(), 3000);
      } else {
        toast.error("Upload failed — please try again");
      }

      setUploading(false);
      setUploadProgress("");
    },
    [uploadSiteImage, refreshHtml]
  );

  // ── Delete handler — calls the real Convex endpoint ──
  const handleDelete = useCallback(
    async (idx: number) => {
      const src = images[idx];
      if (!src) return;

      const filename = extractFilename(src);
      if (!confirm(`Delete "${filename}" from your gallery?`)) return;

      setDeleting(idx);
      try {
        const ok = await deleteGalleryImage(filename, sectionId === "tattoo-gallery" ? "gallery" : sectionId);
        if (ok) {
          setImages((prev) => prev.filter((_, i) => i !== idx));
          toast.success("Photo removed! Allow 3–5 min to update on your site.");
        } else {
          toast.error("Failed to delete image — try again");
        }
      } catch {
        toast.error("Failed to delete image");
      } finally {
        setDeleting(null);
      }
    },
    [images, deleteGalleryImage, sectionId]
  );

  // ── Drag handlers for reorder ──
  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (dragIdx === null || dragIdx === idx) return;
      setImages((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(idx, 0, moved);
        return next;
      });
      setDragIdx(idx);
      setHasOrderChanges(true);
    },
    [dragIdx]
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  // ── Save order handler — calls the real Convex endpoint ──
  const handleSaveOrder = useCallback(async () => {
    setSaving(true);
    try {
      // Extract filenames from image src paths for the API
      const filenames = images.map(extractFilename);
      const gallerySection = sectionId === "tattoo-gallery" ? "gallery" : sectionId;
      const ok = await saveGalleryOrder(filenames, gallerySection);
      if (ok) {
        toast.success("Gallery order saved! Allow 3–5 min to show on your site.", { duration: 5000 });
        setHasOrderChanges(false);
      } else {
        toast.error("Failed to save gallery order");
      }
    } catch {
      toast.error("Failed to save gallery order");
    } finally {
      setSaving(false);
    }
  }, [images, saveGalleryOrder, sectionId]);

  return (
    <div className="space-y-4">
      {/* Gallery Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {images.length} image{images.length !== 1 ? "s" : ""} — drag to reorder
          </p>
        </div>
        <div className="flex gap-2">
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
            {uploading ? uploadProgress || "Uploading..." : "Upload"}
          </Button>
          <Button
            onClick={handleSaveOrder}
            disabled={saving || !hasOrderChanges}
            size="sm"
            className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            {saving ? "Saving..." : hasOrderChanges ? "Save Order" : "Saved"}
          </Button>
        </div>
      </div>

      {/* Auto-compression notice */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[oklch(0.16_0.005_250)] border border-border/50">
        <Zap className="w-3.5 h-3.5 text-gold flex-shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          Images are automatically compressed before upload (max 1600px, WebP format) for faster page loads.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* Image Grid */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-[oklch(0.16_0.005_250)] border border-dashed border-border rounded-lg gap-3">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No gallery images found</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="border-gold-dim text-gold hover:bg-gold/10"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Upload Images
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((src, idx) => (
            <div
              key={`${src}-${idx}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`
                relative group bg-[oklch(0.16_0.005_250)] border rounded-lg overflow-hidden
                transition-all duration-150 cursor-grab active:cursor-grabbing
                ${dragIdx === idx ? "border-gold opacity-60 scale-95" : "border-border hover:border-gold-dim"}
              `}
            >
              <img
                src={resolveImageUrl(src)}
                alt={`Gallery ${idx + 1}`}
                className="w-full aspect-square object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%231a1d24' width='200' height='200'/%3E%3Ctext fill='%23555' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";
                }}
              />
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <GripVertical className="w-5 h-5 text-white/80" />
              </div>
              {/* Delete button */}
              <button
                onClick={() => handleDelete(idx)}
                disabled={deleting === idx}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/60 text-white/80 hover:bg-destructive hover:text-white transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              >
                {deleting === idx ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
              {/* Index badge */}
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white/70 font-mono">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unsaved order indicator */}
      {hasOrderChanges && !saving && (
        <div className="flex items-center justify-between p-3 rounded-md bg-[oklch(0.75_0.12_85/8%)] border border-gold-dim/25">
          <p className="text-xs text-gold-dim">
            Gallery order has unsaved changes
          </p>
          <button
            onClick={handleSaveOrder}
            className="text-xs text-gold hover:text-gold/80 font-medium transition-colors"
          >
            Save now
          </button>
        </div>
      )}
    </div>
  );
}
