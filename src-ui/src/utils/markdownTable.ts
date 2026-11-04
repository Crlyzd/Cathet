/**
 * markdownTable.ts — GFM and TSV Table parsing for Cathet Markdown preview.
 */

export function parseTable(
  lines: string[],
  startIndex: number,
  formatInline: (text: string, docPath?: string | null) => string,
  documentPath?: string | null
): { html: string; nextIndex: number } | null {
  const raw = lines[startIndex];
  const trimmed = raw.trim();

  // 1. Markdown Pipe Table
  if (trimmed.includes("|") && startIndex + 1 < lines.length && isTableDelimiter(lines[startIndex + 1])) {
    const headerCells = parseTableCells(trimmed);
    const delimiterCells = parseTableCells(lines[startIndex + 1]);
    const alignments = delimiterCells.map(getAlignment);

    let tableHtml = '<div class="md-table-wrapper"><table><thead><tr>';
    for (let c = 0; c < headerCells.length; c++) {
      const align = alignments[c] ? ` style="text-align:${alignments[c]}"` : "";
      tableHtml += `<th${align}>${formatInline(headerCells[c], documentPath)}</th>`;
    }
    tableHtml += "</tr></thead><tbody>";

    let i = startIndex + 1; // Advance past delimiter
    while (i + 1 < lines.length) {
      const nextRow = lines[i + 1].trim();
      if (!nextRow || !nextRow.includes("|")) break;
      i++;
      const bodyCells = parseTableCells(nextRow);
      tableHtml += "<tr>";
      for (let c = 0; c < headerCells.length; c++) {
        const cellText = bodyCells[c] !== undefined ? bodyCells[c] : "";
        const align = alignments[c] ? ` style="text-align:${alignments[c]}"` : "";
        tableHtml += `<td${align}>${formatInline(cellText, documentPath)}</td>`;
      }
      tableHtml += "</tr>";
    }

    tableHtml += "</tbody></table></div>";
    return { html: tableHtml, nextIndex: i };
  }

  // 2. Tab-separated Table (TSV / Excel paste)
  if (raw.includes("\t") && startIndex + 1 < lines.length && lines[startIndex + 1].includes("\t")) {
    const headerCells = raw.split("\t").map((c) => c.trim());
    let tableHtml = '<div class="md-table-wrapper"><table><thead><tr>';
    for (const h of headerCells) {
      tableHtml += `<th>${formatInline(h, documentPath)}</th>`;
    }
    tableHtml += "</tr></thead><tbody>";

    let i = startIndex;
    while (i + 1 < lines.length) {
      const nextRow = lines[i + 1];
      if (!nextRow.includes("\t")) break;
      i++;
      const bodyCells = nextRow.split("\t").map((c) => c.trim());
      tableHtml += "<tr>";
      for (let c = 0; c < headerCells.length; c++) {
        const cellText = bodyCells[c] !== undefined ? bodyCells[c] : "";
        tableHtml += `<td>${formatInline(cellText, documentPath)}</td>`;
      }
      tableHtml += "</tr>";
    }

    tableHtml += "</tbody></table></div>";
    return { html: tableHtml, nextIndex: i };
  }

  return null;
}

function parseTableCells(rowStr: string): string[] {
  let s = rowStr.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isTableDelimiter(rowStr: string): boolean {
  const cells = parseTableCells(rowStr);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-+:?$/.test(c));
}

function getAlignment(cell: string): "left" | "center" | "right" | "" {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return "";
}

