import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Send,
  Eye,
  PenLine,
  FileText,
  Download,
  Globe,
  Monitor,
  Smartphone,
} from "lucide-react";

const eventIcons: Record<string, React.ReactNode> = {
  created: <FileText className="h-4 w-4 text-slate-blue" />,
  sent: <Send className="h-4 w-4 text-slate-500" />,
  opened: <Eye className="h-4 w-4 text-amber-500" />,
  signed: <PenLine className="h-4 w-4 text-emerald" />,
};

export default async function SubmissionDetailPage({
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

  const { data: submission } = await supabase
    .from("form_submissions")
    .select(
      `
      *,
      clients!inner(first_name, last_name, email, phone),
      templates!inner(name, content)
    `
    )
    .eq("id", id)
    .eq("agent_id", user.id)
    .single();

  if (!submission) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/submissions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Submissions
          </Button>
        </Link>
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold text-muted-foreground">
              Submission Not Found
            </h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: events } = await supabase
    .from("tracking_events")
    .select("id, event_type, created_at, ip_address, user_agent, device_type")
    .eq("submission_id", id)
    .order("created_at", { ascending: true });

  const client = submission.clients as { first_name: string; last_name: string; email: string; phone?: string };
  const template = submission.templates as { name: string; content: string };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/submissions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy">
              Submission Detail
            </h1>
            <p className="text-sm text-muted-foreground">
              View tracking history and document status
            </p>
          </div>
        </div>
        <Badge
          variant={statusBadgeVariant(submission.status as "draft" | "sent" | "opened" | "signed")}
          className="text-sm px-3 py-1"
        >
          {submission.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Form Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Template
                  </p>
                  <p className="text-sm font-medium">{template.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Client
                  </p>
                  <p className="text-sm font-medium">
                    {client.first_name} {client.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="text-sm font-medium">{client.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Phone
                  </p>
                  <p className="text-sm font-medium">
                    {client.phone || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Created
                  </p>
                  <p className="text-sm font-medium">
                    {new Date(
                      String(submission.created_at)
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Signed
                  </p>
                  <p className="text-sm font-medium">
                    {submission.signed_at
                      ? new Date(
                          String(submission.signed_at)
                        ).toLocaleDateString()
                      : "Pending"}
                  </p>
                </div>
              </div>

              {submission.signed_pdf_url && (
                <div className="mt-4 flex gap-2">
                  <Link
                    href={String(submission.signed_pdf_url)}
                    target="_blank"
                  >
                    <Button variant="outline" size="sm">
                      <Eye className="mr-1 h-3 w-3" />
                      View PDF
                    </Button>
                  </Link>
                  <Link href={String(submission.signed_pdf_url)}>
                    <Button variant="navy" size="sm">
                      <Download className="mr-1 h-3 w-3" />
                      Download PDF
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-4 w-4 text-slate-blue" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
                {events && events.length > 0 ? (
                  events.map((event: Record<string, unknown>) => (
                    <div key={event.id as string} className="relative pb-4">
                      <div className="flex gap-3">
                        <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
                          {eventIcons[String(event.event_type)] || (
                            <CheckCircle2 className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-sm font-medium capitalize">
                            {String(event.event_type).replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              String(event.created_at)
                            ).toLocaleString()}
                          </p>
                          {Boolean(event.ip_address) && String(event.ip_address) !== "server" && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {String(event.ip_address)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Monitor className="h-3 w-3" />
                                {String(event.user_agent)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                {String(event.device_type) === "Mobile" ? (
                                  <Smartphone className="h-3 w-3" />
                                ) : (
                                  <Monitor className="h-3 w-3" />
                                )}
                                {String(event.device_type)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No events recorded
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
