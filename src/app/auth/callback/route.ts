import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\") &&
    !/^\/[^/]*:/i.test(rawNext)
      ? rawNext
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectResponse = NextResponse.redirect(`${origin}${next}`);

      if (next === "/reset-password") {
        redirectResponse.cookies.set("pw-reset-active", "1", {
          path: "/reset-password",
          maxAge: 60 * 10,
          sameSite: "lax",
        });
      }

      return redirectResponse;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
