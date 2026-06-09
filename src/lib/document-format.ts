// Single source of truth for document geometry.
// The editor, both previews, and the PDF all derive from these constants.
// Changing page size, margins, or signature zone = edit ONLY this file.

export const PAGE_SIZE = "Letter" as const;

export const PAGE_PX = {
  width: 816,   // 8.5in  @ 96dpi
  height: 1056, // 11in   @ 96dpi
} as const;

export const PAGE_IN = {
  width: 8.5,
  height: 11,
} as const;

export const MARGINS = {
  top: 96,     // 1in
  right: 96,   // 1in
  bottom: 96,  // 1in
  left: 96,    // 1in
} as const;

export const MARGINS_IN = {
  top: 1,
  right: 1,
  bottom: 1,
  left: 1,
} as const;

// Width available for text and inline content inside the margins.
export const CONTENT_WIDTH = PAGE_PX.width - MARGINS.left - MARGINS.right; // 624px

// Reserved bottom zone where the signature is drawn (centered, on-page).
// The editable area must end above this.
export const SIGNATURE_ZONE_PX = 120;

// Maximum height available to the editable body content.
export const EDITABLE_HEIGHT =
  PAGE_PX.height - MARGINS.top - MARGINS.bottom - SIGNATURE_ZONE_PX; // 744px

// Default document font (web-safe, legal/formal look).
export const DEFAULT_DOCUMENT_FONT = '"Times New Roman", Times, serif';
