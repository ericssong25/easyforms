# AGENTS.md

Compact, repo-specific guidance for agents working in `easy-forms-new`.

## What this is

Next.js 14 (App Router) SaaS for insurance agents to build, send, and e‑sign forms. Stack: React 18, TypeScript, Tailwind, shadcn/ui (new-york), Supabase (auth + Postgres + storage), TipTap rich‑text editor, react-hook-form + zod, Browserless.io for headless PDF generation.

## Commands

`package.json` only exposes four scripts — there is no test runner, no typecheck script, no formatter. Do not invent commands.

- `npm run dev` — local dev server on `:3000`
- `npm run build` — production build (`next build`)
- `npm run start` — serve a prior build
- `npm run lint` — `next lint` (ESLint v8, extends `next/core-web-vitals` + `next/typescript`)

Run `npm run lint` after changes. There is no `tsc` step; type checking happens implicitly through `next lint` and the build.

## Path aliases

`@/*` maps to `./src/*` (see `tsconfig.json:21` and `components.json:16-21`). shadcn aliases are `components`, `ui`, `lib`, `utils`, `hooks` — all under `@/`.

## Required environment

`.env.local` must define:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used by `/api/upload-signed-pdf`
- `BROWSERLESS_TOKEN` — required by `/api/generate-pdf`; service will 500 without it

## Supabase setup

Migrations live in `supabase/migrations/` and must be applied to the project referenced by `NEXT_PUBLIC_SUPABASE_URL`. `001_initial_schema.sql` creates the schema + RLS + a trigger that auto-inserts a row into `agents` on `auth.users` insert. `002_storage_setup.sql` creates the private `signed_forms` bucket with per-folder RLS keyed on `auth.uid()`.

## Architecture map

- `src/middleware.ts` — Next middleware, calls `updateSession` in `src/lib/supabase/middleware.ts`. Matcher excludes `forms/.*` and static assets; everything else is gated behind auth and TOTP (`aal1 → aal2` redirect to `/login`).
- `src/app/layout.tsx` — root layout, mounts `Toaster` (sonner) globally.
- `src/app/page.tsx` — `redirect("/dashboard")`. Root URL is not a real page.
- `src/app/dashboard/layout.tsx` — server component, re-checks auth, loads the agent row, renders sidebar + header + MFA banner.
- `src/app/forms/[id]/` — public (unauthenticated) client signing flow. `forms` path is excluded from middleware on purpose.
- `src/app/api/generate-pdf/route.ts` — POST `{ html, signature }`, returns `{ pdf }` (base64). Hard-depends on `BROWSERLESS_TOKEN`.
- `src/app/api/upload-signed-pdf/route.ts` — `multipart/form-data` with `file`, `submissionId`, `agentId`, `signatureData`. Uses the service-role key to upload to `signed_forms` at `${agentId}/${submissionId}/signed.pdf`, then updates the submission row + inserts a `tracking_events` row.
- `src/lib/supabase/` — three factories: `client.ts` (browser, `@supabase/ssr`), `server.ts` (RSC, `await cookies()` — note the `await`, this is Next 15-style), `middleware.ts` (request/response cookie bridging).
- `src/lib/actions/data.ts` — server actions for clients, policies, dependents, templates, submissions. Always re-check `auth.getUser()`; throw if missing.
- `src/lib/tracking.ts` — parses `User-Agent` and resolves client IP via `api.ipify.org` (cached). `getTrackingMetadataClient()` is sync and returns `"loading"` for IP; `getTrackingMetadata()` awaits the IP. `parseServerMetadata(ua, xForwardedFor, xRealIp)` is for server routes.
- `src/lib/types.ts` — domain types. `Client.ssn_encrypted` is the only SSN field; everything else is plaintext.

## Conventions

- shadcn/ui is configured (`components.json`) for the new-york style, lucide icons, css-variable theming. Add new primitives with `npx shadcn add <name>` — do not hand-roll components that already exist in `src/components/ui/`.
- `next.config.mjs` sets `images.remotePatterns` to allow **all hostnames**. Tighten this before production.
- `eslint-config-next` is pinned to `14.2.35`; do not bump it without confirming the matching `next` version.
- Server actions live in `src/lib/actions/`, named `*Action`. They `revalidatePath` after mutations.
- `useAuth` lives in `src/hooks/use-auth.ts`. Address autocomplete hook is `src/hooks/use-address-autocomplete.ts`.
- Toast UX: use `sonner` (`import { toast } from "sonner"`); a `<Toaster />` shim is also mounted at `src/components/ui/toaster.tsx` for shadcn components that expect a hook-style toaster.

## Verified gotchas in this repo

These are real mismatches between the SQL schema and the application code. They will fail at runtime on a fresh DB; the codebase has not been updated to match.

- `tracking_events` is declared in `001_initial_schema.sql` with columns `(id, submission_id, event_type, created_at)`. Every insert site spreads `...meta` from `src/lib/tracking.ts`, which produces `ip_address`, `user_agent`, `device_type`. Sites: `src/lib/actions/data.ts:154,186`, `src/app/api/upload-signed-pdf/route.ts:67`, `src/app/forms/[id]/preview-sign-client.tsx:76,89,102`, `src/app/dashboard/forms/[id]/send/send-form-client.tsx:62`, `src/app/dashboard/clients/[id]/preview/[templateId]/send-actions.tsx:64`. Either add the three columns to the table or drop `...meta` from the inserts.
- `form_submissions` is declared without a `verification_data` column, but `src/app/dashboard/clients/[id]/preview/[templateId]/send-actions.tsx:56` inserts `{ verification_data: {...} }` and `src/app/forms/[id]/preview-sign-client.tsx:50` reads it back. Add a `jsonb verification_data` column (or move the data elsewhere) before the send-form flow can work end-to-end.
- `next.config.mjs` allows `remotePatterns: [{ hostname: "**" }]`. New agents should not assume this is a typo to fix without checking intended CDN usage.
- `lucide-react` is pinned to `^1.14.0` while the rest of the ecosystem expects `0.x`. `npm run build` will work because shadcn's bundled imports match, but `lucide-react@1.x` is a separate, smaller package — be careful when adding new icons.

## Things this file intentionally does not cover

- The default `README.md` is unmodified `create-next-app` boilerplate and does not describe the app. Do not trust it.
- No CI config, no pre-commit hooks, no test framework. Do not propose adding tests without confirming intent.
- No release / branch / PR convention is encoded in the repo. Ask the user if those matter.
