import { NextResponse } from "next/server";
import {
  PAGE_PX,
  MARGINS_IN,
  CONTENT_WIDTH,
  SIGNATURE_ZONE_PX,
} from "@/lib/document-format";
import { documentCssWithFonts } from "@/lib/document-styles";
import { hasLogo, normalizeLogo } from "@/lib/document-logo";
import { getDmSansWoff2Base64 } from "@/lib/document-fonts.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Parse the body defensively. request.json() throws on non-JSON,
    // which previously surfaced as Next's HTML 500 page.
    let body: { html?: string; signature?: string; logo?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch (parseErr) {
      console.error("[generate-pdf] invalid JSON body:", parseErr);
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const { html, signature } = body;
    const logo = normalizeLogo(body.logo);

    if (!html) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    const dmSansBase64 = await getDmSansWoff2Base64();
    const css = documentCssWithFonts(dmSansBase64 ?? undefined);

    const logoHtml = hasLogo(logo)
      ? `<div class="ef-logo" data-pos="${logo.position}" style="--ef-logo-w:${logo.size}px; --ef-logo-max-w:${Math.min(logo.size, 240)}px;">
           <img src="${logo.dataUrl}" alt="Document logo" />
         </div>`
      : "";

    // Note: the page container is given a fixed pixel height and
    // `overflow: hidden`. This is intentional: even if the agent ignored the
    // in-editor overflow warning, the PDF generator must still produce
    // exactly one Letter-sized page. Content that doesn't fit is clipped.
    //
    // IMPORTANT: every CSS rule in document-styles.ts is scoped under
    // .ef-document. The HTML therefore needs a `<div class="ef-document">`
    // wrapper INSIDE .ef-page so that .ef-logo / .ef-document-content /
    // .ef-signature-zone / h1 / h2 / p all match their styles. The
    // .ef-document wrapper also acts as the position:relative ancestor
    // for the absolutely-positioned logo (otherwise it would size itself
    // to the viewport and overflow the sheet).
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page { size: Letter; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Page container = exactly one Letter sheet, no scrollbars, no second page. */
  .ef-page {
    position: relative;
    width: ${PAGE_PX.width}px;
    height: ${PAGE_PX.height}px;
    overflow: hidden;
    box-sizing: border-box;
    background: #ffffff;
  }
  /* .ef-document fills .ef-page. position:relative is REQUIRED so the
     .ef-logo (position:absolute) anchors to the sheet, not the viewport. */
  .ef-page > .ef-document {
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
    /* Page-level margin in CSS inches (matches the editor). */
    padding: ${MARGINS_IN.top}in ${MARGINS_IN.right}in ${MARGINS_IN.bottom}in ${MARGINS_IN.left}in;
  }
  .ef-document-content {
    position: relative;
    z-index: 1;
    width: ${CONTENT_WIDTH}px;
  }
  ${css}
</style>
</head>
<body>
<div class="ef-page">
  <div class="ef-document">
    ${logoHtml}
    <div class="ef-document-content">${html}</div>
    <div class="ef-signature-zone" style="height:${SIGNATURE_ZONE_PX}px;">
      ${
        signature
          ? `<img class="ef-signature-img" src="${signature}" alt="Signature" />
             <div class="ef-signature-label">Signature</div>
             <div class="ef-signature-meta">Signed on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>`
          : `<div class="ef-signature-label">— Signature —</div>`
      }
    </div>
  </div>
</div>
</body>
</html>`;

    const token = process.env.BROWSERLESS_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "BROWSERLESS_TOKEN environment variable is not set. Get one at https://browserless.io",
        },
        { status: 500 }
      );
    }

    const browserlessUrl =
      process.env.BROWSERLESS_URL ?? "https://chrome.browserless.io/pdf";

    const browserlessRes = await fetch(`${browserlessUrl}?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html: fullHtml,
        options: {
          format: "Letter",
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
    });

    if (!browserlessRes.ok) {
      const errText = await browserlessRes.text();
      console.error("Browserless error:", browserlessRes.status, errText);
      return NextResponse.json(
        { error: `Browserless returned ${browserlessRes.status}` },
        { status: 500 }
      );
    }

    const pdfBuffer = Buffer.from(await browserlessRes.arrayBuffer());
    const base64 = pdfBuffer.toString("base64");

    return NextResponse.json({ pdf: base64 });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate PDF",
      },
      { status: 500 }
    );
  }
}
