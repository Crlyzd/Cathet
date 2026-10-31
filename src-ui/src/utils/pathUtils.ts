/**
 * pathUtils.ts — Path detection and normalization utilities for Cathet.
 * Cleans Windows "Copy as path" quotes and normalizes slashes for Markdown compatibility.
 */

// Matches a single file or directory path wrapped in double or single quotes.
// Supports Windows drive paths (e.g. "C:\dir\file.ext"), Windows UNC network paths (e.g. "\\server\share\file.ext"),
// and POSIX absolute paths (e.g. "/home/user/file.ext").
const QUOTED_FILE_PATH_REGEX = /^["']([a-zA-Z]:[/\\][^"'\r\n]+|\\\\[^"'\r\n]+|\/[^"'\r\n]+)["']$/;

/**
 * Returns true if the text represents a single quoted file or folder path.
 */
export function isQuotedFilePath(text: string): boolean {
  if (!text) return false;
  return QUOTED_FILE_PATH_REGEX.test(text.trim());
}

/**
 * Strips the enclosing quotes from a quoted file path.
 * Optionally normalizes Windows backslashes to forward slashes.
 */
export function unwrapQuotedPath(text: string, normalizeSlashes: boolean = false): string {
  const trimmed = text.trim();
  const match = trimmed.match(QUOTED_FILE_PATH_REGEX);
  let path = match ? match[1] : trimmed;
  if (normalizeSlashes) {
    path = path.replace(/\\/g, "/");
  }
  return path;
}

/**
 * Formats a clean human-readable title for documents and headers,
 * stripping URI schemes (file:///), internal notes/ prefixes, and escaped paths.
 */
export function formatDisplayTitle(raw: string | null | undefined): string {
  if (!raw) return "Untitled";
  let s = raw.trim();
  if (s.startsWith("notes/")) s = s.slice(6);
  if (s.startsWith("file:///")) {
    try {
      s = decodeURIComponent(s.replace(/^file:\/\/\//, ""));
    } catch {}
  }
  const lastSlash = Math.max(s.lastIndexOf("/"), s.lastIndexOf("\\"));
  if (lastSlash !== -1) {
    s = s.slice(lastSlash + 1);
  }
  if (s.startsWith("file___")) {
    const parts = s.split(/_+/);
    if (parts.length > 1) {
      s = parts[parts.length - 1];
    }
  }
  return s || "Untitled";
}
