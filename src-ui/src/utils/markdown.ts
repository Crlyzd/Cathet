/**
 * Lightweight Markdown parser for Cathet.
 */
import { sanitizeHtml } from "./markdownSanitizer";
import { resolveImageSrc } from "./imagePathResolver";
import { parseTable } from "./markdownTable";

export function parseMarkdown(md: string, documentPath?: string | null): string {
  if (!md) return "";

  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // Fenced Code Blocks ```
    if (raw.trim().startsWith("```")) {
      if (inCodeBlock) {
        out.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        closeLists();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(raw);
      continue;
    }

    const trimmed = raw.trim();

    // Blank line
    if (trimmed === "") {
      closeLists();
      out.push('<div class="md-spacer"></div>');
      continue;
    }

    // Raw SVG vector graphic blocks (single-line or multi-line)
    if (/^<svg\b/i.test(trimmed)) {
      closeLists();
      if (trimmed.includes("</svg>")) {
        out.push(trimmed);
      } else {
        const svgLines: string[] = [raw];
        while (i + 1 < lines.length) {
          i++;
          svgLines.push(lines[i]);
          if (lines[i].includes("</svg>")) break;
        }
        out.push(svgLines.join("\n"));
      }
      continue;
    }

    // Block HTML containers (e.g. <div>, </div>, <p>, </p>, <br/>, <details>, </details>, <summary>, <img...>)
    if (/^<\/?(div|p|br|hr|img|details|summary|table|thead|tbody|tr|th|td|blockquote)\b/i.test(trimmed)) {
      closeLists();
      out.push(formatInline(trimmed, documentPath));
      continue;
    }

    // Tables: GFM Markdown Pipe Table & TSV paste table
    const tableResult = parseTable(lines, i, formatInline, documentPath);
    if (tableResult) {
      closeLists();
      out.push(tableResult.html);
      i = tableResult.nextIndex;
      continue;
    }

    // Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      closeLists();
      out.push("<hr />");
      continue;
    }

    // Headings # .. ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeLists();
      const level = headingMatch[1].length;
      out.push(`<h${level}>${formatInline(headingMatch[2], documentPath)}</h${level}>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      closeLists();
      out.push(`<blockquote>${formatInline(trimmed.slice(2), documentPath)}</blockquote>`);
      continue;
    }

    // Unordered List
    if (/^[-*+]\s+/.test(trimmed)) {
      if (inOl) { out.push("</ol>"); inOl = false; }
      if (!inUl) { out.push("<ul>"); inUl = true; }
      const itemText = trimmed.replace(/^[-*+]\s+/, "");
      out.push(`<li>${formatInline(itemText, documentPath)}</li>`);
      continue;
    }

    // Ordered List
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (!inOl) { out.push("<ol>"); inOl = true; }
      out.push(`<li>${formatInline(olMatch[2], documentPath)}</li>`);
      continue;
    }

    // Paragraph
    closeLists();
    out.push(`<p>${formatInline(trimmed, documentPath)}</p>`);
  }

  if (inCodeBlock) {
    out.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }
  closeLists();

  return sanitizeHtml(out.join("\n"));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInline(text: string, documentPath?: string | null): string {
  // 1. Temporarily protect inline code blocks
  const codeSnippets: string[] = [];
  let s = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSnippets.push(escapeHtml(code));
    return `___CODE_SLOT_${codeSnippets.length - 1}___`;
  });

  // 2. Strip HTML comments, then escape non-whitelisted raw HTML
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(?!\/?([a-zA-Z1-6]+)\b)/g, "&lt;");

  // 3. Linked image badges: [![alt](imgUrl)](linkUrl)
  s = s.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g, (_, alt, imgUrl, linkUrl) => {
    const resolvedImg = resolveImageSrc(imgUrl, documentPath);
    return `<a href="${linkUrl}" target="_blank" rel="noopener"><img src="${resolvedImg}" alt="${alt}" loading="lazy" decoding="async" /></a>`;
  });

  // 4. Standalone Markdown images: ![alt](imgUrl)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, imgUrl) => {
    const resolvedImg = resolveImageSrc(imgUrl, documentPath);
    return `<img src="${resolvedImg}" alt="${alt}" loading="lazy" decoding="async" />`;
  });

  // 5. Standard Markdown links: [text](linkUrl)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // 6. Formatting: Bold, Italic, Strikethrough
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // 7. Restore inline code
  s = s.replace(/___CODE_SLOT_(\d+)___/g, (_, idx) => `<code>${codeSnippets[Number(idx)]}</code>`);

  return s;
}
