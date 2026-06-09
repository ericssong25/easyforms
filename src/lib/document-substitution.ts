// Pure variable substitution for template content. Used by:
//   - server: src/app/api/verify-submission/route.ts (renders the full
//     document after successful identity verification)
//   - client: src/app/forms/[id]/preview-sign-client.tsx (preview only;
//     after Fix 4 the client should not run this against PII — server
//     renders and returns the final HTML, but we keep the helper available
//     for the rare case the document HTML needs to be re-rendered on the
//     client for any reason).
//
// The function is pure: same inputs → same output. It does NOT touch the
// network or any DB.

export interface SubstitutionInput {
  templateContent: string;
  client: Record<string, unknown> | null;
  policy: Record<string, unknown> | null;
  dependents: Record<string, unknown>[];
  agent: Record<string, unknown> | null;
  /** Optional override for the "today" variable. ISO string or anything
   *  that Date can parse. Defaults to the current date. */
  todayIso?: string;
}

export function substituteTemplateVars(input: SubstitutionInput): string {
  let html = String(input.templateContent || "");

  const client = input.client || {};
  const policy = input.policy;
  const dependents = input.dependents || [];
  const agent = input.agent || {};

  const clientApplies = Boolean(client.applies_to_policy);
  const coveredDependents = dependents.filter((d) =>
    Boolean(d.applies_to_policy)
  ).length;
  const coverageCount = (clientApplies ? 1 : 0) + coveredDependents;

  const today = input.todayIso
    ? new Date(input.todayIso).toLocaleDateString("en-US")
    : new Date().toLocaleDateString("en-US");

  const vars: Record<string, string> = {
    first_name: String(client.first_name || ""),
    last_name: String(client.last_name || ""),
    email: String(client.email || ""),
    phone: String(client.phone || ""),
    address: String(client.address || ""),
    city: String(client.city || ""),
    state: String(client.state || ""),
    zip: String(client.zip || ""),
    date_of_birth: String(client.date_of_birth || ""),
    subscriber_number: String(client.subscriber_number || ""),
    tax_filing_status: String(client.tax_filing_status || ""),
    marital_status: String(client.marital_status || ""),
    projected_annual_income: client.holder_income
      ? `$${Number(client.holder_income).toLocaleString("en-US")}`
      : "",
    tax_dependents_count:
      client.tax_dependents_count != null
        ? String(client.tax_dependents_count)
        : "",
    coverage_count: String(coverageCount),
    policy_number: String(policy?.policy_number || "N/A"),
    carrier: String(policy?.carrier || "N/A"),
    plan: String(policy?.plan || "N/A"),
    premium: policy?.premium
      ? `$${Number(policy.premium).toFixed(2)}/mo`
      : "N/A",
    effective_date: String(policy?.effective_date || "N/A"),
    agency_name: String(agent.agency_name || "Your Agency"),
    npn: String(agent.npn || "N/A"),
    agent_name: String(agent.full_name || ""),
    today_date: today,
  };

  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }

  return html;
}
