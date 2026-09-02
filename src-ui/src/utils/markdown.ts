/**
 * Lightweight, zero-dependency Markdown parser for Cathet.
 */
export function parseMarkdown(md: string): string {
  if (!md) return "";

  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // Fenced Code Blocks ```
    if (raw.trim().startsWith("```")) {
      if (inCodeBlock) {
        out.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        if (inList) { out.push("</ul>"); inList = false; }
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
      if (inList) { out.push("</ul>"); inList = false; }
      out.push('<div class="md-spacer"></div>');
      continue;
    }

    // Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push("<hr />");
      continue;
    }

    // Headings # .. ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      if (inList) { out.push("</ul>"); inList = false; }
      const level = headingMatch[1].length;
      out.push(`<h${level}>${formatInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<blockquote>${formatInline(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    // Unordered List
    if (/^[-*+]\s+/.test(trimmed)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      const itemText = trimmed.replace(/^[-*+]\s+/, "");
      out.push(`<li>${formatInline(itemText)}</li>`);
      continue;
    }

    // Paragraph
    if (inList) { out.push("</ul>"); inList = false; }
    out.push(`<p>${formatInline(trimmed)}</p>`);
  }

  if (inCodeBlock) {
    out.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }
  if (inList) {
    out.push("</ul>");
  }

  return out.join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInline(text: string): string {
  let s = escapeHtml(text);
  // Inline code `code`
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold **bold**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic *italic*
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}
