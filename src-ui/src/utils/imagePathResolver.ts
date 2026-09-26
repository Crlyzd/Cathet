/**
 * imagePathResolver.ts — Resolves web, data, and local image paths for Cathet.
 * Integrates Tauri v2 convertFileSrc to stream local files safely in WebView2.
 */
import { convertFileSrc } from "@tauri-apps/api/core";

export function resolveImageSrc(src: string, documentPath?: string | null): string {
  if (!src) return "";

  // 1. Strip surrounding quotes (", ') or GFM angle brackets (<...>)
  let clean = src.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) ||
      (clean.startsWith("'") && clean.endsWith("'")) ||
      (clean.startsWith("<") && clean.endsWith(">"))) {
    clean = clean.slice(1, -1).trim();
  }

  // 2. Web links and Base64 data URIs remain unchanged
  if (/^(https?:|data:image\/)/i.test(clean)) {
    return clean;
  }

  // 3. Strip file:/// protocol prefix if present
  let localPath = clean;
  if (/^file:\/\/\/?/i.test(localPath)) {
    localPath = localPath.replace(/^file:\/\/\/?/i, "");
  }

  // 4. Normalize slashes
  localPath = localPath.replace(/\\/g, "/");

  // 4. Check if path is absolute (e.g. C:/... or /...)
  const isAbsolute = /^[a-zA-Z]:\//i.test(localPath) || localPath.startsWith("/");

  if (!isAbsolute) {
    if (!documentPath) {
      // Document is unsaved (Untitled), cannot resolve relative paths
      return clean;
    }

    // Extract directory of active document
    const docDir = getDocumentDirectory(documentPath);
    localPath = resolveRelativePath(docDir, localPath);
  }

  // 5. Convert local filesystem path to WebView-safe asset stream URL
  try {
    return convertFileSrc(localPath);
  } catch (err) {
    console.warn("Failed to convert local image path:", localPath, err);
    return clean;
  }
}

function getDocumentDirectory(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash !== -1 ? normalized.slice(0, lastSlash + 1) : "";
}

function resolveRelativePath(baseDir: string, relativePath: string): string {
  let cleanRel = relativePath;
  if (cleanRel.startsWith("./")) {
    cleanRel = cleanRel.slice(2);
  }

  const baseParts = baseDir.split("/").filter(Boolean);
  const relParts = cleanRel.split("/").filter(Boolean);

  for (const part of relParts) {
    if (part === ".") {
      continue;
    } else if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }

  // Preserve Windows drive root format (e.g. E:/...)
  const isWindowsDrive = /^[a-zA-Z]:/i.test(baseDir);
  return (isWindowsDrive ? "" : "/") + baseParts.join("/");
}
