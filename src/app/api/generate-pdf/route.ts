import { NextResponse } from "next/server";

async function getBrowser() {
  // On Netlify / serverless — use @sparticuz/chromium-min
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY) {
    const puppeteer = await import("puppeteer-core");
    const chromium = (await import("@sparticuz/chromium-min")).default;
    return await puppeteer.default.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local dev — use bundled Chromium
  const puppeteer = await import("puppeteer");
  return await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function POST(request: Request) {
  let browser;
  try {
    const { html, signature } = await request.json();

    if (!html) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2/dist/tailwind.min.css" rel="stylesheet">
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
  body {
    font-family: 'DM Sans', system-ui, sans-serif;
    color: #1a3a5c;
    background: #ffffff;
    margin: 0;
    padding: 40px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .prose { max-width: none; color: #1a3a5c; }
  .prose h1, .prose h2, .prose h3, .prose h4 { color: #1a3a5c; }
  .prose-sm { font-size: 0.875rem; }
  .prose ul { list-style-type: disc; padding-left: 1.625em; }
  .prose ol { list-style-type: decimal; padding-left: 1.625em; }
  .prose li { margin-top: 0.25em; margin-bottom: 0.25em; }
  .prose img { max-width: 100%; height: auto; }
  .leading-snug { line-height: 1.375; }
  * { box-sizing: border-box; }
  .signature-block { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  .signature-block img { max-width: 200px; height: auto; }
</style>
</head>
<body>
<div class="prose prose-sm max-w-none leading-snug">
${html}
</div>
${
  signature
    ? `<div class="signature-block">
<p style="font-weight: bold; font-size: 14px;">Signature:</p>
<img src="${signature}" alt="Signature" />
<p style="font-size: 12px; color: #64748b; margin-top: 10px;">
Signed on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
</p>
</div>`
    : ""
}
</body>
</html>`;

    browser = await getBrowser();

    const page = await browser.newPage();
    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });

    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
      printBackground: true,
      preferCSSPageSize: false,
    });

    const base64 = Buffer.from(pdf).toString("base64");
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
  } finally {
    if (browser) await browser.close();
  }
}
