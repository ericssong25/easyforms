"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QrCode, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface EnrollMFAProps {
  onEnrolled: () => void;
  onCancelled: () => void;
}

export function EnrollMFA({ onEnrolled, onCancelled }: EnrollMFAProps) {
  const supabase = createClient();
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (cancelled) return;
      if (enrollError) {
        setError(enrollError.message);
        setInitializing(false);
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setInitializing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      setError("Please enter a 6-digit verification code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });
      if (verify.error) throw verify.error;

      toast.success("Two-factor authentication has been enabled");
      onEnrolled();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-navy" />
          Set up authenticator app
        </CardTitle>
        <CardDescription>
          Scan the QR code with your authenticator app (Google Authenticator,
          Authy, 1Password, etc.) and enter the verification code below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR Code for authenticator app"
              className="h-48 w-48"
            />
          </div>

          <div className="w-full space-y-2">
            <p className="text-center text-xs text-muted-foreground">
              Can&apos;t scan the QR code? Enter this code manually:
            </p>
            <code className="block break-all rounded-lg bg-muted p-2 text-center text-xs">
              {secret}
            </code>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="verify-code">Verification code</Label>
          <Input
            id="verify-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={verifyCode}
            onChange={(e) =>
              setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="text-center text-lg tracking-widest"
            autoComplete="one-time-code"
          />
        </div>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button variant="outline" onClick={onCancelled} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleVerify}
          disabled={loading || verifyCode.length !== 6}
          className="flex-1"
          variant="navy"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          {loading ? "Verifying..." : "Enable 2FA"}
        </Button>
      </CardFooter>
    </Card>
  );
}
