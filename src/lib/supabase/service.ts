// Server-side Supabase factory using the service-role key. Bypasses RLS.
//
// USE ONLY FROM SERVER-SIDE CODE (API routes, server actions, RSC).
// Never import this from a client component or anything that ends up in
// the browser bundle. The service-role key grants full DB access; leaking
// it would compromise the entire project.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getServiceRoleSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "[supabase-service] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
    return null;
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
