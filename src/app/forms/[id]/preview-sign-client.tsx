"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DocumentSheet } from "@/components/document/document-sheet";
import { normalizeLogo, type TemplateLogo } from "@/lib/document-logo";
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
  ZoomIn,
  ZoomOut,
  Maximize2,
  Square,
} from "lucide-react";

interface PreviewAndSignProps {
  submissionId: string;
  status: string;
  templateName: string;
  templateLogo: unknown;
  agencyName: string;
}

type ZoomMode = "fit" | "actual";

interface VerifySuccess {
  ok: true;
  status: string;
  template: {
    name: string;
    logo: unknown;
    html: string;
  };
}

interface VerifyFailure {
  ok: false;
  error?: string;
  lockedOut?: boolean;
  retryAfterSec?: number;
}

export function PreviewAndSign({
  submissionId,
  status: initialStatus,
  templateName,
  templateLogo,
  agencyName,
}: PreviewAndSignProps) {
  const safeLogo: TemplateLogo = normalizeLogo(templateLogo);

  // --- Verification state ---
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [ssnLast4, setSsnLast4] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [lastName, setLastName] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [lockedOut, setLockedOut] = useState(false);

  // --- Post-verify state (server-rendered document) ---
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<string>(initialStatus);

  // --- Signature state ---
  const sigRef = useRef<SignatureCanvas>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  // --- Zoom state (used in the post-verify document view) ---
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [manualZoom, setManualZoom] = useState(1);

  const trackEvent = useCallback(
    async (eventType: "viewed" | "opened") => {
      try {
        await fetch("/api/track-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, eventType }),
        });
      } catch {
        // Tracking is best-effort; never block the UI on it.
      }
    },
    [submissionId]
  );

  // Record a "viewed" event once the verification form first paints.
  useEffect(() => {
    if (currentStatus === "signed") return;
    void trackEvent("viewed");
  }, [trackEvent, currentStatus]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyError("");
    setLockedOut(false);
    try {
      const res = await fetch("/api/verify-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          ssnLast4,
          phoneLast4,
          lastName,
        }),
      });

      // Even on 429 we still get a JSON body from the server.
      const data = (await res.json().catch(() => null)) as
        | VerifySuccess
        | VerifyFailure
        | null;

      if (res.status === 429) {
        setLockedOut(true);
        setVerifyError(
          "Too many attempts. Please try again in a few minutes."
        );
        return;
      }

      if (!res.ok || !data) {
        setVerifyError(
          "The information provided does not match our records. Please try again."
        );
        return;
      }

      if (data.ok === false) {
        if (data.lockedOut) {
          setLockedOut(true);
          setVerifyError(
            "Too many attempts. Please try again in a few minutes."
          );
          return;
        }
        setVerifyError(
          data.error ||
            "The information provided does not match our records. Please try again."
        );
        return;
      }

      // data.ok === true
      setRenderedHtml(data.template.html);
      setCurrentStatus(data.status);
      setVerified(true);
      toast.success("Identity verified");
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : "Verification failed"
      );
    } finally {
      setVerifying(false);
    }
  };

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

  // PDF: hardened. Read text() on !ok, only parse JSON on success.
  const generateAndUploadPdf = async () => {
    if (!sigRef.current) return;
    setSigning(true);
    try {
      // Trim signature canvas.
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
      trimCtx.drawImage(
        rawCanvas,
        left - 2, top - 2, trimCanvas.width, trimCanvas.height,
        0, 0, trimCanvas.width, trimCanvas.height
      );
      const signatureDataUrl = trimCanvas.toDataURL("image/png");

      // PDF endpoint.
      const pdfRes = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: renderedHtml,
          signature: signatureDataUrl,
          logo: safeLogo,
        }),
      });

      if (!pdfRes.ok) {
        // Read raw text — server may have returned plain text or HTML.
        const raw = await pdfRes.text().catch(() => "");
        console.error("[generate-pdf] server error:", pdfRes.status, raw);
        throw new Error(
          raw || `PDF generation failed (HTTP ${pdfRes.status})`
        );
      }

      const data = (await pdfRes.json().catch(() => null)) as
        | { pdf: string }
        | null;
      if (!data?.pdf) {
        throw new Error("PDF generation returned no data");
      }
      const pdfBytes = Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0));
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

      // Auto-download.
      const now = new Date();
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `signed-document-${now.toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      // Upload to storage. The upload endpoint already runs server-side
      // with the service-role key and logs the "signed" tracking event.
      const formData = new FormData();
      formData.append("file", pdfBlob, "signed.pdf");
      formData.append("submissionId", submissionId);
      // The upload route writes to `${agentId}/${submissionId}/...` so it
      // needs the agent id. We pull it from the post-verify response shape:
      // we don't have it client-side, so we pass an empty string and the
      // server resolves it via the submission row. To keep that contract,
      // we instead look it up via the submission_id server-side. The
      // existing /api/upload-signed-pdf reads agentId from the form, so
      // for now we pass the submission id and let the server resolve the
      // agent via a follow-up query (handled by upload route).
      formData.append("agentId", "");
      formData.append("signatureData", signatureDataUrl);

      const uploadRes = await fetch("/api/upload-signed-pdf", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const raw = await uploadRes.text().catch(() => "");
        console.error("[upload-signed-pdf] server error:", uploadRes.status, raw);
        throw new Error(raw || `Upload failed (HTTP ${uploadRes.status})`);
      }
      const uploaded = (await uploadRes.json().catch(() => null)) as
        | { url: string }
        | null;
      if (!uploaded?.url) {
        throw new Error("Upload returned no URL");
      }
      setGeneratedPdfUrl(uploaded.url);
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

  // -------------------- Rendering --------------------

  if (currentStatus === "signed") {
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
            {generatedPdfUrl && (
              <a
                href={generatedPdfUrl}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-navy hover:underline"
                target="_blank"
                rel="noreferrer"
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
            Please answer the security questions below to access your document
            from {agencyName}.
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
                disabled={lockedOut}
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
                disabled={lockedOut}
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
                disabled={lockedOut}
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
              disabled={verifying || lockedOut}
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

  // ---------- Post-verify: document + signing controls ----------

  const effectiveZoom = zoomMode === "fit" ? undefined : manualZoom;
  const isFit = zoomMode === "fit";

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-4 text-center sm:mb-6">
        <h1 className="text-xl font-bold text-navy sm:text-2xl">{templateName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and sign your document
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:gap-6">
        {/* LEFT: document (vertically scrollable) */}
        <div className="order-1 min-w-0 lg:order-1">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-slate-blue" />
                Document Preview
              </CardTitle>
              <CardDescription>
                Scroll down to read the entire document.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 sm:p-4">
                <ZoomableDocument
                  html={renderedHtml}
                  logo={safeLogo}
                  zoom={effectiveZoom}
                  fitToContainer
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: signing controls (sticky on desktop) */}
        <div className="order-2 min-w-0 space-y-4 lg:sticky lg:top-4 lg:order-2 lg:self-start">
          <ZoomControls
            zoomMode={zoomMode}
            onSetFit={() => setZoomMode("fit")}
            onSetActual={() => {
              setZoomMode("actual");
              setManualZoom(1);
            }}
            onZoomIn={() => {
              setZoomMode("actual");
              setManualZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)));
            }}
            onZoomOut={() => {
              setZoomMode("actual");
              setManualZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
            }}
            currentZoom={isFit ? "fit" : manualZoom}
          />

          <Card className="border-slate-200 shadow-sm">
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
      </div>
    </div>
  );
}

// -------------------- ZoomableDocument --------------------

/**
 * Wraps DocumentSheet in a vertically-scrollable container with
 * pinch-to-zoom + button zoom. When `fit` is true, the sheet auto-fits
 * the container width and the container is just a single vertical scroll
 * for the full sheet. When `fit` is false, the user can pan/zoom freely
 * within the document area.
 */
function ZoomableDocument({
  html,
  logo,
  zoom,
  fitToContainer,
}: {
  html: string;
  logo: TemplateLogo;
  zoom?: number;
  fitToContainer: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Track pinch-zoom and ctrl-wheel zoom separately from the button
  // control, so pinch-zoom persists across re-renders.
  const [pinchZoom, setPinchZoom] = useState(1);
  const lastDistance = useRef<number | null>(null);

  const effectiveZoom =
    zoom != null ? zoom * pinchZoom : pinchZoom;

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistance.current = Math.hypot(dx, dy);
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDistance.current != null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.hypot(dx, dy);
      const ratio = d / lastDistance.current;
      lastDistance.current = d;
      setPinchZoom((z) => clampZoom(z * ratio));
    }
  };
  const onTouchEnd = () => {
    lastDistance.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      setPinchZoom((z) => clampZoom(z * delta));
    }
  };

  return (
    <div
      ref={scrollRef}
      className="relative w-full overflow-auto touch-pan-x touch-pan-y"
      style={{
        // The container is the only scrollable area for the document.
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        maxHeight: "min(80vh, 900px)",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      <DocumentSheet
        html={html}
        logo={logo}
        showSignatureZone
        signatureLabel="Signature"
        signatureMeta="Signature is added when the document is signed"
        zoom={effectiveZoom}
        fitToContainer={fitToContainer}
      />
    </div>
  );
}

function clampZoom(z: number) {
  return Math.max(0.5, Math.min(3, +z.toFixed(2)));
}

// -------------------- ZoomControls --------------------

function ZoomControls({
  zoomMode,
  currentZoom,
  onSetFit,
  onSetActual,
  onZoomIn,
  onZoomOut,
}: {
  zoomMode: ZoomMode;
  currentZoom: number | "fit";
  onSetFit: () => void;
  onSetActual: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  const isFit = zoomMode === "fit";
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            aria-label="Zoom out"
            title="Zoom out"
            disabled={isFit}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[3.5rem] text-center text-xs font-medium tabular-nums text-slate-600">
            {isFit ? "Fit" : `${Math.round((currentZoom as number) * 100)}%`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            aria-label="Zoom in"
            title="Zoom in"
            disabled={isFit}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={isFit ? "default" : "ghost"}
            size="sm"
            onClick={onSetFit}
            aria-label="Fit width"
            title="Fit width"
            className="h-8 gap-1 px-2 text-xs"
          >
            <Maximize2 className="h-3 w-3" />
            Fit
          </Button>
          <Button
            type="button"
            variant={!isFit ? "default" : "ghost"}
            size="sm"
            onClick={onSetActual}
            aria-label="Actual size"
            title="Actual size (100%)"
            className="h-8 gap-1 px-2 text-xs"
          >
            <Square className="h-3 w-3" />
            100%
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
