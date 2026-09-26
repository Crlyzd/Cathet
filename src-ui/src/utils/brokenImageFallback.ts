/**
 * brokenImageFallback.ts — Modern Frosted Glass Fallback for Broken/Unsupported Images.
 * Replaces Chromium's default broken image icon with a sleek vector card.
 */

export const BROKEN_IMAGE_SVG = `
<svg class="md-broken-img-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="3.5"></rect>
  <circle cx="8.5" cy="8.5" r="1.5"></circle>
  <path d="M21 15l-5-5L5 21"></path>
  <line x1="2" y1="2" x2="22" y2="22" class="md-broken-img-slash"></line>
</svg>
`;

function extractFileName(src: string): string {
  if (!src) return "Image";
  if (src.startsWith("data:image/")) {
    const match = src.match(/^data:image\/([a-zA-Z0-9+.-]+);/);
    return match ? `${match[1].toUpperCase()} Data URI` : "Base64 Image";
  }

  // Handle URL or local filesystem path
  const clean = src.split("?")[0].split("#")[0];
  const lastSlash = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
  if (lastSlash !== -1 && lastSlash < clean.length - 1) {
    return decodeURIComponent(clean.slice(lastSlash + 1));
  }
  return decodeURIComponent(clean);
}

/**
 * Creates a modern frosted glass fallback card HTML.
 */
export function createBrokenImageCardHtml(src: string, alt: string): string {
  const fileName = extractFileName(src);
  const displayAlt = alt && alt.trim() ? alt.trim() : "Image not available";
  const escapedSrc = src.replace(/"/g, "&quot;");
  const escapedAlt = displayAlt.replace(/"/g, "&quot;");
  const escapedFile = fileName.replace(/"/g, "&quot;");

  return `
    <span class="md-broken-img-card" title="Failed to load or unsupported format: ${escapedSrc}" data-src="${escapedSrc}">
      <span class="md-broken-img-icon-wrap">${BROKEN_IMAGE_SVG.trim()}</span>
      <span class="md-broken-img-info">
        <span class="md-broken-img-title">${escapedAlt}</span>
        <span class="md-broken-img-meta">${escapedFile}</span>
      </span>
    </span>
  `.trim();
}

/**
 * Replaces a broken <img> element in the DOM with the frosted glass SVG card.
 */
export function replaceBrokenImageWithFallback(imgEl: HTMLImageElement): void {
  if (imgEl.classList.contains("md-broken-img-replaced")) return;
  imgEl.classList.add("md-broken-img-replaced");

  const src = imgEl.getAttribute("src") || "";
  const alt = imgEl.getAttribute("alt") || "";

  const temp = document.createElement("div");
  temp.innerHTML = createBrokenImageCardHtml(src, alt);
  const card = temp.firstElementChild as HTMLElement;

  if (card && imgEl.parentNode) {
    imgEl.parentNode.replaceChild(card, imgEl);
  }
}
