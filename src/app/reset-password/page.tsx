"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, FileText, Lock, Shield, Loader } from "lucide-react";
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

type Status = "checking" | "ready" | "invalid";

const PASSWORD_MIN_LENGTH = 8;

function hasRecoveryMarkerCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .some(
      (c) =>
        c.startsWith("pw-reset-active=") &&
        c.slice("pw-reset-active=".length) === "1"
    );
}

function clearRecoveryMarkerCookie() {
  if (typeof document === "undefined") return;
  document.cookie =
    "pw-reset-active=; Path=/reset-password; Max-Age=0; SameSite=Lax";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" && session?.user) {
          setEmail(session.user.email ?? null);
          setStatus("ready");
        }
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && hasRecoveryMarkerCookie()) {
        setEmail(session.user.email ?? null);
        setStatus("ready");
      } else {
        setStatus("invalid");
      }

      return () => {
        subscription.unsubscribe();
      };
    })();
  }, []);

  const handleCancel = async () => {
    clearRecoveryMarkerCookie();
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    router.push("/login");
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      toast.error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      clearRecoveryMarkerCookie();
      await supabase.auth.signOut();

      toast.success("Contraseña actualizada. Inicia sesión con tu nueva contraseña.");
      router.push("/login");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update password";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy/5 via-background to-slate-blue/5 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">Verifying link...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
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
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Link is invalid or expired</CardTitle>
              <CardDescription>
                Password reset links expire after 1 hour. Request a new one and
                use it right away.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="navy" className="w-full">
                <Link href="/forgot-password">Request a new reset link</Link>
              </Button>
            </CardContent>
            <CardFooter>
              <Link
                href="/login"
                className="text-xs text-muted-foreground hover:text-navy"
              >
                Back to sign in
              </Link>
            </CardFooter>
          </Card>
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
            <CardTitle className="text-xl">Establecer nueva contraseña</CardTitle>
            <CardDescription>
              {email
                ? `Estás cambiando la contraseña para: ${email}`
                : "Estás cambiando la contraseña de tu cuenta."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    autoComplete="new-password"
                    autoFocus
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">
                  Debe tener al menos {PASSWORD_MIN_LENGTH} caracteres
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  variant="navy"
                  className="w-full sm:flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Confirmar
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:flex-1"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </form>
          <CardFooter>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 text-emerald" />
              <span>Encrypted connection — Your data is secure</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
