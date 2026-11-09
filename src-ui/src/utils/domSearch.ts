/**
 * domSearch.ts — DOM-safe in-document search and highlighting utilities.
 * Uses CSS Custom Highlight API (zero DOM mutation, no selection interference)
 * and precise relative element scrolling.
 */

interface TextSpan {
  node: Text;
  start: number;
  end: number;
}

export interface SearchResult {
  ranges: Range[];
  total: number;
}

/**
 * Extracts searchable text nodes, skipping scripts, styles, and base64 folded pills.
 */
function getSearchableTextNodes(root: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(".base64-pill, script, style")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }
  return textNodes;
}

/**
 * Finds all DOM Ranges matching the query within the root element.
 * Works across both plain contenteditable text and rich markdown preview HTML.
 */
export function findMatches(root: HTMLElement, query: string, maxMatches = 1000): SearchResult {
  const cleanQuery = query.trim();
  if (!cleanQuery) return { ranges: [], total: 0 };

  const textNodes = getSearchableTextNodes(root);
  if (textNodes.length === 0) return { ranges: [], total: 0 };

  const spans: TextSpan[] = [];
  let fullText = "";

  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    const text = node.textContent || "";
    const start = fullText.length;
    fullText += text;
    spans.push({ node, start, end: start + text.length });
  }

  const lowerText = fullText.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const queryLen = lowerQuery.length;
  const ranges: Range[] = [];
  let total = 0;

  let matchIndex = lowerText.indexOf(lowerQuery);
  let spanIdx = 0;

  while (matchIndex !== -1) {
    total++;
    const matchEnd = matchIndex + queryLen;

    if (ranges.length < maxMatches) {
      while (spanIdx < spans.length && spans[spanIdx].end <= matchIndex) {
        spanIdx++;
      }

      const startSpan = spans[spanIdx];
      let endSpanIdx = spanIdx;
      while (endSpanIdx < spans.length && spans[endSpanIdx].end < matchEnd) {
        endSpanIdx++;
      }
      const endSpan = spans[endSpanIdx];

      if (startSpan && endSpan) {
        try {
          const range = document.createRange();
          range.setStart(startSpan.node, matchIndex - startSpan.start);
          range.setEnd(endSpan.node, matchEnd - endSpan.start);
          ranges.push(range);
        } catch (err) {
          console.warn("Error creating search range", err);
        }
      }
    }

    matchIndex = lowerText.indexOf(lowerQuery, matchIndex + queryLen);
  }

  return { ranges, total };
}

/**
 * Highlights matches using the modern CSS Custom Highlight API.
 * Never alters DOM structure or input focus/selection.
 */
export function highlightMatches(ranges: Range[], currentIndex: number): void {
  const cssHighlights = (CSS as any)?.highlights;
  const HighlightCtor = (window as any).Highlight;

  if (!cssHighlights || !HighlightCtor) return;

  try {
    if (ranges.length === 0) {
      cssHighlights.delete("cathet-search-match");
      cssHighlights.delete("cathet-search-current");
      return;
    }

    const allMatchesHighlight = new HighlightCtor();
    for (let i = 0; i < ranges.length; i++) {
      if (i !== currentIndex) {
        allMatchesHighlight.add(ranges[i]);
      }
    }
    cssHighlights.set("cathet-search-match", allMatchesHighlight);

    if (currentIndex >= 0 && currentIndex < ranges.length) {
      const currentHighlight = new HighlightCtor(ranges[currentIndex]);
      cssHighlights.set("cathet-search-current", currentHighlight);
    } else {
      cssHighlights.delete("cathet-search-current");
    }
  } catch (err) {
    console.warn("CSS highlight failed", err);
  }
}

/**
 * Clears all active search highlights.
 */
export function clearHighlights(): void {
  const cssHighlights = (CSS as any)?.highlights;
  if (!cssHighlights) return;
  try {
    cssHighlights.delete("cathet-search-match");
    cssHighlights.delete("cathet-search-current");
  } catch (_) {}
}

/**
 * Scrolls the container so the matched Range is visible in the upper viewport.
 */
export function scrollToMatch(wrapper: HTMLElement, range: Range, smooth = false): void {
  const rect = range.getBoundingClientRect();
  const wrapperRect = wrapper.getBoundingClientRect();

  if (rect.height > 0 || rect.width > 0) {
    const currentRelativeTop = rect.top - wrapperRect.top;
    const desiredOffset = wrapper.clientHeight * 0.3;
    const scrollDelta = currentRelativeTop - desiredOffset;

    wrapper.scrollTo({
      top: Math.max(0, wrapper.scrollTop + scrollDelta),
      behavior: smooth ? "smooth" : "auto",
    });
  } else {
    const parent = range.startContainer.parentElement;
    parent?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
  }
}

