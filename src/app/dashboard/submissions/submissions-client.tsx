"use client";

import { useState } from "react";
import Link from "next/link";
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
  created: <FileText className="h-4 w-4 text-primary" />,
  sent: <Send className="h-4 w-4 text-muted-foreground" />,
  opened: <Eye className="h-4 w-4 text-amber-600" />,
  verified: <Check className="h-4 w-4 text-primary" />,
  verification_failed: <Check className="h-4 w-4 rotate-45 text-destructive" />,
  signed: <PenLine className="h-4 w-4 text-emerald-600" />,
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
  // clientEmail is reserved for the upcoming automated email send flow.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clientEmail: _clientEmail,
}: SubmissionsClientProps) {
  const supabase = createClient();
  const [copied, setCopied] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [events, setEvents] = useState<TrackEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const formLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/forms/${submissionId}`
      : `/forms/${submissionId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(formLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

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
    <div className="flex flex-wrap items-center justify-end gap-0.5">
      {/* Copy Link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={copyLink}
        title="Copy client link"
        aria-label="Copy client link"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span className="hidden sm:ml-1 sm:inline">
          {copied ? "Copied" : "Copy"}
        </span>
      </Button>

      {/* Email — disabled (automated send not implemented) */}
      <Button
        variant="ghost"
        size="sm"
        disabled
        title="Coming soon — automated email sending is not implemented yet."
        aria-label="Email — coming soon"
      >
        <Mail className="h-4 w-4" />
        <span className="hidden sm:ml-1 sm:inline">Email</span>
      </Button>

      {/* View — always navigates to the submission detail page */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        title="View submission details"
        aria-label="View submission details"
      >
        <Link href={`/dashboard/submissions/${submissionId}`}>
          <Eye className="h-4 w-4" />
          <span className="hidden sm:ml-1 sm:inline">View</span>
        </Link>
      </Button>

      {/* Download — only available when a signed PDF exists */}
      {signedPdfUrl && (
        <Button
          variant="ghost"
          size="sm"
          asChild
          title="Download signed PDF"
          aria-label="Download signed PDF"
        >
          <a
            href={signedPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={`submission-${submissionId}.pdf`}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:ml-1 sm:inline">DL</span>
          </a>
        </Button>
      )}

      {/* Tracking History */}
      <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadTracking()}
            title="View tracking history"
            aria-label="View tracking history"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:ml-1 sm:inline">Track</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <History className="h-4 w-4 text-primary" />
              Tracking History
            </DialogTitle>
            <DialogDescription>
              Activity log for this form submission
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
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
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                {events.map((event) => (
                  <div key={event.id} className="relative pb-4">
                    <div className="flex gap-3">
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                        {eventIcons[event.event_type] || (
                          <Clock className="h-4 w-4 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="text-sm font-medium capitalize text-foreground">
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
