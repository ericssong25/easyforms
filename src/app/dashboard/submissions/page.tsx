import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmissionsSearchWrapper } from "./submissions-search-wrapper";

export default async function SubmissionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: submissions } = await supabase
    .from("form_submissions")
    .select(
      `
      *,
      clients!inner(first_name, last_name, email),
      templates!inner(name)
    `
    )
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
          Form Submissions
        </h1>
        <p className="text-sm text-muted-foreground">
          Track all form submissions and their status
        </p>
      </div>

      <SubmissionsSearchWrapper
        submissions={(submissions ?? []) as Record<string, unknown>[]}
      />
    </div>
  );
}
