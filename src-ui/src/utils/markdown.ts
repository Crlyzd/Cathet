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

    // Markdown Table: requires header line with '|' and next line as delimiter
    if (trimmed.includes("|") && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
      if (inList) { out.push("</ul>"); inList = false; }
      const headerCells = parseTableCells(trimmed);
      const delimiterCells = parseTableCells(lines[i + 1]);
      const alignments = delimiterCells.map(getAlignment);

      let tableHtml = '<div class="md-table-wrapper"><table><thead><tr>';
      for (let c = 0; c < headerCells.length; c++) {
        const align = alignments[c] ? ` style="text-align:${alignments[c]}"` : "";
        tableHtml += `<th${align}>${formatInline(headerCells[c])}</th>`;
      }
      tableHtml += "</tr></thead><tbody>";

      i += 1; // Advance past delimiter

      while (i + 1 < lines.length) {
        const nextRow = lines[i + 1].trim();
        if (!nextRow || !nextRow.includes("|")) break;
        i++;
        const bodyCells = parseTableCells(nextRow);
        tableHtml += "<tr>";
        for (let c = 0; c < headerCells.length; c++) {
          const cellText = bodyCells[c] !== undefined ? bodyCells[c] : "";
          const align = alignments[c] ? ` style="text-align:${alignments[c]}"` : "";
          tableHtml += `<td${align}>${formatInline(cellText)}</td>`;
        }
        tableHtml += "</tr>";
      }

      tableHtml += "</tbody></table></div>";
      out.push(tableHtml);
      continue;
    }

    // Tab-separated Table (TSV / Excel paste)
    if (raw.includes("\t") && i + 1 < lines.length && lines[i + 1].includes("\t")) {
      if (inList) { out.push("</ul>"); inList = false; }
      const headerCells = raw.split("\t").map(c => c.trim());
      let tableHtml = '<div class="md-table-wrapper"><table><thead><tr>';
      for (const h of headerCells) {
        tableHtml += `<th>${formatInline(h)}</th>`;
      }
      tableHtml += "</tr></thead><tbody>";

      while (i + 1 < lines.length) {
        const nextRow = lines[i + 1];
        if (!nextRow.includes("\t")) break;
        i++;
        const bodyCells = nextRow.split("\t").map(c => c.trim());
        tableHtml += "<tr>";
        for (let c = 0; c < headerCells.length; c++) {
          const cellText = bodyCells[c] !== undefined ? bodyCells[c] : "";
          tableHtml += `<td>${formatInline(cellText)}</td>`;
        }
        tableHtml += "</tr>";
      }

      tableHtml += "</tbody></table></div>";
      out.push(tableHtml);
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

function parseTableCells(rowStr: string): string[] {
  let s = rowStr.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map(c => c.trim());
}

function isTableDelimiter(rowStr: string): boolean {
  const cells = parseTableCells(rowStr);
  if (cells.length === 0) return false;
  return cells.every(c => /^:?-+:?$/.test(c));
}

function getAlignment(cell: string): "left" | "center" | "right" | "" {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return "";
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
