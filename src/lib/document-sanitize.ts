import createDOMPurify from "dompurify";
import type { Config } from "dompurify";

/**
 * Sanitizes agent-authored document HTML before it is injected into the DOM
 * (preview, public signing page) or embedded into the PDF generator's HTML
 * payload sent to Browserless.
 *
 * Background: template content is authored via the TipTap rich-text editor
 * and persisted as raw HTML. It is rendered into the page with
 * `dangerouslySetInnerHTML`, and is also forwarded to the public, *unauthenticated*
 * signing page. Without sanitization a malicious template (or compromised
 * agent session) can inject `<script>`, event-handler attributes, `<iframe>`,
 * `javascript:` URLs, etc. — a stored XSS vector served to unauthenticated
 * signers.
 *
 * Allowlist policy: we enumerate EXACTLY the elements/attributes/inline-style
 * properties the editor in `src/components/ui/rich-text-editor.tsx` can emit
 * (see Editor extensions below), and forbid everything else. Inline `style`
 * is allowed as an attribute, but DOMPurify's ALLOWED_ATTR is paired with a
 * narrow ALLOWED_STYLE_PROPS list so that only the visual properties the
 * editor produces survive; e.g. `position`, `z-index`, `top/left`,
 * `width/height`, `background`, etc. are stripped even if a `<div>` survived.
 *
 * Editor extensions (rich-text-editor.tsx):
 *   - StarterKit   -> <p>, <h1>..<h3>, <strong>, <em>, <ul>, <ol>, <li>,
 *                     <blockquote>, <code>, <pre>, <br>, <hr>, <s>
 *                     (StarterKit also includes bold, italic, strike, code,
 *                     link history; attributes are listed explicitly below.)
 *   - Underline    -> <u>
 *   - TextAlign    -> inline `text-align` (paragraph + heading)
 *   - TextStyle    -> inline `color`
 *   - FontFamily   -> inline `font-family`
 *   - FontSize     -> inline `font-size` (custom mark on text style)
 *   - LineHeight   -> inline `line-height` (paragraph / heading / listItem)
 *   - Link         -> <a href class="ef-doc-link">
 *
 * Notes:
 *   - We deliberately do NOT sanitize the agent's CSS string (the one we
 *     author ourselves in `src/lib/document-styles.ts`) or the signature
 *     image src; those are produced by trusted code, not user input.
 *   - We also allow <img src alt class> for the document logo (rendered
 *     separately, not in the content stream, but allowed defensively in
 *     case content ever includes one).
 *   - All on*-event attributes are stripped by virtue of NOT being in
 *     ALLOWED_ATTR. `javascript:` / `data:` URLs in href/src are stripped
 *     by DOMPurify's default URI sanitization (ALLOWED_URI_REGEXP).
 *   - The TipTap `textStyle` mark wraps the literal span and is the
 *     carrier for font-family / font-size / color. We permit <span style>
 *     so those marks round-trip.
 *
 * File layout:
 *   - `document-sanitize.ts` (this file) — pure config + shared sanitize
 *     helper, no jsdom, safe to import from both client and server.
 *   - `document-sanitize.server.ts` — server-only entry that bootstraps
 *     a JSDOM window for DOMPurify and re-exports a Node-flavored
 *     `sanitizeDocumentHtml`.
 *   The client uses `sanitizeDocumentHtml` from THIS file; the route
 *   handler uses the server re-export. The two configs are identical.
 */

export const DOCUMENT_SANITIZE_CONFIG: Config = (() => {
  // ALLOWED_STYLE_PROPS is supported at runtime by dompurify >= 2.x but is
  // not declared in the bundled .d.ts (3.4.8). Cast through `unknown` to
  // keep the call site typed without disabling the whole file.
  const styleProps = [
    "font-family",
    "font-size",
    "line-height",
    "text-align",
    "color",
  ];

  return {
    ALLOWED_TAGS: [
      "p",
      "br",
      "hr",
      "strong",
      "em",
      "u",
      "s",
      "code",
      "pre",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "span",
      "div",
    ],
    ALLOWED_ATTR: [
      "href",
      "rel",
      "target",
      "title",
      "src",
      "alt",
      "class",
      "style",
      "data-pos",
    ],
    ...({ ALLOWED_STYLE_PROPS: styleProps } as unknown as Config),
    // Keep any whitespace/newlines the editor inserted; DOMPurify otherwise
    // collapses runs of whitespace by default.
    KEEP_CONTENT: true,
    // We don't want to wrap in <body> — the content is already a fragment
    // that gets dropped into a styled container.
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM: false,
  };
})();

type Purifier = ReturnType<typeof createDOMPurify>;

export function sanitizeWith(purifier: Purifier, html: string): string {
  if (!html) return "";
  return purifier.sanitize(html, DOCUMENT_SANITIZE_CONFIG) as string;
}

/**
 * Client-side sanitizer. Uses the real browser `window`. Safe to import
 * from any component that runs in the browser (DocumentSheet, etc.).
 */
export function sanitizeDocumentHtml(html: string): string {
  if (typeof window === "undefined") {
    // Calling this on the server from a client-only code path would
    // throw (no `window`). The server entry re-exports its own
    // `sanitizeDocumentHtml` for use in route handlers.
    throw new Error(
      "sanitizeDocumentHtml (client) invoked on the server; use document-sanitize.server.ts instead"
    );
  }
  return sanitizeWith(createDOMPurify(window), html);
}
