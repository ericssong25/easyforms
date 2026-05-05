let cachedIp: string | null = null;

async function getIp(): Promise<string> {
  if (cachedIp) return cachedIp as string;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    const raw = data.ip || "";
    cachedIp = cleanIp(raw);
    return cachedIp as string;
  } catch {
    return "unknown";
  }
}

function cleanIp(ip: string): string {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip === "localhost") {
    return "localhost";
  }
  // Prefer IPv4 if dual-stack
  if (ip.startsWith("::ffff:")) {
    return ip.replace("::ffff:", "");
  }
  return ip;
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
  ip_address: string;
  user_agent: string;
  device_type: string;
}

export function getTrackingMetadataClient(): TrackingMetadata {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return {
    ip_address: "loading", // populated after async fetch
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
