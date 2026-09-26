/**
 * base64Fold.ts — Collapsible Frosted Glass Pills for Base64 Data URIs in Cathet.
 * Keeps Edit mode clean by replacing massive data strings with interactive badges.
 */

const DATA_URI_REGEX = /data:image\/([a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/g;

/**
 * Creates an interactive pill badge HTML for a Base64 data URI.
 */
export function createBase64PillHtml(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
  const format = match ? match[1].toUpperCase() : "IMAGE";
  const bytes = Math.round(dataUrl.length * 0.75);
  const sizeStr = bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

  const escapedRaw = dataUrl.replace(/"/g, "&quot;");

  return `<span class="b64-pill-container" contenteditable="false" data-raw="${escapedRaw}"><span class="b64-pill-badge" title="Click to view/expand raw Base64 data"><span class="b64-pill-icon">📷</span><span class="b64-pill-meta">${format} ~${sizeStr}</span><span class="b64-pill-arrow">▾</span></span></span>`;
}

/**
 * Serializes editor DOM back into standard Markdown by replacing pill badges with their data-raw strings.
 */
export function serializeEditorContent(editorEl: HTMLElement): string {
  if (!editorEl.querySelector(".b64-pill-container")) {
    return editorEl.innerText;
  }

  const clone = editorEl.cloneNode(true) as HTMLElement;
  const pills = clone.querySelectorAll<HTMLElement>(".b64-pill-container");

  pills.forEach((pill) => {
    const raw = pill.getAttribute("data-raw") || "";
    const textNode = document.createTextNode(raw);
    pill.parentNode?.replaceChild(textNode, pill);
  });

  return clone.innerText;
}

/**
 * Renders raw text into the editor DOM with Base64 data URIs converted into pill badges,
 * while safely escaping HTML tags so they remain editable raw text.
 */
export function renderEditorTextWithPills(text: string): string {
  if (!text.includes("data:image/")) {
    return escapeHtml(text);
  }

  // 1. Escape HTML so markdown tags (<div>, <p>, etc.) remain literal text
  const escaped = escapeHtml(text);

  // 2. Replace data URIs with interactive pills
  return escaped.replace(DATA_URI_REGEX, (match) => {
    return createBase64PillHtml(match);
  });
}

/**
 * Attaches click delegation on the editor element to toggle pill expansion.
 */
export function attachPillClickHandler(editorEl: HTMLElement): void {
  editorEl.addEventListener("click", (e: MouseEvent) => {
    const target = (e.target as HTMLElement)?.closest<HTMLElement>(".b64-pill-container");
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    const isExpanded = target.classList.contains("expanded");
    const raw = target.getAttribute("data-raw") || "";

    if (isExpanded) {
      // Collapse back to compact badge
      target.classList.remove("expanded");
      target.innerHTML = createBase64PillHtml(raw).replace(/^<span[^>]*>/, "").replace(/<\/span>$/, "");
    } else {
      // Expand to view raw data
      target.classList.add("expanded");
      target.innerHTML = `
        <span class="b64-pill-expanded-header" title="Click to collapse">
          <span class="b64-pill-icon">📷</span>
          <span class="b64-pill-meta">Raw Data URI (${Math.round(raw.length * 0.75 / 1024)} KB)</span>
          <span class="b64-pill-arrow">▴ (Click to collapse)</span>
        </span>
        <span class="b64-pill-raw-text">${escapeHtml(raw)}</span>
      `;
    }
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
