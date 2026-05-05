"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTrackingMetadata } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, Copy, Check, Mail, ExternalLink } from "lucide-react";

interface SendActionsProps {
  clientId: string;
  templateId: string;
}

export function SendActions({ clientId, templateId }: SendActionsProps) {
  const supabase = createClient();
  const [sending, setSending] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: client } = await supabase
        .from("clients")
        .select("ssn_encrypted, phone, last_name")
        .eq("id", clientId)
        .single();

      const ssnRaw = client?.ssn_encrypted || "";
      const ssnDigits = ssnRaw.replace(/\D/g, "");
      const ssnLast4 = ssnDigits.slice(-4);

      const phoneRaw = client?.phone || "";
      const phoneDigits = phoneRaw.replace(/\D/g, "");
      const phoneLast4 = phoneDigits.slice(-4);

      const verificationData = {
        ssn_last4: ssnLast4,
        phone_last4: phoneLast4,
        last_name: (client?.last_name || "").toLowerCase().trim(),
      };

      const { data: submission, error } = await supabase
        .from("form_submissions")
        .insert({
          agent_id: user.id,
          client_id: clientId,
          template_id: templateId,
          status: "sent",
          verification_data: verificationData,
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

      const link = `${window.location.origin}/forms/${submission.id}`;
      setGeneratedLink(link);

      toast.success("Form sent! Share the link with your client.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send form"
      );
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const openLink = () => {
    if (!generatedLink) return;
    window.open(generatedLink, "_blank");
  };

  const emailLink = generatedLink
    ? `mailto:?subject=Please review and sign your document&body=Please review and sign your insurance document using the secure link below:%0D%0A%0D%0A${encodeURIComponent(generatedLink)}%0D%0A%0D%0AThank you!`
    : null;

  if (!generatedLink) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Click the button below to generate a secure, unique link for your
          client. The client will not need to log in.
        </p>
        <Button
          variant="navy"
          className="w-full"
          onClick={handleSend}
          disabled={sending}
        >
          <Send className="mr-2 h-4 w-4" />
          {sending ? "Generating link..." : "Generate Secure Link"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <p className="mb-1 text-xs font-medium text-emerald-700">
          Secure Client Link
        </p>
        <code className="block break-all text-xs text-navy">
          {generatedLink}
        </code>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={copyLink} className="w-full">
          {copied ? (
            <Check className="mr-1 h-4 w-4 text-emerald" />
          ) : (
            <Copy className="mr-1 h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy URL"}
        </Button>
        <Button variant="outline" size="sm" onClick={openLink} className="w-full">
          <ExternalLink className="mr-1 h-4 w-4" />
          Open
        </Button>
        {emailLink && (
          <Button variant="outline" size="sm" className="col-span-2 w-full" asChild>
            <a href={emailLink}>
              <Mail className="mr-1 h-4 w-4" />
              Share via Email
            </a>
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Copy the link to send via WhatsApp, SMS, or any messaging app.
      </p>
    </div>
  );
}
