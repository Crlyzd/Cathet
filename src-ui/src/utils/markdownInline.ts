/**
 * markdownInline.ts — Inline Markdown parser, escapes, reference links, autolinks, and footnotes.
 */
import { resolveImageSrc } from "./imagePathResolver";

export interface LinkDef {
  url: string;
  title?: string;
}

export interface MarkdownDocContext {
  documentPath?: string | null;
  linkDefs: Map<string, LinkDef>;
  footnotes: Map<string, string>;
  usedFootnotes: string[];
}

export function createMarkdownContext(documentPath?: string | null): MarkdownDocContext {
  return {
    documentPath,
    linkDefs: new Map<string, LinkDef>(),
    footnotes: new Map<string, string>(),
    usedFootnotes: [],
  };
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatEmphasis(text: string): string {
  return text
    .replace(/==([^=\n]+)==/g, "<mark>$1</mark>")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/___([^_]+)___/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\b_([^_]+)_\b/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/\^([^\^\s~]+)\^/g, "<sup>$1</sup>")
    .replace(/~([^~\s^]+)~/g, "<sub>$1</sub>");
}

function parseUrlAndTitle(rawTarget: string): { url: string; title: string } {
  const trimmed = rawTarget.trim();
  const titleMatch = trimmed.match(/^(\S+?)\s+["']([^"']*)["']\s*$/);
  if (titleMatch) {
    return { url: titleMatch[1], title: titleMatch[2] };
  }
  return { url: trimmed, title: "" };
}

export function formatInline(
  text: string,
  docPathOrCtx?: string | null | MarkdownDocContext
): string {
  const ctx: MarkdownDocContext =
    docPathOrCtx && typeof docPathOrCtx === "object" && "linkDefs" in docPathOrCtx
      ? docPathOrCtx
      : createMarkdownContext(typeof docPathOrCtx === "string" ? docPathOrCtx : null);

  // 1. Protect inline code (double & single backticks) before escapes
  const codeSnippets: string[] = [];
  let s = text.replace(/``(.+?)``|`([^`\n]+)`/g, (_, dbl, single) => {
    codeSnippets.push(escapeHtml((dbl ?? single).trim()));
    return `§§§CODE_${codeSnippets.length - 1}§§§`;
  });

  // 2. Protect backslash-escaped characters
  const escapes: string[] = [];
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|~$^=<>])/g, (_, ch) => {
    escapes.push(escapeHtml(ch));
    return `§§§ESC_${escapes.length - 1}§§§`;
  });

  // 3. Protect inline math formulas ($...$)
  const mathSnippets: string[] = [];
  s = s.replace(/\$([^\s$](?:[^$\n]*[^\s$])?)\$/g, (_, math) => {
    mathSnippets.push(escapeHtml(math));
    return `§§§MATH_${mathSnippets.length - 1}§§§`;
  });

  const htmlTokens: string[] = [];
  const stashHtml = (html: string): string => {
    htmlTokens.push(html);
    return `§§§HTML_${htmlTokens.length - 1}§§§`;
  };

  // 4. Angle-bracket autolinks (<https://...> & <email>)
  s = s.replace(/<(https?:\/\/[^\s<>]+)>/gi, (_, url) =>
    stashHtml(`<a href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`)
  );
  s = s.replace(/<(?:mailto:)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/gi, (_, email) =>
    stashHtml(`<a href="mailto:${escapeAttr(email)}" target="_blank" rel="noopener">${escapeHtml(email)}</a>`)
  );

  // 5. Strip HTML comments, then escape stray '<' that are not valid HTML tag starts
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(?!\/?([a-zA-Z1-6]+)\b)/g, "&lt;");

  // 6. Linked image badges: [![alt](imgUrl)](linkUrl)
  s = s.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g, (_, alt, imgTarget, linkTarget) => {
    const { url: imgUrl, title: imgTitle } = parseUrlAndTitle(imgTarget);
    const { url: linkUrl, title: linkTitle } = parseUrlAndTitle(linkTarget);
    const resolvedImg = resolveImageSrc(imgUrl, ctx.documentPath);
    const titleAttr = linkTitle || imgTitle ? ` title="${escapeAttr(linkTitle || imgTitle)}"` : "";
    return stashHtml(
      `<a href="${escapeAttr(linkUrl)}"${titleAttr} target="_blank" rel="noopener"><img src="${escapeAttr(resolvedImg)}" alt="${escapeAttr(alt)}" loading="lazy" decoding="async" /></a>`
    );
  });

  // 7. Standalone Markdown images: ![alt](imgUrl "optional title")
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, imgTarget) => {
    const { url: imgUrl, title } = parseUrlAndTitle(imgTarget);
    const resolvedImg = resolveImageSrc(imgUrl, ctx.documentPath);
    const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
    return stashHtml(
      `<img src="${escapeAttr(resolvedImg)}" alt="${escapeAttr(alt)}"${titleAttr} loading="lazy" decoding="async" />`
    );
  });

  // 8. Footnote references: [^id]
  s = s.replace(/\[\^([^\]]+)\]/g, (full, rawId: string) => {
    const key = rawId.trim().toLowerCase();
    if (!ctx.footnotes.has(key)) return full;
    let fnIdx = ctx.usedFootnotes.indexOf(key);
    if (fnIdx === -1) {
      ctx.usedFootnotes.push(key);
      fnIdx = ctx.usedFootnotes.length - 1;
    }
    const num = fnIdx + 1;
    return stashHtml(
      `<sup class="md-footnote-ref"><a href="#fn-${num}" id="fnref-${num}">[${num}]</a></sup>`
    );
  });

  // 9. Standard Markdown links: [text](url "optional title") with single-level balanced parens
  s = s.replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()]*\))+(?:\s+["'][^"']*["'])?)\)/g, (_, label, target) => {
    const { url, title } = parseUrlAndTitle(target);
    const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
    return stashHtml(
      `<a href="${escapeAttr(url)}"${titleAttr} target="_blank" rel="noopener">${formatEmphasis(label)}</a>`
    );
  });

  // 10. Reference-style links: [text][id] and [text][]
  s = s.replace(/\[([^\]]+)\]\[([^\]]*)\]/g, (full, label: string, refId: string) => {
    const key = (refId || label).trim().toLowerCase();
    const def = ctx.linkDefs.get(key);
    if (!def) return full;
    const titleAttr = def.title ? ` title="${escapeAttr(def.title)}"` : "";
    return stashHtml(
      `<a href="${escapeAttr(def.url)}"${titleAttr} target="_blank" rel="noopener">${formatEmphasis(label)}</a>`
    );
  });

  // 11. Protect remaining inline raw HTML tags before bare URL autolinking
  s = s.replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[^<>]*)?\/?>/g, (tag) => stashHtml(tag));

  // 12. Bare URL autolinks (https://... or http://...)
  s = s.replace(/(^|[\s(])((?:https?:\/\/)[^\s<)"'`]+)/gi, (_, lead: string, rawUrl: string) => {
    const cleaned = rawUrl.replace(/[.,;:!?]+$/, "");
    const trailing = rawUrl.slice(cleaned.length);
    return `${lead}${stashHtml(`<a href="${escapeAttr(cleaned)}" target="_blank" rel="noopener">${escapeHtml(cleaned)}</a>`)}${trailing}`;
  });

  // 13. Formatting: Highlight, Bold/Italic, Strikethrough, Sup/Sub
  s = formatEmphasis(s);

  // 14. Restore stashed HTML, escaped chars, code snippets, and math (HTML first in case it holds inner tokens)
  s = s.replace(/§§§HTML_(\d+)§§§/g, (_, idx) => htmlTokens[Number(idx)] ?? "");
  s = s.replace(/§§§ESC_(\d+)§§§/g, (_, idx) => escapes[Number(idx)] ?? "");
  s = s.replace(/§§§CODE_(\d+)§§§/g, (_, idx) => `<code>${codeSnippets[Number(idx)] ?? ""}</code>`);
  s = s.replace(/§§§MATH_(\d+)§§§/g, (_, idx) => `<code class="md-math">${mathSnippets[Number(idx)] ?? ""}</code>`);

  return s;
}
