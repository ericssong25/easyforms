// Server-side font loader for the PDF route. Fetches the DM Sans woff2 from
// Google's CDN once, caches it in memory, and exposes a base64 string we can
// inline into the PDF's <style> block. The browser-side editor already has
// DM Sans via next/font/google, so the on-screen editor does not need this.

const WOFF2_URL =
  "https://fonts.gstatic.com/s/dmsans/v15/rP2Yp2ywxgERUObC8I0R1Ubf6XEdpg.woff2";

let cachedBase64: string | null = null;
let inflight: Promise<string | null> | null = null;

export async function getDmSansWoff2Base64(): Promise<string | null> {
  if (cachedBase64) return cachedBase64;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(WOFF2_URL);
      if (!res.ok) {
        console.warn(`[fonts] failed to fetch DM Sans woff2: ${res.status}`);
        return null;
      }
      const ab = await res.arrayBuffer();
      cachedBase64 = Buffer.from(ab).toString("base64");
      return cachedBase64;
    } catch (err) {
      console.warn("[fonts] DM Sans fetch error:", err);
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
