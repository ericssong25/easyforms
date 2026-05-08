"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnrollMFA } from "@/components/auth/enroll-mfa";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Factor {
  id: string;
  friendly_name?: string;
  factor_type: "totp" | "phone";
  status: "verified" | "unverified";
  created_at: string;
  updated_at: string;
}

interface MfaState {
  hasFactors: boolean;
  factors: Factor[];
  currentLevel: string;
  nextLevel: string;
}

export default function SecurityPage() {
  const supabase = createClient();
  const [mfaState, setMfaState] = useState<MfaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showingEnroll, setShowingEnroll] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchMfaStatus = useCallback(async () => {
    try {
      const factors = await supabase.auth.mfa.listFactors();
      const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      const totpFactors = factors.data?.totp ?? [];
      setMfaState({
        hasFactors: totpFactors.length > 0,
        factors: totpFactors,
        currentLevel: aal.data?.currentLevel ?? "aal1",
        nextLevel: aal.data?.nextLevel ?? "aal1",
      });
    } catch (err) {
      console.error("Failed to fetch MFA status:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchMfaStatus();
  }, [fetchMfaStatus]);

  const handleEnrolled = () => {
    setShowingEnroll(false);
    fetchMfaStatus();
    toast.success("Your account is now more secure");
  };

  const handleCancelEnroll = () => {
    setShowingEnroll(false);
  };

  const handleUnenroll = async (factorId: string) => {
    setUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("Two-factor authentication has been disabled");
      fetchMfaStatus();
      setDialogOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to disable 2FA";
      toast.error(message);
    } finally {
      setUnenrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showingEnroll) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <button
          onClick={() => setShowingEnroll(false)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to security settings
        </button>
        <EnrollMFA
          onEnrolled={handleEnrolled}
          onCancelled={handleCancelEnroll}
        />
      </div>
    );
  }

  const isMfaEnabled = mfaState?.hasFactors;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account security settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isMfaEnabled ? (
              <ShieldCheck className="h-5 w-5 text-emerald" />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground" />
            )}
            Two-factor authentication
          </CardTitle>
          <CardDescription>
            {isMfaEnabled
              ? "Your account is protected with an additional layer of security."
              : "Add an extra layer of security to your account by requiring a code from your authenticator app when signing in."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isMfaEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    Two-factor authentication is enabled
                  </p>
                  <p className="text-xs text-emerald-600">
                    You&apos;ll need your authenticator app when signing in
                  </p>
                </div>
              </div>

              {mfaState?.factors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy/10">
                      <Smartphone className="h-4 w-4 text-navy" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Authenticator app
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added{" "}
                        {new Date(factor.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {factor.status === "verified" ? "Active" : "Pending"}
                  </Badge>
                </div>
              ))}

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Disable two-factor authentication
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Disable two-factor authentication?</DialogTitle>
                    <DialogDescription>
                      This will remove the extra layer of security from your
                      account. You&apos;ll only need your password to sign in.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={unenrolling}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const factor = mfaState?.factors[0];
                        if (factor) handleUnenroll(factor.id);
                      }}
                      disabled={unenrolling}
                    >
                      {unenrolling ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      {unenrolling ? "Disabling..." : "Disable 2FA"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800">
                  Two-factor authentication is not enabled
                </p>
                <p className="text-xs text-amber-600">
                  We strongly recommend enabling two-factor authentication to
                  protect your account and keep your clients&apos; information
                  secure. This adds an extra verification step when signing in.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {!isMfaEnabled && (
          <CardFooter>
            <Button
              onClick={() => setShowingEnroll(true)}
              variant="navy"
              className="gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Set up two-factor authentication
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
