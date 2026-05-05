"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getTrackingMetadata } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, UserRound } from "lucide-react";

interface SendFormClientProps {
  template: Record<string, unknown>;
  clients: Record<string, unknown>[];
}

export function SendFormClient({ template, clients }: SendFormClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }

    setSending(true);
    try {
      const { data: existingUser } = await supabase.auth.getUser();
      if (!existingUser.user) throw new Error("Not authenticated");

      const { data: submission, error } = await supabase
        .from("form_submissions")
        .insert({
          agent_id: existingUser.user.id,
          client_id: selectedClientId,
          template_id: template.id,
          status: "sent",
        })
        .select()
        .single();

      if (error) throw error;

      const meta = await getTrackingMetadata();
      await supabase.from("tracking_events").insert({
        submission_id: submission.id,
        event_type: "sent",
        ...meta,
      });

      toast.success("Form sent to client successfully");
      router.push("/dashboard/submissions");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send form"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Send Form
        </h1>
        <p className="text-sm text-muted-foreground">
          Send &quot;{String(template.name)}&quot; to a client for review and signature
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Select Recipient</CardTitle>
          <CardDescription>
            Choose the client who will receive this form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client: Record<string, unknown>) => (
                  <SelectItem
                    key={client.id as string}
                    value={client.id as string}
                  >
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      {String(client.first_name)} {String(client.last_name)} —{" "}
                      {String(client.email)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {clients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No clients found. Create a client first.
            </p>
          )}

          <Button
            variant="navy"
            className="w-full"
            onClick={handleSend}
            disabled={sending || clients.length === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending..." : "Send Form to Client"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
