"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  PAGE_PX,
  MARGINS,
  CONTENT_WIDTH,
  SIGNATURE_ZONE_PX,
} from "@/lib/document-format";
import { DOCUMENT_CSS, documentCssWithFonts } from "@/lib/document-styles";
import { hasLogo, type TemplateLogo } from "@/lib/document-logo";

interface DocumentSheetProps {
  html: string;
  logo?: TemplateLogo | null;
  /** When true, render the reserved signature zone at the bottom of the sheet. */
  showSignatureZone?: boolean;
  /** Signature image (dataURL) to paint inside the reserved zone. */
  signatureDataUrl?: string | null;
  /** Label rendered above the signature image. */
  signatureLabel?: string;
  /** Optional small line under the signature. */
  signatureMeta?: string;
  /** Optional max width override (defaults to PAGE_PX.width). */
  maxWidth?: number;
  className?: string;
  /** Pass a base64 woff2 for DM Sans to embed inside the scoped <style>. */
  dmSansWoff2Base64?: string;
  /** Render at zoom (e.g. 0.6 for previews). */
  zoom?: number;
  /**
   * When true (default), the sheet is scaled with `transform: scale()` to
   * fit the available width of its parent (no horizontal scrollbar inside
   * the card). The logical PAGE_PX size is preserved — the geometry in
   * document-format.ts is never changed; this is purely a CSS transform.
   */
  fitToContainer?: boolean;
}

export function DocumentSheet({
  html,
  logo,
  showSignatureZone = false,
  signatureDataUrl,
  signatureLabel = "Signature",
  signatureMeta,
  maxWidth,
  className,
  dmSansWoff2Base64,
  zoom = 1,
  fitToContainer = true,
}: DocumentSheetProps) {
  const safeLogo = logo ?? null;
  const css = dmSansWoff2Base64
    ? documentCssWithFonts(dmSansWoff2Base64)
    : DOCUMENT_CSS;

  const pageWidth = maxWidth ?? PAGE_PX.width;
  const pageHeight = PAGE_PX.height;

  // ---- Zoom-to-fit measurement ----
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [autoScale, setAutoScale] = useState(1);

  useEffect(() => {
    if (!fitToContainer) return;
    const el = wrapperRef.current;
    if (!el) return;
    const compute = () => {
      // Available width = the wrapper's content box. We use clientWidth
      // (excludes padding). A small safety margin keeps the sheet from
      // touching the card edge on some browsers.
      const available = el.clientWidth;
      if (!available) {
        setAutoScale(1);
        return;
      }
      const next = Math.min(1, available / pageWidth);
      setAutoScale(next);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitToContainer, pageWidth]);

  // Effective scale: explicit `zoom` prop multiplies the auto-fit scale.
  const finalScale = fitToContainer ? autoScale * zoom : zoom;
  const scaledHeight = pageHeight * finalScale;

  return (
    <div
      ref={wrapperRef}
      className={cn("relative w-full", className)}
      style={{
        // The wrapper occupies exactly the scaled size so siblings and
        // scroll containers see the post-transform dimensions and don't
        // add an extra horizontal scrollbar.
        height: scaledHeight || undefined,
        minHeight: scaledHeight || undefined,
      }}
    >
      <div
        className="ef-document absolute left-1/2 top-0 origin-top bg-white shadow-[0_2px_12px_rgba(15,23,42,0.12)]"
        style={{
          width: pageWidth,
          minHeight: pageHeight,
          paddingTop: MARGINS.top,
          paddingRight: MARGINS.right,
          paddingBottom: MARGINS.bottom,
          paddingLeft: MARGINS.left,
          transform:
            finalScale !== 1 ? `translateX(-50%) scale(${finalScale})` : undefined,
        }}
      >
        <style
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: css }}
        />

        {hasLogo(safeLogo) && (
          <div
            className="ef-logo"
            data-pos={safeLogo!.position}
            style={
              {
                "--ef-logo-w": `${safeLogo!.size}px`,
                "--ef-logo-max-w": `${Math.min(safeLogo!.size, 240)}px`,
              } as React.CSSProperties
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={safeLogo!.dataUrl!} alt="Document logo" />
          </div>
        )}

        <div
          className="ef-document-content relative"
          style={{
            width: CONTENT_WIDTH,
            minHeight: 100,
            zIndex: 1,
          }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {showSignatureZone && (
          <div
            className="ef-signature-zone"
            style={{
              marginTop: 8,
              height: SIGNATURE_ZONE_PX,
            }}
          >
            {signatureDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureDataUrl}
                alt="Signature"
                className="ef-signature-img"
              />
            ) : null}
            {signatureDataUrl && (
              <div className="ef-signature-label">{signatureLabel}</div>
            )}
            {signatureMeta && (
              <div className="ef-signature-meta">{signatureMeta}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
