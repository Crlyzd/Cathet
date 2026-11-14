/**
 * markdownBlocks.ts — Extended block-level Markdown parsers (Frontmatter, Alerts, Blockquotes, Nested Lists, Code Blocks).
 */
import { escapeHtml } from "./markdownInline";

export interface BlockParseResult {
  html: string;
  nextIndex: number;
}

const ALERT_LABELS: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

const ALERT_ICONS: Record<string, string> = {
  note: `<svg class="md-alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  tip: `<svg class="md-alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"></path></svg>`,
  important: `<svg class="md-alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="12" y1="7" x2="12" y2="11"></line><line x1="12" y1="14" x2="12.01" y2="14"></line></svg>`,
  warning: `<svg class="md-alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  caution: `<svg class="md-alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
};

export function parseFrontmatter(lines: string[]): BlockParseResult | null {
  if (lines.length < 3 || lines[0].trim() !== "---") return null;

  let endIdx = -1;
  const maxScan = Math.min(lines.length - 1, 25);
  for (let i = 1; i <= maxScan; i++) {
    const t = lines[i].trim();
    if (t === "---" || t === "...") {
      endIdx = i;
      break;
    }
  }
  if (endIdx <= 1) return null;

  const pairs: Array<{ key: string; val: string }> = [];
  for (let i = 1; i < endIdx; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    const m = t.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) return null;
    pairs.push({ key: m[1], val: m[2].replace(/^["']|["']$/g, "") });
  }
  if (pairs.length === 0) return null;

  const badges = pairs
    .map(
      ({ key, val }) =>
        `<span class="md-fm-badge"><span class="md-fm-key">${escapeHtml(key)}</span>${val ? `<span class="md-fm-val">${escapeHtml(val)}</span>` : ""}</span>`
    )
    .join("");

  return {
    html: `<div class="md-frontmatter">${badges}</div>`,
    nextIndex: endIdx,
  };
}

export function renderCodeBlock(codeLines: string[], lang: string): string {
  const cleanLang = lang.trim();
  const displayLang = cleanLang || "text";
  const codeClass = cleanLang ? ` class="language-${escapeHtml(cleanLang)}"` : "";
  return `<div class="md-code-block"><div class="md-code-header"><span class="md-code-lang">${escapeHtml(displayLang)}</span><button type="button" class="md-code-copy" aria-label="Copy code">Copy</button></div><pre><code${codeClass}>${escapeHtml(codeLines.join("\n"))}</code></pre></div>`;
}

function renderQuoteLines(innerLines: string[], formatInlineFn: (t: string) => string, depth = 0): string {
  const chunks: string[] = [];
  let paraLines: string[] = [];

  const flushPara = () => {
    if (paraLines.length > 0) {
      chunks.push(`<p>${paraLines.map((l) => formatInlineFn(l)).join("<br />")}</p>`);
      paraLines = [];
    }
  };

  for (let i = 0; i < innerLines.length; i++) {
    const line = innerLines[i];
    if (/^\s*>/.test(line) && depth < 4) {
      flushPara();
      const nested: string[] = [];
      while (i < innerLines.length && /^\s*>/.test(innerLines[i])) {
        nested.push(innerLines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      i--;
      chunks.push(`<blockquote>${renderQuoteLines(nested, formatInlineFn, depth + 1)}</blockquote>`);
    } else if (line.trim() === "") {
      flushPara();
    } else {
      paraLines.push(line.trim());
    }
  }
  flushPara();
  return chunks.join("");
}

export function parseBlockquoteOrAlert(
  lines: string[],
  startIndex: number,
  formatInlineFn: (t: string) => string
): BlockParseResult {
  const rawCollected: string[] = [];
  let idx = startIndex;
  while (idx < lines.length && /^\s*>/.test(lines[idx])) {
    rawCollected.push(lines[idx].replace(/^\s*>\s?/, ""));
    idx++;
  }

  const firstLine = rawCollected[0]?.trim() || "";
  const alertMatch = firstLine.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);

  if (alertMatch) {
    const type = alertMatch[1].toLowerCase();
    const trailingFirst = alertMatch[2].trim();
    const bodyLines = trailingFirst ? [trailingFirst, ...rawCollected.slice(1)] : rawCollected.slice(1);
    const bodyHtml = renderQuoteLines(bodyLines, formatInlineFn);
    const html = `<div class="md-alert md-alert-${type}"><div class="md-alert-title">${ALERT_ICONS[type] || ""}<span>${ALERT_LABELS[type] || type}</span></div>${bodyHtml ? `<div class="md-alert-body">${bodyHtml}</div>` : ""}</div>`;
    return { html, nextIndex: idx - 1 };
  }

  return {
    html: `<blockquote>${renderQuoteLines(rawCollected, formatInlineFn)}</blockquote>`,
    nextIndex: idx - 1,
  };
}

export function parseListBlock(
  lines: string[],
  startIndex: number,
  formatInlineFn: (t: string) => string
): BlockParseResult {
  const out: string[] = [];
  const stack: Array<{ tag: "ul" | "ol"; indent: number; openLi: boolean }> = [];
  let i = startIndex;

  const closeTop = () => {
    const frame = stack.pop();
    if (!frame) return;
    if (frame.openLi) out.push("</li>");
    out.push(`</${frame.tag}>`);
  };

  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim() === "") break;

    const match = raw.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (!match) break;

    const indent = match[1].replace(/\t/g, "  ").length;
    const tag: "ul" | "ol" = /^\d+\./.test(match[2]) ? "ol" : "ul";
    const itemText = match[3];

    if (stack.length === 0 || indent > stack[stack.length - 1].indent) {
      stack.push({ tag, indent, openLi: false });
      out.push(`<${tag}>`);
    } else {
      while (stack.length > 1 && indent < stack[stack.length - 1].indent) {
        closeTop();
      }
      const top = stack[stack.length - 1];
      if (top.tag !== tag) {
        closeTop();
        stack.push({ tag, indent, openLi: false });
        out.push(`<${tag}>`);
      } else if (top.openLi) {
        out.push("</li>");
        top.openLi = false;
      }
    }

    const taskMatch = itemText.match(/^\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const checkedAttr = taskMatch[1].toLowerCase() === "x" ? " checked" : "";
      out.push(
        `<li class="task-list-item"><input type="checkbox" class="task-checkbox" data-line="${i}"${checkedAttr} /> ${formatInlineFn(taskMatch[2])}`
      );
    } else {
      out.push(`<li>${formatInlineFn(itemText)}`);
    }
    stack[stack.length - 1].openLi = true;
    i++;
  }

  while (stack.length > 0) {
    closeTop();
  }

  return { html: out.join("\n"), nextIndex: i - 1 };
}
