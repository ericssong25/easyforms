# Easy Forms — Full Audit Report

Date: 2026-06-09
Scope: every file in `easy-forms-new` (excluding `node_modules`, `.next`, `.git`, lockfiles, fonts, favicon).
Method: read every source file end-to-end before writing this report; no code, styles, or functionality was modified.

---

## Executive Summary

- **The verifier/PDF pipeline has been substantially hardened in the most recent pass.** Identity verification is now server-side via `POST /api/verify-submission` (`src/app/api/verify-submission/route.ts:79-309`), no client PII is returned to the unauthenticated `/forms/[id]` page, template substitution is centralised in `src/lib/document-substitution.ts`, and the public signing page uses the service-role client with an in-memory per-submission rate limiter + constant-time `safeEq` for the SSN/phone/last-name check. PDF generation now inlines a base64 DM Sans woff2 (`src/lib/document-fonts.server.ts`, `src/lib/document-styles.ts:172-181`) and uses single-page Letter geometry from `src/lib/document-format.ts`.
- **Several older architectural sins are still live.** The `lib/actions/data.ts` server actions (`createSubmissionAction`, `updateSubmissionStatusAction` at `src/lib/actions/data.ts:130, 166`) still insert `ip_address: "server"` into an `inet` column, which **would throw `22P02 invalid input syntax for type inet`** the moment either function is called. The UI does not call them today, so the bug is latent, not active.
- **The PDF download + upload flow (`src/app/forms/[id]/preview-sign-client.tsx:194-315`) still has a 30+ line manual pixel-loop trim of the signature** that is `O(W·H)` on the main thread. `trim-canvas` is in `package.json:56` and is the one obvious drop-in fix. The PII-leak risk that existed in the old "verify in the client" flow is gone — the new flow renders the document server-side and returns only the rendered HTML + template name + logo to the client (`src/app/api/verify-submission/route.ts:294-302`).
- **Type safety is poor on the dashboard side.** `Record<string, unknown>` is the de-facto type for any Supabase row that flows into a client component (`src/app/dashboard/page.tsx:150`, `src/app/dashboard/clients/page.tsx:50`, `src/app/dashboard/submissions/page.tsx:37`, etc.) — 10+ files. `src/lib/types.ts` already defines a correct `Client`/`Policy`/`Template`/`FormSubmission` interface; nothing uses it.
- **The form/template document system has been split into clean shared modules** (`document-format.ts`, `document-styles.ts`, `document-logo.ts`, `document-substitution.ts`, `document-fonts.server.ts`, `document-sheet.tsx`). The single source of truth is genuinely single. The only outstanding cleanup is that **the wizard's template-content preview (`src/components/forms/form-builder.tsx:121-152`) and the agent pre-send preview (`src/app/dashboard/clients/[id]/preview/[templateId]/page.tsx:69-117`) still inline their own `varMap` and substitute locally** instead of using `substituteTemplateVars`, so the substitution has 3 implementations today (substitution module + builder preview + preview-before-send).

---

## Section 1: Page-by-Page UI/UX Review

### `/login` — `src/app/login/page.tsx`
- Polished: navy/gradient background, brand mark, Card with `border-slate-200 shadow-lg`, password show/hide, MFA step inline.
- Loading state (`step === "checking"`) is a centered logo + "Loading...". No spinner; the animation is implicit.
- Sign-in error comes from `supabase.auth.signInWithPassword` via `toast.error`. Generic fall-through is fine.
- Mobile (390px): the Card is `max-w-md` and `w-full`; gradient container is `px-4`; everything fits. Forgot-password link + Create-one footer both readable.
- Accessibility: `<Input type="email">` and `autoComplete="email"` / `current-password` set; `aria-label` missing on the show/hide password toggle button (it is just an unlabeled `<button>` wrapping the eye icon). Screen reader will say "button" with no name.
- Issue: clicking the eye button toggles visibility, but the button has no `aria-label` or `title` and no `aria-pressed` state — same in `/signup` and `/reset-password`.

### `/signup` — `src/app/signup/page.tsx`
- Same chrome as login. Form fields: name, email, password (with minLength=8 and hint).
- `full_name` is passed as `data: { full_name: fullName }` to `signUp`, which the `handle_new_user` trigger (`supabase/migrations/001_initial_schema.sql:209-220`) picks up to populate `agents.full_name`.
- Issue: **no client-side email-format check** (the input has `type="email"`, so the browser checks, but custom check would be better — small nit).
- Issue: no "resend verification email" or "I didn't get the email" recovery. If the SMTP fails, the user is stuck.
- Mobile: fits, no overflow.

### `/forgot-password` — `src/app/forgot-password/page.tsx`
- Two states: form, then "Check your email" success card. The success card explains the 1-hour window and offers "Try a different email".
- Honest copy: "Didn't get the email? Check your spam folder…"
- Issue: no rate-limit messaging. If a user spams the button, Supabase will start rejecting silently.
- Mobile: fits.

### `/reset-password` — `src/app/reset-password/page.tsx`
- Three states: `checking` (loader card), `invalid` (link expired), `ready` (form with password + confirm). `supabase.auth.getSession()` decides which one.
- `password !== confirmPassword` is enforced client-side (`reset-password/page.tsx:44-47`); `password.length < 8` too. Good.
- After successful `updateUser({ password })`, the page calls `signOut()` then `router.push("/login")`. That is the right pattern.
- Issue: the "invalid" card is reachable only when the Supabase session is missing. If the link expired between the email and the page load, the user sees a generic "Link is invalid or expired" with a button to request a new one. Polished, but it loses the original email — the user has to type it again.
- Issue: `confirmPassword` uses `type={showPassword ? "text" : "password"}` but **does not have its own eye toggle** — when the user reveals password, confirm also reveals, but the eye icon is only next to the first field. This is fine UX-wise but slightly inconsistent (the eye button is not "next to" the confirm field at all).

### `/dashboard` — `src/app/dashboard/page.tsx`
- 4 stat cards (Total Clients, Active Policies, Form Submissions, Signed Documents). Each uses an `icon + bg-color/10` chip. Looks consistent.
- The counts come from four sequential `await supabase.from(...).select('*', { count: 'exact', head: true })` calls — they are **not parallelized**. The page is a server component, so each query blocks RSC streaming. A 4× speedup is achievable with `Promise.all`.
- "Recent Submissions" table: 5 most-recent submissions with client name, template name (hidden on mobile), status badge, "View PDF" if signed. Cast to `Record<string, unknown>` everywhere. The "View PDF" link is `/dashboard/submissions/${sub.id}`, not the actual PDF URL — clicking it goes to the submission detail page, not the PDF. The label "View PDF" is therefore misleading.
- "Quick Actions" card: 3 large tappable links (Add Client & Policy / Create Form Template / View Signed Documents). Polished.
- Empty state for recent submissions is good (FileText icon + "No submissions yet").
- No error state — if any of the 5 queries throws, the page just doesn't render. The component returns `null` only on the `!user` branch.
- Issue: layout uses `grid-cols-2 lg:grid-cols-4` for the stat cards (good), but the cards inside a 2-col mobile layout look cramped — the "Form Submissions" label wraps to 2 lines on 390px.
- Issue: `max-w-5xl` container on a 390px viewport has ~24px of usable space on each side. Cards have `p-6` and the icon+text is fine, but the long labels (e.g. "Active Policies") clip a bit.

### `/dashboard/clients` — `src/app/dashboard/clients/page.tsx` + `clients-search-wrapper.tsx`
- Server page fetches all clients with their policy (1 query, fine).
- Search wrapper filters client-side by `first_name + " " + last_name`. With `<100` clients it's instant; with thousands it would block. No debounce, no server query — adequate for current scale, but the search is by-name-only (no email, no policy number, no city).
- "Add Client & Policy" primary button top-right. Empty state: a centered `UserRound` icon + "No clients yet" + "Add your first client to get started" + a navy CTA. Well done.
- Table columns: Client (avatar+name, mobile reveals policy carrier), Policy (sm+), Contact (md+), Location (lg+), Actions (always). ExternalLink button with icon-only on mobile, "View" label on sm+. Good progressive disclosure.
- Issue: no way to delete a client from the list. The only path to deletion is to navigate to the client detail page… where there is also no delete button. **No client-deletion flow exists anywhere.**
- Issue: no sort UI; clients come back `order("created_at", { ascending: false })` from the server, which is fine but the column header doesn't indicate this.
- Issue: search is `String(c.first_name)` / `String(c.last_name)` — relies on `Record<string, unknown>` cast. Works, but typing a space alone returns zero matches (intentional).

### `/dashboard/clients/new` — `src/app/dashboard/clients/new/page.tsx` → `<ClientWizard>` (`src/components/forms/client-wizard.tsx`)
- Page wrapper is just a heading and the wizard. Accepts `?resume=clientId` to continue a half-finished client.
- Wizard is 3 steps with a top stepper: Client Info → Policy Info → Dependents.
- Step 1 (Client Info, lines 549-872):
  - Fields: First/Last name, Email, Phone, SSN, DOB, Address, City/State/ZIP, Policyholder checkbox, Subscriber number, Annual income, Tax filing status, Marital status, Tax dependents count. 16 fields on one page.
  - Validation: per-field via `validateClientField` on change (lines 288-328); full validation on `validateClientStep` (lines 330-349). Errors show under the field after `touched`. Required fields marked with red `*`.
  - Address autocomplete via Nominatim — typing the address shows up to 5 US suggestions, picking one fills city/state/zip too. Honest: the hook is client-side, has a 1s throttle, but no User-Agent header (Nominatim TOS issue, AGENTS already noted it).
  - The DOB field uses `DateInput` (masked MM/DD/YYYY) which only accepts years 1900-2100 and rejects future dates. Good.
  - "Next: Policy Info" calls `supabase.from('clients').insert(...)` directly. **The wizard does NOT use the `createClientAction` server action** — the action exists in `lib/actions/data.ts:9-39` but is dead code. Toast on success, set step to 2.
- Step 2 (Policy Info, lines 874-985):
  - Carrier combobox (search-as-you-type via `getAllCarrierNames` from `insurance-data.ts`) + Plan combobox cascaded.
  - Carrier is hard-required ("Insurance carrier is required" toast) but premium / effective date are not. **No required-field enforcement on premium, effective_date, or plan name.**
  - "Next: Dependents" inserts the policy and updates the client.
- Step 3 (Dependents, lines 987-1087):
  - Empty state ("No dependents added. Click Add or skip.") with `Users` icon.
  - Each dependent has First/Last/DOB/Covered checkbox. Adding many dependents is unbounded.
  - "Complete & Save" inserts each dependent one-by-one in a `for` loop, sequentially. No `Promise.all`. With 5+ dependents this is slow.
  - Empty dependents → skips the loop and redirects immediately. Smooth.
- Mobile (390px): the stepper buttons overflow horizontally because of the 3-step "Client Info / Policy Info / Dependents" labels. They shrink but the separators (`<Separator className="w-8" />`) leave little room — at 390px the stepper feels cramped.
- Issue: **the wizard's field-level validation shows errors after `touched`, but the user can still click "Next" with the form blank** and `validateClientStep` will block them. The user sees the errors only after pressing the button, which is fine. But the policy step uses `toast.error` (line 353) instead of inline errors, which is inconsistent with step 1.
- Issue: **the entire client-wizard is 1090 lines in a single file.** No sub-components, no custom hooks. Hard to maintain.
- Issue: phone number field has no validation against a real format; `formatPhone` simply masks digits. A user can enter "(123) 123-1234" or "(000) 000-0000" and it passes.
- Issue: SSN field on the wizard does validate `isValidSsn` (9 digits), but **stores `ssn_encrypted` as plaintext digits in the DB** — `ssn.replace(/\D/g, "")`. The "encrypted" column name is misleading; the data is unencrypted at rest.
- Issue: ZIP code is not validated against the actual 5-digit ZIP database, but `value.replace(/\D/g, "").slice(0, 5)` keeps it to 5 digits.
- Issue: tax_dependents_count + holder_income are typed as `number | null`; on parse, `parseFloat(e.target.value) || 0` collapses NaN to 0 — a user typing "abc" gets 0 saved instead of an error. Mild bug, not severe.
- Issue: **the wizard does not check for duplicate client emails.** Supabase has no UNIQUE on `clients.email` either, so two clients can be created with the same email. The verification flow uses `(ssn_last4, phone_last4, last_name)` to identify the signer; duplicates would mean one client sees the other's verification data.

### `/dashboard/clients/[id]` — `src/app/dashboard/clients/[id]/page.tsx`
- 4 sequential `await` queries: client+policy+dependents, dependents, submissions, templates. No `Promise.all` (same problem as `/dashboard`).
- Header: back arrow, name as `h1`, "Continue Setup" button (only if `wizardIncomplete` = no policy). Good.
- Cards (2-col on desktop, 1-col on mobile): Contact Information, Policy Details, Dependents, Document History. The Document History is duplicated (`hidden lg:hidden` mobile card + `hidden lg:block` desktop sidebar) — that is fine for layout but the code is duplicated.
- "Edit" buttons trigger dialogs: `<EditClientModal>`, `<EditPolicyModal>`, `<EditDependentsModal>`. No "Add" button visible to add a new policy or dependent from this page (they only show if a record exists).
- Issue: contact info card has 9 icon+text rows. At 390px the grid is `grid-cols-1` (`sm:grid-cols-2` kicks in at ≥640px) — at 390px the rows stack and the card grows very tall.
- Issue: `<EditClientModal>` receives `initialData` with 15 fields. The modal is 6 rows of fields, and on a 390px viewport the scrollable area inside the dialog (`max-h-[85vh] overflow-y-auto`) is needed. Works, but is dense.
- Issue: **no Delete Client button on this page**, confirming the missing delete flow.
- Issue: `EditClientModal` calls `supabase.from('clients').update(...)` directly — server action is unused. Pattern repeats for policy and dependents modals.
- Issue: the document history on desktop shows template name + date + status badge + View/Download buttons. The `View` and `Download` buttons are `<Link href={signed_pdf_url}>` — these are public URLs that the agent can open (works because the policy requires `auth.uid() = folder[1]`). After sign-out or in another browser, the same URL would fail. Not a UI bug, but `signed_pdf_url` is misleading (see Section 6).

### `/dashboard/clients/[id]/preview/[templateId]` — `src/app/dashboard/clients/[id]/preview/[templateId]/page.tsx` + `send-actions.tsx`
- Server component: loads client + template + agent, **does the variable substitution inline** in `renderContent()` (lines 69-117), renders the result inside a `<DocumentSheet>` (the new shared component) with the reserved signature zone.
- Right column has a "Sending To" card (client name, email, phone, policy summary) and a "Send Form" card with the action button.
- `<SendActions>` (`send-actions.tsx`):
  - "Generate Secure Link" button → reads `ssn_last4` and `phone_last4` from the client row, builds `verificationData = { ssn_last4, phone_last4, last_name }`, inserts a `form_submissions` row with `status: "sent"` + `verification_data`, logs a "sent" tracking event, and shows the link.
  - "Copy URL" / "Open" / "Share via Email" buttons. Share via email uses `mailto:` with a hard-coded subject + body.
  - **No file size or text length validation** before inserting the tracking event metadata; if `getTrackingMetadata()` fails (e.g. ipify blocked), the event is still inserted with `ip_address: null` and the function continues. The new code path is resilient.
- Issue: the template name in the preview card title is `template.name` (no truncation if the name is very long).
- Issue: when `BROWSERLESS_TOKEN` is empty, the page still works — but the user only discovers the broken PDF flow on the client-side signing, not at send time. There's no in-page warning.
- Issue: the variable substitution is duplicated here AND in `lib/document-substitution.ts` (used by the public signing flow). They produce identical results but are two separate code paths.

### `/dashboard/forms` — `src/app/dashboard/forms/page.tsx`
- Card grid of templates, each with name + created date + Edit button. Empty state: dashed border + FileText icon + "Create your first form template" CTA.
- No delete-template UI. **No duplicate template UI. No preview-from-list UI.**
- "New Template" CTA top-right.
- Mobile: 1 column. Desktop: 3 columns. Good.
- Issue: no "last modified" or "use count" — agents can't see which templates are actually being used.

### `/dashboard/forms/builder` and `/dashboard/forms/builder/[id]` — `src/components/forms/form-builder.tsx`
- Top bar: back button + page title ("New Template" / "Edit Template") + Save button.
- "Template Name" input above the editor.
- Tabs: Edit / Preview. On mobile (<lg), an additional "Show Variables" toggle reveals the variable panel as a stacked card.
- The editor (`<RichTextEditor>`, `src/components/ui/rich-text-editor.tsx`) is the most polished part of the app:
  - Toolbar: font family (5 options), font size +/-, line height +/-, H1/H2/H3, bold/italic/underline/strike, clear, align left/center/right, bullet/numbered list, link, undo/redo.
  - LogoPanel above the toolbar: Upload/Replace + position toggle (Top-left/Top-right) + size presets (Small/Medium/Large) + slider (40-240px) + Remove.
  - The paper sheet is rendered at `PAGE_PX.width = 816px` with `box-shadow` on a `bg-slate-100` "desk" — a very nice WYSIWYG metaphor.
  - **Live overflow detection**: a `ResizeObserver` and editor `update` event measure `scrollHeight > EDITABLE_HEIGHT + 1` and render a red dashed line + amber warning. Then on save, a `window.confirm` asks "Content exceeds one page. Save anyway?". This is the most thoughtful UX feature in the app.
- Preview tab: substitutes dummy data ("John", "Smith", etc.) inline via a `varMap` and renders the result in the same `<DocumentSheet>`.
- Save: `upsert` into `templates` with `name`, `content`, `logo` (JSONB). On success, toast + redirect to `/dashboard/forms`.
- Issue: **the dummy data preview (lines 121-152) is a third copy of the substitution logic** with different format (e.g. `premium: "$250.00"` here, `"$250.00/mo"` in the public signing flow, `N/A` for missing policy in preview-before-send). If you add a new variable, you must update all 3 sites.
- Issue: `content === "<p></p>"` is checked as the "empty" sentinel (line 198), but a user can easily type `<p>&nbsp;</p>` or `<p><br></p>` (TipTap default empty state) and bypass the check.
- Issue: the editor's `<EditorContent>` mount uses `immediatelyRender: false` (good for SSR), but the editor instance is null until the client hydrates, so the "Loading editor..." fallback is shown for a moment. Adequate.
- Issue: the form-builder calls `supabase.from('templates').update/insert` directly — the `createTemplateAction` server action in `lib/actions/data.ts:107-128` is unused.
- Issue: the mobile experience shows an amber "Desktop recommended" banner; the variables panel toggle reveals the same content; the editor itself is hard to use on a 390px screen because the toolbar wraps to 3+ rows.

### `/dashboard/forms/[id]/send` — `src/app/dashboard/forms/[id]/send/page.tsx` + `send-form-client.tsx`
- This is a **second, parallel path** for sending a form. `/dashboard/clients/[id]/preview/[templateId]` is the primary. This page is reached via `/dashboard/forms/...` and lets the agent pick the client, but **the verification_data (SSN/phone/last-name) is NOT computed** here — the submission is inserted with `status: "sent"` but `verification_data` is NULL. **The client cannot verify identity** to open a form sent through this path.
- This is a critical bug. The page works (the row is inserted, the link is generated, the agent is redirected to `/dashboard/submissions`), but the recipient cannot pass verification because `verification_data` is null. The endpoint `/api/verify-submission/route.ts:155-179` will compare input SSN/phone/last-name against empty strings, and `safeEq` will return false. Every attempt is a "verification_failed" event.
- Confirmed by reading `send-form-client.tsx:48-57` — the insert has no `verification_data` field.

### `/dashboard/submissions` — `src/app/dashboard/submissions/page.tsx` + `submissions-search-wrapper.tsx` + `submissions-client.tsx`
- Server page fetches all submissions with client + template. No pagination. With 100+ submissions this is slow.
- Search wrapper filters client-side by name (no email, no template name, no date range).
- Empty state: "Send a form to a client to get started" + "View Clients" button.
- Per-row actions (submissions-client.tsx):
  - **Copy** link (with toast feedback, "Copied" green check).
  - **Email** via `mailto:` with the link.
  - **View** + **DL** PDF (only if `signed_pdf_url`) — same public-URL issue.
  - **Track** opens a Dialog showing a vertical timeline of `tracking_events` for that submission. Each event shows type, time, IP, user-agent, device type. The icons are a local `eventIcons` map.
- Issue: **the inline tracking dialog refetches on every open** because `loadTracking` is only called inside the `onClick` of the `DialogTrigger` (line 144). If the user opens the dialog twice without signing in another tab, the data is reloaded each time. Minor.
- Issue: `signed_at` is shown as just a date (`Signed` column) even when it's a timestamp — formatting as `toLocaleDateString()` is fine but doesn't include time. Acceptable.
- Issue: the dialog uses `max-w-sm` and `max-h-[60vh] overflow-y-auto` — on mobile this is a sheet-like dialog, works.
- Issue: no bulk actions (no bulk delete, no bulk resend, no bulk reminder).

### `/dashboard/submissions/[id]` — `src/app/dashboard/submissions/[id]/page.tsx`
- Server page: loads submission + client + template + tracking events.
- 2-column layout: left = Form Details (template name, client name, email, phone, created, signed date, View/Download PDF buttons). Right = Activity Timeline (the same `eventIcons` map as `submissions-client.tsx`).
- Issue: the timeline's `eventIcons` map (lines 27-32) does **not** include `verification_failed` or `verified` (those use the default `CheckCircle2`). The inline dialog in the list page does include those icons. **Inconsistent iconography.**
- Issue: the `signed_at` column for "Signed" shows only the date, but `toLocaleDateString()` is locale-aware — depending on the agent's browser, this could be "6/9/2026" or "09/06/2026" or "2026-06-09". Minor consistency issue.
- Issue: no "Resend" button on the submission detail page. The agent has to go back to the list to copy/email the link.
- Issue: no way to void/cancel a submission. If the client never signs, the row sits there forever.

### `/dashboard/profile` — `src/app/dashboard/profile/page.tsx`
- Single Card with: Email (disabled), Full name, NPN, Phone, Agency name. "Save changes" button.
- All `Input` components. Email is read-only with a "Contact support" hint.
- NPN has `inputMode="numeric"` and strips non-digits. No length validation (real NPNs are 10 digits; the field accepts any digit count).
- Phone is `type="tel"` with no masking.
- Issue: the page is a **client component** that runs `useEffect` to fetch the agent. While loading, shows `<Loader2 />` spinner. Good. But the form's `setEmail` from `user.email` is set inside the effect — if the user updates the email later via Supabase auth, the page won't re-render. Acceptable.
- Issue: the page does not include the `agency_name` in the header like the dashboard does, but otherwise it's identical to editing the `agents` row.

### `/dashboard/security` — `src/app/dashboard/security/page.tsx`
- Single Card with 2FA status. If a TOTP factor is enrolled, the card shows green "enabled" + a list of factors + a "Disable two-factor authentication" destructive button with a confirm dialog.
- If not enrolled, the card shows amber warning + "Set up two-factor authentication" button → opens `<EnrollMFA>`.
- `<EnrollMFA>` shows the QR code (from `data.totp.qr_code`), the secret, a 6-digit input, and an "Enable 2FA" button. Enrolls + challenges + verifies + calls `onEnrolled`.
- Issue: **the unenroll button only ever unenrolls `mfaState?.factors[0]`** (line 234). With multiple TOTP factors, only the first is unenrolled even if the dialog was opened from a different factor's row.
- Issue: the "Set up" flow doesn't let the user re-enroll a different authenticator (e.g. if they lose their phone) without first unenrolling the old one. The QR code is shown once, but re-enroll is one click. Adequate.
- Issue: no "Backup codes" or recovery flow. If the agent loses their phone, they cannot recover the account without admin intervention.

### `/forms/[id]` (public signing) — `src/app/forms/[id]/page.tsx` + `preview-sign-client.tsx`
- **Major improvement from prior version.** The server component only returns: `id`, `status`, `templateName`, `templateLogo`, `agencyName`. No client PII. The agency name is shown as a marketing touch ("access your document from {agencyName}").
- Three client-side states:
  1. `currentStatus === "signed"` → "Document Already Signed" success card with a download link (only if `generatedPdfUrl`).
  2. `!verified` → identity verification form (SSN-4, phone-4, last name) with a 429-aware error and a "Too many attempts" message.
  3. Verified → split view: document preview on the left, signature controls on the right.
- Verification (`handleVerify` lines 113-177): POSTs to `/api/verify-submission` with `submissionId`, `ssnLast4`, `phoneLast4`, `lastName`. Receives `{ ok: true, status, template: { name, logo, html } }` and stores the rendered HTML in state. The HTML is then re-rendered into the `<DocumentSheet>` so the PII never touches the public page directly.
- Signature flow:
  - `<SignatureCanvas>` (`react-signature-canvas`) with `penColor="#1a3a5c"`, 100% width, 150px tall.
  - "Capture Signature" button → `setIsSigned(true)` (no threshold check on signature density).
  - "Clear" button + post-sign emerald confirmation.
  - "Sign Document & Generate PDF" big button at the bottom.
- Generate and upload (`generateAndUploadPdf` lines 194-315):
  - Manual pixel-trim loop on the canvas (200k+ iterations for a 1000×200 canvas).
  - `fetch('/api/generate-pdf', { html, signature, logo })` → PDF as base64.
  - Auto-download via `<a download="signed-document-YYYY-MM-DD.pdf">`.
  - `fetch('/api/upload-signed-pdf', FormData)` with `file`, `submissionId`, `agentId=""`, `signatureData`. The server resolves the agent id from the submission row.
  - On success, sets `generatedPdfUrl` from the response.
- **Zoom controls** (lines 488-510, 683-758): the post-verify view adds a Card with "Fit"/"100%" buttons + zoom +/-, plus pinch-zoom + ctrl-wheel zoom on the document container (`ZoomableDocument` lines 601-676). Mobile-friendly.
- The document is wrapped in a `bg-slate-100` "desk" with a white sheet at the center, scaled to fit container width via `transform: scale()` (auto-fit on resize via `ResizeObserver` in `DocumentSheet`). Same WYSIWYG as the editor.
- Loading the verification screen fires a `trackEvent("viewed")` (lines 92-105) via `/api/track-event`. The track-event endpoint is allow-listed to `viewed`, `opened`, `verified`, `verification_failed` (constants at line 12-17). Unknown event types are rejected with 400.
- Mobile (390px): the layout is a single column (the desktop split is `lg:grid-cols-[1fr_360px]`). The signature card is below the document. The pinch-zoom + wheel-zoom work.
- Issue: **the success card "Document Already Signed" shows a download link, but only if `generatedPdfUrl` is set from the just-completed flow.** If the client re-opens the link after signing (the "already signed" branch is hit on the initial page load), `generatedPdfUrl` is empty and the card has no link. The agent has to download from the dashboard. Confusing for the signer.
- Issue: **the signature trim loop is `O(W·H)` on the main thread** (lines 209-218). With a 1000×200 canvas on a low-end mobile, this is 200,000 × 4 buffer reads = ~800k array accesses. `trim-canvas` is in `package.json:56` and is the obvious drop-in.
- Issue: the page does not surface an error if the service-role key is missing — the `getServiceRoleSupabase()` returns `null` and the server component returns `<ServiceUnavailable />`. Good, but the user sees a generic "Form Unavailable" without a way to report.
- Issue: the **no-feedback path** if `BROWSERLESS_TOKEN` is missing — `/api/generate-pdf/route.ts:118-128` returns 500 with the message. The client's `generateAndUploadPdf` shows the error in a toast. The user does not know whether to retry or contact their agent.
- Issue: `lockout` is set client-side but the `disabled` on the inputs is the only signal. There is no countdown to retry.
- Issue: `data?.lock` would crash if `data.lock` were ever set. Minor.

### `/forms/[id]` UUID validation
- The page validates the param matches a UUID regex (`forms/[id]/page.tsx:36`). If not, returns `<NotFound />`. Good.

---

## Section 2: User Flow Walkthrough

### Flow A — Agent onboarding
1. `/signup` — fill name + email + password, click "Create account". Toast "Account created! Please check your email for verification." Redirect to `/login`.
2. Email confirmation — Supabase sends a confirmation email. The link goes to `/auth/callback?next=/dashboard`.
3. `/login` — first time after confirmation, MFA is not yet enrolled. Login → `<VerifyMFA>` is **not** shown because `aal.nextLevel === aal1` (no factor yet). Redirect to `/dashboard`.
4. `/dashboard` — first time, no stats, empty recent submissions. `MfaBanner` is shown (because `currentLevel === aal1 && nextLevel === aal1`).
5. Agent clicks "Set up now" → `/dashboard/security` → "Set up two-factor authentication" → `<EnrollMFA>`. Scan QR, enter 6-digit code, "Enable 2FA". Page reloads; banner disappears.
6. Logout/login again now requires `<VerifyMFA>` step.

**Issues:**
- No "Welcome" or first-run experience. The dashboard is a wall of zeros.
- No tooltips explaining the MFA banner.
- After first login, the agent has zero clients/templates/submissions. The only "quick action" that's actually useful is "Add Client & Policy". The other two ("Create Form Template", "View Signed Documents") link to empty pages.

### Flow B — Client management
1. `/dashboard/clients/new` → wizard.
2. Step 1 fills in name, email, phone, SSN, DOB, address (with autocomplete), policyholder checkbox, income/tax fields. **All required fields are enforced.** "Next" → inserts a `clients` row, advances to step 2.
3. Step 2 selects carrier via combobox, plan via combobox, policy number, premium, effective date. "Next" → inserts a `policies` row, updates the client's `policy_id`, advances to step 3.
4. Step 3 optionally adds dependents. "Complete & Save" → inserts each dependent sequentially, redirects to `/dashboard/clients/[id]`.
5. Client detail page shows contact info, policy, dependents, document history.
6. Edit flows use `<EditClientModal>` / `<EditPolicyModal>` / `<EditDependentsModal>`.

**Issues:**
- The wizard has no "Back to step 1" from step 2 or 3 (well, it has a "Back" button on step 2 and 3, but the data is not re-editable; the user can only re-edit the previous step's whole form).
- Step 3 "skip" by leaving the dependents list empty: works (line 479-484).
- **No way to delete a client.** Confirmed: the client detail page has no delete button, the list has no delete, the wizard has no delete. The data is essentially append-only.
- **No way to delete or unlink a policy** without deleting the client.
- **No way to delete a single dependent** from the modal. The `EditDependentsModal` does support delete (lines 55-59 + lines 70-73 in save), but the initial empty list and "Remove" button only show after the dependent is added to the UI; you can't delete a dependent that was loaded from the server and then changed.
- Phone number format is loose (any 10 digits pass).
- SSN is stored as plaintext digits despite the column name `ssn_encrypted`.
- **No UNIQUE constraint on client email.** Two clients with the same email can be created. Combined with the SSN/phone/last-name verification scheme, this means an agent could accidentally have two clients with the same name and the verification flow becomes ambiguous.
- `applies_to_policy` is a checkbox on the wizard. If a user submits the wizard with the checkbox unchecked, the coverage_count for the templates is `0` — but this is a single adult client, and the system can't distinguish "client is the policyholder and is covered" from "client is the policyholder but is excluded". The semantics are unclear.

### Flow C — Template management
1. `/dashboard/forms/builder` → `FormBuilder` with empty content.
2. Editor: type content. Click variables in the side panel to insert `{first_name}` etc. (the side panel is collapsed on mobile behind a "Show Variables" button).
3. Live overflow detection: if the content goes past the red dashed line, an amber warning appears + a `window.confirm` on save.
4. Upload a logo, choose position (top-left/top-right), size preset (Small/Medium/Large) or slider.
5. Switch to Preview tab → see the document with dummy "John Smith" data.
6. Click Save → inserts the template, redirects to `/dashboard/forms`.
7. From the list, click Edit on a template → back to builder with content loaded.
8. No delete option, no duplicate option, no preview-with-real-data option (the only preview with real data is the pre-send flow in `/dashboard/clients/[id]/preview/[templateId]`).

**Issues:**
- The "Variables" panel doesn't show the dummy value each variable will produce; the agent has to switch tabs to see.
- Save on a name-only template (no content) is blocked with "Please provide a name and content for the template". Adequate.
- Save on `<p></p>` (the initial state) is also blocked. Adequate.
- **No autosave / draft state.** If the agent navigates away, they lose their work.
- **No version history.** Editing a template affects all future sends; existing submissions keep their rendered HTML but the template they were built from can be changed silently.

### Flow D — Send form to client
**Path 1 (recommended): from the client detail page.**
1. `/dashboard/clients/[id]` → `SendFormSection` card → pick a template from the dropdown → "Generate & Preview".
2. Navigate to `/dashboard/clients/[id]/preview/[templateId]`. Server component renders the preview with real client data.
3. Click "Generate Secure Link" → inserts `form_submissions` with `status: "sent"` + `verification_data: { ssn_last4, phone_last4, last_name }` (computed from the client's row), logs "sent" tracking event.
4. Link is shown in a green emerald card with Copy / Open / Share via Email buttons.

**Path 2 (broken): from the template list.**
1. `/dashboard/forms` → click a template (no "Send" button). **There is no UI to send from the template list.** The only way to reach `/dashboard/forms/[id]/send` is by URL guessing.

**Issues:**
- From "I want to send a form" to "I have the link" is: Clients list → click client → scroll to Send card → pick template → click "Generate & Preview" → click "Generate Secure Link" = 4-5 clicks. Not bad.
- **The template-list "Send" entry point is broken.** The route exists but is unreachable from the UI.
- **The `send-form-client.tsx` flow does not set `verification_data`** (`send-form-client.tsx:48-57`). If anyone reaches `/dashboard/forms/[id]/send` (manually, by URL), the resulting form is unverifiable.
- No bulk send (one template to many clients).
- No scheduled send.
- No reminder email after N days.

### Flow E — Client signs (public)
1. Open `/forms/[id]` in incognito. The page loads. A "viewed" tracking event is fired.
2. Identity form: enter SSN-4, phone-4, last name. "Verify & Continue".
3. Server returns `{ ok: true, status, template: { name, logo, html } }`. The HTML is the **already-rendered document with PII substituted server-side** (`substituteTemplateVars` is called inside `/api/verify-submission/route.ts:256-262`). The client never sees the raw `client` row.
4. The verified state renders: document on the left, signature pad on the right. Pinch/scroll-zoom on the document.
5. Draw signature. "Capture Signature" (no density check). "Sign Document & Generate PDF".
6. Server `/api/generate-pdf` returns base64 PDF. Auto-download. `POST /api/upload-signed-pdf` uploads to storage, updates the submission, logs "signed" event.
7. "Document signed and downloaded!" toast + green confirmation card with "PDF downloaded and saved to your device. A copy has been sent to your agent."

**Issues:**
- **Reopening the link after signing** shows the "Document Already Signed" card with NO download link (`generatedPdfUrl` is null on initial render). The user has to ask the agent for the PDF.
- **"A copy has been sent to your agent"** is misleading — the only thing sent is a `signed` tracking event. There is no email notification to the agent (Section 3).
- The signature pad has no minimum-stroke check. A single dot counts.
- No keyboard support for signing (the only path is mouse/touch).
- The PDF download filename uses `toISOString().slice(0, 10)` → "2026-06-09". Adequate.
- The form is unilingual (English UI only). The wizard has Spanish labels for some fields ("Número de suscriptor", "Ingreso proyectado anual familiar") — inconsistent.

### Flow F — Tracking & submissions
1. `/dashboard/submissions` → all submissions, sorted by created_at desc. Search by name.
2. Click "Track" on a row → modal with vertical timeline: each event has type, time, IP, user-agent, device.
3. Or click the row link → `/dashboard/submissions/[id]` → same timeline on the right side of the page.
4. The "Copy" / "Email" / "View" / "DL" actions are on the list page. The detail page only has "View PDF" / "Download PDF" if `signed_pdf_url` is set.

**Issues:**
- The list page and detail page have **different event-icons maps**. List page (submissions-client.tsx:37-44) has 6 icons including `verified` and `verification_failed`. Detail page (submissions/[id]/page.tsx:27-32) has 4 icons and falls back to a green CheckCircle for everything else. Inconsistent.
- No filter by status (sent/opened/signed). No date range.
- No export to CSV.
- The "DL" link uses `signed_pdf_url` which is a getPublicUrl — works while the agent is signed in, fails otherwise.

---

## Section 3: Functionality Completeness

| Feature | Status | Notes |
|---|---|---|
| Client management — Create | **Complete** | Wizard works, validates required fields, supports resume. |
| Client management — Read (list) | **Complete** | List with search by name, avatars, mobile-friendly. |
| Client management — Read (detail) | **Complete** | All fields shown, edit modals work. |
| Client management — Update | **Complete** | EditClientModal / EditPolicyModal / EditDependentsModal. |
| Client management — Delete | **Missing** | No delete UI anywhere. No server action to delete. |
| Client management — Search | **Partial** | Name-only, no email/policy/city/zip. No server-side query. |
| Client management — Bulk actions | **Missing** | None. |
| Client management — Data validation | **Partial** | Name/email/phone/SSN/DOB on wizard; weaker on edit modals (no format checks). |
| Policy management — CRUD | **Partial** | Create + Update only (via wizard + edit modal). No standalone "policies" list page. No delete. |
| Policy management — Carrier/plan selection | **Complete** | Combobox with search, cascading plan select, custom-name allowed. |
| Policy management — Lookup by client | **Complete** | Via client detail (each client has 0 or 1 policy). |
| Dependent management — CRUD | **Partial** | Create + Update + Delete inside the edit modal works. No add/remove from a dedicated page. |
| Dependent management — Validation | **Partial** | First/last name required (skip empties), DOB optional, no SSN field even though the table has `ssn_encrypted`. |
| Template management — CRUD | **Partial** | Create + Read + Update. No delete. No duplicate. No version history. |
| Template management — Editor | **Complete** | TipTap with full toolbar, font/size/line-height/colors, link, lists, headings, undo/redo. |
| Template management — Variables | **Complete** | 24 tokens in 4 categories; click-to-insert; mobile toggle. |
| Template management — Logo | **Complete** | Upload, position (left/right), size (slider + presets 40-240px), remove. |
| Template management — Live overflow warning | **Complete** | Best UX feature in the app. |
| Template management — Preview with dummy data | **Complete** | Preview tab renders `<DocumentSheet>` with the same WYSIWYG chrome. |
| Template management — Preview with real data | **Partial** | Only via the pre-send page (`/dashboard/clients/[id]/preview/[templateId]`). Not from the template list. |
| Form sending — Link generation | **Complete** | Path 1 works (pre-send preview). Path 2 (`/dashboard/forms/[id]/send`) is broken (no `verification_data`). |
| Form sending — Link expiration | **Missing** | No expiry. The link works forever as long as the submission is in `sent`/`opened` state. |
| Form sending — Resend capability | **Partial** | "Copy link" + "Email" buttons exist but they regenerate the same URL, not a new one. No "resend" in the strict sense. |
| Form sending — Bulk send | **Missing** | One client at a time. |
| Form sending — Reminders | **Missing** | No scheduled reminder emails. |
| Public signing — Verification | **Complete (hardened)** | Server-side SSN/phone/last-name check, constant-time compare, in-memory rate limit, lockout. |
| Public signing — Document render | **Complete (hardened)** | Server-side substitution, no PII in page HTML. |
| Public signing — Signature pad | **Complete** | react-signature-canvas, manual pixel-trim, auto-download. |
| Public signing — Re-open after signing | **Partial** | "Document Already Signed" card renders, but no download link is shown unless the user is in the just-signed flow. |
| PDF generation — Reliability | **Partial** | Hard-fails if `BROWSERLESS_TOKEN` is empty (returns 500). The `BROWSERLESS_TOKEN` is not in `.env.example`'s parent and may be empty. |
| PDF generation — Quality | **Complete** | Letter-sized, single page, signature zone reserved, background colors printed, logo behind text. |
| PDF generation — Signature handling | **Partial** | Painted as `<img>` at the end of the document, not anchored to a field in the template. |
| PDF generation — Storage | **Complete** | Service-role upload to `signed_forms` bucket, path `${agentId}/${submissionId}/signed.pdf`. |
| Auth — Login | **Complete** | Email + password, MFA step inline. |
| Auth — Signup | **Complete** | Email + password + name, trigger creates `agents` row. |
| Auth — Password reset | **Complete** | `forgot-password` → email link → `reset-password` page → update. |
| Auth — MFA | **Complete** | TOTP via `enroll-mfa` + `verify-mfa`. Banner shown if not enrolled. |
| Auth — Session management | **Complete** | Middleware re-checks on every request. |
| Auth — Sign out | **Complete** | Sidebar + header dropdown + mobile sheet. |
| Dashboard — Stats | **Complete** | 4 counters, recent submissions. |
| Dashboard — Recent activity | **Complete** | Last 5 submissions with status. |
| Dashboard — Quick actions | **Complete** | 3 quick action links. |
| Search — Client | **Partial** | Name only. |
| Search — Submission | **Partial** | Client name only. No template, no status filter. |
| Search — Template | **Missing** | The `/dashboard/forms` page has no search input. |
| Search — Global | **Missing** | None. |
| Notifications — Email to agent on sign | **Missing** | No email is sent. Only a tracking_events row. |
| Notifications — In-app | **Missing** | No notification center. |
| Settings / Profile | **Partial** | Profile page edits `agents` row. No agency-wide settings, no template defaults, no agent-level feature flags. |
| Settings / Branding | **Missing** | Agency logo, colors, signature default — none. |
| Settings / Signature | **Missing** | The agent's own signature (to appear on documents) is not configurable. |
| Settings / Email templates | **Missing** | No control over the email body. |
| Server actions vs client mutations | **Partial** | All the new mutation points (wizard, edit modals, send-actions, form-builder, sign-actions) call `supabase.from(...).insert/update` directly. The 6 server actions in `lib/actions/data.ts` are dead code. |

---

## Section 4: Data & Validation

### Grouped by form/area:

**Client Wizard (`src/components/forms/client-wizard.tsx`):**
- Required: first_name, last_name, ssn (9 digits), phone, date_of_birth. **Enforced on `validateClientStep` (lines 330-349) — must click "Next" to see errors.** Inline errors appear after the field is `touched`.
- Email: optional, but if provided, must match a basic regex. Good.
- SSN: must be 9 digits, but the field accepts any non-digit input via `formatSsn` (the format mask filters). Good.
- DOB: must not be in the future (line 321-322). Good. Year range 1900-2100 enforced in `DateInput`.
- Address: not required. Good.
- City/State/ZIP: not required individually. ZIP is 5 digits if provided. Good.
- Phone: required, but no format check (any digit string passes).
- Income, tax fields: all optional.

**Edit Client Modal (`src/app/dashboard/clients/[id]/edit-client-modal.tsx`):**
- First/last name: required, enforced (`edit-client-modal.tsx:111-115`). Good.
- Email: NO validation in the edit modal (any string saves). **Inconsistency: wizard validates email, edit modal does not.**
- SSN: NO validation (just strips non-digits and saves). **Inconsistency: wizard validates 9 digits, edit modal accepts anything.**
- Phone: no validation. Same inconsistency.
- ZIP: 5 digits enforced via `slice(0, 5)`. Good.
- DOB: `DateInput` only — would catch the year range.

**Edit Policy Modal (`src/app/dashboard/clients/[id]/edit-policy-modal.tsx`):**
- Carrier: required (`toast.error` line 55).
- Policy number: required (line 56).
- Plan: optional. No validation.
- Premium: optional, parsed as float. Negative numbers accepted (e.g. `-50`).
- Effective date: optional.

**Edit Dependents Modal (`src/app/dashboard/clients/[id]/edit-dependents-modal.tsx`):**
- Dependents with empty first or last name are silently skipped on save (line 76). No user feedback that the dependent wasn't saved.
- DOB: optional.

**Form Builder (`src/components/forms/form-builder.tsx`):**
- Template name: required (`handleSave` line 198). Good.
- Content: required, must not be `<p></p>` exactly. The check is weak: `<p>&nbsp;</p>` or `<p><br></p>` (TipTap defaults) would pass.

**Profile Page (`src/app/dashboard/profile/page.tsx`):**
- No validation on the form. The page just calls `agents.update(...)`. Empty strings overwrite previous values. The page would let you save `full_name = ""` if you clear the field.

**Sign Up (`src/app/signup/page.tsx`):**
- HTML5 `type="email"` and `minLength="8"` for password. The browser handles it. The JS does no extra check.

**Login (`/login`):**
- HTML5 `type="email"` only. No format check server-side; Supabase returns its own error.

**Reset Password (`/reset-password`):**
- Passwords must match (line 44-47), `minLength=8` (line 48-51). Good.

**Enroll MFA (`src/components/auth/enroll-mfa.tsx`):**
- 6-digit code required (line 57). Good.

**Public Verification (`/forms/[id]`):**
- 4-digit SSN + 4-digit phone (clamped by `maxLength={4}` + `replace(/\D/g, "").slice(0, 4)`).
- Last name: any non-empty string.
- Server-side: `safeEq` (constant-time) for the compare. **Excellent.**

### Supabase queries with issues:

**`src/lib/actions/data.ts:154-160, 186-192`:**
```ts
await supabase.from("tracking_events").insert({
  ...
  ip_address: "server",  // ← string, column is `inet`. THROWS.
  user_agent: "server",
  device_type: "Desktop",
});
```
The function would throw `22P02 invalid input syntax for type inet` at runtime. Dead code today, but a foot-gun. The new code paths (track-event, verify-submission, upload-signed-pdf) correctly use `null` or a real IP.

**`src/app/dashboard/page.tsx:30-65`:**
5 sequential `await` calls. Each adds one round-trip to the page RSC. `Promise.all` would cut latency.

**`src/app/dashboard/clients/[id]/page.tsx:52-97`:**
4 sequential `await` calls. Same issue.

**`src/components/forms/client-wizard.tsx:488-498`:**
The dependent-insert loop is sequential:
```ts
for (const dep of dependents) {
  if (!dep.first_name.trim() || !dep.last_name.trim()) continue;
  const { error } = await supabase.from("dependents").insert({...});
}
```
With 5+ dependents this is 5+ round-trips. `Promise.all` over the valid subset is faster.

**`src/app/forms/[id]/preview-sign-client.tsx:265-283` (verify-submission does it, but the public page):**
Server-side, `verify-submission` does 3 sequential `tracking_events.insert` calls on success (verified, opened, status update). Could be batched.

**`src/lib/insurance-data.ts`:** No DB queries. Static data, fine.

**`src/lib/hooks/use-address-autocomplete.ts:70-74`:** Nominatim call without `User-Agent` header. Per Nominatim TOS, requests without a UA can be blocked. No `try/catch` for the rate-limit response (429) — it would just throw "Nominatim error" and close the suggestions.

**`src/app/dashboard/clients/[id]/preview/[templateId]/send-actions.tsx:74-80`:**
If `getTrackingMetadata` fails, the catch wraps the entire flow and the toast error overrides the success state. The user sees a failure toast even though the submission row was inserted. (Edge case: ipify blocked in the agent's network.)

**`src/app/dashboard/forms/[id]/send/send-form-client.tsx:48-66`:** Doesn't set `verification_data`. **Critical bug** — see Section 1 `/dashboard/forms/[id]/send` notes.

---

## Section 5: Code Quality

### Files using `Record<string, unknown>`

- `src/app/dashboard/page.tsx:150, 161` — recentSubmissions
- `src/app/dashboard/clients/page.tsx:50` — clients list
- `src/app/dashboard/clients/clients-search-wrapper.tsx:19, 59` — clients list
- `src/app/dashboard/submissions/page.tsx:37` — submissions
- `src/app/dashboard/submissions/submissions-search-wrapper.tsx:21, 64` — submissions
- `src/app/dashboard/submissions/[id]/page.tsx:212` — events timeline
- `src/app/dashboard/forms/page.tsx:47` — templates list
- `src/app/dashboard/forms/[id]/send/send-form-client.tsx:27, 28, 109` — template + clients
- `src/app/dashboard/clients/[id]/preview/[templateId]/page.tsx:71, 72, 185, 186` — local client cast
- `src/app/api/verify-submission/route.ts:248-252` — full submission cast
- `src/lib/document-substitution.ts:15-18` — substitution input type

`src/lib/types.ts` already defines `Client`, `Policy`, `Template`, `FormSubmission`, `TrackingEvent`. None of these is used as a type. **Total: 11+ files casting to `Record<string, unknown>`.**

### `any` types

- 0 occurrences of explicit `: any`. Good.

### `console.log`/`console.error`/`console.warn` statements (21 total)

| File | Line | Statement | Intent |
|---|---|---|---|
| `src/app/api/generate-pdf/route.ts` | 22 | `console.error("[generate-pdf] invalid JSON body:", parseErr)` | Intentional — server-side error logging. |
| `src/app/api/generate-pdf/route.ts` | 149 | `console.error("Browserless error:", ...)` | Intentional — Browserless upstream failure logging. |
| `src/app/api/generate-pdf/route.ts` | 161 | `console.error("PDF generation error:", error)` | Intentional. |
| `src/app/api/track-event/route.ts` | 39, 73, 101, 116 | various `console.error` | Intentional — service-side error logging. |
| `src/app/api/verify-submission/route.ts` | 104, 238, 304 | `console.error` | Intentional. |
| `src/app/api/upload-signed-pdf/route.ts` | 47, 67, 106 | `console.error` | Intentional. |
| `src/app/forms/[id]/preview-sign-client.tsx` | 247, 296, 308 | `console.error` | Intentional — client-side dev logs for PDF/upload failures. |
| `src/lib/supabase/service.ts` | 17 | `console.error` | Intentional — missing service-role key warning. |
| `src/lib/document-fonts.server.ts` | 20, 27 | `console.warn` | Intentional — font fetch failure. |
| `src/app/dashboard/security/page.tsx` | 73 | `console.error("Failed to fetch MFA status:", err)` | Intentional. |
| `src/hooks/use-address-autocomplete.ts` | 145 | `console.error("Address search error:", err)` | Intentional. |

**No `console.log` debug leftovers. All 21 are server- or client-side error logs, intentional.** Only nit: none of them pipe to a real logger (Sentry, etc.).

### `TODO`/`FIXME`/`HACK`/`XXX` comments

- 0 matches in `src/`. Clean.

### Unused imports / variables / files

**Unused exports (dead code, not imported anywhere):**
- `src/lib/pdf-utils.ts` — `usePdfDownload`, `generateSignedPdfUrl` — 0 imports. **Dead file.**
- `src/lib/toast.ts` — `createToast`, `onToast` — 0 imports. **Dead file.**
- `src/lib/actions/data.ts` — `createClientAction`, `createPolicyAction`, `createDependentAction`, `createTemplateAction`, `createSubmissionAction`, `updateSubmissionStatusAction` — 0 imports. **All 6 server actions are dead code.**

**Unused exports within used files:**
- `src/components/ui/avatar.tsx` — `AvatarImage` is exported but not used in any consumer.
- `src/components/ui/badge.tsx` — `badgeVariants` is exported but used only internally.
- `src/components/ui/dropdown-menu.tsx` — many sub-components (RadioItem, CheckboxItem, Sub*, RadioGroup, Group) are exported but not used.
- `src/components/ui/select.tsx` — `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton` exported but not used.
- `src/components/ui/sheet.tsx` — `SheetClose` exported but the only consumer (sidebar) uses `SheetContent` directly.
- `src/components/ui/toaster.tsx` — `Toaster` is exported but the root layout (`src/app/layout.tsx:5,28`) imports the one from `@/components/ui/toaster` (same file) and mounts it. This is fine but the duplicate import path in `index.ts` (line 16) is redundant.
- `src/hooks/use-auth.ts` — defined but only re-imports `createClient`. Looking at imports… `use-auth.ts` is **not imported anywhere.** The `useEffect` + `onAuthStateChange` pattern is duplicated in `login/page.tsx:32-51` and `mfa-banner.tsx:13-26` and `security/page.tsx:60-77`. Dead file.

**Unused file-level assets:**
- `src/app/fonts/GeistVF.woff` and `GeistMonoVF.woff` — files present but `layout.tsx` uses `DM_Sans` from `next/font/google`. **Dead assets.**

**Unused package.json dependencies:**
- `jspdf` — 0 imports
- `html2canvas` — 0 imports
- `pdf-lib` — 0 imports
- `trim-canvas` — 0 imports (yet signature trim is hand-rolled)
- `@base-ui/react` — 0 imports
- `react-hook-form` — 0 imports
- `zod` — 0 imports
- `@hookform/resolvers` — 0 imports
- `date-fns` — 0 imports
- `@tiptap/extension-highlight` — declared in `package.json:32` but not imported in `rich-text-editor.tsx` (the import list is `StarterKit`, `TextAlign`, `FontFamily`, `Underline`, `TextStyle`, `Link`).
- `@tiptap/extension-image` — declared in `package.json:33` but not imported. **No image-insert capability in the editor** despite the dependency.

### Usage of the new `document-*` modules

- `src/lib/document-format.ts` — used in: `src/lib/document-styles.ts:8-15`, `src/components/document/document-sheet.tsx:6-12`, `src/components/ui/rich-text-editor.tsx:41-44`, `src/app/api/generate-pdf/route.ts:2-7`. ✅ All four places that need it.
- `src/lib/document-styles.ts` — used in: `src/components/document/document-sheet.tsx:11`, `src/components/ui/rich-text-editor.tsx:46`, `src/app/api/generate-pdf/route.ts:8`. ✅
- `src/lib/document-logo.ts` — used in: `src/components/document/document-sheet.tsx:12`, `src/components/ui/rich-text-editor.tsx:47-55`, `src/components/forms/form-builder.tsx:22`, `src/app/forms/[id]/preview-sign-client.tsx:16`, `src/app/dashboard/clients/[id]/preview/[templateId]/page.tsx:14`, `src/app/api/generate-pdf/route.ts:9`. ✅
- `src/lib/document-substitution.ts` — used in: `src/app/api/verify-submission/route.ts:4`. **Only one consumer.** The two pre-send previews (builder preview, agent pre-send) still inline their own `varMap` and do not use this module. **3 substitution paths, 1 module.**
- `src/lib/document-fonts.server.ts` — used in: `src/app/api/generate-pdf/route.ts:10`. ✅
- `src/components/document/document-sheet.tsx` — used in: `src/app/forms/[id]/preview-sign-client.tsx:15`, `src/components/forms/form-builder.tsx:21`, `src/app/dashboard/clients/[id]/preview/[templateId]/page.tsx:13`. ✅

The new shared-document system is well-integrated. The only cleanup is the still-inline substitution in 2 of 3 preview paths.

---

## Section 6: Security

| Issue | Severity | Location | Recommendation |
|---|---|---|---|
| `createSubmissionAction` and `updateSubmissionStatusAction` insert `ip_address: "server"` into an `inet` column. Throws `22P02 invalid input syntax for type inet` at runtime. | **High** | `src/lib/actions/data.ts:154-160, 186-192` | Either delete the dead code (recommended) or remove the `tracking_events` insert and let the client insert it with real metadata. |
| `/dashboard/forms/[id]/send` route does not set `verification_data` on the inserted submission. Signers cannot verify identity. | **High** | `src/app/dashboard/forms/[id]/send/send-form-client.tsx:48-57` | Read the client's ssn/phone/last_name and set `verification_data` like `send-actions.tsx:43-47` does. |
| `/api/verify-submission` is a public endpoint with no origin/auth check. Anyone with a `submissionId` can attempt to verify. Rate limit + lockout mitigate but do not fully prevent. | **Medium** | `src/app/api/verify-submission/route.ts:79` | Add origin check / `Referer` validation. Consider CAPTCHA after N fails. |
| `safeEq` in `verify-submission` is a constant-time char-by-char compare but does **not** check length first (`if (a.length !== b.length) return false`). Length leak is minor but a strict implementation would skip the loop entirely on length mismatch without that side channel. | **Low** | `src/app/api/verify-submission/route.ts:70-77` | Acceptable as-is; length is a 4-byte value, very weak side channel. |
| In-memory rate limiter (`RATE` map) is per-process. On serverless cold start, it's empty. With multiple serverless instances (Vercel default), each instance has its own counter. | **Medium** | `src/app/api/verify-submission/route.ts:21-24` | Move the counter to a persistent store (Supabase table, Redis, Upstash) or use the existing `tracking_events` rollup (count `verification_failed` events in the last 10 minutes per submissionId). |
| `signed_pdf_url` is a `getPublicUrl` on a private bucket. The path `${agentId}/${submissionId}/signed.pdf` works only because RLS requires `auth.uid() = folder[1]`. Anyone with the agent's session and the URL can download. There is no signed URL with expiry. | **Medium** | `src/app/api/upload-signed-pdf/route.ts:74-78` and consumers `src/app/dashboard/submissions/[id]/page.tsx:181,189`, `src/app/dashboard/clients/[id]/page.tsx:349,354,415,420`, `src/app/dashboard/submissions/submissions-client.tsx:124,130` | Generate a `createSignedUrl(filePath, 60*60*24*7)` instead and refresh on dashboard load. |
| `dangerouslySetInnerHTML` is used for `html` (template content) and `css` (document styles) in `DocumentSheet` and the editor. The HTML is written by an authenticated agent (templates table) — but the agent is not sanitized. A malicious template could embed `<script>`, `<iframe>`, `onerror=`, etc. | **High** | `src/components/document/document-sheet.tsx:119, 146`, `src/components/ui/rich-text-editor.tsx:750` | Add a sanitization pass (DOMPurify or a custom allowlist) before rendering. The TipTap editor already produces safe HTML on the way out; the risk is an attacker who can write to `templates` (an authenticated agent with XSS payload). |
| `api.ipify.org` call is from the **browser** of the public signer (the verification page used to do this; the new code path moved it server-side). | **Resolved** | `src/lib/tracking.ts:1-14` | The function `getIp()` is still in the module but `getTrackingMetadata` is only called from the server actions and server routes. The browser-side `getTrackingMetadataClient` returns `ip_address: null`. ✅ |
| `use-address-autocomplete` calls Nominatim without a `User-Agent` header. Per Nominatim TOS, requests without identifying headers can be blocked. | **Medium** | `src/hooks/use-address-autocomplete.ts:70-74` | Use a `User-Agent` or `Referer` header. Or move the autocomplete to a server route. |
| `/api/track-event` allows `viewed`, `opened`, `verified`, `verification_failed` — but anyone can fire `viewed` N times. No rate limit. | **Low** | `src/app/api/track-event/route.ts:12-17` | Add a per-submissionId rate limit similar to the verify route. |
| `/api/upload-signed-pdf` does not check that the submission is in a `sent` or `opened` state before allowing upload. A signed submission could be overwritten. | **Medium** | `src/app/api/upload-signed-pdf/route.ts:80-89` | Reject if `sub.status === "signed"` (or use a server-side check). |
| `agents.id = auth.uid()` policy (`001_initial_schema.sql:134-138`) is `FOR ALL` without `TO authenticated`. Per Supabase best-practice, the `TO` should be explicit. | **Low** | All 7 RLS policies in `001_initial_schema.sql:133-204` | Add `TO authenticated` to all `CREATE POLICY` statements. The `USING/WITH CHECK` clauses are tight enough that anon access is denied, but `TO` is hygienic. |
| `auth/callback/route.ts:7-13` redirects to `${origin}${next}` without validating `next` is a same-origin path. Open-redirect risk. | **Medium** | `src/app/auth/callback/route.ts:7-13` | Validate `next` starts with `/` and not `//`. |
| `.env.local` may contain a committed anon key. (Not verified by the audit, but the structure suggests the file is in the workspace.) | **Low** | `.env.local` | Confirm `.env*.local` is in `.gitignore`. Anon key is public by design. |
| The doc says `SSR session cookies` are HttpOnly. Confirmed in `src/lib/supabase/server.ts:11-22` and `src/lib/supabase/middleware.ts:11-23`. ✅ |  |  |  |
| Service-role key usage is properly server-only (`src/lib/supabase/service.ts:1-9` comment, `getServiceRoleSupabase` only called from `src/app/api/*` route handlers and `src/app/forms/[id]/page.tsx`). ✅ |  |  |  |
| `/api/track-event` and `/api/verify-submission` are excluded from middleware (matcher in `src/middleware.ts:34`), so they can run as anon. ✅ Correct. |
| `tracking_events` insert via `track-event` route only allows whitelisted event types (`src/app/api/track-event/route.ts:12-17`). ✅ |
| Submission id is validated as a UUID regex before any DB access (`track-event`, `verify-submission`, `upload-signed-pdf`). ✅ |
| Server-side verify returns `200` even on "wrong credentials" to avoid leaking whether the submission exists (`src/app/api/verify-submission/route.ts:147-152`). ✅ Excellent. |
| Server-side verify returns only the rendered HTML + template name + logo, never the raw client/policy/dependents (`src/app/api/verify-submission/route.ts:294-302`). ✅ |
| `safeEq` constant-time compare for SSN/phone/last_name. ✅ |
| The agent_id is **resolved server-side** in `upload-signed-pdf` from the submission row (line 53), not trusted from the client. ✅ |
| `LogoPanel` reads uploaded image as a `FileReader` dataURL on the client. No server round-trip, no XSS sink (it goes into the template logo JSONB). ✅ |

---

## Section 7: Performance

- **`src/app/dashboard/page.tsx:30-65`** — 5 sequential `await` queries (4 counts + 1 list). Should be `Promise.all`. Latency = sum of round-trips; with parallel = max. Expected: 2-3× speedup.
- **`src/app/dashboard/clients/[id]/page.tsx:52-97`** — 4 sequential `await` queries. Same fix.
- **`src/app/dashboard/clients/[id]/preview/[templateId]/page.tsx:31-67`** — 3 sequential queries (client, template, agent). Should be `Promise.all` after `user` is known.
- **`src/app/dashboard/submissions/page.tsx:13-23`** — 1 query but fetches ALL submissions with no `limit()`. With 1000+ submissions, this loads them all into memory and serializes them to the client. Needs pagination.
- **`src/app/dashboard/clients/page.tsx:15-28`** — same: fetches all clients with no limit.
- **`src/app/dashboard/forms/page.tsx:20-24`** — same: fetches all templates.
- **`src/components/forms/client-wizard.tsx:488-498`** — sequential dependent inserts in a `for` loop. `Promise.all` is a 5× speedup for 5 dependents.
- **`src/app/forms/[id]/preview-sign-client.tsx:209-218`** — `O(W·H)` pixel loop for signature trim. With a 1000×200 canvas on a mid-range mobile, this is ~200k iterations × 4 buffer reads ≈ 800k ops. The `trim-canvas` package is already a dep.
- **`src/app/forms/[id]/preview-sign-client.tsx:185`** — `sigRef.current.isEmpty()` is fine. The trim loop runs regardless of whether the user actually drew something.
- **`src/app/api/verify-submission/route.ts:264-283`** — 3 sequential `tracking_events.insert` calls + 1 `form_submissions.update` on success. The 4 could be in parallel.
- **`src/lib/document-substitution.ts:76-78`** — 24 `new RegExp` allocations per render. For each variable, a new regex is compiled. With repeated renders (form-builder preview, agent pre-send), this is wasted work. A single regex `/\{(\w+)\}/g` with a Map lookup would be O(n) for the HTML and avoid re-compilation.
- **`src/components/ui/rich-text-editor.tsx:183-202`** — `ResizeObserver` + `editor.on("update")` both call `check()` (overflow detection). The `check` function reads `el.scrollHeight` and calls `setOverflow`. With a long document this triggers a re-render. Adequate, but the `editor.on("update")` callback runs on every keystroke. Throttling would help.
- **`src/components/document/document-sheet.tsx:66-86`** — same: `ResizeObserver` + `setAutoScale` on every container resize. Adequate.
- **No code splitting visible.** TipTap + react-signature-canvas + sonner all land in the main bundle. `/forms/[id]` is the heaviest page; Next.js will route-based code-split automatically, but a manual `dynamic(() => import('...'))` for TipTap on the public sign page is unnecessary (it doesn't use TipTap) — but for `/dashboard/forms/builder` it might help. Default Next 14 behavior is fine for now.
- **`src/hooks/use-address-autocomplete.ts:40`** — module-level `lastRequestTime` for 1s throttle. Reasonable.
- **`src/lib/document-fonts.server.ts:9-10`** — in-memory `cachedBase64` and `inflight` promise, single-flight. ✅ Good.
- **`src/app/api/generate-pdf/route.ts`** — depends on Browserless round-trip (~1-3s typical). Hard to reduce without pre-rendering.
- **Images:** no `next/image` usage anywhere. The avatar in `DashboardHeader` uses Radix `<Avatar>` without `<AvatarImage>` (always falls back to initials). The logo in the editor is a base64 dataURL inline. For the public PDF, the logo dataUrl is also embedded. No actual remote image fetches.
- **Bundle:** the form-builder pulls TipTap (7 extensions + 2 custom), `react-signature-canvas`, `cmdk` (via Combobox in the wizard), sonner. No dynamic imports. The public `/forms/[id]` pulls TipTap (indirectly via the verification page) — actually no, the public page uses `DocumentSheet`, not the rich text editor. The public bundle is small.
- **CSS:** `DOCUMENT_CSS` is a single ~3KB string injected via `<style>` per `DocumentSheet` instance. Adequate.
- **Fonts:** the PDF inlines DM Sans as base64 woff2 (good — no network fetch). The browser uses `next/font/google` for DM Sans (good — CDN-cached at build time). The Geist VF/Mono woff files in `src/app/fonts/` are not imported.
- **No telemetry / observability.** No Sentry, no Logflare, no OpenTelemetry.

---

## Prioritized Action Items

Sorted: **Critical bugs → UX blockers → Reliability/Security → Improvements → Nice-to-haves**.

### Critical bugs (must-fix)

1. **[Critical] `/dashboard/forms/[id]/send` does not set `verification_data`** — signers cannot verify. `src/app/dashboard/forms/[id]/send/send-form-client.tsx:48-57`. *Effort: low.*
2. **[Critical] `createSubmissionAction` / `updateSubmissionStatusAction` insert `"server"` into `inet` column** — would throw if called. `src/lib/actions/data.ts:154-160, 186-192`. *Effort: low (delete or fix).*
3. **[Critical] Template HTML is not sanitized** — `dangerouslySetInnerHTML` on the document body for unauthenticated public viewers. `src/components/document/document-sheet.tsx:146`. *Effort: low-medium (add DOMPurify).*
4. **[Critical] `next` parameter in `/auth/callback` is an open redirect** — `src/app/auth/callback/route.ts:13`. *Effort: low.*

### UX blockers (high impact)

5. **[High] `Document Already Signed` card has no download link on re-open** — only the just-signed flow has `generatedPdfUrl`. `src/app/forms/[id]/preview-sign-client.tsx:319-348`. *Effort: low (add a "Download PDF" button that calls the public API or a pre-signed URL).*
6. **[High] `signed_pdf_url` is `getPublicUrl` on a private bucket** — works only if the agent is signed in. Should be a signed URL. `src/app/api/upload-signed-pdf/route.ts:74-78` + 6 consumers. *Effort: low (swap to `createSignedUrl` with TTL).*
7. **[High] `verification_data` is a stringly-typed JSON blob** — the column is `jsonb` (added on top of `001_initial_schema.sql` in a manual migration) but no migration reflects it. Add migration `005_submission_verification.sql` and `006_tracking_metadata.sql` to capture the live schema. *Effort: low-medium.*
8. **[High] No template-list "Send" entry point** — `/dashboard/forms` has no Send button. The route exists but is dead. Either remove the route or add a Send button. *Effort: low.*
9. **[High] `EditClientModal` does not validate email/SSN/phone** — inconsistent with the wizard. `src/app/dashboard/clients/[id]/edit-client-modal.tsx:111-154`. *Effort: low (mirror the wizard's `validateClientField`).*
10. **[High] Profile page has no validation** — can save empty name. `src/app/dashboard/profile/page.tsx:55-83`. *Effort: low.*

### Security / reliability

11. **[High] `/api/track-event` has no per-submission rate limit** — anyone can flood `viewed` events. `src/app/api/track-event/route.ts`. *Effort: low (reuse the same pattern as `verify-submission`).*
12. **[High] `/api/upload-signed-pdf` does not check submission status** — a signed submission can be overwritten. `src/app/api/upload-signed-pdf/route.ts:80-89`. *Effort: low.*
13. **[High] Rate limiter is in-memory** — does not work across Vercel instances. `src/app/api/verify-submission/route.ts:21-24`. *Effort: medium (move to a Supabase table or Redis).*
14. **[High] `handle_new_user` is `SECURITY DEFINER` in `public`** — Postgres grants `EXECUTE` to `PUBLIC` by default. Anon can call it. *Effort: low (REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC; then GRANT EXECUTE TO authenticated;).*
15. **[Medium] RLS policies lack `TO authenticated`** — best-practice hygiene. All 7 policies in `supabase/migrations/001_initial_schema.sql:133-204`. *Effort: low.*
16. **[Medium] Nominatim call has no `User-Agent`** — can be blocked. `src/hooks/use-address-autocomplete.ts:70-74`. *Effort: low.*

### Code quality / consistency

17. **[High] Variable substitution is implemented 3 times** — `src/lib/document-substitution.ts` (the public signing flow), `src/components/forms/form-builder.tsx:121-152` (builder preview), `src/app/dashboard/clients/[id]/preview/[templateId]/page.tsx:69-117` (agent pre-send). Refactor the two preview paths to use `substituteTemplateVars` with dummy and real data. *Effort: medium.*
18. **[High] `Record<string, unknown>` everywhere** — 11+ files. `src/lib/types.ts` already defines the domain types. Either generate types via `npx supabase gen types typescript` or use the existing interfaces. *Effort: medium.*
19. **[High] All 6 server actions in `src/lib/actions/data.ts` are dead** — every UI mutation is a direct `supabase.from(...).insert/update` from the client. Either delete the dead code or wire the actions in. *Effort: medium.*
20. **[Medium] `client-wizard.tsx` is 1090 lines in one file** — split into `ClientStep1`, `ClientStep2`, `ClientStep3` components. *Effort: medium.*
21. **[Medium] Sequential `await` on dashboards** — `/dashboard`, `/dashboard/clients/[id]`, `/dashboard/clients/[id]/preview/[templateId]`. Use `Promise.all`. *Effort: low.*

### Improvements

22. **[Medium] Signature trim is hand-rolled `O(W·H)`** — use `trim-canvas` (already a dep). `src/app/forms/[id]/preview-sign-client.tsx:199-231`. *Effort: low.*
23. **[Medium] Sequential dependent inserts in the wizard** — `src/components/forms/client-wizard.tsx:488-498`. Use `Promise.all`. *Effort: low.*
24. **[Medium] Sequential tracking_events inserts on success in `verify-submission`** — 3 inserts + 1 update. *Effort: low.*
25. **[Medium] Submissions list / clients list / templates list have no pagination** — could be slow at scale. *Effort: medium.*
26. **[Medium] Search is client-side only, by name** — add status filter on submissions, policy/city/email on clients, name on templates. *Effort: medium.*
27. **[Medium] Add a client-delete flow** — confirmation modal, soft-delete with `deleted_at` column, or hard delete. *Effort: medium.*
28. **[Medium] Add a template-delete flow** — confirmation modal. *Effort: low.*
29. **[Medium] Add a "Cancel submission" / "Void" flow for unsigned submissions.** *Effort: medium.*
30. **[Medium] Add a `domain` field to `agents` for email-template branding.** *Effort: low.*
31. **[Low] Notification system: send agent an email when a client signs.** *Effort: medium (Resend or Supabase + transactional template).*
32. **[Low] In-app notification center on the dashboard header.** *Effort: medium.*
33. **[Low] Bulk send (one template to many clients).** *Effort: medium.*
34. **[Low] Bulk resend / reminder emails.** *Effort: medium.*
35. **[Low] Add CSRF protection to server actions / API routes** — currently relies on `getUser()` cookie. *Effort: medium (double-submit token or check origin).*

### Nice-to-haves

36. **[Low] Add tests with Vitest** — start with `substituteTemplateVars`, `safeEq`, `smartSearch`, `formatSsn/formatPhone`, `getTrackingMetadata`, `parseServerMetadata`. *Effort: medium.*
37. **[Low] Use `handlebars` for true templating** — supports `{{#if}}` and `{{#each}}` for dependent lists. *Effort: medium-high.*
38. **[Low] Add `Insert Table` to the TipTap editor** — the dep `@tiptap/extension-image` is already there but not imported. *Effort: low.*
39. **[Low] Add @tiptap/extension-highlight (the dep is installed but not imported).** *Effort: low.*
40. **[Low] Replace `pdf-lib` for signature stamping** — stamp the signature + hash + timestamp server-side instead of rasterizing an `<img>` in Browserless. *Effort: medium.*
41. **[Low] Add `<Toaster />` from `sonner` to the form-builder / client-wizard pages** — currently only the root layout has one. Adequate. *Effort: none.*
42. **[Low] Migrate `pnpm-workspace.yaml` to a single lockfile** — both `package-lock.json` and `pnpm-lock.yaml` exist. *Effort: low.*
43. **[Low] Add ESLint rule for `dangerouslySetInnerHTML` to require a comment justifying it.** *Effort: low.*
44. **[Low] Add an `.env.example` next to the existing one** — already exists. ✅
45. **[Low] Add a CI workflow** — `npm run lint`, `npm run build`. *Effort: low.*
46. **[Low] Add `pdf-lib` based PDF/A-1b compliance** for insurance archival. *Effort: high.*
47. **[Low] Multi-language support** — the wizard already has Spanish labels. Make it consistent. *Effort: high.*
48. **[Low] Add a "Bulk import clients" CSV flow.** *Effort: medium.*
49. **[Low] Per-agent feature flags (e.g. enable/disable MFA enforcement).** *Effort: medium.*
50. **[Low] Delete `src/lib/toast.ts`, `src/lib/pdf-utils.ts`, `src/hooks/use-auth.ts`, `src/app/fonts/GeistVF.woff`, `src/app/fonts/GeistMonoVF.woff` if no plan to revive them.** *Effort: low.*

---

*End of AUDIT_REPORT.md*
