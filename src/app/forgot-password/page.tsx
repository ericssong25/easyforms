"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Mail, Shield } from "lucide-react";
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
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success("Check your email for the reset link");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send reset email";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
          {sent ? (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Check your email</CardTitle>
                <CardDescription>
                  We sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  The link expires in 1 hour.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                  <p>
                    Didn&apos;t get the email? Check your spam folder, or wait a
                    minute and try again from a fresh reset.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                >
                  Try a different email
                </Button>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-navy"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </Link>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Forgot your password?</CardTitle>
                <CardDescription>
                  Enter the email associated with your account and we&apos;ll
                  send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
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
                      autoFocus
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="navy"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      "Sending..."
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send reset link
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
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-navy"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </Link>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
