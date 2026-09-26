/**
 * imageOptimizer.ts — In-memory Canvas downscaler & WebP compressor for Cathet.
 * Prevents multi-megabyte clipboard pastes from bloating documents or freezing the UI.
 */

export const DIRECT_PASTE_MAX_BYTES = 500 * 1024; // 500 KB
export const HARD_LIMIT_BYTES = 15 * 1024 * 1024;   // 15 MB
export const MAX_IMAGE_DIMENSION = 1920;           // Max width/height in px
export const WEBP_QUALITY = 0.82;                  // High fidelity WebP compression

/**
 * Returns true if the pasted file exceeds the safety threshold.
 */
export function isImageTooLarge(file: File): boolean {
  return file.size > HARD_LIMIT_BYTES;
}

/**
 * Formats file bytes into a human-readable MB string.
 */
export function formatFileSizeMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/**
 * Downscales and compresses large images to lightweight WebP data URIs.
 * Small images (<= 500 KB) bypass recompression to preserve 1:1 pixel sharpness.
 */
export async function optimizePastedImage(file: File): Promise<string> {
  // 1. Bypass recompression for small clips, icons, and diagrams
  if (file.size <= DIRECT_PASTE_MAX_BYTES) {
    return readRawDataUrl(file);
  }

  // 2. Compress larger screenshots via Canvas into modern WebP
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback to raw data URL if canvas context fails
        readRawDataUrl(file).then(resolve);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Export as WebP
      const webpUrl = canvas.toDataURL("image/webp", WEBP_QUALITY);
      resolve(webpUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      readRawDataUrl(file).then(resolve);
    };

    img.src = objectUrl;
  });
}

function readRawDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
