/**
 * Lightweight, zero-dependency HTML-to-Markdown converter for Cathet.
 * Translates clipboard HTML and TSV into clean GitHub Flavored Markdown (GFM).
 */

export function isHtmlFormatted(html: string): boolean {
  if (!html) return false;
  return /<(table|tr|td|th|pre|code|h[1-6]|ul|ol|li|blockquote|strong|b|em|i|a|img|div|details|summary)\b/i.test(html);
}

export function tsvToMarkdownTable(text: string): string | null {
  if (!text || !text.includes("\t")) return null;
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return null;

  const rows: string[][] = [];
  let colCount = 0;

  for (const line of lines) {
    if (!line.includes("\t")) return null;
    const cells = line.split("\t").map(c => c.trim());
    if (colCount === 0) {
      colCount = cells.length;
      if (colCount < 2) return null;
    } else if (Math.abs(cells.length - colCount) > 1) {
      return null;
    }
    rows.push(cells);
  }

  const maxCols = Math.max(...rows.map(r => r.length));
  const output: string[] = [];

  const header = rows[0];
  while (header.length < maxCols) header.push("");
  output.push(`| ${header.join(" | ")} |`);

  output.push(`| ${Array(maxCols).fill("---").join(" | ")} |`);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    while (row.length < maxCols) row.push("");
    output.push(`| ${row.join(" | ")} |`);
  }

  return output.join("\n");
}

export function htmlToMarkdown(html: string): string {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return nodeToMarkdown(doc.body).trim();
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  const childrenMd = (): string => {
    return Array.from(el.childNodes).map(nodeToMarkdown).join("");
  };

  switch (tag) {
    case "style":
    case "script":
    case "noscript":
    case "head":
    case "meta":
    case "link":
    case "title":
      return "";

    case "table":
      return convertTable(el) + "\n\n";

    case "h1":
      return `\n# ${childrenMd().trim()}\n\n`;
    case "h2":
      return `\n## ${childrenMd().trim()}\n\n`;
    case "h3":
      return `\n### ${childrenMd().trim()}\n\n`;
    case "h4":
      return `\n#### ${childrenMd().trim()}\n\n`;
    case "h5":
      return `\n##### ${childrenMd().trim()}\n\n`;
    case "h6":
      return `\n###### ${childrenMd().trim()}\n\n`;

    case "p":
      return `${childrenMd().trim()}\n\n`;

    case "br":
      return "\n";

    case "strong":
    case "b": {
      const text = childrenMd().trim();
      return text ? `**${text}**` : "";
    }

    case "em":
    case "i": {
      const text = childrenMd().trim();
      return text ? `*${text}*` : "";
    }

    case "mark": {
      const text = childrenMd().trim();
      return text ? `==${text}==` : "";
    }

    case "del":
    case "s":
    case "strike": {
      const text = childrenMd().trim();
      return text ? `~~${text}~~` : "";
    }

    case "code": {
      if (el.parentElement?.tagName.toLowerCase() === "pre") {
        return el.textContent || "";
      }
      const codeText = el.textContent || "";
      return codeText ? `\`${codeText}\`` : "";
    }

    case "pre": {
      const code = el.textContent || "";
      return `\n\`\`\`\n${code.replace(/\r?\n$/, "")}\n\`\`\`\n\n`;
    }

    case "blockquote":
      return childrenMd().split("\n").map(line => line ? `> ${line}` : ">").join("\n") + "\n\n";

    case "ul": {
      const items = Array.from(el.children).filter(c => c.tagName.toLowerCase() === "li");
      return "\n" + items.map(li => `- ${nodeToMarkdown(li).trim()}`).join("\n") + "\n\n";
    }

    case "ol": {
      const items = Array.from(el.children).filter(c => c.tagName.toLowerCase() === "li");
      return "\n" + items.map((li, idx) => `${idx + 1}. ${nodeToMarkdown(li).trim()}`).join("\n") + "\n\n";
    }

    case "li": {
      const checkbox = el.querySelector('input[type="checkbox"]');
      if (checkbox) {
        const isChecked = (checkbox as HTMLInputElement).checked;
        const cleanText = childrenMd().replace(/^\s*\[[ xX]\]\s*/, "").trim();
        return `[${isChecked ? "x" : " "}] ${cleanText}`;
      }
      return childrenMd().trim();
    }

    case "a": {
      const href = el.getAttribute("href") || "";
      const text = childrenMd().trim();
      return href ? `[${text || href}](${href})` : text;
    }

    case "hr":
      return "\n---\n\n";

    case "img": {
      const src = el.getAttribute("src") || "";
      const alt = el.getAttribute("alt") || "Image";
      return src ? `![${alt}](${src})` : "";
    }

    case "div":
      return `\n${childrenMd().trim()}\n\n`;

    case "details": {
      const openAttr = el.hasAttribute("open") ? " open" : "";
      return `\n<details${openAttr}>\n${childrenMd().trim()}\n</details>\n\n`;
    }

    case "summary":
      return `<summary>${childrenMd().trim()}</summary>\n`;

    default:
      return childrenMd();
  }
}

function convertTable(tableEl: HTMLElement): string {
  const rows = Array.from(tableEl.querySelectorAll("tr"));
  if (rows.length === 0) return "";

  const tableData: string[][] = [];
  let maxCols = 0;

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll("th, td"));
    if (cells.length === 0) continue;
    const rowData: string[] = [];
    for (const cell of cells) {
      const cellText = nodeToMarkdown(cell).replace(/\r?\n+/g, " ").replace(/\|/g, "\\|").trim();
      rowData.push(cellText);
      const colSpan = parseInt(cell.getAttribute("colspan") || "1", 10);
      for (let s = 1; s < colSpan; s++) {
        rowData.push("");
      }
    }
    maxCols = Math.max(maxCols, rowData.length);
    tableData.push(rowData);
  }

  if (tableData.length === 0 || maxCols === 0) return "";

  for (const row of tableData) {
    while (row.length < maxCols) {
      row.push("");
    }
  }

  const outputLines: string[] = [];

  const header = tableData[0];
  outputLines.push(`| ${header.join(" | ")} |`);

  const separator = Array(maxCols).fill("---").join(" | ");
  outputLines.push(`| ${separator} |`);

  for (let i = 1; i < tableData.length; i++) {
    outputLines.push(`| ${tableData[i].join(" | ")} |`);
  }

  return outputLines.join("\n");
}
