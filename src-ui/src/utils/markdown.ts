/**
 * Lightweight, zero-dependency Markdown parser for Cathet (CommonMark + GFM + Extended).
 */
import { sanitizeHtml } from "./markdownSanitizer";
import { parseTable } from "./markdownTable";
import {
  createMarkdownContext,
  escapeHtml,
  formatInline,
  MarkdownDocContext,
} from "./markdownInline";
import {
  parseBlockquoteOrAlert,
  parseFrontmatter,
  parseListBlock,
  renderCodeBlock,
} from "./markdownBlocks";

function collectDefinitions(
  lines: string[],
  startLine: number,
  ctx: MarkdownDocContext
): Set<number> {
  const skipLines = new Set<number>();
  let fenceChar = "";
  let fenceLen = 0;

  for (let i = startLine; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const ch = fenceMatch[1][0];
      const len = fenceMatch[1].length;
      if (!fenceChar) {
        fenceChar = ch;
        fenceLen = len;
      } else if (ch === fenceChar && len >= fenceLen && !fenceMatch[2].trim()) {
        fenceChar = "";
        fenceLen = 0;
      }
      continue;
    }
    if (fenceChar) continue;

    // Footnote definition: [^id]: text (plus indented continuation lines)
    const fnMatch = lines[i].match(/^\s*\[\^([^\]]+)\]:\s*(.*)$/);
    if (fnMatch) {
      const key = fnMatch[1].trim().toLowerCase();
      const parts = [fnMatch[2].trim()];
      skipLines.add(i);
      while (i + 1 < lines.length && /^(?: {2,}|\t)\S/.test(lines[i + 1])) {
        i++;
        parts.push(lines[i].trim());
        skipLines.add(i);
      }
      ctx.footnotes.set(key, parts.filter(Boolean).join(" "));
      continue;
    }

    // Reference link definition: [id]: url "optional title"
    const linkMatch = lines[i].match(/^\s*\[(?!\^)([^\]]+)\]:\s*(\S+)(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*$/);
    if (linkMatch) {
      const key = linkMatch[1].trim().toLowerCase();
      const url = linkMatch[2].replace(/^<|>$/g, "");
      const title = linkMatch[3] ?? linkMatch[4] ?? linkMatch[5];
      ctx.linkDefs.set(key, { url, title });
      skipLines.add(i);
    }
  }

  return skipLines;
}

export function parseMarkdown(md: string, documentPath?: string | null): string {
  if (!md) return "";

  const lines = md.split(/\r?\n/);
  const ctx = createMarkdownContext(documentPath);
  const fm = parseFrontmatter(lines);
  const startLine = fm ? fm.nextIndex + 1 : 0;
  const skipLines = collectDefinitions(lines, startLine, ctx);
  const formatFn = (t: string) => formatInline(t, ctx);

  const out: string[] = [];
  if (fm) out.push(fm.html);

  let fenceChar = "";
  let fenceLen = 0;
  let codeLang = "";
  let codeBuffer: string[] = [];

  for (let i = startLine; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Fenced Code Blocks (``` or ~~~ with optional language header)
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const ch = fenceMatch[1][0];
      const len = fenceMatch[1].length;
      if (!fenceChar) {
        fenceChar = ch;
        fenceLen = len;
        codeLang = fenceMatch[2].trim().split(/\s+/)[0] || "";
        continue;
      }
      if (ch === fenceChar && len >= fenceLen && !fenceMatch[2].trim()) {
        out.push(renderCodeBlock(codeBuffer, codeLang));
        codeBuffer = [];
        fenceChar = "";
        fenceLen = 0;
        codeLang = "";
        continue;
      }
    }

    if (fenceChar) {
      codeBuffer.push(raw);
      continue;
    }

    if (skipLines.has(i)) continue;

    // Blank line
    if (trimmed === "") {
      out.push('<div class="md-spacer"></div>');
      continue;
    }

    // Display Math Block ($$ ... $$ single-line or multi-line)
    const singleMath = trimmed.match(/^\$\$(.+)\$\$$/);
    if (singleMath) {
      out.push(`<div class="md-math-block"><code class="md-math">${escapeHtml(singleMath[1].trim())}</code></div>`);
      continue;
    }
    if (trimmed === "$$") {
      const mathLines: string[] = [];
      while (i + 1 < lines.length) {
        i++;
        if (lines[i].trim() === "$$") break;
        mathLines.push(lines[i]);
      }
      out.push(`<div class="md-math-block"><code class="md-math">${escapeHtml(mathLines.join("\n"))}</code></div>`);
      continue;
    }

    // Raw SVG vector graphic blocks (single-line or multi-line)
    if (/^<svg\b/i.test(trimmed)) {
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

    // Block HTML containers (e.g. <div>, <p>, <details>, <summary>, <img...>)
    if (/^<\/?(div|p|br|hr|img|details|summary|table|thead|tbody|tr|th|td|blockquote|section|h[1-6])\b/i.test(trimmed)) {
      out.push(formatFn(trimmed));
      continue;
    }

    // Tables: GFM Markdown Pipe Table & TSV paste table
    const tableResult = parseTable(lines, i, formatFn, documentPath);
    if (tableResult) {
      out.push(tableResult.html);
      i = tableResult.nextIndex;
      continue;
    }

    // Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      out.push("<hr />");
      continue;
    }

    // ATX Headings # .. ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      out.push(`<h${level}>${formatFn(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquotes & GitHub Alerts ([!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION])
    if (/^\s*>/.test(raw)) {
      const qRes = parseBlockquoteOrAlert(lines, i, formatFn);
      out.push(qRes.html);
      i = qRes.nextIndex;
      continue;
    }

    // Unordered, Ordered, Nested & Task Lists
    if (/^(\s*)([-*+]|\d+\.)\s+/.test(raw)) {
      const lRes = parseListBlock(lines, i, formatFn);
      out.push(lRes.html);
      i = lRes.nextIndex;
      continue;
    }

    // Setext Headings (=== or --- underline)
    if (i + 1 < lines.length && !skipLines.has(i + 1) && !trimmed.includes("|") && !trimmed.startsWith("<")) {
      const nextTrim = lines[i + 1].trim();
      if (/^={3,}$/.test(nextTrim)) {
        out.push(`<h1>${formatFn(trimmed)}</h1>`);
        i++;
        continue;
      }
      if (/^-{3,}$/.test(nextTrim)) {
        out.push(`<h2>${formatFn(trimmed)}</h2>`);
        i++;
        continue;
      }
    }

    // Paragraph
    out.push(`<p>${formatFn(trimmed)}</p>`);
  }

  if (fenceChar) {
    out.push(renderCodeBlock(codeBuffer, codeLang));
  }

  // Render collected footnotes at the bottom of the document
  if (ctx.usedFootnotes.length > 0) {
    const items = ctx.usedFootnotes
      .map((key, idx) => {
        const num = idx + 1;
        const body = ctx.footnotes.get(key) || "";
        return `<li id="fn-${num}">${formatFn(body)} <a href="#fnref-${num}" class="md-footnote-backref" aria-label="Back to reference">↩</a></li>`;
      })
      .join("\n");
    out.push(`<section class="md-footnotes"><hr /><ol class="md-footnotes-list">\n${items}\n</ol></section>`);
  }

  return sanitizeHtml(out.join("\n"));
}
