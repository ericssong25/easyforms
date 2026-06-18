"use server";

import { createClient } from "@/lib/supabase/server";

export type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  policy_id: string | null;
  policies: {
    carrier: string;
    plan: string | null;
    policy_number: string;
  } | null;
};

export type ClientsQueryInput = {
  search?: string;
  carriers?: string[];
  states?: string[];
  // ["with","without"] or just one of them. Empty array = no constraint.
  hasPolicy?: ("with" | "without")[];
  from: number;
  to: number;
};

export type ClientsQueryResult = {
  rows: ClientRow[];
  totalCount: number;
  hasMore: boolean;
  facets: {
    carriers: string[];
    states: string[];
  };
};

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0);
}

function normalizeHasPolicy(v: unknown): ("with" | "without")[] {
  if (!Array.isArray(v)) return [];
  const out: ("with" | "without")[] = [];
  for (const x of v) {
    if (x === "with" || x === "without") out.push(x);
  }
  return out;
}

export async function queryClientsAction(
  input: ClientsQueryInput
): Promise<ClientsQueryResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { rows: [], totalCount: 0, hasMore: false, facets: { carriers: [], states: [] } };
  }

  const search = (input.search ?? "").trim();
  const carriers = normalizeStringArray(input.carriers);
  const states = normalizeStringArray(input.states);
  const hasPolicy = normalizeHasPolicy(input.hasPolicy);
  const from = Math.max(0, Math.floor(input.from) | 0);
  const to = Math.max(from, Math.floor(input.to) | 0);

  // Always start with agent scope.
  let q = supabase
    .from("clients")
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      phone,
      city,
      state,
      created_at,
      policy_id,
      policies ( carrier, plan, policy_number )
    `,
      { count: "exact" }
    )
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  // Search: case-insensitive substring on first_name OR last_name. The
  // brief scopes to the client name. We use ilike on each column with the
  // term wrapped in %...%.
  if (search) {
    const term = `%${search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    // Supabase JS does not have a clean OR on the same column set without
    // raw filter — use or() with two ilike predicates.
    q = q.or(`first_name.ilike.${term},last_name.ilike.${term}`);
  }

  // State filter: AND across filters, OR within. `in` is OR semantics.
  if (states.length > 0) {
    q = q.in("state", states);
  }

  // Has-policy: AND across filters, OR within the two values. If both are
  // selected it means "no constraint", so skip the filter. If only one is
  // selected, apply the corresponding predicate.
  if (hasPolicy.length === 1) {
    if (hasPolicy[0] === "with") {
      q = q.not("policy_id", "is", null);
    } else {
      q = q.is("policy_id", null);
    }
  }

  // Carrier filter: carrier lives on the joined `policies` row. Supabase
  // lets us filter on related-table columns through the FK with `!inner`
  // to require the relation, but we want clients WITH OR WITHOUT a policy
  // when only that filter is on. The cleanest, RLS-safe approach is:
  // fetch the candidate client ids whose joined policy has one of the
  // requested carriers, then constrain the main query by id IN (...).
  if (carriers.length > 0) {
    const { data: carrierClients, error: ccErr } = await supabase
      .from("policies")
      .select("id, clients!inner(id, agent_id)")
      .eq("agent_id", user.id)
      .in("carrier", carriers);

    if (ccErr) {
      console.error("[queryClientsAction] carrier filter failed:", ccErr);
      return {
        rows: [],
        totalCount: 0,
        hasMore: false,
        facets: { carriers: [], states: [] },
      };
    }

    const ids = Array.from(
      new Set(
        (carrierClients ?? [])
          .map((p) => {
            const c = (p as { clients: { id: string } | { id: string }[] | null })
              .clients;
            if (!c) return null;
            return Array.isArray(c) ? c[0]?.id ?? null : c.id;
          })
          .filter((x): x is string => !!x)
      )
    );

    if (ids.length === 0) {
      // No clients match the carrier filter — return an empty page with
      // an accurate count. We still need facets for the filter bar UI.
      const facets = await loadFacets(supabase, user.id);
      return { rows: [], totalCount: 0, hasMore: false, facets };
    }

    q = q.in("id", ids);
  }

  // Pagination. `.range(from, to)` is inclusive on both ends in Supabase JS.
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) {
    console.error("[queryClientsAction] main query failed:", error);
    return {
      rows: [],
      totalCount: 0,
      hasMore: false,
      facets: { carriers: [], states: [] },
    };
  }

  const rows = (data ?? []) as unknown as ClientRow[];
  const totalCount = count ?? rows.length;
  const hasMore = to + 1 < totalCount;

  const facets = await loadFacets(supabase, user.id);

  return { rows, totalCount, hasMore, facets };
}

export type ClientsFacets = {
  carriers: string[];
  states: string[];
};

async function loadFacets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agentId: string
): Promise<ClientsFacets> {
  // Carriers from policies owned by the agent.
  const [{ data: carrierRows }, { data: stateRows }] = await Promise.all([
    supabase
      .from("policies")
      .select("carrier")
      .eq("agent_id", agentId),
    supabase
      .from("clients")
      .select("state")
      .eq("agent_id", agentId)
      .not("state", "is", null),
  ]);

  const carriers = Array.from(
    new Set(
      (carrierRows ?? [])
        .map((r) => (r as { carrier: string | null }).carrier)
        .filter((c): c is string => !!c && c.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  const states = Array.from(
    new Set(
      (stateRows ?? [])
        .map((r) => (r as { state: string | null }).state)
        .filter((s): s is string => !!s && s.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  return { carriers, states };
}
