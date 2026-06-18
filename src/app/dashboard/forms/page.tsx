import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TemplatesGrid } from "./templates-grid";

export default async function FormsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, created_at")
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Form Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage dynamic form templates with variable injection
          </p>
        </div>
        <Link href="/dashboard/forms/builder" className="sm:self-start">
          <Button variant="navy" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      <TemplatesGrid
        templates={(templates ?? []) as {
          id: string;
          name: string;
          created_at: string;
        }[]}
      />
    </div>
  );
}
