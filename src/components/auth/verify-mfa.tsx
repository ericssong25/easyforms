"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, AlertCircle, Smartphone } from "lucide-react";

interface VerifyMFAProps {
  onVerified: () => void;
}

export function VerifyMFA({ onVerified }: VerifyMFAProps) {
  const supabase = createClient();
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      setError("Please enter a 6-digit verification code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;

      const totpFactor = factors.data.totp[0];
      if (!totpFactor) {
        throw new Error("No authentication factor found");
      }

      const factorId = totpFactor.id;
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const challengeId = challenge.data.id;
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: verifyCode,
      });
      if (verify.error) throw verify.error;

      onVerified();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy/10">
          <Smartphone className="h-6 w-6 text-navy" />
        </div>
        <h2 className="text-lg font-semibold">Two-factor authentication</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="mfa-code">Authentication code</Label>
        <Input
          id="mfa-code"
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

      <Button
        onClick={handleVerify}
        disabled={loading || verifyCode.length !== 6}
        className="w-full"
        variant="navy"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="mr-2 h-4 w-4" />
        )}
        {loading ? "Verifying..." : "Verify and sign in"}
      </Button>
    </div>
  );
}
