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
import { ClientsByStateChart } from "@/components/dashboard/charts/clients-by-state-chart";
import { ClientsByAgeChart } from "@/components/dashboard/charts/clients-by-age-chart";
import { bucketAge } from "@/components/dashboard/charts/age-buckets";
import { CarriersChart } from "@/components/dashboard/charts/carriers-chart";
import { SubmissionStatusChart } from "@/components/dashboard/charts/submission-status-chart";
import { SubmissionsOverTimeChart } from "@/components/dashboard/charts/submissions-over-time-chart";

type SubmissionStatus = "draft" | "sent" | "opened" | "signed";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { count: clientCount },
    { count: policyCount },
    { count: submissionCount },
    { count: signedCount },
    { data: recentSubmissions },
    { data: clientsForCharts },
    { data: policiesForCharts },
    { data: submissionsForCharts },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", user.id),
    supabase
      .from("policies")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", user.id),
    supabase
      .from("form_submissions")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", user.id),
    supabase
      .from("form_submissions")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", user.id)
      .eq("status", "signed"),
    supabase
      .from("form_submissions")
      .select(
        `
        id,
        status,
        created_at,
        signed_pdf_path,
        clients!inner(first_name, last_name),
        templates!inner(name)
      `
      )
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("clients")
      .select("state, date_of_birth")
      .eq("agent_id", user.id),
    supabase
      .from("policies")
      .select("carrier")
      .eq("agent_id", user.id),
    supabase
      .from("form_submissions")
      .select("status, created_at")
      .eq("agent_id", user.id),
  ]);

  const stats = [
    {
      label: "Total Clients",
      value: clientCount ?? 0,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Active Policies",
      value: policyCount ?? 0,
      icon: FileCheck,
      color: "text-[hsl(var(--sidebar-accent))]",
      bg: "bg-[hsl(var(--sidebar-accent))]/10",
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

  // ---- chart data shaping ----
  const asOf = new Date();
  const stateCounts = new Map<string, number>();
  const ageCounts = new Map<string, number>();
  for (const c of clientsForCharts ?? []) {
    if (c.state) {
      stateCounts.set(c.state, (stateCounts.get(c.state) ?? 0) + 1);
    }
    const bucket = bucketAge(c.date_of_birth, asOf);
    if (bucket) {
      ageCounts.set(bucket, (ageCounts.get(bucket) ?? 0) + 1);
    }
  }

  const carrierCounts = new Map<string, number>();
  for (const p of policiesForCharts ?? []) {
    if (p.carrier) {
      carrierCounts.set(p.carrier, (carrierCounts.get(p.carrier) ?? 0) + 1);
    }
  }

  const statusCounts = new Map<SubmissionStatus, number>();
  for (const s of submissionsForCharts ?? []) {
    const k = s.status as SubmissionStatus;
    statusCounts.set(k, (statusCounts.get(k) ?? 0) + 1);
  }

  const monthCounts = new Map<string, { signed: number; pending: number }>();
  for (const s of submissionsForCharts ?? []) {
    if (!s.created_at) continue;
    const d = new Date(s.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = monthCounts.get(key) ?? { signed: 0, pending: 0 };
    if (s.status === "signed") cur.signed += 1;
    else cur.pending += 1;
    monthCounts.set(key, cur);
  }
  const sortedMonths = Array.from(monthCounts.keys()).sort();
  const limitedMonths = sortedMonths.slice(-7);
  const monthSeries = limitedMonths.map((key) => {
    const [yStr, mStr] = key.split("-");
    const y = Number(yStr);
    const m = Number(mStr) - 1;
    const data = monthCounts.get(key) ?? { signed: 0, pending: 0 };
    return {
      month: `${MONTH_LABELS[m]} ${String(y).slice(2)}`,
      signed: data.signed,
      pending: data.pending,
    };
  });

  const stateData = Array.from(stateCounts.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);
  const ageData = Array.from(ageCounts.entries())
    .map(([range, count]) => ({ range, count }));
  const carrierData = Array.from(carrierCounts.entries())
    .map(([carrier, count]) => ({ carrier, count }))
    .sort((a, b) => b.count - a.count);
  const statusData: { status: string; count: number }[] = (
    ["signed", "sent", "opened", "draft"] as SubmissionStatus[]
  )
    .map((s) => ({ status: s, count: statusCounts.get(s) ?? 0 }))
    .filter((d) => d.count > 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview of your clients, policies, and form activity
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="whitespace-nowrap text-xs font-medium text-muted-foreground sm:text-sm">
                {stat.label}
              </CardTitle>
              <div className={`rounded-xl ${stat.bg} p-1.5 sm:p-2`}>
                <stat.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground sm:text-2xl">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClientsByStateChart data={stateData} />
        </div>
        <div className="lg:col-span-1">
          <SubmissionStatusChart data={statusData} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ClientsByAgeChart data={ageData} />
        <CarriersChart data={carrierData} />
      </div>

      <SubmissionsOverTimeChart data={monthSeries} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Recent submissions</CardTitle>
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
                      <TableHead>Signed PDF</TableHead>
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
                              sub.status as SubmissionStatus
                            )}
                          >
                            {String(sub.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sub.signed_pdf_path ? (
                            <Link
                              href={`/dashboard/submissions/${sub.id}`}
                              className="text-primary hover:underline"
                            >
                              Open details
                            </Link>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
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

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Quick actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/dashboard/clients/new"
              className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/40 sm:p-4"
            >
              <div className="rounded-xl bg-primary/10 p-2">
                <Users className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Add new client &amp; policy
                </p>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Create a client record with policy details
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/forms/builder"
              className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/40 sm:p-4"
            >
              <div className="rounded-xl bg-[hsl(var(--sidebar-accent))]/10 p-2">
                <FileText className="h-4 w-4 text-[hsl(var(--sidebar-accent))] sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Create form template
                </p>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Design dynamic forms with variable injection
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/submissions"
              className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/40 sm:p-4"
            >
              <div className="rounded-xl bg-emerald-50 p-2">
                <FileCheck className="h-4 w-4 text-emerald sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  View signed documents
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
