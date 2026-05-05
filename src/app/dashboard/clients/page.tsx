import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ClientsSearchWrapper } from "./clients-search-wrapper";

export default async function ClientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clients } = await supabase
    .from("clients")
    .select(
      `
      *,
      policies (
        carrier,
        plan,
        policy_number
      )
    `
    )
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
            Clients & Policies
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your client records and policy information
          </p>
        </div>
        <Link href="/dashboard/clients/new" className="sm:self-start">
          <Button variant="navy" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Client & Policy
          </Button>
        </Link>
      </div>

      <ClientsSearchWrapper
        clients={(clients ?? []) as Record<string, unknown>[]}
      />
    </div>
  );
}
