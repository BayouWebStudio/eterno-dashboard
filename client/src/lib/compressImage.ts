/**
 * Client-side image compression using the Canvas API.
 * Resizes large images and reduces JPEG/WebP quality before upload.
 * No external dependencies required — runs entirely in the browser.
 */

export interface CompressionOptions {
  /** Max width in pixels. Default: 1600 */
  maxWidth?: number;
  /** Max height in pixels. Default: 1600 */
  maxHeight?: number;
  /** JPEG/WebP quality (0–1). Default: 0.82 */
  quality?: number;
  /** Output MIME type. Default: "image/webp" (falls back to "image/jpeg") */
  outputType?: string;
}

export interface CompressionResult {
  /** Compressed file ready for upload */
  file: File;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Compression ratio (0–1, lower = more compressed) */
  ratio: number;
  /** Whether the image was actually compressed (false if already small enough) */
  wasCompressed: boolean;
}

const DEFAULTS: Required<CompressionOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
  outputType: "image/webp",
};

/** Size threshold: skip compression for files under 100 KB */
const SKIP_THRESHOLD = 100 * 1024;

/**
 * Compress a single image file.
 * Returns the original file unchanged if it's already small enough
 * or if the compressed version is larger than the original.
 */
export async function compressImage(
  file: File,
  options?: CompressionOptions
): Promise<CompressionResult> {
  const opts = { ...DEFAULTS, ...options };
  const originalSize = file.size;

  // Skip tiny files — compression won't help
  if (originalSize <= SKIP_THRESHOLD) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
      wasCompressed: false,
    };
  }

  // Skip non-image files
  if (!file.type.startsWith("image/")) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
      wasCompressed: false,
    };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    // Calculate scaled dimensions maintaining aspect ratio
    let newWidth = width;
    let newHeight = height;

    if (newWidth > opts.maxWidth) {
      newHeight = Math.round((newHeight * opts.maxWidth) / newWidth);
      newWidth = opts.maxWidth;
    }
    if (newHeight > opts.maxHeight) {
      newWidth = Math.round((newWidth * opts.maxHeight) / newHeight);
      newHeight = opts.maxHeight;
    }

    // Draw to canvas
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
    bitmap.close();

    // Try WebP first, fall back to JPEG
    let blob: Blob;
    try {
      blob = await canvas.convertToBlob({
        type: opts.outputType,
        quality: opts.quality,
      });
    } catch {
      // WebP not supported — fall back to JPEG
      blob = await canvas.convertToBlob({
        type: "image/jpeg",
        quality: opts.quality,
      });
    }

    const compressedSize = blob.size;

    // If compression made the file larger, return the original
    if (compressedSize >= originalSize) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        ratio: 1,
        wasCompressed: false,
      };
    }

    // Build a new File with the compressed data
    const ext = blob.type === "image/webp" ? ".webp" : ".jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const compressedFile = new File([blob], `${baseName}${ext}`, {
      type: blob.type,
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      ratio: compressedSize / originalSize,
      wasCompressed: true,
    };
  } catch {
    // If anything fails, return the original file
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
      wasCompressed: false,
    };
  }
}

/**
 * Compress multiple image files in parallel.
 * Returns results in the same order as the input array.
 */
export async function compressImages(
  files: File[],
  options?: CompressionOptions
): Promise<CompressionResult[]> {
  return Promise.all(files.map((f) => compressImage(f, options)));
}

/** Format bytes to a human-readable string (e.g., "1.2 MB") */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}
