"use client";

import { useRef, useState, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { createClient } from "@/lib/supabase/client";
import { getTrackingMetadata } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  PenLine,
  RotateCcw,
  Check,
  Shield,
  Download,
  FileText,
  Lock,
  ArrowRight,
} from "lucide-react";

interface PreviewAndSignProps {
  submission: Record<string, unknown>;
}

export function PreviewAndSign({ submission }: PreviewAndSignProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [verified, setVerified] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  const [ssnLast4, setSsnLast4] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [lastName, setLastName] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const template = submission.templates as { name: string; content: string };
  const rawClient = (submission.clients || {}) as Record<string, unknown>;
  const rawPolicy = rawClient?.policies as Record<string, unknown> | null;
  const rawDependents = (rawClient?.dependents || []) as Record<string, unknown>[];
  const rawAgent = (submission.agents || {}) as Record<string, unknown>;

  const verificationData = (submission.verification_data || {}) as {
    ssn_last4?: string;
    phone_last4?: string;
    last_name?: string;
  };

  const handleVerify = async () => {
    const supabase = createClient();
    setVerifying(true);
    setVerifyError("");

    const expectedSsn = verificationData.ssn_last4 || "";
    const expectedPhone = verificationData.phone_last4 || "";
    const expectedLastName = verificationData.last_name || "";

    const ssnInput = ssnLast4.replace(/\D/g, "");
    const phoneInput = phoneLast4.replace(/\D/g, "");
    const nameInput = lastName.trim().toLowerCase();

    const isCorrect =
      ssnInput === expectedSsn &&
      (expectedPhone === "" || phoneInput === expectedPhone) &&
      nameInput === expectedLastName;

    if (!isCorrect) {
      const meta = await getTrackingMetadata();
      await supabase.from("tracking_events").insert({
        submission_id: submission.id,
        event_type: "verification_failed",
        ...meta,
      });
      setVerifyError(
        "The information provided does not match our records. Please try again."
      );
      setVerifying(false);
      return;
    }

    const meta = await getTrackingMetadata();
    await supabase.from("tracking_events").insert({
      submission_id: submission.id,
      event_type: "verified",
      ...meta,
    });

    if (submission.status === "sent") {
      await supabase
        .from("form_submissions")
        .update({ status: "opened" })
        .eq("id", submission.id);

      const meta2 = await getTrackingMetadata();
      await supabase.from("tracking_events").insert({
        submission_id: submission.id,
        event_type: "opened",
        ...meta2,
      });
    }

    setVerified(true);
    setVerifying(false);
    toast.success("Identity verified");
  };

  const renderContent = useCallback(() => {
    let html = template.content || "";

    const clientApplies = Boolean(rawClient.applies_to_policy);
    const coveredDependents = rawDependents.filter((d) =>
      Boolean(d.applies_to_policy)
    ).length;
    const coverageCount = (clientApplies ? 1 : 0) + coveredDependents;
    const today = new Date().toLocaleDateString("en-US");

    const vars: Record<string, string> = {
      first_name: String(rawClient.first_name || ""),
      last_name: String(rawClient.last_name || ""),
      email: String(rawClient.email || ""),
      phone: String(rawClient.phone || ""),
      address: String(rawClient.address || ""),
      city: String(rawClient.city || ""),
      state: String(rawClient.state || ""),
      zip: String(rawClient.zip || ""),
      date_of_birth: String(rawClient.date_of_birth || ""),
      subscriber_number: String(rawClient.subscriber_number || ""),
      tax_filing_status: String(rawClient.tax_filing_status || ""),
      marital_status: String(rawClient.marital_status || ""),
      projected_annual_income: rawClient.holder_income
        ? `$${Number(rawClient.holder_income).toLocaleString("en-US")}`
        : "",
      tax_dependents_count: rawClient.tax_dependents_count != null
        ? String(rawClient.tax_dependents_count)
        : "",
      coverage_count: String(coverageCount),
      policy_number: String(rawPolicy?.policy_number || "N/A"),
      carrier: String(rawPolicy?.carrier || "N/A"),
      plan: String(rawPolicy?.plan || "N/A"),
      premium: rawPolicy?.premium
        ? `$${Number(rawPolicy.premium).toFixed(2)}/mo`
        : "N/A",
      effective_date: String(rawPolicy?.effective_date || "N/A"),
      agency_name: String(rawAgent.agency_name || "Your Agency"),
      npn: String(rawAgent.npn || "N/A"),
      agent_name: String(rawAgent.full_name || ""),
      today_date: today,
    };

    for (const [key, value] of Object.entries(vars)) {
      html = html.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }

    return html;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.content]);

  const clearSignature = () => {
    sigRef.current?.clear();
    setIsSigned(false);
  };

  const handleSign = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Please draw your signature first");
      return;
    }
    setIsSigned(true);
    toast.success("Signature captured");
  };

  const generateAndUploadPdf = async () => {
    if (!sigRef.current) return;
    setSigning(true);
    try {
      // Trim signature canvas
      const rawCanvas = sigRef.current.getCanvas();
      const ctx = rawCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      const imageData = ctx.getImageData(0, 0, rawCanvas.width, rawCanvas.height);
      const pixels = imageData.data;
      let top = rawCanvas.height,
        bottom = 0,
        left = rawCanvas.width,
        right = 0;

      for (let py = 0; py < rawCanvas.height; py++) {
        for (let px = 0; px < rawCanvas.width; px++) {
          if (pixels[(py * rawCanvas.width + px) * 4 + 3] > 0) {
            if (py < top) top = py;
            if (py > bottom) bottom = py;
            if (px < left) left = px;
            if (px > right) right = px;
          }
        }
      }
      if (top > bottom || left > right) {
        top = 0; bottom = rawCanvas.height; left = 0; right = rawCanvas.width;
      }
      const trimCanvas = document.createElement("canvas");
      trimCanvas.width = right - left + 4;
      trimCanvas.height = bottom - top + 4;
      const trimCtx = trimCanvas.getContext("2d")!;
      trimCtx.drawImage(rawCanvas, left - 2, top - 2, trimCanvas.width, trimCanvas.height, 0, 0, trimCanvas.width, trimCanvas.height);
      const signatureDataUrl = trimCanvas.toDataURL("image/png");

      // Render content
      const contentHtml = renderContent();

      // Generate PDF via Puppeteer (server-side, browser-quality rendering)
      const pdfRes = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: contentHtml, signature: signatureDataUrl }),
      });

      if (!pdfRes.ok) {
        const err = await pdfRes.json();
        throw new Error(err.error || "PDF generation failed");
      }

      const { pdf } = await pdfRes.json();
      const pdfBytes = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

      // Auto-download
      const now = new Date();
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `signed-document-${now.toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      // Upload to storage via server API
      const formData = new FormData();
      formData.append("file", pdfBlob, "signed.pdf");
      formData.append("submissionId", String(submission.id));
      formData.append("agentId", String(submission.agent_id));
      formData.append("signatureData", signatureDataUrl);

      const uploadRes = await fetch("/api/upload-signed-pdf", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const { url } = await uploadRes.json();
      setGeneratedPdfUrl(url);
      toast.success("Document signed and downloaded!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate PDF"
      );
    } finally {
      setSigning(false);
    }
  };

  // Already signed
  if (submission.status === "signed") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:py-12">
        <Card className="border-slate-200 text-center">
          <CardContent className="py-8 sm:py-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-8 w-8 text-emerald" />
            </div>
            <h1 className="text-xl font-bold text-navy sm:text-2xl">
              Document Already Signed
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This document has already been signed and saved.
            </p>
            {Boolean(submission.signed_pdf_url) && (
              <a
                href={String(submission.signed_pdf_url)}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-navy hover:underline"
                target="_blank"
              >
                <Download className="h-4 w-4" />
                Download Signed PDF
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verification screen
  if (!verified) {
    return (
      <div className="mx-auto max-w-md space-y-6 px-4 py-8 sm:py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-navy text-white">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">
            Verify Your Identity
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Please answer the security questions below to access your document.
          </p>
        </div>

        <Card className="border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm">Security Verification</CardTitle>
            <CardDescription>
              Answer the following to confirm your identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ssn-last4">Last 4 digits of SSN</Label>
              <Input
                id="ssn-last4"
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="••••"
                value={ssnLast4}
                onChange={(e) =>
                  setSsnLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone-last4">Last 4 digits of Phone</Label>
              <Input
                id="phone-last4"
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="••••"
                value={phoneLast4}
                onChange={(e) =>
                  setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                type="text"
                autoComplete="off"
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            {verifyError && (
              <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                {verifyError}
              </div>
            )}
            <Button
              variant="navy"
              className="w-full"
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying ? (
                "Verifying..."
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Verify & Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          <Shield className="mr-1 inline h-3 w-3 text-emerald" />
          Your information is encrypted and secure
        </p>
      </div>
    );
  }

  // Main form + signature
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
      <div className="text-center">
        <h1 className="text-xl font-bold text-navy sm:text-2xl">
          {template.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and sign your document
        </p>
      </div>

      <Card className="border-slate-200 shadow-md">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-slate-blue" />
            Document Preview
          </CardTitle>
          <CardDescription>
            Please review the document before signing
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="max-w-[210mm] mx-auto overflow-y-auto overflow-x-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-inner sm:p-6">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderContent() }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-md">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-sm">
            <PenLine className="h-4 w-4 shrink-0 text-slate-blue" />
            Your Signature
          </CardTitle>
          <CardDescription>
            Draw your signature in the area below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <div className="overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-white">
            <SignatureCanvas
              ref={sigRef}
              penColor="#1a3a5c"
              canvasProps={{
                className: "w-full h-[120px] sm:h-[150px] rounded-xl",
                style: { width: "100%", height: "150px" },
              }}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" size="sm" onClick={clearSignature}>
              <RotateCcw className="mr-1 h-3 w-3" />
              Clear
            </Button>
            <Button variant="navy" size="sm" onClick={handleSign}>
              <PenLine className="mr-1 h-3 w-3" />
              Capture Signature
            </Button>
          </div>
          {isSigned && (
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <Check className="h-4 w-4" />
                Signature captured successfully
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          variant="navy"
          size="lg"
          onClick={generateAndUploadPdf}
          disabled={!isSigned || signing}
          className="w-full gap-2 sm:w-auto sm:px-8"
        >
          {signing ? (
            "Generating PDF..."
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Sign Document & Generate PDF
            </>
          )}
        </Button>
      </div>

      {generatedPdfUrl && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-4 text-center">
            <Check className="mx-auto mb-2 h-8 w-8 text-emerald" />
            <p className="text-sm font-medium text-emerald-700 sm:text-base">
              PDF downloaded and saved to your device
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              A copy has been sent to your agent
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
