import { NextResponse } from "next/server";
import { getServiceRoleSupabase } from "@/lib/supabase/service";
import { parseServerMetadata } from "@/lib/tracking";

export const runtime = "nodejs";

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Event types the public signer is allowed to log. Anything else is
// rejected so the endpoint can't be used as a generic tracking sink.
const ALLOWED_EVENT_TYPES = new Set([
  "verification_failed",
  "verified",
  "opened",
  "viewed",
]);

/**
 * Insert a tracking_events row server-side using a service-role client.
 *
 * The /api/track-event endpoint is called by the public signing page,
 * which runs in an UNAUTHENTICATED browser context (no Supabase
 * session). The service-role client bypasses RLS so anon callers do not
 * need a session; the route never reads cookies or auth.uid().
 *
 * If the service-role env vars are not set, we return a 500 with a real
 * message and a boolean (NEVER the value) of whether the key was
 * present, so the cause is easy to diagnose without leaking the secret.
 */
export async function POST(request: Request) {
  try {
    // Defensive body parsing. request.json() throws on non-JSON, which
    // previously surfaced as Next's HTML 500 page.
    let body: { submissionId?: string; eventType?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch (parseErr) {
      console.error("[track-event] invalid JSON body:", parseErr);
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { submissionId, eventType } = body;

    // Validate the payload BEFORE touching the DB. Both fields are
    // required and constrained; unknown event types are rejected.
    if (!submissionId || !UUID_LIKE.test(submissionId)) {
      return NextResponse.json(
        { error: "submissionId (UUID) is required" },
        { status: 400 }
      );
    }
    if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
      return NextResponse.json(
        {
          error:
            "eventType is required and must be one of: " +
            Array.from(ALLOWED_EVENT_TYPES).join(", "),
        },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleSupabase();
    if (!supabase) {
      const hasServiceKey = Boolean(
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
          process.env.SUPABASE_SERVICE_ROLE_KEY.length > 0
      );
      console.error(
        "[track-event] SUPABASE_SERVICE_ROLE_KEY set:",
        hasServiceKey
      );
      return NextResponse.json(
        { error: "Server is not configured" },
        { status: 500 }
      );
    }

    // Real IP/UA come from the request, not the client. Do NOT trust
    // anything the browser says about itself. ip_address may be null
    // (loopback / unparseable) — Postgres `inet` accepts NULL.
    const meta = parseServerMetadata(
      request.headers.get("user-agent"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    );

    const { error } = await supabase.from("tracking_events").insert({
      submission_id: submissionId,
      event_type: eventType,
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
      device_type: meta.device_type,
    });

    if (error) {
      console.error("[track-event] insert failed:", error);
      // Surface the real Postgres error message in the response so the
      // client (and tests) can react. The route is internal; it does
      // not echo user input.
      return NextResponse.json(
        {
          error: error.message || "Failed to record event",
          code: error.code ?? null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track-event] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

