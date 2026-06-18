// Server-only helper for generating fresh signed URLs for objects in the
// `signed_forms` bucket. Returns null on failure — never throws into a page.
//
// IMPORTANT: this module imports the service-role Supabase client. It must
// only be imported from server-side code (RSC, API routes, server actions).

import { getServiceRoleSupabase } from "@/lib/supabase/service";

const BUCKET = "signed_forms";

// 1 hour. Long enough for the user to click View / Download; short enough
// that a leaked link expires quickly.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function createFreshSignedUrl(
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;

  const supabase = getServiceRoleSupabase();
  if (!supabase) {
    console.error("[signed-url] service-role client unavailable");
    return null;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[signed-url] createSignedUrl failed:", error);
    return null;
  }

  return data.signedUrl;
}

// Convenience: generate a fresh URL for every path in a list, preserving
// the original index. Missing/empty paths map to null.
export async function createFreshSignedUrls(
  paths: (string | null | undefined)[]
): Promise<(string | null)[]> {
  return Promise.all(paths.map((p) => createFreshSignedUrl(p)));
}
