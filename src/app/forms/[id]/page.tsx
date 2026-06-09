import { redirect } from "next/navigation";
import { getServiceRoleSupabase } from "@/lib/supabase/service";
import { PreviewAndSign } from "./preview-sign-client";

// Public signing page. The /forms path is excluded from auth middleware
// (see src/middleware.ts), so unauthenticated visitors hit this route in
// incognito.
//
// SECURITY: this page deliberately returns ONLY the minimum data needed
// to render the verification screen + chrome. NO client PII (SSN, DOB,
// address, income, dependents, etc.) and NO verification_data crosses
// the wire until the visitor passes identity verification, which
// happens server-side in /api/verify-submission.
//
// What we DO return (all non-PII):
//   - submissionId
//   - status (so the UI can show "already signed" if applicable)
//   - template name + logo jsonb (branding, not PII)
//   - agent agency name (branding, not PII)
//
// What we DO NOT return:
//   - clients.* (no SSN, DOB, address, income, dependents, etc.)
//   - verification_data.* (no answers in the page HTML)
//
// Service-role key is used because the path is excluded from middleware
// and there is no user session. The key never leaves the server.
export default async function PreviewSignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: submissionId } = await params;
  if (!submissionId) redirect("/");

  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidLike.test(submissionId)) {
    return <NotFound />;
  }

  const supabase = getServiceRoleSupabase();
  if (!supabase) {
    return <ServiceUnavailable />;
  }

  const { data, error } = await supabase
    .from("form_submissions")
    .select(
      `
      id,
      status,
      agents!form_submissions_agent_id_fkey(agency_name, full_name),
      templates!inner(name, logo)
      `
    )
    .eq("id", submissionId)
    .single();

  if (error || !data) {
    return <NotFound />;
  }

  const agent = (data.agents || {}) as {
    agency_name?: string | null;
    full_name?: string | null;
  };
  const template = (data.templates || {}) as {
    name?: string;
    logo?: unknown;
  };

  return (
    <PreviewAndSign
      submissionId={data.id as string}
      status={(data.status as string) || "sent"}
      templateName={String(template.name || "Document")}
      templateLogo={template.logo ?? null}
      agencyName={String(agent.agency_name || "Your Agency")}
    />
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-navy">Form Not Found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This form submission does not exist or has been removed.
        </p>
      </div>
    </div>
  );
}

function ServiceUnavailable() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-navy">Form Unavailable</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The signing service is not configured. Please contact your agent.
        </p>
      </div>
    </div>
  );
}
