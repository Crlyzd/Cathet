/**
 * Zero-dependency HTML sanitizer for Cathet's Markdown Preview.
 * Allows safe GFM HTML tags and attributes while eliminating XSS vectors.
 */

const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "code", "dd", "del", "details", "div", "dl", "dt",
  "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "input", "ins",
  "kbd", "li", "ol", "p", "pre", "q", "rp", "rt", "ruby", "s", "samp", "small",
  "span", "strike", "strong", "sub", "summary", "sup", "table", "tbody", "td",
  "tfoot", "th", "thead", "tr", "u", "ul", "var", "wbr"
]);

const ALLOWED_ATTRS = new Set([
  "align", "alt", "class", "dir", "height", "href", "id", "loading",
  "name", "rel", "src", "style", "target", "title", "width"
]);

export function sanitizeHtml(html: string): string {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  cleanNode(doc.body.firstElementChild || doc.body);
  return (doc.body.firstElementChild || doc.body).innerHTML;
}

function cleanNode(node: Node): void {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Disallow dangerous or unwanted tags (e.g. script, style, iframe, object)
      if (!ALLOWED_TAGS.has(tag)) {
        el.remove();
        continue;
      }

      // Sanitize attributes
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        const attrName = attr.name.toLowerCase();

        // Strip any event handler attributes (onload, onerror, onclick, etc.)
        if (attrName.startsWith("on") || !ALLOWED_ATTRS.has(attrName)) {
          el.removeAttribute(attr.name);
          continue;
        }

        // Validate links and image sources against dangerous protocols
        if (attrName === "href" || attrName === "src") {
          const val = attr.value.trim().toLowerCase();
          if (val.startsWith("javascript:") || val.startsWith("vbscript:") || val.startsWith("data:text/html")) {
            el.removeAttribute(attr.name);
            continue;
          }
        }
      }

      // Enforce safe link attributes
      if (tag === "a" && el.hasAttribute("href")) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }

      // Enforce lazy loading and responsive images
      if (tag === "img") {
        if (!el.hasAttribute("loading")) {
          el.setAttribute("loading", "lazy");
        }
      }

      // Recurse into children
      cleanNode(el);
    }
  }
}
