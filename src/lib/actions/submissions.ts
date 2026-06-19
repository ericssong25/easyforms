"use server";

import { createClient } from "@/lib/supabase/server";
import { createFreshSignedUrls } from "@/lib/storage/signed-url";

export type SubmissionStatusFilter = "draft" | "sent" | "opened" | "signed";

export type SubmissionRow = {
  id: string;
  status: SubmissionStatusFilter;
  created_at: string;
  signed_at: string | null;
  signed_pdf_url: string | null;
  signed_pdf_path: string | null;
  clients: { first_name: string; last_name: string; email: string };
  templates: { name: string };
  // Generated server-side so the row can be passed straight to the row
  // action component (which expects a ready-to-use href). Never persisted.
  fresh_signed_pdf_url: string | null;
};

export type SubmissionsQueryInput = {
  search?: string;
  // Empty = no constraint (all statuses). OR within.
  statuses?: SubmissionStatusFilter[];
  from: number;
  to: number;
};

export type SubmissionsQueryResult = {
  rows: SubmissionRow[];
  totalCount: number;
  hasMore: boolean;
  // Per-status counts over the CURRENT filtered set (not the whole table).
  // These drive the chips' count badges so the UI stays informative.
  statusCounts: Record<SubmissionStatusFilter, number>;
};

const VALID_STATUSES: SubmissionStatusFilter[] = [
  "draft",
  "sent",
  "opened",
  "signed",
];

function normalizeStatuses(v: unknown): SubmissionStatusFilter[] {
  if (!Array.isArray(v)) return [];
  const set = new Set<SubmissionStatusFilter>();
  for (const x of v) {
    if (
      typeof x === "string" &&
      (VALID_STATUSES as string[]).includes(x)
    ) {
      set.add(x as SubmissionStatusFilter);
    }
  }
  return Array.from(set);
}

export async function querySubmissionsAction(
  input: SubmissionsQueryInput
): Promise<SubmissionsQueryResult> {
  const empty: SubmissionsQueryResult = {
    rows: [],
    totalCount: 0,
    hasMore: false,
    statusCounts: { draft: 0, sent: 0, opened: 0, signed: 0 },
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const search = (input.search ?? "").trim();
  const statuses = normalizeStatuses(input.statuses);
  const from = Math.max(0, Math.floor(input.from) | 0);
  const to = Math.max(from, Math.floor(input.to) | 0);

  // Resolve matching client ids when a search term is present. The
  // submissions -> clients relation is many-to-one; RLS still applies.
  let clientIdFilter: string[] | null = null;
  if (search) {
    const term = `%${search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const { data: matchedClients, error: mcErr } = await supabase
      .from("clients")
      .select("id")
      .eq("agent_id", user.id)
      .or(`first_name.ilike.${term},last_name.ilike.${term}`);

    if (mcErr) {
      console.error("[querySubmissionsAction] client search failed:", mcErr);
      return empty;
    }
    clientIdFilter = (matchedClients ?? [])
      .map((c) => (c as { id: string }).id)
      .filter((x) => !!x);
    if (clientIdFilter.length === 0) {
      return empty;
    }
  }

  // Build the paginated main query. Always agent-scoped.
  let q = supabase
    .from("form_submissions")
    .select(
      `
      id,
      status,
      created_at,
      signed_at,
      signed_pdf_url,
      signed_pdf_path,
      clients!inner ( first_name, last_name, email ),
      templates!inner ( name )
    `,
      { count: "exact" }
    )
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (clientIdFilter) {
    q = q.in("client_id", clientIdFilter);
  }
  if (statuses.length > 0) {
    q = q.in("status", statuses);
  }

  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) {
    console.error("[querySubmissionsAction] main query failed:", error);
    return empty;
  }

  const baseRows = (data ?? []) as unknown as Omit<
    SubmissionRow,
    "fresh_signed_pdf_url"
  >[];

  // Mint a fresh signed URL for every row that has a stored path (or
  // legacy URL). The helper uses the service-role client and never
  // persists the result.
  const freshUrls = await createFreshSignedUrls(
    baseRows.map((r) => r.signed_pdf_path ?? r.signed_pdf_url)
  );

  const rows: SubmissionRow[] = baseRows.map((r, i) => ({
    ...r,
    fresh_signed_pdf_url: freshUrls[i] ?? null,
  }));

  const totalCount = count ?? rows.length;
  const hasMore = to + 1 < totalCount;

  // Status counts for the chip badges. Always computed over the FULL
  // filtered set (search + current statuses) so the chips stay
  // informative while typing. This means a second unconstrained query
  // keyed on the same filters; cheap because of the agent_id index.
  const statusCounts = await loadStatusCounts(
    supabase,
    user.id,
    clientIdFilter
  );

  return { rows, totalCount, hasMore, statusCounts };
}

async function loadStatusCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agentId: string,
  clientIdFilter: string[] | null
): Promise<Record<SubmissionStatusFilter, number>> {
  // Counts are computed over the FULL agent universe (optionally
  // narrowed by the active text search via client_id), but NEVER
  // narrowed by the active status filter — otherwise the chip badges
  // would collapse to "0" on every non-zero selection.

  const out: Record<SubmissionStatusFilter, number> = {
    draft: 0,
    sent: 0,
    opened: 0,
    signed: 0,
  };

  // Factory: builds a fresh query each time so concurrent awaiters
  // never share/alias the same builder.
  const buildCountQuery = (status: SubmissionStatusFilter) => {
    let q = supabase
      .from("form_submissions")
      .select("status", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .eq("status", status);
    if (clientIdFilter && clientIdFilter.length > 0) {
      q = q.in("client_id", clientIdFilter);
    }
    return q;
  };

  // Run four small count queries in parallel. Each call builds its own
  // query from scratch (via a factory) so there's zero chance of a
  // shared/aliased builder mutating under concurrent awaiters.
  const settled = await Promise.all(
    VALID_STATUSES.map(async (s) => {
      try {
        const { count, error } = await buildCountQuery(s);
        if (error) {
          console.error(
            "[querySubmissionsAction] status count failed:",
            error
          );
          return [s, 0] as const;
        }
        return [s, count ?? 0] as const;
      } catch (e) {
        console.error("[querySubmissionsAction] status count threw:", e);
        return [s, 0] as const;
      }
    })
  );
  for (const [s, c] of settled) {
    out[s] = c;
  }
  return out;
}

