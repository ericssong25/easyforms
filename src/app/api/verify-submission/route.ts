import { NextResponse } from "next/server";
import { getServiceRoleSupabase } from "@/lib/supabase/service";
import { parseServerMetadata } from "@/lib/tracking";
import { substituteTemplateVars } from "@/lib/document-substitution";

export const runtime = "nodejs";

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RateLimitEntry {
  fails: number;
  firstFailAt: number; // ms epoch
  lockedUntil: number; // ms epoch
}

// In-memory per-submissionId rate limit. Each entry tracks the count of
// failed attempts and a lockout expiry. NOTE: this map is process-local
// and will be cleared on server restart. A durable store (KV / Redis /
// a tracking_events rollup) is recommended for production.
const RATE: Map<string, RateLimitEntry> = (globalThis as {
  __efRate?: Map<string, RateLimitEntry>;
}).__efRate ?? new Map();
(globalThis as { __efRate?: Map<string, RateLimitEntry> }).__efRate = RATE;

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_FAILS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function noteFailure(submissionId: string): {
  lockedOut: boolean;
  fails: number;
  lockedUntil: number;
} {
  const now = Date.now();
  const entry = RATE.get(submissionId) ?? {
    fails: 0,
    firstFailAt: now,
    lockedUntil: 0,
  };

  // Reset fail count if the window expired.
  if (now - entry.firstFailAt > WINDOW_MS && entry.lockedUntil < now) {
    entry.fails = 0;
    entry.firstFailAt = now;
  }

  // Currently locked out?
  if (entry.lockedUntil > now) {
    RATE.set(submissionId, entry);
    return { lockedOut: true, fails: entry.fails, lockedUntil: entry.lockedUntil };
  }

  entry.fails += 1;
  if (entry.fails >= MAX_FAILS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  RATE.set(submissionId, entry);
  return {
    lockedOut: entry.lockedUntil > now,
    fails: entry.fails,
    lockedUntil: entry.lockedUntil,
  };
}

function noteSuccess(submissionId: string) {
  RATE.delete(submissionId);
}

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      submissionId?: string;
      ssnLast4?: string;
      phoneLast4?: string;
      lastName?: string;
    };
    const { submissionId, ssnLast4, phoneLast4, lastName } = body;

    if (!submissionId || !UUID_LIKE.test(submissionId)) {
      return NextResponse.json(
        { ok: false, error: "submissionId (UUID) is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleSupabase();
    if (!supabase) {
      // Log a boolean (NEVER the value) so we can confirm at runtime
      // whether the service-role env is set, without leaking it.
      const hasServiceKey = Boolean(
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
          process.env.SUPABASE_SERVICE_ROLE_KEY.length > 0
      );
      console.error(
        "[verify-submission] SUPABASE_SERVICE_ROLE_KEY set:",
        hasServiceKey
      );
      return NextResponse.json(
        { ok: false, error: "Server is not configured" },
        { status: 500 }
      );
    }

    // Rate limit check.
    const now = Date.now();
    const entry = RATE.get(submissionId);
    if (entry && entry.lockedUntil > now) {
      const retryAfterSec = Math.ceil((entry.lockedUntil - now) / 1000);
      return NextResponse.json(
        {
          ok: false,
          lockedOut: true,
          error: "Too many attempts. Please try again later.",
          retryAfterSec,
        },
        { status: 429 }
      );
    }

    // Load ONLY what's needed to verify: verification_data + status +
    // template content/logo + the agent's display name.
    const { data: row, error: fetchErr } = await supabase
      .from("form_submissions")
      .select(
        `
        id,
        status,
        verification_data,
        agents!form_submissions_agent_id_fkey(agency_name, full_name),
        templates!inner(name, content, logo)
        `
      )
      .eq("id", submissionId)
      .single();

    if (fetchErr || !row) {
      // Treat "not found" the same as "wrong credentials" to avoid
      // leaking whether a submissionId exists.
      return NextResponse.json(
        { ok: false, error: "The information provided does not match our records." },
        { status: 200 }
      );
    }

    const verification = (row.verification_data || {}) as {
      ssn_last4?: string;
      phone_last4?: string;
      last_name?: string;
    };

    // Normalize before comparing:
    //   - last_name: trim + lowercase (the stored value is lowercase)
    //   - ssn_last4 / phone_last4: trim, then keep digits only
    const expectedSsn = (verification.ssn_last4 || "").trim().replace(/\D/g, "");
    const expectedPhone = (verification.phone_last4 || "").trim().replace(/\D/g, "");
    const expectedLast = (verification.last_name || "")
      .trim()
      .toLowerCase();

    const inputSsn = (ssnLast4 || "").trim().replace(/\D/g, "").slice(0, 4);
    const inputPhone = (phoneLast4 || "").trim().replace(/\D/g, "").slice(0, 4);
    const inputLast = (lastName || "").trim().toLowerCase();

    const ssnOk = inputSsn.length > 0 && safeEq(inputSsn, expectedSsn);
    const phoneOk =
      expectedPhone === ""
        ? true
        : inputPhone.length > 0 && safeEq(inputPhone, expectedPhone);
    const lastOk = inputLast.length > 0 && safeEq(inputLast, expectedLast);

    const meta = parseServerMetadata(
      request.headers.get("user-agent"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    );

    if (!ssnOk || !phoneOk || !lastOk) {
      const rl = noteFailure(submissionId);

      // Log the failed attempt server-side. Do not tell the client which
      // field was wrong.
      await supabase.from("tracking_events").insert({
        submission_id: submissionId,
        event_type: "verification_failed",
        ip_address: meta.ip_address,
        user_agent: meta.user_agent,
        device_type: meta.device_type,
      });

      if (rl.lockedOut) {
        return NextResponse.json(
          {
            ok: false,
            lockedOut: true,
            error: "Too many attempts. Please try again later.",
            retryAfterSec: Math.ceil(rl.lockedUntil / 1000) - Math.floor(now / 1000),
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { ok: false, error: "The information provided does not match our records." },
        { status: 200 }
      );
    }

    // SUCCESS. Now load the FULL submission (client/policy/dependents)
    // and render the document server-side.
    const { data: full, error: fullErr } = await supabase
      .from("form_submissions")
      .select(
        `
        id,
        status,
        clients!inner(
          *,
          policies!clients_policy_id_fkey(*),
          dependents(*)
        ),
        agents!form_submissions_agent_id_fkey(*),
        templates!inner(name, content, logo)
        `
      )
      .eq("id", submissionId)
      .single();

    if (fullErr || !full) {
      console.error("[verify-submission] full fetch failed:", fullErr);
      return NextResponse.json(
        { ok: false, error: "Unable to load document" },
        { status: 500 }
      );
    }

    const submission = full as unknown as {
      id: string;
      status: string;
      clients: Record<string, unknown> & {
        policies: Record<string, unknown> | null;
        dependents: Record<string, unknown>[];
      };
      agents: Record<string, unknown>;
      templates: { name: string; content: string; logo: unknown };
    };

    const renderedHtml = substituteTemplateVars({
      templateContent: submission.templates.content,
      client: submission.clients,
      policy: submission.clients?.policies ?? null,
      dependents: submission.clients?.dependents ?? [],
      agent: submission.agents,
    });

    // Log verified + opened. Update status (sent -> opened) atomically.
    await supabase.from("tracking_events").insert({
      submission_id: submissionId,
      event_type: "verified",
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
      device_type: meta.device_type,
    });
    if (submission.status === "sent") {
      await supabase
        .from("form_submissions")
        .update({ status: "opened" })
        .eq("id", submissionId);
      await supabase.from("tracking_events").insert({
        submission_id: submissionId,
        event_type: "opened",
        ip_address: meta.ip_address,
        user_agent: meta.user_agent,
        device_type: meta.device_type,
      });
    }

    noteSuccess(submissionId);

    // Return ONLY what the client needs to render the document preview:
    //   - the already-rendered HTML (variables substituted)
    //   - the template name (for the page title)
    //   - the logo jsonb (for the behind-the-text logo)
    //   - the status so the UI can switch to "already signed" if needed
    // NO raw PII fields are returned.
    return NextResponse.json({
      ok: true,
      status: submission.status === "sent" ? "opened" : submission.status,
      template: {
        name: submission.templates.name,
        logo: submission.templates.logo ?? null,
        html: renderedHtml,
      },
    });
  } catch (err) {
    console.error("[verify-submission] error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
