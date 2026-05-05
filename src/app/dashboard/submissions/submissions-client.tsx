"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Copy,
  Mail,
  Eye,
  Download,
  History,
  Clock,
  Send,
  PenLine,
  FileText,
  Check,
  Monitor,
  Smartphone,
  Globe,
} from "lucide-react";

interface SubmissionsClientProps {
  submissionId: string;
  signedPdfUrl: string;
  clientEmail: string;
}

const eventIcons: Record<string, React.ReactNode> = {
  created: <FileText className="h-4 w-4 text-slate-blue" />,
  sent: <Send className="h-4 w-4 text-slate-500" />,
  opened: <Eye className="h-4 w-4 text-amber-500" />,
  verified: <Check className="h-4 w-4 text-slate-blue" />,
  verification_failed: <Check className="h-4 w-4 rotate-45 text-destructive" />,
  signed: <PenLine className="h-4 w-4 text-emerald" />,
};

interface TrackEvent {
  id: string;
  event_type: string;
  created_at: string;
  ip_address: string;
  user_agent: string;
  device_type: string;
}

export function SubmissionsClient({
  submissionId,
  signedPdfUrl,
  clientEmail,
}: SubmissionsClientProps) {
  const supabase = createClient();
  const [copied, setCopied] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [events, setEvents] = useState<TrackEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const formLink = `${window.location.origin}/forms/${submissionId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(formLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const emailLink = `mailto:${encodeURIComponent(clientEmail)}?subject=Please review and sign your document&body=Please review and sign your insurance document using the secure link below:%0D%0A%0D%0A${encodeURIComponent(formLink)}%0D%0A%0D%0AThank you!`;

  const loadTracking = async () => {
    setLoadingEvents(true);
    const { data } = await supabase
      .from("tracking_events")
      .select("id, event_type, created_at, ip_address, user_agent, device_type")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: true });

    setEvents(
      (data || []).map((e) => ({
        id: String(e.id),
        event_type: String(e.event_type),
        created_at: String(e.created_at),
        ip_address: String(e.ip_address || "—"),
        user_agent: String(e.user_agent || "—"),
        device_type: String(e.device_type || "—"),
      }))
    );
    setLoadingEvents(false);
  };

  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {/* Copy Link */}
      <Button variant="ghost" size="sm" onClick={copyLink} title="Copy client link">
        {copied ? (
          <Check className="h-4 w-4 text-emerald" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span className="hidden sm:ml-1 sm:inline">
          {copied ? "Copied" : "Copy"}
        </span>
      </Button>

      {/* Email */}
      <Button variant="ghost" size="sm" asChild title="Resend via email">
        <a href={emailLink}>
          <Mail className="h-4 w-4" />
          <span className="hidden sm:ml-1 sm:inline">Email</span>
        </a>
      </Button>

      {/* View PDF */}
      {signedPdfUrl && (
        <>
          <Button variant="ghost" size="sm" asChild title="View signed PDF">
            <a href={signedPdfUrl} target="_blank">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:ml-1 sm:inline">View</span>
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild title="Download PDF">
            <a href={signedPdfUrl}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:ml-1 sm:inline">DL</span>
            </a>
          </Button>
        </>
      )}

      {/* Tracking History */}
      <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadTracking()}
            title="View tracking history"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:ml-1 sm:inline">Track</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <History className="h-4 w-4" />
              Tracking History
            </DialogTitle>
            <DialogDescription>
              Activity log for this form submission
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {loadingEvents ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading...
              </p>
            ) : events.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No events recorded
              </p>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
                {events.map((event) => (
                  <div key={event.id} className="relative pb-4">
                    <div className="flex gap-3">
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
                        {eventIcons[event.event_type] || (
                          <Clock className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="text-sm font-medium capitalize">
                          {event.event_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </p>

                        {/* Metadata row */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {event.ip_address}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Monitor className="h-3 w-3" />
                            {event.user_agent}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            {event.device_type === "Mobile" ? (
                              <Smartphone className="h-3 w-3" />
                            ) : (
                              <Monitor className="h-3 w-3" />
                            )}
                            {event.device_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
