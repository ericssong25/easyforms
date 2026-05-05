import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, FileText, Pencil } from "lucide-react";

export default async function FormsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
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

      {templates && templates.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template: Record<string, unknown>) => (
            <Card
              key={template.id as string}
              className="border-slate-200 transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-slate-blue/10 p-2">
                      <FileText className="h-5 w-5 text-slate-blue" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {String(template.name)}
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Created{" "}
                        {new Date(
                          String(template.created_at)
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/forms/builder/${template.id}`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 sm:py-16">
          <FileText className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            No templates yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Create your first form template
          </p>
          <Link href="/dashboard/forms/builder" className="mt-4">
            <Button variant="navy">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
