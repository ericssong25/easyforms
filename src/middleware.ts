import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Exclude everything that the public signer (anon, no Supabase session)
// must be able to reach. The middleware's `updateSession` redirects
// unauthenticated visitors to /login, which is correct for the
// dashboard but wrong for the public signing flow.
//
//   forms/.*            → /forms/[id] (the signing page itself)
//   api/verify-submission → Phase B identity verification (server uses
//                          service-role, does NOT depend on the caller's
//                          session)
//   api/track-event     → public-signer tracking writes (service-role)
//   api/generate-pdf    → public PDF rendering (service-role +
//                          Browserless)
//   api/upload-signed-pdf → public storage upload (service-role)
export const config = {
  // Next.js middleware matchers use path-to-regexp WITHOUT capturing
  // groups. All exclusions are inlined into a single negative-lookahead
  // regex so any of these prefixes is excluded from the middleware run:
  //
  //   - _next/static, _next/image, favicon.ico
  //   - forms/ (the public signing page, must work with no auth)
  //   - api/verify-submission, api/track-event, api/generate-pdf,
  //     api/upload-signed-pdf (the public signer's API endpoints, all
  //     run server-side with service-role and do NOT depend on the
  //     caller's session)
  //   - common static asset extensions
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|forms|api/(?:verify-submission|track-event|generate-pdf|upload-signed-pdf)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
