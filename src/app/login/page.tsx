"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, Shield, FileText, Loader } from "lucide-react";
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
import { VerifyMFA } from "@/components/auth/verify-mfa";
import { toast } from "sonner";

type LoginStep = "credentials" | "mfa" | "checking";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("checking");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setStep("credentials");
        return;
      }

      const hasRecoveryMarker =
        document.cookie
          .split(";")
          .map((c) => c.trim())
          .some(
            (c) =>
              c.startsWith("pw-reset-active=") && c.slice("pw-reset-active=".length) === "1"
          );

      if (hasRecoveryMarker) {
        router.push("/reset-password");
        router.refresh();
        return;
      }

      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel) {
        setStep("mfa");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    })();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel) {
        setStep("mfa");
        return;
      }

      toast.success("Signed in successfully");
      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to sign in";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerified = () => {
    toast.success("Signed in successfully");
    router.push("/dashboard");
    router.refresh();
  };

  if (step === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy/5 via-background to-slate-blue/5 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (step === "mfa") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy/5 via-background to-slate-blue/5 px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-navy">
              Easy Forms
            </h1>
          </div>

          <Card className="border-slate-200 shadow-lg">
            <CardContent className="pt-6">
              <VerifyMFA onVerified={handleMfaVerified} />
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Having trouble? Contact your administrator for help.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy/5 via-background to-slate-blue/5 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">
            Easy Forms
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Secure document management for insurance agents
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@agency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-navy"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="navy"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign in securely
                  </>
                )}
              </Button>
            </CardContent>
          </form>
          <CardFooter className="flex flex-col space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 text-emerald" />
              <span>Encrypted connection — Your data is secure</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <span className="font-medium text-foreground">
                Contact your administrator
              </span>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
