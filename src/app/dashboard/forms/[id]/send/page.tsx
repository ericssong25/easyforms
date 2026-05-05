import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SendFormClient } from "./send-form-client";

export default async function SendFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .eq("agent_id", user.id)
    .single();

  if (!template) redirect("/dashboard/forms");

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("agent_id", user.id)
    .order("last_name", { ascending: true });

  return (
    <SendFormClient
      template={template}
      clients={clients ?? []}
    />
  );
}
