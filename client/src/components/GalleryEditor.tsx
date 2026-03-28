/*
  DESIGN: Dark Forge — Inline Gallery Editor
  Embeds inside the Section Editor panel for gallery-type sections.
  Supports image upload, delete, and drag-to-reorder.
  Uses the same save flow (saveSiteField) as the rest of the editor.
*/
import { useState, useCallback, useRef, useEffect } from "react";
import { useSite } from "@/contexts/SiteContext";
import { parseGalleryImages } from "@/lib/parseHtml";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload,
  Trash2,
  GripVertical,
  Loader2,
  ImageIcon,
  Save,
} from "lucide-react";

interface GalleryEditorProps {
  sectionId: string;
}

export default function GalleryEditor({ sectionId }: GalleryEditorProps) {
  const { siteHtml, saveSiteField, uploadSiteImage, refreshHtml } = useSite();
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse gallery images from HTML whenever it changes
  useEffect(() => {
    if (siteHtml) {
      const parsed = parseGalleryImages(siteHtml, sectionId);
      setImages(parsed);
      setHasChanges(false);
    }
  }, [siteHtml, sectionId]);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadSiteImage(file, "gallery");
        if (url) newUrls.push(url);
      }
      if (newUrls.length > 0) {
        setImages((prev) => [...prev, ...newUrls]);
        setHasChanges(true);
        toast.success(`${newUrls.length} image${newUrls.length > 1 ? "s" : ""} uploaded`);
      }
      setUploading(false);
    },
    [uploadSiteImage]
  );

  const handleDelete = useCallback((idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setHasChanges(true);
    toast.success("Image removed — save to apply");
  }, []);

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
      setHasChanges(true);
    },
    [dragIdx]
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const ok = await saveSiteField("gallery_images", JSON.stringify(images));
      if (ok) {
        toast.success("Gallery saved");
        setHasChanges(false);
        refreshHtml();
      } else {
        toast.error("Failed to save gallery");
      }
    } catch {
      toast.error("Failed to save gallery");
    } finally {
      setSaving(false);
    }
  }, [images, saveSiteField, refreshHtml]);

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
            Upload
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            size="sm"
            className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            {saving ? "Saving..." : hasChanges ? "Save Gallery" : "Saved"}
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
                src={src}
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
                className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/60 text-white/80 hover:bg-destructive hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {/* Index badge */}
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white/70 font-mono">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unsaved indicator */}
      {hasChanges && !saving && (
        <div className="flex items-center justify-between p-3 rounded-md bg-[oklch(0.75_0.12_85/8%)] border border-gold-dim/25">
          <p className="text-xs text-gold-dim">
            Gallery has unsaved changes
          </p>
          <button
            onClick={handleSave}
            className="text-xs text-gold hover:text-gold/80 font-medium transition-colors"
          >
            Save now
          </button>
        </div>
      )}
    </div>
  );
}
