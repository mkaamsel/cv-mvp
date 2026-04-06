/**
 * cleanJobHtml — shared HTML cleaning utility for job posting fetchers.
 *
 * Exported and used by:
 *   - app/api/fetch-job/route.ts
 *   - app/api/extract-job/route.ts
 *
 * No AI. No extraction. Pure HTML noise stripping and text conversion.
 */

// ── Shared fetch headers ───────────────────────────────────────────────────────

export const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
};

// ── HTML noise removal ─────────────────────────────────────────────────────────

/**
 * Remove entire tag blocks whose name is a known noise container.
 * Non-greedy — works for one level of nesting which covers all real-world cases.
 */
function removeTagBlock(html: string, tag: string): string {
  return html.replace(
    new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"),
    "",
  );
}

/**
 * Remove inline elements identified as cookie / consent / banner noise
 * via their id or class attribute.
 */
function removeCookieBanners(html: string): string {
  return html.replace(
    /<[a-z][a-z0-9]*\b[^>]*(?:id|class)="[^"]*(?:cookie|consent|gdpr|banner|onetrust|cookiebot|trustarc|privacy-notice|notification-bar|toast)[^"]*"[^>]*>[\s\S]*?<\/[a-z][a-z0-9]*>/gi,
    "",
  );
}

/**
 * Strip all noise sections from raw HTML, leaving only job-relevant content.
 */
export function removeNoise(html: string): string {
  let h = html;
  // Remove executable / style blocks
  h = removeTagBlock(h, "script");
  h = removeTagBlock(h, "style");
  h = removeTagBlock(h, "noscript");
  // Remove structural chrome
  h = removeTagBlock(h, "nav");
  h = removeTagBlock(h, "header");
  h = removeTagBlock(h, "footer");
  h = removeTagBlock(h, "aside");
  // Remove cookie / consent banners
  h = removeCookieBanners(h);
  return h;
}

// ── Main content extraction ────────────────────────────────────────────────────

/**
 * Try to find the smallest subtree that contains the actual job description.
 * Uses structural anchors in priority order:
 *   1. <main>
 *   2. role="main"
 *   3. <article>
 *   4. Common job-site class/id patterns
 *   5. <body> fallback
 */
export function extractMainBlock(html: string): string {
  const anchors: RegExp[] = [
    // Semantic HTML5 landmarks
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    // ARIA landmark
    /<[a-z][a-z0-9]*\b[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/[a-z][a-z0-9]*>/i,
    // Single article block
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    // Common job site content containers (class/id contains these keywords)
    /<(?:div|section)\b[^>]*(?:id|class)="[^"]*(?:job[-_]?(?:description|content|detail|body|posting|overview)|posting[-_]description|job[-_]info|vacancy[-_]description|stelle[-_]?beschreibung|stellenbeschreibung|job[-_]?details)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/i,
  ];

  for (const pattern of anchors) {
    const match = pattern.exec(html);
    if (match?.[1] && match[1].length > 400) {
      return match[1];
    }
  }

  // Last resort: whole body
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  return body?.[1] ?? html;
}

// ── HTML → plain text ──────────────────────────────────────────────────────────

export function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—");
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      // List items: preserve as bullets
      .replace(/<li\b[^>]*>/gi, "\n• ")
      .replace(/<\/li>/gi, "")
      // Line breaks and block terminators
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|h[1-6]|tr|td|th)>/gi, "\n")
      // Drop all remaining tags
      .replace(/<[^>]+>/g, " ")
      // Normalise whitespace
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

// ── Blocked / thin content detection ──────────────────────────────────────────

export function isBlockedOrThin(text: string): boolean {
  if (text.length < 600) return true;
  const lower = text.toLowerCase();
  return [
    "captcha", "verify you are human", "access denied", "unusual traffic",
    "security check", "enable javascript", "cloudflare", "please enable cookies",
  ].some((s) => lower.includes(s));
}
