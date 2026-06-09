// Document typography & base layout. Single source of truth, consumed by the
// editor, the previews, and the PDF. Low-specificity rules so that TipTap
// inline styles (FontSize, LineHeight, text-align, font-family) can override.
//
// Page geometry (sizes, margins, signature zone) is defined in
// `./document-format.ts` and re-imported here as CSS custom properties.

import {
  PAGE_PX,
  MARGINS,
  CONTENT_WIDTH,
  EDITABLE_HEIGHT,
  SIGNATURE_ZONE_PX,
  DEFAULT_DOCUMENT_FONT,
} from "./document-format";

// All rules are scoped under .ef-document so they never leak into the rest
// of the editor UI (toolbar, panels, etc.).
//
// Two flavours are exported:
//  - DOCUMENT_CSS  : no font payload; use in the editor and in previews
//                    (the browser already has DM Sans via next/font).
//  - documentCssWithFonts(dmSansBase64): injects a base64 woff2 @font-face
//                    for DM Sans; use in the PDF where there is no network
//                    and no next/font.

const CSS_VARS = `:root {
  --ef-page-w: ${PAGE_PX.width}px;
  --ef-page-h: ${PAGE_PX.height}px;
  --ef-margin-top: ${MARGINS.top}px;
  --ef-margin-right: ${MARGINS.right}px;
  --ef-margin-bottom: ${MARGINS.bottom}px;
  --ef-margin-left: ${MARGINS.left}px;
  --ef-content-w: ${CONTENT_WIDTH}px;
  --ef-editable-h: ${EDITABLE_HEIGHT}px;
  --ef-sig-zone-h: ${SIGNATURE_ZONE_PX}px;
  --ef-doc-font: ${DEFAULT_DOCUMENT_FONT};
}`;

const RULES = `.ef-document {
  font-family: var(--ef-doc-font);
  color: #0f172a;
  font-size: 12pt;
  line-height: 1.5;
  text-align: left;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  box-sizing: border-box;
}
.ef-document *,
.ef-document *::before,
.ef-document *::after { box-sizing: border-box; }

.ef-document h1,
.ef-document h2,
.ef-document h3 {
  font-family: var(--ef-doc-font);
  color: #0f172a;
  line-height: 1.2;
  margin: 0.6em 0 0.35em;
  font-weight: 700;
}
.ef-document h1 { font-size: 22pt; font-weight: 700; margin-top: 0; }
.ef-document h2 { font-size: 16pt; font-weight: 700; }
.ef-document h3 { font-size: 13pt; font-weight: 600; }

.ef-document p {
  margin: 0 0 0.6em;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}
.ef-document p:last-child { margin-bottom: 0; }

.ef-document ul,
.ef-document ol {
  margin: 0 0 0.6em;
  padding-left: 1.6em;
}
.ef-document li { margin: 0.15em 0; }
.ef-document li > p { margin: 0; }

.ef-document strong { font-weight: 700; }
.ef-document em     { font-style: italic; }
.ef-document u      { text-decoration: underline; }
.ef-document s      { text-decoration: line-through; }

.ef-document a {
  color: #1d4ed8;
  text-decoration: underline;
}

.ef-document img {
  max-width: 100%;
  height: auto;
  display: block;
}

.ef-document blockquote {
  margin: 0 0 0.6em;
  padding-left: 0.9em;
  border-left: 2px solid #cbd5e1;
  color: #334155;
  font-style: italic;
}

.ef-document hr {
  border: 0;
  border-top: 1px solid #cbd5e1;
  margin: 1em 0;
}

.ef-document code {
  font-family: "Courier New", Courier, monospace;
  font-size: 0.92em;
  background: #f1f5f9;
  padding: 0.05em 0.3em;
  border-radius: 3px;
}

/* The "behind the text" logo. Positioned absolutely inside the sheet, sits
   below the text in z-order (text always paints on top). The logo does not
   alter text flow. */
.ef-document .ef-logo {
  position: absolute;
  top: 24px;
  z-index: 0;
  pointer-events: none;
}
.ef-document .ef-logo[data-pos="left"]  { left: 24px; }
.ef-document .ef-document-content      { position: relative; z-index: 1; }
.ef-document .ef-logo[data-pos="right"] { right: 24px; }
.ef-document .ef-logo img {
  display: block;
  width: var(--ef-logo-w, 96px);
  height: auto;
  max-width: var(--ef-logo-max-w, 240px);
  opacity: var(--ef-logo-opacity, 1);
}

/* Reserved signature zone (used in editor preview and PDF). */
.ef-document .ef-signature-zone {
  height: var(--ef-sig-zone-h);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #cbd5e1;
  margin-top: 8px;
  text-align: center;
  color: #475569;
  font-size: 10pt;
}
.ef-document .ef-signature-zone .ef-signature-img {
  max-height: 64px;
  max-width: 220px;
  object-fit: contain;
  margin-bottom: 4px;
}
.ef-document .ef-signature-zone .ef-signature-label {
  font-weight: 600;
  color: #1e293b;
}
.ef-document .ef-signature-zone .ef-signature-meta {
  font-size: 9pt;
  color: #64748b;
  margin-top: 2px;
}`;

export const DOCUMENT_CSS = `${CSS_VARS}\n${RULES}`;

export function documentCssWithFonts(dmSansWoff2Base64?: string): string {
  if (!dmSansWoff2Base64) return DOCUMENT_CSS;
  const face = `@font-face {
  font-family: "DM Sans";
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(data:font/woff2;base64,${dmSansWoff2Base64}) format("woff2");
}`;
  return `${CSS_VARS}\n${face}\n${RULES}`;
}
