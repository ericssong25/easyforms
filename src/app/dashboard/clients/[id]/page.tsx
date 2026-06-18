import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createFreshSignedUrls } from "@/lib/storage/signed-url";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Hash,
  Wallet,
  FileText,
  Clock,
  Eye,
  Download,
  ArrowRight,
  Heart,
  Receipt,
  Users,
} from "lucide-react";
import { SendFormSection } from "./send-form-section";
import { EditClientModal } from "./edit-client-modal";
import { EditPolicyModal } from "./edit-policy-modal";
import { EditDependentsModal } from "./edit-dependents-modal";
import { CardEnter } from "./card-enter";

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
      ),
      dependents (*)
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
      signed_pdf_path,
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

  // Generate fresh signed URLs server-side for every submission with a path.
  // Consumers render never persist a signed URL — we mint a new one on every
  // request via the service-role client.
  const submissionRows = (submissions ?? []) as Array<{
    id: string;
    status: string;
    signed_pdf_url: string | null;
    signed_pdf_path: string | null;
    created_at: string;
    templates: { name: string } | { name: string }[] | null;
  }>;
  const freshUrls = await createFreshSignedUrls(
    submissionRows.map((s) => s.signed_pdf_path ?? s.signed_pdf_url)
  );
  const submissionsWithFreshUrl = submissionRows.map((s, i) => ({
    ...s,
    fresh_signed_pdf_url: freshUrls[i] ?? null,
  }));

  const hasPolicy = !!client.policies;
  const wizardIncomplete = !hasPolicy;

  const submissionsEmpty = submissionsWithFreshUrl.length === 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to clients"
              className="text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {client.first_name} {client.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">Client profile</p>
          </div>
        </div>

        {wizardIncomplete && (
          <Link href={`/dashboard/clients/new?resume=${id}`}>
            <Button
              variant="navy"
              size="sm"
              className="transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Continue setup
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CardEnter delay={0.05}>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg">Contact information</CardTitle>
                  <CardDescription>
                    Personal details and reachability
                  </CardDescription>
                </div>
                <EditClientModal
                  clientId={id}
                  initialData={{
                    first_name: String(client.first_name || ""),
                    last_name: String(client.last_name || ""),
                    email: String(client.email || ""),
                    phone: client.phone ? String(client.phone) : "",
                    ssn: client.ssn_encrypted ? String(client.ssn_encrypted) : "",
                    address: String(client.address || ""),
                    city: String(client.city || ""),
                    state: String(client.state || ""),
                    zip: String(client.zip || ""),
                    date_of_birth: client.date_of_birth
                      ? String(client.date_of_birth)
                      : "",
                    subscriber_number: client.subscriber_number
                      ? String(client.subscriber_number)
                      : "",
                    holder_income:
                      client.holder_income != null
                        ? Number(client.holder_income)
                        : null,
                    tax_filing_status: client.tax_filing_status
                      ? String(client.tax_filing_status)
                      : "",
                    marital_status: client.marital_status
                      ? String(client.marital_status)
                      : "",
                    tax_dependents_count:
                      client.tax_dependents_count != null
                        ? Number(client.tax_dependents_count)
                        : null,
                  }}
                />
              </CardHeader>
              <CardContent>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <ContactRow
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={String(client.email || "N/A")}
                    truncate
                  />
                  <ContactRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={client.phone ? String(client.phone) : "N/A"}
                  />
                  <ContactRow
                    icon={<MapPin className="h-4 w-4" />}
                    label="Address"
                    value={
                      [client.address, client.city, client.state, client.zip]
                        .filter(Boolean)
                        .join(", ") || "No address"
                    }
                    full
                    truncate
                  />
                  <ContactRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Date of birth"
                    value={client.date_of_birth
                      ? String(client.date_of_birth)
                      : "N/A"}
                  />
                  <ContactRow
                    icon={<Hash className="h-4 w-4" />}
                    label="Subscriber #"
                    value={client.subscriber_number
                      ? String(client.subscriber_number)
                      : "N/A"}
                  />
                  <ContactRow
                    icon={<Wallet className="h-4 w-4" />}
                    label="Annual income"
                    value={
                      client.holder_income != null
                        ? `$${Number(client.holder_income).toLocaleString("en-US")}`
                        : "N/A"
                    }
                  />
                  <ContactRow
                    icon={<FileText className="h-4 w-4" />}
                    label="Tax filing"
                    value={client.tax_filing_status
                      ? String(client.tax_filing_status)
                      : "N/A"}
                  />
                  <ContactRow
                    icon={<Heart className="h-4 w-4" />}
                    label="Marital status"
                    value={client.marital_status
                      ? String(client.marital_status)
                      : "N/A"}
                  />
                  <ContactRow
                    icon={<Receipt className="h-4 w-4" />}
                    label="Tax dependents"
                    value={
                      client.tax_dependents_count != null
                        ? String(client.tax_dependents_count)
                        : "N/A"
                    }
                  />
                </dl>
              </CardContent>
            </Card>
          </CardEnter>

          <CardEnter delay={0.1}>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg">Policy details</CardTitle>
                  <CardDescription>
                    {hasPolicy
                      ? "Carrier and coverage information"
                      : "No policy assigned yet"}
                  </CardDescription>
                </div>
                <EditPolicyModal
                  clientId={id}
                  initialData={
                    client.policies
                      ? {
                          id: String(client.policies.id),
                          carrier: String(client.policies.carrier),
                          plan: String(client.policies.plan || ""),
                          policy_number: String(client.policies.policy_number),
                          premium: Number(client.policies.premium) || 0,
                          effective_date: client.policies.effective_date
                            ? String(client.policies.effective_date)
                            : "",
                        }
                      : null
                  }
                />
              </CardHeader>
              <CardContent>
                {client.policies ? (
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <DetailRow
                      label="Carrier"
                      value={String(client.policies.carrier)}
                    />
                    <DetailRow
                      label="Plan"
                      value={client.policies.plan
                        ? String(client.policies.plan)
                        : "—"}
                    />
                    <DetailRow
                      label="Policy #"
                      value={String(client.policies.policy_number)}
                    />
                    <DetailRow
                      label="Premium"
                      value={`$${client.policies.premium}/mo`}
                    />
                    <DetailRow
                      label="Effective"
                      value={
                        client.policies.effective_date
                          ? String(client.policies.effective_date)
                          : "—"
                      }
                    />
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No policy assigned
                  </p>
                )}
              </CardContent>
            </Card>
          </CardEnter>
        </div>

        <div className="space-y-6">
          <CardEnter delay={0.15}>
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
          </CardEnter>

          <CardEnter delay={0.2}>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg">Document history</CardTitle>
                  <CardDescription>
                    Submissions for this client
                  </CardDescription>
                </div>
                {!submissionsEmpty && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {submissionsWithFreshUrl.length}
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {submissionsEmpty ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      No form submissions yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Send a template to get started
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[320px] pr-3">
                    <ul className="space-y-3">
                      {submissionsWithFreshUrl.map((sub) => (
                        <li
                          key={String(sub.id)}
                          className="rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {String(
                                  (sub.templates as unknown as { name: string })
                                    .name
                                )}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(String(sub.created_at)).toLocaleDateString()}
                              </div>
                            </div>
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
                          </div>
                          {sub.fresh_signed_pdf_url && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Link
                                href={sub.fresh_signed_pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="transition-colors hover:bg-primary/10 hover:text-primary"
                                >
                                  <Eye className="mr-1 h-3 w-3" />
                                  View
                                </Button>
                              </Link>
                              <Link href={sub.fresh_signed_pdf_url}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="transition-colors hover:bg-primary/10 hover:text-primary"
                                >
                                  <Download className="mr-1 h-3 w-3" />
                                  Download
                                </Button>
                              </Link>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </CardEnter>

          <CardEnter delay={0.25}>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg">
                    Dependents{" "}
                    {dependents ? `(${dependents.length})` : ""}
                  </CardTitle>
                  <CardDescription>
                    {hasPolicy
                      ? "People covered by this policy"
                      : "Add a policy to manage dependents"}
                  </CardDescription>
                </div>
                {hasPolicy && (
                  <EditDependentsModal
                    clientId={id}
                    policyId={String(client.policies!.id)}
                    initialData={(dependents || []).map((d) => ({
                      id: String(d.id),
                      first_name: String(d.first_name),
                      last_name: String(d.last_name),
                      applies_to_policy: Boolean(d.applies_to_policy),
                      date_of_birth: d.date_of_birth
                        ? String(d.date_of_birth)
                        : "",
                    }))}
                  />
                )}
              </CardHeader>
              <CardContent>
                {dependents && dependents.length > 0 ? (
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
                        {dependents.map((dep) => (
                          <TableRow key={String(dep.id)}>
                            <TableCell className="font-medium">
                              {String(dep.first_name)} {String(dep.last_name)}
                            </TableCell>
                            <TableCell>
                              {String(dep.date_of_birth || "N/A")}
                            </TableCell>
                            <TableCell>
                              {dep.applies_to_policy ? "Yes" : "No"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Users className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      No dependents added
                    </p>
                    {hasPolicy && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Use Edit to add a dependent
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </CardEnter>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  full,
  truncate,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  full?: boolean;
  truncate?: boolean;
}) {
  return (
    <div
      className={
        "flex items-start gap-3" + (full ? " sm:col-span-2" : "")
      }
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd
          className={
            "mt-0.5 text-sm text-foreground" +
            (truncate ? " truncate" : "")
          }
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
