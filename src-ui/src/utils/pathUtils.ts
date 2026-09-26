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
