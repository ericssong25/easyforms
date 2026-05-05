import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PreviewAndSign } from "./preview-sign-client";

export default async function PreviewSignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id: submissionId } = await params;

  if (!submissionId) redirect("/");

  const { data: submission } = await supabase
    .from("form_submissions")
    .select(
      `
      *,
      clients!inner(*, policies!clients_policy_id_fkey(*)),
      templates!inner(name, content)
    `
    )
    .eq("id", submissionId)
    .single();

  if (!submission) {
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

  return <PreviewAndSign submission={submission} />;
}
