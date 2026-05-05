import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, FileText, UserRound, Shield } from "lucide-react";
import { SendActions } from "./send-actions";

export default async function PreviewBeforeSendPage({
  params,
}: {
  params: Promise<{ id: string; templateId: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id: clientId, templateId } = await params;

  const { data: client } = await supabase
    .from("clients")
    .select(
      `
      *,
      policies!clients_policy_id_fkey (
        carrier,
        plan,
        policy_number,
        premium,
        effective_date
      )
    `
    )
    .eq("id", clientId)
    .eq("agent_id", user.id)
    .single();

  if (!client) redirect("/dashboard/clients");

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .eq("agent_id", user.id)
    .single();

  if (!template) redirect("/dashboard/clients");

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", user.id)
    .single();

  const renderContent = () => {
    let html = String(template.content);
    const policy = client.policies as Record<string, unknown> | null;

    const vars: Record<string, string> = {
      first_name: String(client.first_name),
      last_name: String(client.last_name),
      email: String(client.email),
      phone: String(client.phone || ""),
      address: String(client.address || ""),
      city: String(client.city || ""),
      state: String(client.state || ""),
      zip: String(client.zip || ""),
      date_of_birth: String(client.date_of_birth || ""),
      policy_number: String(policy?.policy_number || "N/A"),
      carrier: String(policy?.carrier || "N/A"),
      plan: String(policy?.plan || "N/A"),
      premium: policy?.premium ? `$${policy.premium}/mo` : "N/A",
      effective_date: String(policy?.effective_date || "N/A"),
      agency_name: String(agent?.agency_name || "Your Agency"),
      npn: String(agent?.npn || "N/A"),
    };

    for (const [key, value] of Object.entries(vars)) {
      html = html.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return html;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/clients/${clientId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
            Preview & Send
          </h1>
          <p className="text-sm text-muted-foreground">
            Review the form before sending it to the client
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>
                  This is how your client will see the document
                </CardDescription>
              </div>
              <div className="rounded-xl bg-slate-blue/10 p-2">
                <FileText className="h-5 w-5 text-slate-blue" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-w-[210mm] mx-auto overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-inner sm:p-6">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderContent() }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <UserRound className="h-4 w-4 text-slate-blue" />
                Sending To
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium text-navy">
                {client.first_name} {client.last_name}
              </p>
              <p className="text-sm text-muted-foreground">{client.email}</p>
              {client.phone && (
                <p className="text-sm text-muted-foreground">{client.phone}</p>
              )}
              {client.policies && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Policy</p>
                  <p className="text-sm">
                    {String((client.policies as Record<string, unknown>).carrier)} —{" "}
                    {String((client.policies as Record<string, unknown>).policy_number)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-slate-blue" />
                Send Form
              </CardTitle>
              <CardDescription>
                Generate a secure link for your client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SendActions clientId={clientId} templateId={templateId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
