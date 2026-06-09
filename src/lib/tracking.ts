let cachedIp: string | null = null;

async function getIp(): Promise<string | null> {
  if (cachedIp !== null) return cachedIp;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    const raw = data.ip || "";
    cachedIp = cleanIp(raw);
    return cachedIp;
  } catch {
    return null;
  }
}

/**
 * Returns the IP as a string suitable for Postgres' `inet` type, or
 * `null` when the input is empty / unparseable / loopback. Callers MUST
 * pass `null` (not "localhost") to an `inet` column — Postgres rejects
 * "localhost" with `22P02 invalid input syntax for type inet`.
 */
function cleanIp(ip: string): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;
  // "localhost" is not a valid IP literal and is rejected by `inet`.
  if (trimmed.toLowerCase() === "localhost") return null;
  // Strip a dual-stack prefix so we get a plain IPv4 address.
  if (trimmed.startsWith("::ffff:")) {
    const v4 = trimmed.replace("::ffff:", "");
    return v4 || null;
  }
  return trimmed;
}

function parseBrowser(ua: string): string {
  if (!ua) return "unknown";
  const uaLower = ua.toLowerCase();
  const version = ua.match(/(?:chrome|firefox|safari|edge|opera|msie|trident)[\/\s](\d+)/i);
  const verStr = version ? ` ${version[1]}` : "";

  if (uaLower.includes("edg/")) return `Edge${verStr}`;
  if (uaLower.includes("firefox/")) return `Firefox${verStr}`;
  if (uaLower.includes("opr/") || uaLower.includes("opera/")) return `Opera${verStr}`;
  if (uaLower.includes("chrome/")) return `Chrome${verStr}`;
  if (uaLower.includes("safari/") && !uaLower.includes("chrome")) return `Safari${verStr}`;
  if (uaLower.includes("msie") || uaLower.includes("trident/")) return `IE${verStr}`;
  return "Other";
}

function parseDevice(ua: string): string {
  if (!ua) return "unknown";
  if (/Tablet|iPad/i.test(ua)) return "Tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "Mobile";
  return "Desktop";
}

export interface TrackingMetadata {
  // null when the IP could not be resolved (loopback, empty, parse
  // failure). Callers persist `null` directly into the `inet` column.
  ip_address: string | null;
  user_agent: string;
  device_type: string;
}

export function getTrackingMetadataClient(): TrackingMetadata {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return {
    ip_address: null, // populated after async fetch
    user_agent: parseBrowser(ua),
    device_type: parseDevice(ua),
  };
}

export async function getTrackingMetadata(): Promise<TrackingMetadata> {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const ip = await getIp();
  return {
    ip_address: ip,
    user_agent: parseBrowser(ua),
    device_type: parseDevice(ua),
  };
}

export function parseServerMetadata(
  userAgent: string | null,
  ipHeader: string | null,
  realIpHeader: string | null
): TrackingMetadata {
  const rawIp = ipHeader?.split(",")[0]?.trim() || realIpHeader || "";
  return {
    ip_address: cleanIp(rawIp),
    user_agent: parseBrowser(userAgent || ""),
    device_type: parseDevice(userAgent || ""),
  };
}
