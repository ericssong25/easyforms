import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Eye,
  Download,
} from "lucide-react";
import { SendFormSection } from "./send-form-section";

export default async function ClientDetailPage({
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

  const { data: client } = await supabase
    .from("clients")
    .select(
      `
      *,
      policies!clients_policy_id_fkey (
        id,
        carrier,
        plan,
        policy_number,
        premium,
        effective_date
      )
    `
    )
    .eq("id", id)
    .eq("agent_id", user.id)
    .single();

  if (!client) redirect("/dashboard/clients");

  const { data: dependents } = await supabase
    .from("dependents")
    .select("*")
    .eq("client_id", id);

  const { data: submissions } = await supabase
    .from("form_submissions")
    .select(
      `
      id,
      status,
      signed_pdf_url,
      created_at,
      templates!inner(name)
    `
    )
    .eq("client_id", id)
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false });

  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, content")
    .eq("agent_id", user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
            {client.first_name} {client.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">Client Profile</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Contact Info */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{client.phone || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm sm:col-span-2">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {[client.address, client.city, client.state, client.zip]
                    .filter(Boolean)
                    .join(", ") || "No address"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>DOB: {client.date_of_birth || "N/A"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Policy */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Policy Details</CardTitle>
            </CardHeader>
            <CardContent>
              {client.policies ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Carrier</p>
                    <p className="text-sm font-medium">{client.policies.carrier}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Plan</p>
                    <p className="text-sm font-medium">{client.policies.plan}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Policy #</p>
                    <p className="text-sm font-medium">{client.policies.policy_number}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Premium</p>
                    <p className="text-sm font-medium">${client.policies.premium}/mo</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Effective</p>
                    <p className="text-sm font-medium">{client.policies.effective_date}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No policy assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Dependents */}
          {dependents && dependents.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Dependents ({dependents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>DOB</TableHead>
                        <TableHead>Covered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dependents.map((dep: Record<string, unknown>) => (
                        <TableRow key={dep.id as string}>
                          <TableCell className="font-medium">
                            {String(dep.first_name)} {String(dep.last_name)}
                          </TableCell>
                          <TableCell>{String(dep.date_of_birth || "N/A")}</TableCell>
                          <TableCell>{dep.applies_to_policy ? "Yes" : "No"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document History */}
          <Card className="border-slate-200 lg:hidden">
            <CardHeader>
              <CardTitle className="text-lg">Document History</CardTitle>
            </CardHeader>
            <CardContent>
              {submissions && submissions.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {submissions.map((sub: Record<string, unknown>) => (
                      <div key={sub.id as string} className="rounded-xl border border-slate-100 p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {String((sub.templates as { name: string }).name)}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(String(sub.created_at)).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge
                            variant={statusBadgeVariant(
                              sub.status as "draft" | "sent" | "opened" | "signed"
                            )}
                          >
                            {String(sub.status)}
                          </Badge>
                        </div>
                        {Boolean(sub.signed_pdf_url) && (
                          <div className="mt-2 flex gap-2">
                            <Link href={String(sub.signed_pdf_url)} target="_blank">
                              <Button variant="outline" size="sm">
                                <Eye className="mr-1 h-3 w-3" /> View
                              </Button>
                            </Link>
                            <Link href={String(sub.signed_pdf_url)}>
                              <Button variant="outline" size="sm">
                                <Download className="mr-1 h-3 w-3" /> Download
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No form submissions yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Send Form Section */}
          <SendFormSection
            clientId={id}
            templates={(templates ?? []).map((t) => ({
              id: String(t.id),
              name: String(t.name),
              content: String(t.content),
            }))}
            clientData={{
              first_name: String(client.first_name),
              last_name: String(client.last_name),
              email: String(client.email),
            }}
          />

          {/* Document History (desktop) */}
          <Card className="hidden border-slate-200 lg:block">
            <CardHeader>
              <CardTitle className="text-lg">Document History</CardTitle>
            </CardHeader>
            <CardContent>
              {submissions && submissions.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {submissions.map((sub: Record<string, unknown>) => (
                      <div key={sub.id as string} className="rounded-xl border border-slate-100 p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {String((sub.templates as { name: string }).name)}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(String(sub.created_at)).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge
                            variant={statusBadgeVariant(
                              sub.status as "draft" | "sent" | "opened" | "signed"
                            )}
                          >
                            {String(sub.status)}
                          </Badge>
                        </div>
                        {Boolean(sub.signed_pdf_url) && (
                          <div className="mt-2 flex gap-2">
                            <Link href={String(sub.signed_pdf_url)} target="_blank">
                              <Button variant="outline" size="sm">
                                <Eye className="mr-1 h-3 w-3" /> View
                              </Button>
                            </Link>
                            <Link href={String(sub.signed_pdf_url)}>
                              <Button variant="outline" size="sm">
                                <Download className="mr-1 h-3 w-3" /> Download
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No form submissions yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
