"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MfaBanner() {
  const supabase = createClient();
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) return;
        if (data.currentLevel === "aal1" && data.nextLevel === "aal1") {
          setShow(true);
        }
      } catch {
        // silently fail
      }
    })();
  }, [supabase]);

  if (!show) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-6 py-3">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-800">
            Protect your account with two-factor authentication
          </p>
          <p className="text-xs text-amber-600">
            Add an extra layer of security to keep your data and client
            information safe.
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" asChild>
        <Link href="/dashboard/security" className="gap-1">
          Set up now
          <ArrowRight className="h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}
