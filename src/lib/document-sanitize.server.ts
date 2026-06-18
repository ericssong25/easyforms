import "server-only";

import createDOMPurify from "dompurify";
import { sanitizeWith } from "@/lib/document-sanitize";

/**
 * Server-side sanitizer. Bootstraps a JSDOM window once, caches the
 * resulting DOMPurify instance, and re-exports `sanitizeDocumentHtml`
 * for use in route handlers (e.g. `/api/generate-pdf`).
 *
 * Split from `document-sanitize.ts` so that the client bundle never
 * pulls in `jsdom` (which transitively requires `undici` and `node:crypto`
 * and is not browser-safe).
 */

let cached: ReturnType<typeof createDOMPurify> | null = null;

function getServerPurifier() {
  if (cached) return cached;
  // Lazy-require jsdom at sanitize time so it is only evaluated in the
  // Node runtime, not at module load.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require("jsdom") as typeof import("jsdom");
  const dom = new JSDOM("<!DOCTYPE html>");
  cached = createDOMPurify(dom.window);
  return cached;
}

export function sanitizeDocumentHtml(html: string): string {
  return sanitizeWith(getServerPurifier(), html);
}
