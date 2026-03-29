/*
  DESIGN: Dark Forge — Gallery Page
  Grid of images with drag-to-reorder, upload, and delete.
  Uses gold hover borders and dark card surfaces.
*/
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSite } from "@/contexts/SiteContext";
import { parseGalleryImages } from "@/lib/parseHtml";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Trash2, GripVertical, Loader2, ImageIcon, RefreshCw } from "lucide-react";

export default function Gallery() {
  const { siteHtml, loading, saveSiteField, uploadSiteImage, refreshHtml, currentSite } = useSite();
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve relative image paths to full URLs (mirrors GalleryEditor logic)
  const resolveImageUrl = useCallback(
    (src: string) => {
      if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) return src;
      const siteUrl = currentSite?.siteUrl?.replace(/\/$/, "") || "";
      const slug = currentSite?.slug || "";
      if (siteUrl && slug) return `${siteUrl}/${slug}/${src}`;
      if (siteUrl) return `${siteUrl}/${src}`;
      if (slug) return `https://raw.githubusercontent.com/BayouWebStories/${slug}/main/${src}`;
      return src;
    },
    [currentSite]
  );

  // Parse gallery images from HTML
  useEffect(() => {
    if (siteHtml) {
      const parsed = parseGalleryImages(siteHtml);
      setImages(parsed);
    }
  }, [siteHtml]);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadSiteImage(file, "gallery");
      if (url) newUrls.push(url);
    }
    if (newUrls.length > 0) {
      setImages((prev) => [...prev, ...newUrls]);
      toast.success(`${newUrls.length} image(s) uploaded`);
    }
    setUploading(false);
  }, [uploadSiteImage]);

  const handleDelete = useCallback((idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    toast.success("Image removed");
  }, []);

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  }, [dragIdx]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  const handleSaveOrder = useCallback(async () => {
    setSaving(true);
    try {
      const ok = await saveSiteField("gallery_images", JSON.stringify(images));
      if (ok) {
        toast.success("Gallery order saved");
        refreshHtml();
      } else {
        toast.error("Failed to save gallery order");
      }
    } catch {
      toast.error("Failed to save gallery order");
    } finally {
      setSaving(false);
    }
  }, [images, saveSiteField, refreshHtml]);

  if (loading && !siteHtml) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">Gallery</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {images.length} image{images.length !== 1 ? "s" : ""} — drag to reorder
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshHtml()}
            className="border-border text-muted-foreground hover:text-foreground hover:border-gold-dim"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
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
            Upload
          </Button>
          <Button
            onClick={handleSaveOrder}
            disabled={saving}
            size="sm"
            className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
            Save Order
          </Button>
        </div>
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
        <div className="flex flex-col items-center justify-center h-64 bg-card border border-border rounded-lg gap-4">
          <ImageIcon className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No gallery images found</p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="border-gold-dim text-gold hover:bg-gold/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Images
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((src, idx) => (
            <div
              key={`${src}-${idx}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`
                relative group bg-card border rounded-lg overflow-hidden
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
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%231a1d24' width='200' height='200'/%3E%3Ctext fill='%23555' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";
                }}
              />
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <GripVertical className="w-5 h-5 text-white/80" />
              </div>
              {/* Delete button */}
              <button
                onClick={() => handleDelete(idx)}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-white/80 hover:bg-destructive hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {/* Index badge */}
              <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white/70 font-mono">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
