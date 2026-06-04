import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusBadgeVariant } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, FileCheck, FileText, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { count: clientCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", user.id);

  const { count: policyCount } = await supabase
    .from("policies")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", user.id);

  const { count: submissionCount } = await supabase
    .from("form_submissions")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", user.id);

  const { count: signedCount } = await supabase
    .from("form_submissions")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", user.id)
    .eq("status", "signed");

  const { data: recentSubmissions } = await supabase
    .from("form_submissions")
    .select(
      `
      id,
      status,
      created_at,
      signed_pdf_url,
      clients!inner(first_name, last_name),
      templates!inner(name)
    `
    )
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    {
      label: "Total Clients",
      value: clientCount ?? 0,
      icon: Users,
      color: "text-navy",
      bg: "bg-navy/10",
    },
    {
      label: "Active Policies",
      value: policyCount ?? 0,
      icon: FileCheck,
      color: "text-slate-blue",
      bg: "bg-slate-blue/10",
    },
    {
      label: "Form Submissions",
      value: submissionCount ?? 0,
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Signed Documents",
      value: signedCount ?? 0,
      icon: TrendingUp,
      color: "text-emerald",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview of your clients, policies, and form activity
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
                {stat.label}
              </CardTitle>
              <div className={`rounded-xl ${stat.bg} p-1.5 sm:p-2`}>
                <stat.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-navy sm:text-2xl">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Recent Submissions</CardTitle>
            <CardDescription>
              Latest form submissions and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSubmissions && recentSubmissions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="hidden sm:table-cell">Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Signed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSubmissions.map((sub: Record<string, unknown>) => (
                      <TableRow key={sub.id as string}>
                        <TableCell className="font-medium">
                          {String(
                            (sub.clients as { first_name: string; last_name: string }).first_name
                          )}{" "}
                          {String(
                            (sub.clients as { first_name: string; last_name: string }).last_name
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {String((sub.templates as Record<string, unknown>).name)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadgeVariant(
                              sub.status as
                                | "draft"
                                | "sent"
                                | "opened"
                                | "signed"
                            )}
                          >
                            {String(sub.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sub.signed_pdf_url ? (
                            <Link
                              href={`/dashboard/submissions/${sub.id}`}
                              className="text-navy hover:underline"
                            >
                              View PDF
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                No submissions yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/dashboard/clients/new"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50 sm:p-4"
            >
              <div className="rounded-xl bg-navy/10 p-2">
                <Users className="h-4 w-4 text-navy sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy">
                  Add New Client & Policy
                </p>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Create a client record with policy details
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/forms/builder"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50 sm:p-4"
            >
              <div className="rounded-xl bg-slate-blue/10 p-2">
                <FileText className="h-4 w-4 text-slate-blue sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy">
                  Create Form Template
                </p>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Design dynamic forms with variable injection
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/submissions"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50 sm:p-4"
            >
              <div className="rounded-xl bg-emerald-50 p-2">
                <FileCheck className="h-4 w-4 text-emerald sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy">
                  View Signed Documents
                </p>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Access and download completed forms
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
