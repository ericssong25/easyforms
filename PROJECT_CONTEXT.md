# PROJECT_CONTEXT.md — Easy Forms

Structured project summary. Snapshot taken 2026-06-09 against the source of `easy-forms-new` and the live schema in Supabase. This file supersedes the earlier `PROJECT_CONTEXT.md`: it reflects the recent additions — `document-format.ts`, `document-styles.ts`, `document-logo.ts`, `document-substitution.ts`, `document-fonts.server.ts`, `document-sheet.tsx`, the new service-role endpoints (`/api/verify-submission`, `/api/track-event`), the WYSIWYG editor polish, the logo support, the toolbar fixes, and the migration `004_template_logo.sql`.

---

## 1. ESTRUCTURA DEL PROYECTO

Árbol completo excluyendo `node_modules`, `.next`, `.git` y binarios.

```
easy-forms-new/
├── AGENTS.md
├── AUDIT_REPORT.md                (NEW — full audit, 2026-06-09)
├── PROJECT_CONTEXT.md             (este archivo)
├── README.md                      (boilerplate create-next-app, no describe el proyecto)
├── components.json                (shadcn/ui new-york, Tailwind, css variables)
├── .env.example                   (Supabase + Browserless; ver §8)
├── .env.local                     (gitignored)
├── .eslintrc.json                 (next/core-web-vitals + next/typescript)
├── next.config.mjs                (images.remotePatterns: { hostname: "**" })
├── next-env.d.ts
├── package.json / package-lock.json
├── pnpm-lock.yaml                 (también lockfile de pnpm presente)
├── pnpm-workspace.yaml            (allowBuilds: core-js, msw, unrs-resolver)
├── postcss.config.mjs             (solo tailwindcss)
├── tailwind.config.ts             (paleta navy / slate-blue / emerald + HSL tokens)
├── tsconfig.json                  (strict, paths: @/* → ./src/*)
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql     (7 tablas + 7 políticas RLS + trigger)
│       ├── 002_storage_setup.sql      (bucket signed_forms + 4 RLS)
│       ├── 003_consent_fields.sql     (ALTER clients tax_*/marital_status)
│       └── 004_template_logo.sql      (NEW — ALTER templates ADD COLUMN logo jsonb)
└── src/
    ├── middleware.ts                          (matcher excluye /forms y /api/{verify,track,generate-pdf,upload-signed-pdf})
    ├── hooks/
    │   ├── use-auth.ts                        (NOT IMPORTED — dead code; same logic inlined in login/mfa-banner/security)
    │   └── use-address-autocomplete.ts        (Nominatim, throttle 1s)
    ├── lib/
    │   ├── actions/data.ts                    (server actions *Action — DEAD CODE, no UI calls them)
    │   ├── supabase/
    │   │   ├── client.ts                      (browser client)
    │   │   ├── server.ts                      (RSC, await cookies())
    │   │   ├── middleware.ts                  (request/response cookie bridge, MFA gate)
    │   │   └── service.ts                     (NEW — service-role factory, server-only)
    │   ├── insurance-data.ts                  (~85 carriers, ~95 plans hardcoded)
    │   ├── pdf-utils.ts                       (usePdfDownload + generateSignedPdfUrl — DEAD CODE)
    │   ├── search.ts                          (smartSearch con alias/abbrev)
    │   ├── toast.ts                           (createToast/onToast event bus — DEAD CODE)
    │   ├── tracking.ts                        (IP + UA + device parse, cleanIp, safeEq-style helpers)
    │   ├── types.ts                           (dominio TS)
    │   ├── utils.ts                           (cn = clsx + tailwind-merge)
    │   ├── document-format.ts                 (NEW — single source of truth for page geometry)
    │   ├── document-styles.ts                 (NEW — scoped .ef-document CSS, font injection)
    │   ├── document-logo.ts                   (NEW — TemplateLogo type, normalizeLogo, presets)
    │   ├── document-substitution.ts           (NEW — pure variable substitution)
    │   └── document-fonts.server.ts           (NEW — single-flight DM Sans woff2 fetch/cache)
    ├── components/
    │   ├── auth/
    │   │   ├── enroll-mfa.tsx                 (TOTP QR + verify)
    │   │   ├── verify-mfa.tsx                 (TOTP challenge + verify)
    │   │   └── mfa-banner.tsx                 (shown if aal1→aal1, no factor enrolled)
    │   ├── dashboard/
    │   │   ├── header.tsx                     (avatar + dropdown + signOut)
    │   │   └── sidebar.tsx                    (incluye MobileNavSheet)
    │   ├── document/
    │   │   └── document-sheet.tsx             (NEW — shared WYSIWYG sheet, fit-to-container, scoped CSS injection)
    │   ├── forms/
    │   │   ├── client-wizard.tsx              (3 pasos, 1090 líneas)
    │   │   └── form-builder.tsx               (TipTap, logo + variables + overflow guard)
    │   └── ui/                                (20 primitivas shadcn, ver §10)
    │       └── rich-text-editor.tsx           (TipTap editor: toolbar + LogoPanel + overflow detection)
    └── app/
        ├── layout.tsx                         (root, monta <Toaster />)
        ├── globals.css
        ├── page.tsx                           (redirect("/dashboard"))
        ├── fonts/                             (Geist VF, GeistMonoVF — NOT IMPORTED)
        ├── api/
        │   ├── generate-pdf/route.ts          (POST { html, signature, logo } → Browserless → base64)
        │   ├── upload-signed-pdf/route.ts     (POST multipart → signed_forms bucket, logs "signed" event)
        │   ├── verify-submission/route.ts     (NEW — POST { submissionId, ssnLast4, phoneLast4, lastName }; service-role verify + server-side render)
        │   └── track-event/route.ts           (NEW — POST { submissionId, eventType }; allowlist; logs viewed/verified/opened/verification_failed)
        ├── auth/callback/route.ts             (PKCE exchange, then redirect to ?next=)
        ├── login/page.tsx
        ├── signup/page.tsx
        ├── forgot-password/page.tsx
        ├── reset-password/page.tsx
        ├── forms/                             (PÚBLICO, sin auth)
        │   ├── layout.tsx
        │   └── [id]/
        │       ├── page.tsx                   (server: trae submission + template name + logo + agency; no PII)
        │       └── preview-sign-client.tsx    (verify → render document → sign → upload)
        └── dashboard/                         (auth + MFA requerido)
            ├── layout.tsx                     (auth + agent + sidebar/header)
            ├── page.tsx                       (stats + recent)
            ├── profile/page.tsx
            ├── security/page.tsx              (TOTP enroll/unenroll)
            ├── clients/
            │   ├── page.tsx
            │   ├── clients-search-wrapper.tsx
            │   ├── new/page.tsx               (recibe ?resume=clientId)
            │   └── [id]/
            │       ├── page.tsx
            │       ├── send-form-section.tsx
            │       ├── edit-client-modal.tsx
            │       ├── edit-policy-modal.tsx
            │       ├── edit-dependents-modal.tsx
            │       └── preview/[templateId]/
            │           ├── page.tsx           (server render con datos reales)
            │           └── send-actions.tsx   (Generate Secure Link)
            ├── forms/
            │   ├── page.tsx                   (template list)
            │   ├── builder/page.tsx
            │   ├── builder/[id]/page.tsx
            │   └── [id]/send/                 (⚠ la ruta existe pero no hay link de entrada desde la UI)
            │       ├── page.tsx
            │       └── send-form-client.tsx
            └── submissions/
                ├── page.tsx
                ├── submissions-search-wrapper.tsx
                ├── submissions-client.tsx     (acciones fila + dialog tracking)
                └── [id]/page.tsx
```

### Qué contiene cada carpeta principal
- **`src/app/api/`** — cuatro Route Handlers: generación de PDF vía Browserless, subida del PDF firmado a Storage, verificación de identidad de la firma (service-role, server-side render), y tracking de eventos del firmante.
- **`src/app/{login,signup,forgot-password,reset-password,auth}`** — flujo auth completo de Supabase con callback PKCE.
- **`src/app/forms/[id]/`** — flujo público de firmado: verificación server-side (SSN-4 + phone-4 + last name, constant-time compare, in-memory rate limit + lockout) → documento pre-renderizado server-side → firma → upload. **No PII cruza el wire sin verificar.**
- **`src/app/dashboard/`** — zona privada tras middleware: clientes, pólizas, plantillas, envíos, perfil, 2FA.
- **`src/components/ui/`** — 20 primitivas shadcn/ui + `toaster.tsx` (shim sonner) + `rich-text-editor.tsx` (TipTap con toolbar, LogoPanel, overflow detection, `onOverflowChange` callback).
- **`src/components/forms/`** — `client-wizard.tsx` (3 pasos) y `form-builder.tsx` (editor TipTap con variables + logo + live overflow).
- **`src/components/document/`** — `document-sheet.tsx` (hoja de papel compartida por editor, preview antes de enviar, y post-verify).
- **`src/components/auth/`** — pantallas de enrolamiento y verificación TOTP.
- **`src/components/dashboard/`** — `sidebar.tsx` (con `MobileNavSheet`) y `header.tsx`.
- **`src/lib/actions/data.ts`** — server actions (definidas pero **NO usadas** por la UI actual; toda mutación se hace directo desde el cliente).
- **`src/lib/supabase/`** — 4 factories (browser, RSC, middleware, **service-role**).
- **`src/lib/document-*.ts`** — sistema compartido de geometría, estilos, logo, sustitución de variables y carga de fuente.
- **`src/lib/insurance-data.ts`** — datos estáticos de aseguradoras y planes (carriers, plans, aliases, estados).
- **`src/lib/search.ts`** — búsqueda ponderada (alias, abreviaturas, scoring por palabra).
- **`src/lib/tracking.ts`** — IP via ipify (cliente) + `parseServerMetadata` (server) + `cleanIp` (NULL safe para columna `inet`).
- **`src/lib/types.ts`** — modelos del dominio (Agent, Client, Policy, Dependent, Template, FormSubmission, TrackingEvent).
- **`supabase/migrations/`** — 4 SQL. `001_initial_schema.sql` crea el modelo entero, `002_storage_setup.sql` crea el bucket y RLS, `003_consent_fields.sql` añade 3 columnas a `clients`, **`004_template_logo.sql` añade `logo jsonb` a `templates`**.

---

## 2. STACK TECNOLÓGICO

### Lenguajes
- TypeScript 5 (`tsconfig.json:67`, `"strict": true`)
- JavaScript implícito vía `allowJs: true` y JSX (`tsconfig.json:3-13`)
- SQL procedural (PL/pgSQL) para el trigger `handle_new_user` (`001_initial_schema.sql:209-220`)
- HTML/CSS (Tailwind + CSS variables)

### Framework y runtime
- **Next.js 14.2.35** (App Router, RSC, Route Handlers, `next/font/google` DM Sans, `next/image`)
- **React 18** + `react-dom 18`
- **Node 20** declarado en `@types/node: "^20"`
- Gestor de paquetes ambiguo: coexisten `package-lock.json` (npm) y `pnpm-lock.yaml` + `pnpm-workspace.yaml`.

### UI y estilos
- **Tailwind CSS 3.4** + `tw-animate-css: ^1.4.0` (en lugar de `tailwindcss-animate`)
- **shadcn/ui** (new-york, slate base, lucide icons, css variables) — `components.json`
- **Radix UI** primitives: avatar, checkbox, dialog, dropdown-menu, label, scroll-area, select, separator, slot, tabs
- **`@base-ui/react ^1.4.1`** declarada pero **no usada en el código** (0 imports)
- **DM Sans** vía `next/font/google` (`src/app/layout.tsx:7-11`), declarado como `font-sans` global (`tailwind.config.ts:75-77`)
- **Geist VF** y **GeistMonoVF** (woff en `src/app/fonts/`) — **declarados pero NO importados** en el layout
- `tailwind.config.ts` añade paleta propia: `navy #1a3a5c`, `slate-blue #2d5a7b`, `emerald` con tonos

### Formularios y validación
- **react-hook-form 7.75** (en `dependencies`) — **no se usa en el código**; los wizards implementan su propio estado con `useState`
- **zod 4.4** + **@hookform/resolvers 5.2** (en `dependencies`) — **no se usan en el código**
- Validación implementada a mano en `client-wizard.tsx:288-361` y `edit-client-modal.tsx:111-153`

### Rich text
- **TipTap 3.22** (`@tiptap/react`, `starter-kit`, `font-family`, `text-align`, `text-style`, `underline`, `link`)
- Extensiones custom inline: `FontSize` (`src/components/ui/rich-text-editor.tsx:59-86`) y `LineHeight` (`rich-text-editor.tsx:88-120`)
- **Nota:** `@tiptap/extension-highlight`, `@tiptap/extension-image` están instaladas en `package.json:32-33` pero **no se importan en el editor** (capacidad de insertar imágenes/highlight no expuesta en la UI).

### PDF y manipulación
- **jspdf 4.2** + **html2canvas 1.4** + **pdf-lib 1.17** + **trim-canvas 0.1** (en `dependencies`) — **ninguno se importa en el código**; el único render real de PDF lo hace Browserless vía fetch. `trim-canvas` sería el drop-in para la operación manual `O(W·H)` en `preview-sign-client.tsx:209-218`.

### Backend / servicios
- **Supabase JS 2.105** + **@supabase/ssr 0.10** (auth, RSC, middleware)
- **Browserless.io** (`https://chrome.browserless.io/pdf` por defecto)
- **api.ipify.org** (cliente, para IP del firmante; **migrado a server-side** vía `parseServerMetadata` en endpoints)
- **nominatim.openstreetmap.org** (autocompletar dirección; throttle 1s; **sin User-Agent header**)

### Iconos y utilidades
- **lucide-react ^1.14.0** (pinned raro — ver §12)
- `class-variance-authority 0.7`, `clsx 2.1`, `tailwind-merge 3.5`, `cmdk 1.1`, `date-fns 4.1` (no usado), `sonner 2.0.7`, `react-signature-canvas 1.1.0-alpha.2`, `shadcn 4.7.0` (CLI)

### Scripts
```
npm run dev     → next dev
npm run build   → next build
npm run start   → next start
npm run lint    → next lint
```
No hay `test`, `typecheck`, `format`. AGENTS.md lo confirma.

---

## 3. PUNTOS DE ENTRADA Y FLUJO

### Entradas
- **Frontend**: `src/app/layout.tsx` (root) → `src/app/page.tsx` (`redirect("/dashboard")`)
- **Backend / API**: 4 Route Handlers en `src/app/api/{generate-pdf,upload-signed-pdf,verify-submission,track-event}/route.ts`, más `src/app/auth/callback/route.ts` (intercambio de código PKCE).
- **Middleware**: `src/middleware.ts` aplica `updateSession` (`src/lib/supabase/middleware.ts`) a todo excepto `_next/static`, `_next/image`, `favicon.ico`, `forms`, `api/verify-submission`, `api/track-event`, `api/generate-pdf`, `api/upload-signed-pdf`, y extensiones de imagen.

### Flujo de una petición típica — agente envía un formulario (camino correcto, desde el cliente)
1. Agente entra a `/dashboard/clients/[id]` → `SendFormSection` → pick template → "Generate & Preview".
2. Server component `.../preview/[templateId]/page.tsx:31-67` carga cliente + template + agente, **renderiza el HTML con variables sustituidas localmente** (en `renderContent()` lines 69-117 — *duplicación menor, ver §12*).
3. Agente hace clic en "Generate Secure Link" → `send-actions.tsx:21-81`:
   - Lee `ssn_last4`, `phone_last4`, `last_name` del cliente.
   - Inserta `form_submissions` con `status: "sent"` + `verification_data: { ssn_last4, phone_last4, last_name }`.
   - Inserta `tracking_events` con `event_type: "sent"` + `getTrackingMetadata()` (resuelve IP via ipify en cliente).
   - Muestra `${origin}/forms/${submission.id}` con Copy / Open / Share-via-Email.

### Flujo del firmante (PII-gated, server-side)
1. Cliente abre `/forms/[id]` en incognito → `forms/[id]/page.tsx:27-81` (server component) llama `getServiceRoleSupabase()`, **selecciona SOLO `id, status, agents.agency_name/full_name, templates.name/logo`**. **No PII.** Si no es UUID válido → `<NotFound />`. Si la service-role no está configurada → `<ServiceUnavailable />`.
2. `PreviewAndSign` (`preview-sign-client.tsx`) renderiza UI de verificación. Inmediatamente `POST /api/track-event { eventType: "viewed" }` (allowlist: `viewed | opened | verified | verification_failed`).
3. Cliente llena SSN-4, phone-4, last name → "Verify & Continue" → `POST /api/verify-submission` (`route.ts:79-309`):
   - **Validación:** UUID regex, rate limit (in-memory `RATE` map, 5 fails / 10 min, lockout 15 min), constant-time `safeEq` para los 3 campos.
   - **Carga inicial** (línea 132): solo `id, status, verification_data, agents.agency_name/full_name, templates.name/content/logo` — sin PII todavía.
   - Si falla: `tracking_events` inserta `verification_failed` con `parseServerMetadata` (server-side IP/UA/device). Devuelve `200` (no `4xx`) para no leak existencia.
   - Si pasa: carga full submission (client/policy/dependents/agent/template content), `substituteTemplateVars` (server-side), inserta `verified` + `opened` + actualiza `status: "opened"`. Devuelve `{ ok: true, status, template: { name, logo, html } }` — **NO raw PII**.
4. Cliente ve documento con variables ya sustituidas. Pinch-zoom / wheel-zoom / Fit/100%.
5. Dibuja firma en `<SignatureCanvas>` (pen color `#1a3a5c`). "Capture Signature" → `setIsSigned(true)`. "Sign Document & Generate PDF".
6. `generateAndUploadPdf` (`preview-sign-client.tsx:194-315`):
   1. **Trim manual** del canvas: loop O(W·H) sobre `getImageData().data` (líneas 209-218). Bug latente: `trim-canvas` ya está en `package.json:56`.
   2. `POST /api/generate-pdf` con `{ html, signature, logo }` → `route.ts:14-170`:
      - `getDmSansWoff2Base64()` (single-flight, in-memory cache) desde `src/lib/document-fonts.server.ts`.
      - `documentCssWithFonts()` desde `src/lib/document-styles.ts` — inyecta base64 woff2 inline.
      - Geometría desde `src/lib/document-format.ts` (PAGE_PX, MARGINS, CONTENT_WIDTH, SIGNATURE_ZONE_PX, EDITABLE_HEIGHT).
      - HTML completo envuelve logo (`hasLogo(logo)` desde `document-logo.ts`), `.ef-document-content`, y `.ef-signature-zone`.
      - `POST https://chrome.browserless.io/pdf?token=…` con `{ html, options: { format: "Letter", printBackground: true, preferCSSPageSize: true, margin: {0,0,0,0} } }`.
      - Devuelve `{ pdf: <base64> }`.
   3. Cliente decodifica base64 → Blob → descarga `signed-document-YYYY-MM-DD.pdf`.
   4. `POST /api/upload-signed-pdf` con `FormData({ file, submissionId, agentId: "", signatureData })` → `route.ts:10-112`:
      - **Resuelve `agentId` server-side** desde la fila de submission (no se confía en el cliente).
      - `storage.from("signed_forms").upload(${agentId}/${submissionId}/signed.pdf, ..., { upsert: true, contentType: "application/pdf" })`.
      - `getPublicUrl(...)` → guarda en `signed_pdf_url` (URL pública de bucket privado, funciona solo por RLS — ver §12).
      - `form_submissions.update({ status: "signed", signed_pdf_url, signature_data, signed_at })`.
      - `tracking_events.insert({ event_type: "signed", ...parseServerMetadata })`.

### Flujo de una petición típica — agente crea plantilla
1. `/dashboard/forms/builder` o `/dashboard/forms/builder/[id]` → monta `FormBuilder` (`src/components/forms/form-builder.tsx:73-368`).
2. Editor TipTap en `<RichTextEditor>` (`src/components/ui/rich-text-editor.tsx:145-397`) con:
   - **Toolbar** (font family 5 opciones, font size +/-, line height +/-, H1/H2/H3, bold/italic/underline/strike, clear, align L/C/R, bullet/numbered list, link, undo/redo).
   - **LogoPanel** (upload/replace, position top-left/right, size presets Small/Medium/Large, slider 40-240px, remove).
   - **Live overflow detection** (líneas 183-202): `ResizeObserver` + `editor.on("update")` miden `scrollHeight > EDITABLE_HEIGHT + 1`. Renderiza línea roja discontinua + amber warning. `onOverflowChange` callback al padre.
3. **Tabs Edit / Preview** (mismo `<DocumentSheet>`):
   - Edit: editor TipTap dentro de hoja `bg-white shadow` sobre "desk" `bg-slate-100`, dimensiones `PAGE_PX.width=816px` exactas.
   - Preview: `renderPreview()` (líneas 121-152) con `varMap` de datos dummy ("John Smith"). **Tercera copia de la sustitución — ver §12.**
4. Variables panel: 24 tokens en 4 categorías (Client / Policy / Agency / Form). `insertText` mueve el cursor y pega el token (`rich-text-editor.tsx:208-222`).
5. `handleSave` (líneas 197-209) hace `upsert` en `templates` con `name`, `content`, `logo` directamente desde el cliente. **Bypassa la server action `createTemplateAction`** (línea 107 de `actions/data.ts`, dead code).

---

## 4. ARQUITECTURA Y PATRONES

### Organización
- **App Router de Next.js** con separación por dominio:
  - `(auth)`: `src/app/{login,signup,forgot-password,reset-password}` (cliente, "use client")
  - `(public)`: `src/app/forms/[id]` (cliente, sin auth)
  - `(dashboard)`: `src/app/dashboard/**` (server components que revalidan auth, ver `src/app/dashboard/layout.tsx:8-37`)
- **Capas**:
  - `app/` — rutas (server) + componentes específicos (cliente)
  - `components/ui/` — primitivas (shadcn, "use client" cuando usan estado)
  - `components/{auth,dashboard,forms,document}/` — compuestos de dominio
  - `lib/supabase/` — 4 factories de cliente
  - `lib/actions/` — server actions (mutaciones con `revalidatePath`, **NO USADAS**)
  - `lib/document-*.ts` — sistema de documentos compartido (geometría, estilos, logo, sustitución, fuente)
  - `lib/*.ts` — utilidades puras (search, tracking, types, utils, insurance-data, pdf-utils — dead)
  - `hooks/` — hooks de cliente (`use-auth` dead, `use-address-autocomplete` vivo)
- **Cuatro variantes del cliente Supabase** (browser, RSC, middleware, service-role) — patrón `@supabase/ssr` estándar.

### Patrones
- **Server components primero**: layouts y páginas hacen `await createClient()` + queries y pasan datos a client components. RSC + cookies de Next 15-style (`await cookies()` en `src/lib/supabase/server.ts:5`).
- **Documento compartido**: el editor, los dos previews (agente y público), y el PDF todos derivan de `document-format.ts` (constantes de geometría), `document-styles.ts` (CSS scoped a `.ef-document`), `document-logo.ts` (JSONB shape + normalize), `document-substitution.ts` (función pura).
- **Service-role + safety**: el `getServiceRoleSupabase()` (`src/lib/supabase/service.ts`) cachea el cliente, loggea un booleano (nunca el valor) si las env vars faltan. Solo se llama desde Route Handlers y desde `forms/[id]/page.tsx` (donde la ruta está excluida del middleware).
- **Tracking-first**: cada acción del firmante (verify, open, send, sign) escribe su evento en `tracking_events` con IP/UA/device reales del request, vía `parseServerMetadata` (server) o `getTrackingMetadata` (cliente). El endpoint `/api/track-event` valida que `eventType` esté en una allowlist (`viewed | opened | verified | verification_failed`) y el `submissionId` sea un UUID.
- **Verifier hardening**: `safeEq` (constant-time char compare), `cleanIp` (NULL para loopback/localhost — no `"server"`), rate limiter in-memory con TTL 10min y lockout 15min. `noteSuccess` resetea el contador tras un verify exitoso.
- **Modales como client components** montados en server pages: `EditClientModal`, `EditPolicyModal`, `EditDependentsModal` se pasan los `initialData` desde la página servidor.
- **Búsqueda estática** sobre datasets en memoria: `lib/insurance-data.ts` + `lib/search.ts` (alias, abreviaturas, scoring por palabra). Sin consultas a la DB para carriers/plans.
- **Variable substitution por regex** — 3 sitios con duplicación:
  - `src/lib/document-substitution.ts:24-80` (server, el canónico, usado por `/api/verify-submission`).
  - `src/components/forms/form-builder.tsx:121-152` (preview del editor, con datos dummy "John Smith").
  - `src/app/dashboard/clients/[id]/preview/[templateId]/page.tsx:69-117` (preview antes de enviar, con datos reales del cliente, formato de `premium` distinto).
  - **El refactor natural** es hacer que las dos páginas de preview llamen `substituteTemplateVars` con `{ client, policy, dependents, agent }` apropiado y datos dummy/real.

### Convenciones de nomenclatura
- **Componentes**: `PascalCase` (`ClientWizard`, `FormBuilder`, `DocumentSheet`, `DashboardSidebar`).
- **Hooks**: prefijo `use-` en archivo, `useXxx` en export (`use-auth.ts` dead, `use-address-autocomplete.ts`).
- **Server actions**: `*Action` (definidas en `lib/actions/data.ts` pero no llamadas).
- **Tipos**: interfaces `PascalCase`, tipos unión `PascalCase` (`FormSubmissionStatus`, `PlanType`).
- **Archivos UI**: kebab-case (`date-input.tsx`, `rich-text-editor.tsx`, `combobox.tsx`, `document-sheet.tsx`).
- **Módulos document-***: `document-format.ts`, `document-styles.ts`, `document-logo.ts`, `document-substitution.ts`, `document-fonts.server.ts` (sufijo `.server.ts` para asegurar que no entra al bundle del cliente).
- **Variables placeholder de plantilla**: snake_case envuelto en `{...}` (`{first_name}`, `{policy_number}`, `{coverage_count}`).
- **Tokens CSS**: definidos en `src/app/globals.css:6-76` como HSL y referenciados en `tailwind.config.ts:19-68`.
- **Event types en tracking**: lowercase con guiones (`verification_failed`).
- **CSS variables del documento** (en `document-format.ts`): `--ef-page-w`, `--ef-page-h`, `--ef-margin-*`, `--ef-content-w`, `--ef-editable-h`, `--ef-sig-zone-h`, `--ef-doc-font`, `--ef-logo-w`, `--ef-logo-max-w`, `--ef-logo-opacity`.

---

## 5. INTEGRACIÓN CON SUPABASE

### Clientes
- **Browser** (`src/lib/supabase/client.ts:1-8`): `createBrowserClient`. Usado por todos los client components y hooks.
- **RSC** (`src/lib/supabase/server.ts:1-25`): `createServerClient` con `await cookies()` (Next 15 style). Usado por todos los server components y server actions.
- **Middleware** (`src/lib/supabase/middleware.ts:1-68`): rehidrata cookies en request/response, llama `auth.getUser()` + `auth.mfa.getAuthenticatorAssuranceLevel()` y redirige a `/login` si:
  - no hay user y la ruta no es `/login|signup|auth|forgot-password|reset-password`, o
  - hay user pero `aal1 → aal2` (necesita MFA) y no está en ruta de auth, o
  - ya autenticado y completo `aal2` e intenta entrar a una ruta de auth (lo manda a `/dashboard`).
- **Service role** (`src/lib/supabase/service.ts:1-26`): `createClient` con `SUPABASE_SERVICE_ROLE_KEY` y `{ auth: { autoRefreshToken: false, persistSession: false } }`. Cachea el cliente. **Solo usado por**:
  - `src/app/forms/[id]/page.tsx` (página pública, sin sesión).
  - `src/app/api/verify-submission/route.ts` (verifica + renderiza server-side).
  - `src/app/api/track-event/route.ts` (inserta tracking anon).
  - `src/app/api/upload-signed-pdf/route.ts` (resuelve agentId + upload + tracking).

### Schema (extraído de la DB real, no solo del SQL)

| Tabla | RLS | Columnas clave |
|---|---|---|
| `agents` | ✅ | `id uuid PK→auth.users`, `email`, `full_name`, `agency_name`, `npn`, `phone`, `created_at` |
| `policies` | ✅ | `id`, `agent_id →agents`, `carrier`, `plan`, `policy_number`, `premium numeric(10,2)`, `effective_date date` |
| `clients` | ✅ | `id`, `agent_id`, `policy_id?`, `first_name`, `last_name`, `ssn_encrypted text`, `applies_to_policy bool`, `email`, `phone`, `address`, `city`, `state`, `zip`, `date_of_birth`, `subscriber_number`, `holder_income numeric`, `tax_filing_status`, `marital_status`, `tax_dependents_count int` |
| `dependents` | ✅ | `id`, `client_id`, `policy_id`, `first_name`, `last_name`, `applies_to_policy`, `date_of_birth`, `ssn_encrypted` |
| `templates` | ✅ | `id`, `agent_id`, `name`, `content text` (HTML con `{variables}`), **`logo jsonb`** (NEW en `004_template_logo.sql`) |
| `form_submissions` | ✅ | `id`, `agent_id`, `client_id`, `template_id`, `status form_submission_status`, `signed_pdf_url?`, `signature_data?`, `signed_at?`, `verification_data jsonb?` (estado real, no migrado), `created_at` |
| `tracking_events` | ✅ | `id`, `submission_id`, `event_type text`, `ip_address inet?`, `user_agent text?`, `device_type text?`, `created_at` |

**Tipos/enums**:
- `form_submission_status = ('draft', 'sent', 'opened', 'signed')` (`001_initial_schema.sql:92`)

**Foreign keys** (todas con `ON DELETE CASCADE` excepto `clients.policy_id → ON DELETE SET NULL`):
- `policies.agent_id → agents.id`
- `clients.agent_id → agents.id`
- `clients.policy_id → policies.id`
- `dependents.client_id → clients.id`
- `dependents.policy_id → policies.id`
- `templates.agent_id → agents.id`
- `form_submissions.agent_id/client_id/template_id → sus tablas`
- `tracking_events.submission_id → form_submissions.id`

**Índices** (declarados en SQL, se mantienen):
- `idx_policies_agent_id`, `idx_clients_agent_id`, `idx_clients_policy_id`
- `idx_dependents_client_id`, `idx_dependents_policy_id`
- `idx_templates_agent_id`
- `idx_form_submissions_agent_id/client_id/template_id`
- `idx_tracking_events_submission_id`

> **⚠️ Estado real de la DB vs migraciones**: el schema desplegado tiene columnas que **no están en las migraciones**:
> - `tracking_events.ip_address` (inet), `user_agent` (text), `device_type` (text) — añadidas a mano.
> - `form_submissions.verification_data` (jsonb) — añadida a mano.
>
> El código actual inserta usando esas columnas en 6 sitios: `src/lib/actions/data.ts:154,186` (con bug — ver §12), `src/app/api/upload-signed-pdf/route.ts:96`, `src/app/api/verify-submission/route.ts:192,265,277`, `src/app/api/track-event/route.ts:92`, `src/app/dashboard/forms/[id]/send/send-form-client.tsx:62`, `src/app/dashboard/clients/[id]/preview/[templateId]/send-actions.tsx:64`. **Las migraciones `005_tracking_metadata.sql` y `006_submission_verification.sql` no existen todavía** — el próximo agente que clone el repo tendrá un schema inconsistente.

### RLS
Siete políticas `FOR ALL` (todas con `USING` + `WITH CHECK`):
- `agents`: `id = auth.uid()`
- `policies`: `agent_id = auth.uid()`
- `clients`: `agent_id = auth.uid()`
- `dependents`: `EXISTS clients WHERE clients.id = dependents.client_id AND clients.agent_id = auth.uid()`
- `templates`: `agent_id = auth.uid()`
- `form_submissions`: `agent_id = auth.uid()`
- `tracking_events`: `EXISTS form_submissions WHERE form_submissions.id = tracking_events.submission_id AND form_submissions.agent_id = auth.uid()`

> Las policies no usan `TO authenticated` explícito (ver §12 — Supabase best practice hygiene).

### Triggers / funciones
- `public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER` (`001_initial_schema.sql:209-220`): en `AFTER INSERT ON auth.users` inserta en `agents (id, email, full_name)` leyendo `NEW.raw_user_meta_data->>'full_name'` con fallback al email. **Es `SECURITY DEFINER`** (privilegios del owner, normalmente `postgres` con `bypassrls`). Postgres concede `EXECUTE` a `PUBLIC` por defecto — debería revocarse.

### Storage
- Bucket `signed_forms` (privado, `public: false`), `file_size_limit = 10MB`, `MIME: pdf/png/jpeg` (`002_storage_setup.sql:6-14`).
- 4 policies en `storage.objects` con `bucket_id = 'signed_forms' AND auth.uid()::text = (storage.foldername(name))[1]`: INSERT, SELECT, UPDATE, DELETE. La convención del folder es `${agentId}/${submissionId}/signed.pdf` (lo respeta `upload-signed-pdf/route.ts:55`).
- **Inconsistencia activa**: `upload-signed-pdf/route.ts:74-78` llama `getPublicUrl` para guardar `signed_pdf_url`, pero el bucket es **privado** y las policies de SELECT solo permiten `auth.uid() = folder[1]`. La URL "pública" realmente solo funciona si el cliente está autenticado como el mismo agente. La app lo muestra como `<a href={signed_pdf_url} target="_blank">` y descarga en `submissions-client.tsx:124,130` y `[id]/page.tsx:181,189` — funciona porque el path cumple la policy. Pero el nombre `getPublicUrl` es engañoso y rompe si el agente pierde la sesión. **Recomendado: `createSignedUrl(filePath, 60*60*24*7)`.**

### Auth y MFA
- Auth: `supabase.auth.signInWithPassword` (`src/app/login/page.tsx:59`), `signUp` con `data: { full_name }` (`signup/page.tsx:35`), `resetPasswordForEmail` con `redirectTo: ${origin}/auth/callback?next=/reset-password` (`forgot-password/page.tsx:31`).
- MFA TOTP: `supabase.auth.mfa.enroll({ factorType: "totp" })` (`enroll-mfa.tsx:37`), `challenge` + `verify` (`enroll-mfa.tsx:64-72`, `verify-mfa.tsx:37-46`).
- Callback PKCE: `src/app/auth/callback/route.ts:4-18` — intercambia el código y redirige a `?next=` (sin validación → **open redirect latente**, ver §12).
- `MfaBanner` (`mfa-banner.tsx:9-52`) se muestra en el dashboard si `currentLevel === aal1 && nextLevel === aal1` (es decir, ni siquiera tiene un factor enrolado, lo cual es informativo y no bloqueante).

### Migraciones
`supabase/migrations/`:
- `001_initial_schema.sql` — modelo completo, RLS, trigger
- `002_storage_setup.sql` — bucket + RLS de storage
- `003_consent_fields.sql` — 3 columnas nuevas en `clients` (tax_filing_status, marital_status, tax_dependents_count)
- `004_template_logo.sql` — `ADD COLUMN IF NOT EXISTS logo jsonb` en `templates`, con COMMENT describiendo la shape `{ dataUrl, position: "left"|"right", size }`.

> **No hay** archivo `supabase/config.toml`, ni `seed.sql`, ni `supabase/.gitignore` propio del CLI. **Faltan** migraciones `005_tracking_metadata.sql` y `006_submission_verification.sql` para reflejar el estado real de la DB.

### Extensiones disponibles
La DB tiene 80+ extensiones disponibles; en uso real: `uuid-ossp` (PK default), `pgcrypto` (1.3), `pg_stat_statements` (1.11), `pg_graphql` (1.5.11), `vector` (0.8.0, pgvector). `pg_trgm` y `unaccent` (sin uso) serían útiles para búsqueda fuzzy de clientes/templates.

---

## 6. SISTEMA DE DOCUMENTOS (NEW)

### Geometría (`src/lib/document-format.ts`)
Único lugar donde se define la geometría de la página. Cambiar tamaño de página, márgenes o zona de firma = editar SOLO este archivo.

```ts
PAGE_SIZE = "Letter"
PAGE_PX = { width: 816, height: 1056 }   // 8.5in x 11in @ 96dpi
MARGINS = { top: 96, right: 96, bottom: 96, left: 96 }   // 1in
CONTENT_WIDTH = PAGE_PX.width - MARGINS.left - MARGINS.right  // 624px
SIGNATURE_ZONE_PX = 120
EDITABLE_HEIGHT = PAGE_PX.height - MARGINS.top - MARGINS.bottom - SIGNATURE_ZONE_PX  // 744px
DEFAULT_DOCUMENT_FONT = '"Times New Roman", Times, serif'
```

### Estilos (`src/lib/document-styles.ts`)
CSS scoped bajo `.ef-document` con dos variantes:
- `DOCUMENT_CSS` — sin payload de fuente (uso en editor y previews que ya tienen DM Sans por `next/font/google`).
- `documentCssWithFonts(dmSansWoff2Base64?)` — inyecta `@font-face` inline con base64 woff2 (uso en PDF, donde no hay red ni `next/font`).

Incluye `CSS_VARS` con `--ef-page-w`, `--ef-page-h`, `--ef-margin-*`, `--ef-content-w`, `--ef-editable-h`, `--ef-sig-zone-h`, `--ef-doc-font`. Reglas para `h1-h3`, `p`, `ul/ol/li`, `strong/em/u/s`, `a`, `img`, `blockquote`, `hr`, `code`, `.ef-logo` (posicionado absolutamente detrás del texto, `z-index: 0`), `.ef-document-content` (`z-index: 1`), `.ef-signature-zone` (border-top, contenido centrado).

### Logo (`src/lib/document-logo.ts`)
Shape de la columna `templates.logo`:
```ts
type TemplateLogo = {
  dataUrl: string | null;   // base64 inline
  position: "left" | "right";
  size: number;             // width in px (40-240)
};
DEFAULT_LOGO = { dataUrl: null, position: "right", size: 96 }
LOGO_SIZE_MIN = 40, LOGO_SIZE_MAX = 240
LOGO_PRESETS = [{ Small, 64 }, { Medium, 96 }, { Large, 140 }]
```
- `normalizeLogo(value)` — defensiva, accepts `unknown`, retorna `TemplateLogo` válido.
- `hasLogo(logo)` — true si `dataUrl` no es null.
- El logo se inserta en el HTML del PDF con `<div class="ef-logo" data-pos="..." style="--ef-logo-w:...px; --ef-logo-max-w:...px"><img src="${dataUrl}" alt="Document logo" /></div>`.
- UI: `<LogoPanel>` en `rich-text-editor.tsx:628-740` con Upload/Replace, toggle de posición, presets, slider, Remove.

### Sustitución (`src/lib/document-substitution.ts`)
Función pura `substituteTemplateVars({ templateContent, client, policy, dependents, agent, todayIso? })`:
- 24 variables: `first_name`, `last_name`, `email`, `phone`, `address`, `city`, `state`, `zip`, `date_of_birth`, `subscriber_number`, `tax_filing_status`, `marital_status`, `projected_annual_income` (formato `$X,XXX`), `tax_dependents_count`, `coverage_count` (calculado = `(client.applies_to_policy ? 1 : 0) + dependents.filter(applies_to_policy).length`), `policy_number`, `carrier`, `plan`, `premium` (formato `$X.XX/mo` o `N/A`), `effective_date`, `agency_name` (default `"Your Agency"`), `npn` (default `N/A`), `agent_name`, `today_date` (default `new Date().toLocaleDateString("en-US")`).
- **Consumidor único actual**: `src/app/api/verify-submission/route.ts:256-262`. **Las dos previews todavía lo duplican localmente** (ver §12).

### Fuente (`src/lib/document-fonts.server.ts`)
- `getDmSansWoff2Base64()` — single-flight fetch + cache in-memory desde `https://fonts.gstatic.com/s/dmsans/v15/rP2Yp2ywxgERUObC8I0R1Ubf6XEdpg.woff2`.
- Convierte ArrayBuffer → base64 con `Buffer.from(ab).toString("base64")`.
- Retorna `null` si falla (no rompe el PDF — el PDF sale con el fallback de `document-format.ts`).
- `.server.ts` suffix garantiza que no entra al bundle del cliente.

### Hoja compartida (`src/components/document/document-sheet.tsx`)
- Props: `html`, `logo?`, `showSignatureZone?`, `signatureDataUrl?`, `signatureLabel?`, `signatureMeta?`, `maxWidth?`, `className?`, `dmSansWoff2Base64?`, `zoom?`, `fitToContainer?`.
- `fitToContainer` (default true): mide `wrapperRef.clientWidth` con `ResizeObserver`, aplica `transform: scale(available / pageWidth)`. **El tamaño lógico en `document-format.ts` nunca cambia**; esto es CSS transform puro.
- `finalScale = fitToContainer ? autoScale * zoom : zoom`.
- Renderiza dentro de `ef-document` con `style` de padding igual a `MARGINS`, un `<style dangerouslySetInnerHTML css>` con la CSS scoped, el logo (si `hasLogo`), el contenido `<div class="ef-document-content" dangerouslySetInnerHTML html>`, y opcionalmente la zona de firma.
- **Inyecta CSS con `dangerouslySetInnerHTML`** — tanto `css` (nuestra propia, segura) como `html` (template del agente, NO sanitizado — ver §12).

---

## 7. GENERACIÓN DE PDF CON BROWSERLESS

### Conexión
- Variable de entorno `BROWSERLESS_TOKEN` (y opcional `BROWSERLESS_URL`, default `https://chrome.browserless.io/pdf`) — `src/app/api/generate-pdf/route.ts:118-131`.
- POST a `${url}?token=${token}` con `Content-Type: application/json` y body `{ html, options: { format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } } }`. Browserless responde con `application/pdf` (binario).
- Si `BROWSERLESS_TOKEN` está vacío → 500 con el mensaje "BROWSERLESS_TOKEN environment variable is not set…".

### Flujo completo (post-verify)
1. **Origen del HTML**: `template.content` (HTML con tokens `{first_name}` etc.) guardado en `templates` por el agente.
2. **Sustitución de variables**: ocurre **una vez, server-side** en `/api/verify-submission` (`route.ts:256-262`) usando `substituteTemplateVars`. El HTML renderizado con PII viaja como JSON al cliente.
3. **Inyección a Browserless** (`route.ts:59-116`):
   - DOCTYPE + `<meta charset>`.
   - `@page { size: Letter; margin: 0; }` + reset CSS.
   - `.ef-page` con `width: PAGE_PX.width`, `height: PAGE_PX.height`, `overflow: hidden` (clip).
   - `.ef-page > .ef-document` con `padding: MARGINS_IN.*in` (1in por lado).
   - `documentCssWithFonts(dmSansBase64)` (CSS con woff2 inlined si la fuente se cargó).
   - HTML body: logo (`<div class="ef-logo" data-pos="..." style="--ef-logo-w...">`), `<div class="ef-document-content">${html}</div>`, `<div class="ef-signature-zone">` con `<img class="ef-signature-img" src="${signature}">` + label + meta ("Signed on: … at …").
4. **Respuesta**: `Buffer.from(arrayBuffer).toString("base64")` → JSON `{ pdf: <base64> }`.
5. **Cliente decodifica** (`preview-sign-client.tsx:259-260`): `Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))` → `Blob` con `type: "application/pdf"`.
6. **Auto-descarga forzada** (`preview-sign-client.tsx:262-271`): `<a download="signed-document-YYYY-MM-DD.pdf">` + `URL.revokeObjectURL`.
7. **Upload a Storage** (`POST /api/upload-signed-pdf` con `FormData({ file, submissionId, agentId: "", signatureData })`). El server route usa service-role para `storage.from("signed_forms").upload(${agentId}/${submissionId}/signed.pdf, buffer, { upsert: true, contentType: "application/pdf" })`.
8. **Update DB**: `form_submissions.status = "signed"`, `signed_pdf_url = getPublicUrl(...)`, `signature_data`, `signed_at = now()`.
9. **Tracking**: `tracking_events` insert con `event_type: "signed"` + `parseServerMetadata(ua, x-forwarded-for, x-real-ip)`.

### Mejoras recientes (vs la versión anterior)
- **Woff2 inlined** (no CDN de Tailwind, no Google Fonts CDN) — la fuente DM Sans se descarga UNA vez y se cachea en memoria. La versión anterior descargaba Tailwind 2.2 CDN + DM Sans CDN en cada request.
- **Geometría centralizada** — un cambio en márgenes/tamaño de página se hace en `document-format.ts` y se propaga al editor, los previews y el PDF.
- **Logo detrás del texto** — `ef-logo` con `z-index: 0` y `ef-document-content` con `z-index: 1`. El texto siempre pinta encima.

### Ineficiencias y problemas aún presentes

1. **Sin timeout/abort** en la llamada a Browserless — un PDF grande puede colgar.
2. **Buffer completo en memoria** (`route.ts:156`): `Buffer.from(arrayBuffer)` y `pdfBlob` en el navegador (`preview-sign-client.tsx:259-260`). Para PDFs grandes puede tumbar la pestaña en móviles.
3. **Firma recortada con loop manual de píxeles** (`preview-sign-client.tsx:199-231`): O(W·H) en el hilo principal. La dep `trim-canvas` ya está instalada y haría esto mismo en 1 línea.
4. **Doble inserción de `tracking_events` consecutivos en verificación** (`verify-submission/route.ts:265, 277, 273-275`): 1 update + 2 inserts en serie (no en paralelo).
5. **`signed_pdf_url` se guarda como `getPublicUrl(...)`** sobre bucket privado. URL "pública" realmente solo funciona si el cliente está autenticado como el mismo agente.
6. **No se valida la firma** antes de generar el PDF — si el cliente dibuja tres puntos y pulsa "Sign", `isEmpty()` retorna false y el PDF sale con una firma "fantasma" sin aviso.
7. **HTML de plantilla NO sanitizado** — `dangerouslySetInnerHTML` en `document-sheet.tsx:146` y `rich-text-editor.tsx:750`. Un agente puede meter `<script>` o atributos `onerror=`. El preview público se sirve a no-autenticados.

---

## 8. SISTEMA DE PLANTILLAS Y FORMULARIOS

### Definición
- Una plantilla = un registro en `templates` con `name text`, `content text` (HTML crudo con tokens `{snake_case}`), y **`logo jsonb`** (opcional, shape `TemplateLogo`).
- Creación: editor TipTap con barra completa (`src/components/ui/rich-text-editor.tsx`) y panel de variables (`src/components/forms/form-builder.tsx:26-69`).
- **Variables soportadas (24)**:
  - Cliente: `{first_name}`, `{last_name}`, `{email}`, `{phone}`, `{address}`, `{city}`, `{state}`, `{zip}`, `{date_of_birth}`, `{subscriber_number}`, `{tax_filing_status}`, `{marital_status}`, `{projected_annual_income}`, `{tax_dependents_count}`, `{coverage_count}`
  - Póliza: `{policy_number}`, `{carrier}`, `{plan}`, `{premium}`, `{effective_date}`
  - Agencia: `{agency_name}`, `{npn}`, `{agent_name}`
  - Formulario: `{today_date}`
- El editor expone el botón "Variables" con `editorRef.current?.insertText(token)` (`form-builder.tsx:117-119`) que inserta el token literal en el cursor.

### Almacenamiento
- `templates.content` es un `text` plano en Postgres. No hay validación de HTML, no hay sanitización, no hay control de versión.
- `templates.logo` es un `jsonb` con shape `{ dataUrl, position, size }`. La imagen se guarda como base64 inline (dataURL) — el PDF la pinta directamente sin Storage.
- Se inserta/actualiza directamente desde el cliente con `supabase.from('templates').insert/update` (`form-builder.tsx:166-185`).
- No hay plantillas globales / de sistema, todas son por agente.

### Renderizado (3 paths)
1. **En el editor**: `renderPreview()` con `varMap` hardcoded de datos dummy ("John", "Smith", etc.) — `form-builder.tsx:121-152`.
2. **En el preview antes de enviar** (agente): server component con datos reales del cliente — `.../preview/[templateId]/page.tsx:69-117`. **Duplica la lógica de `substituteTemplateVars` con formato `premium` distinto** (`${premium}/mo` aquí, `.toFixed(2)/mo` en `substituteTemplateVars`).
3. **En el preview público** (tras verificar): server-side via `/api/verify-submission` con datos reales del cliente + `coverage_count` calculado — `preview-sign-client.tsx` recibe el HTML ya renderizado, NO ejecuta `substituteTemplateVars` en el cliente.
4. **En el PDF**: el HTML (ya con variables sustituidas) se envía tal cual a Browserless junto con la firma.

### Mapeo datos → formato final (en `substituteTemplateVars`)
- `coverage_count` = `(client.applies_to_policy ? 1 : 0) + dependents.filter(applies_to_policy).length`.
- `premium` = `$${Number(policy.premium).toFixed(2)}/mo` o `N/A` si no hay.
- `projected_annual_income` = `$${Number(client.holder_income).toLocaleString("en-US")}`.
- `agency_name` default `"Your Agency"`, `npn`/`policy_number`/`carrier`/`plan`/`effective_date` default `N/A`.
- `today_date` = `new Date().toLocaleDateString("en-US")` por defecto; acepta override via `todayIso`.
- Strings vacíos se sustituyen por el valor (no por `""` limpio): `address` vacío produce literal vacío.
- Faltan fallbacks universales: si una variable está en la plantilla pero el cliente no tiene el dato, sale vacío (no `N/A`).

### Limitaciones actuales

1. **Sin validación de HTML**: un agente puede meter `<script>` o atributos `onerror=` y se sirven sin sanitizar. En el preview público se renderiza con `dangerouslySetInnerHTML` (`document-sheet.tsx:146`).
2. **No hay un DSL de campos**: las variables son text-sustitution. No se puede poner `{if first_name}Estimado {first_name}{endif}` ni `{repeat:dependents}` para listas. El agente tiene que saber a priori cuántos dependientes hay.
3. **`coverage_count` se calcula en cliente y servidor por separado**, con código duplicado (3 copias). No es recalculable en runtime si el agente edita el cliente tras enviar.
4. **Sin versionado de plantillas**: editar una plantilla afecta a envíos futuros pero no a los `form_submissions` ya creados (que tienen el HTML congelado en `signed_pdf_url`).
5. **No se pueden reutilizar "bloques"** (firma común, footer legal, header con logo). El agente tiene que duplicar HTML entre plantillas.
6. **Sin tipos de campo**: no se distingue entre campo de texto, fecha, checkbox, firma. Todo es HTML+token.
7. **Variables en otros idiomas**: el panel expone etiquetas en inglés pero el cliente puede escribir en español — el editor no impide mezclar idiomas en la misma plantilla.
8. **Editor no soporta tablas** (TipTap StarterKit no las incluye) y **no se importa `@tiptap/extension-image` ni `@tiptap/extension-highlight`** aunque estén en `package.json`.
9. **Variables en mayúsculas**: si la plantilla tiene `{FIRST_NAME}` no se sustituye (la regex es `\{(\w+)\}` case-sensitive).
10. **No hay preview con datos reales hasta que hay un cliente** — el dummy "John Smith" puede llevar a creer que la plantilla está lista.
11. **`date_of_birth` en el PDF sale como `YYYY-MM-DD`** (ISO crudo), no `MM/DD/YYYY` (humano).
12. **Plantilla sin CSS de página**: la clase `.ef-document` está bien definida por `document-styles.ts` y `document-format.ts` pero el editor (que tiene su propio `DOCUMENT_CSS` injectado) y el PDF (que tiene la misma CSS via `documentCssWithFonts`) deben mantenerse en sync.
13. **Firma embebida como `<img>` al final** — no aparece anclada en una zona específica de la plantilla. No se puede firmar dentro de un campo del propio documento.
14. **No hay auditoría de cambios** en la plantilla (quién/cuándo la editó, historial).
15. **El `state` del cliente se guarda uppercase** (`"FL"`) pero el form wizard usa `e.target.value.toUpperCase()` solo en el submit; el `edit-client-modal.tsx:128` también. Inconsistencia menor.

---

## 9. CONFIGURACIÓN Y ENTORNO

### Archivos de configuración
- `package.json` — nombre `easy-forms-new`, versión `0.1.0`, privado.
- `tsconfig.json` — strict, `noEmit`, `moduleResolution: "bundler"`, alias `@/* → ./src/*`.
- `next.config.mjs` — solo `images.remotePatterns: [{ protocol: "https", hostname: "**" }]` (riesgo: cualquier CDN/host puede ser proxied).
- `tailwind.config.ts` — content paths, paleta custom, plugins `[require("@tailwindcss/typography")]`. Usa `var(--font-dm-sans)` para `font-sans`.
- `postcss.config.mjs` — solo Tailwind.
- `components.json` — shadcn new-york, slate, lucide, css variables, alias `components`/`ui`/`lib`/`utils`/`hooks` → `@/*`.
- `.eslintrc.json` — `next/core-web-vitals` + `next/typescript`.
- `pnpm-workspace.yaml` — `allowBuilds: core-js / msw / unrs-resolver` (placeholder, sin packages).
- `.env.example` — documenta `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BROWSERLESS_TOKEN` con comentarios explicando dónde se usan.

### Variables de entorno (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://jaqatfmyjadxmtxprvrz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc…(JWT anon role)
SUPABASE_SERVICE_ROLE_KEY=        ← puede estar vacío en local
BROWSERLESS_TOKEN=                ← puede estar vacío en local
```
> ⚠️ **Anon key está commiteada**: el JWT termina en `…7PVkSCnrb19I0JSAwsKjaJMvRfVz5iowCk4jcI65oMI` y es de rol `anon`. Por diseño las anon keys son públicas (viven en el cliente), así que esto no es un leak — pero el repo ahora SÍ incluye `.env.example` y `.env.local` está en `.gitignore`.

### No hay `.env.example` adicional, `docker-compose.yml`, ni archivo de CI
El README es el boilerplate de `create-next-app` y no menciona estas variables. AGENTS.md sí las lista.

### Gestión de entornos
- **No hay distinción dev/staging/prod** documentada. El proyecto asume un único `.env.local` apuntando a un proyecto Supabase de desarrollo (`jaqatfmyjadxmtxprvrz`).
- No hay configuración de Supabase CLI (`config.toml`), ni `db diff` en CI, ni políticas de promoción de migraciones.

---

## 10. SCRIPTS Y COMANDOS

### Instalación
```bash
npm install            # con package-lock.json presente
# o pnpm install       # con pnpm-lock.yaml presente (ambigüedad, ver §12)
```

### Desarrollo
```bash
npm run dev            # next dev → http://localhost:3000
```

### Build
```bash
npm run build          # next build
npm run start          # next start (requiere build previo)
```

### Lint
```bash
npm run lint           # next lint (ESLint 8 + next/core-web-vitals + next/typescript)
```

### Lo que NO existe
- No `test`, no `test:watch`, no `test:ui` (no hay runner).
- No `typecheck` (no hay `tsc --noEmit` script; el type-check va implícito en `next build` y `next lint`).
- No `format` (no hay Prettier).
- No `db:migrate`, `db:push`, `db:reset` (no hay scripts de Supabase CLI).
- No `prepare`, no `husky` (no hay pre-commit hooks).

### Despliegue
El README sugiere Vercel pero no hay `vercel.json` ni workflow de GitHub Actions. Cualquier despliegue es manual.

---

## 11. TESTS Y CALIDAD

### Cobertura de tests
**Cero tests**. No hay `__tests__/`, no hay `*.test.ts`, no hay `*.spec.ts`, no hay `vitest.config`, no hay `playwright.config`. No hay dependencia de testing en `package.json`.

### Framework de tests
No instalado. (El repo tiene `pgtap` 1.3.3 disponible como extensión en la DB por si se quisiera usar para tests SQL, pero no se usa.)

### Linters y formatters
- **ESLint 8** vía `next lint`, con presets `next/core-web-vitals` y `next/typescript` (`.eslintrc.json`). Type-aware.
- **Sin Prettier** ni otro formateador. La indentación es consistente (2 spaces) pero no se enforce.
- **Sin reglas custom** ni de seguridad (no `eslint-plugin-security`).

### Type-check
- Implícito vía `next build` (TypeScript 5).
- `noEmit: true` en `tsconfig.json:7` → nunca se compila TS a JS standalone.
- `strict: true` activa `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`.

### Estado real
- El proyecto compila (`next build` corre según AGENTS.md).
- El tipo de muchos componentes que reciben data de Supabase es `Record<string, unknown>` (visto en 11+ sitios — ver §12). `src/lib/types.ts` ya define `Client`/`Policy`/`Template`/`FormSubmission`/`TrackingEvent`/`ClientFormData`/`PolicyFormData`/`DependentFormData`. Una capa de tipos generados (`supabase gen types typescript`) eliminaría esto.

---

## 12. DOCUMENTACIÓN EXISTENTE

### `README.md`
Boilerplate de `create-next-app` (36 líneas). Menciona `next dev` y el uso de Geist font de Vercel, pero **no describe la app real**. No hay instrucciones específicas de Supabase, Browserless, ni de las variables de entorno. No es útil para onboarding.

### `AGENTS.md`
~230 líneas de contexto real, muy bien organizado. Cubre:
- Stack (Next 14 App Router, Supabase, Browserless, TipTap, react-hook-form, zod, shadcn new-york).
- Comandos disponibles (los 4 de `package.json`).
- Aliases de paths.
- Variables de entorno requeridas.
- Mapa de arquitectura (middleware, layout root, dashboard, forms, API routes, factories Supabase, server actions, tracking, types).
- Convenciones (shadcn, `next.config.mjs`, eslint pinned, server actions `*Action`, hooks).
- Gotchas verificados contra SQL/schema.
- Limitaciones declaradas (no CI, no tests, no formato).

### `AUDIT_REPORT.md` (NEW)
~700 líneas, escrito 2026-06-09. Cubre page-by-page UI/UX review (17 páginas), 6 user flows end-to-end, funcionalidad por área (tabla), validación y datos, code quality (incluyendo `Record<string, unknown>` y dependencias no usadas), seguridad, performance, y 50 action items priorizados.

### Otros
- **No hay** `docs/`, `wiki/`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE`, `SECURITY.md`.
- **No hay** comentarios JSDoc en funciones clave (ni en `getTrackingMetadata`, ni en `smartSearch`, ni en `parseServerMetadata`).
- **No hay** OpenAPI/Swagger para las 4 rutas API.
- **No hay** schema diagram; toda la info de relaciones está dispersa en `001_initial_schema.sql` y AGENTS.md.

---

## 13. DEUDA TÉCNICA Y RIESGOS

### Código duplicado
- **Sustitución de variables** en 3 sitios (ver §7 y §8): `src/lib/document-substitution.ts` (canónico), `src/components/forms/form-builder.tsx:121-152` (preview del editor con dummy), `src/app/dashboard/clients/[id]/preview/[templateId]/page.tsx:69-117` (preview antes de enviar con reales). Las 3 tienen `varMap` similares pero NO idénticos (formato de `premium` difiere, `coverage_count` ausente en el builder). Cualquier nueva variable requiere tocar 3 sitios. **Refactor natural**: las dos previews llaman `substituteTemplateVars` con `client/policy/dependents/agent` apropiados.
- **State options y status de matrimonio duplicados** entre `client-wizard.tsx:83-124` y `edit-client-modal.tsx:21-62` (mismo array de 51 estados + 4 status + 4 marital). Mover a `src/lib/constants/`.
- **`formatSsn` y `formatPhone` duplicados** en `client-wizard.tsx:132-145` y `edit-client-modal.tsx:64-77`.
- **`getPublicUrl` se llama en 2 sitios con misma path** (`upload-signed-pdf/route.ts:74-78` y `pdf-utils.ts:42-50` — este último dead code).
- **`createClientAction`/`createPolicyAction`/`createDependentAction`/`createTemplateAction`/`createSubmissionAction`/`updateSubmissionStatusAction` en `lib/actions/data.ts:9-194`**: **definidos pero NO usados** por la UI. La UI hace `supabase.from('clients').insert(...)` directamente desde el cliente en `client-wizard.tsx:394-422`, `form-builder.tsx:166-185`, `edit-client-modal.tsx:118-141`, `edit-policy-modal.tsx:62-95`, `edit-dependents-modal.tsx:70-97`, `send-form-client.tsx:48-66`, `send-actions.tsx:49-66`. La RLS los filtra igual, pero se pierde la revalidation central y la auditabilidad.
- **`src/lib/toast.ts` define `createToast`/`onToast`**: event bus propio no usado (todos usan `sonner` directamente).
- **`src/lib/pdf-utils.ts:usePdfDownload` / `generateSignedPdfUrl`**: hook/helpers no importados en ningún archivo del repo.
- **`src/hooks/use-auth.ts`**: hook no importado en ningún archivo (lógica equivalente inlined en `login/page.tsx`, `mfa-banner.tsx`, `security/page.tsx`).
- **Inserción de `tracking_events` con metadata falsa hardcodeada** en `lib/actions/data.ts:154-160, 186-192` — `ip_address: "server"`, `user_agent: "server"`, `device_type: "Desktop"`. **Bug activo**: `"server"` no es una `inet` válida, la inserción fallaría con `22P02 invalid input syntax for type inet` si las actions se llamaran. La UI no las llama hoy, pero el código está ahí.
- **El `eventIcons` map de `submissions-client.tsx:37-44` (6 tipos) y el de `submissions/[id]/page.tsx:27-32` (4 tipos) son diferentes.** El detail page no incluye `verified` ni `verification_failed` (cae al fallback `CheckCircle2`).

### Tipos inseguros
- `Record<string, unknown>` en submissions y clients propagado por toda la UI. Hace casts manuales con `String(sub.x)` y `Boolean(sub.x)`. Un rename de columna en la DB pasa desapercibido. **11+ sitios** (ver §5 de `AUDIT_REPORT.md` para la lista).
- `dangerouslySetInnerHTML` con HTML que viene de la DB en `document-sheet.tsx:146` (template renderizado, viewer público) y `rich-text-editor.tsx:750` (CSS scoped, no riesgo real).

### Dependencias desactualizadas o con pinning extraño
- **`lucide-react ^1.14.0`**: el ecosistema espera `0.x`. `lucide-react@1.x` es un package separado y más pequeño. Riesgo: nuevos iconos pueden no existir en v1.
- **`react-signature-canvas 1.1.0-alpha.2`**: alpha. Sin typings oficiales buenos.
- **`@tiptap/* 3.22`**: stable, pero `@tiptap/extension-image` y `@tiptap/extension-highlight` están instaladas y no se usan.
- **`jspdf`, `html2canvas`, `pdf-lib`, `trim-canvas` instaladas sin uso** (≈ 2 MB de bundle si se importaran). `trim-canvas` es el fix obvio para la operación manual de trim en `preview-sign-client.tsx:209-218`.
- **`@base-ui/react ^1.4.1` instalado sin uso**.
- **`react-hook-form` + `zod` + `@hookform/resolvers` instalados sin uso** (la validación es manual).
- **`@tailwindcss/typography` versión 0.5.19** declarada pero no usada en `rich-text-editor.tsx`; la app no usa `.prose` en ningún sitio.
- **`date-fns 4.1` instalado sin uso**.
- **Lockfiles duplicados**: `package-lock.json` (npm) **y** `pnpm-lock.yaml` + `pnpm-workspace.yaml` (pnpm). Imposible saber cuál es la fuente de verdad.

### Seguridad
- **`getPublicUrl` sobre bucket privado** (`upload-signed-pdf/route.ts:74-78`): la URL "pública" solo funciona porque el path es `${agentId}/${submissionId}` y la policy valida `auth.uid() = folder[1]`. **Reemplazar por `createSignedUrl(filePath, 60*60*24*7)`.**
- **Anon key commiteada en `.env.local`**: técnicamente las anon keys son públicas, pero el repo ahora SÍ incluye `.env.example` y `.env.local` está en `.gitignore`.
- **Falta `TO authenticated` en las policies RLS** (`001_initial_schema.sql:133-204`): todas son `FOR ALL USING (...)` sin `TO`. La policy `agents` es `id = auth.uid()` — sin `TO`, en Postgres esto se evalúa también para `anon`. La RLS hace que el `USING` falle para `anon` (porque `auth.uid()` es NULL), pero es mejor hygiene ponerlo explícito.
- **`handle_new_user` es `SECURITY DEFINER` en `public`** (`001_initial_schema.sql:209-220`): ejecuta con privilegios del owner. Postgres concede `EXECUTE` a `PUBLIC` por defecto → un `anon` puede llamar `SELECT public.handle_new_user()`. No es directamente explotable (la firma es trigger, no user-call), pero es superficie de ataque. **Recomendado:** `REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;`
- **HTML no sanitizado** en `dangerouslySetInnerHTML` (`document-sheet.tsx:146`): un agente (o un atacante que compromete su sesión) puede meter `<script>` o `onerror=`. **El preview público se sirve a no-autenticados.** Reemplazar por DOMPurify o allowlist custom.
- **Open redirect latente** en `auth/callback/route.ts:7-13`: redirige a `${origin}${next}` sin validar `next` es una ruta relativa. El flow actual siempre pone `next=/reset-password` pero si se permite un `?next=` arbitrario en otra ruta, sería vulnerable. **Recomendado:** validar `next.startsWith("/")` y no `//`.
- **In-memory rate limit** en `verify-submission/route.ts:21-24`: el `RATE` map es per-process. Con múltiples instancias Vercel cada una tiene su propio contador. **Recomendado:** mover a Supabase table o Redis.
- **`/api/upload-signed-pdf` no check de status**: una submission ya firmada puede ser sobrescrita. `route.ts:80-89`.
- **`/api/track-event` sin rate limit**: cualquiera puede hacer flood de `viewed`. `route.ts`.
- **Validación de identidad del firmante robusta pero no blindada**: `safeEq` (constant-time), 4 dígitos, 5 fails/10min, 15min lockout. La fuerza bruta completa toma ~10^4 attempts × 4 fields = 10^12 combinaciones para SSN+phone+last_name. Bien para 4 dígitos, pero **un atacante que conozca `last_name` reduce a 10^8 (SSN) + 10^8 (phone) = 2×10^8**.
- **Nominatim sin User-Agent** (`use-address-autocomplete.ts:70-74`): la API pública Nominatim exige `User-Agent` identificable. Uso actual puede ser bloqueado.
- **No hay CSRF check explícito** (las acciones confían en el `getUser()` de Supabase — si la cookie está, pasa).
- **No hay rate limiting en `/api/generate-pdf`**: cualquiera con el `BROWSERLESS_URL` válido puede gastarse el token de Browserless.
- **`signed_pdf_url` es persistente y no expira**. El link vive para siempre (hasta que el bucket se borre).
- **`forms/[id]/page.tsx` no valida formato del UUID** solo regex (no `parseUUID`). Suficiente.
- **`fetch` sin `signal` abortable** en algunos lugares (`generate-pdf` route, `upload-signed-pdf` route, `MfaBanner`).

### Bugs activos
1. **`/dashboard/forms/[id]/send` no setea `verification_data`** (`send-form-client.tsx:48-57`). Si un agente llega a esta ruta (no hay link en la UI), el firmante no puede verificar identidad. **Severidad: alta** (ruta rota si alguien la descubre).
2. **`createSubmissionAction` / `updateSubmissionStatusAction` insertan `"server"` en columna `inet`** (`lib/actions/data.ts:154-160, 186-192`). Throw en runtime. **Severidad: alta** (no activo porque nadie las llama, pero es foot-gun).
3. **`Document Already Signed` card no muestra download link** en re-open (`preview-sign-client.tsx:319-348`): `generatedPdfUrl` solo se setea en el flujo just-signed, no en page load. **Severidad: media**.
4. **No client-deletion flow**: no se puede borrar un cliente. La página de detalle no tiene botón. **Severidad: media**.
5. **No template-deletion flow**. **Severidad: baja** (los templates pueden ser editados a un estado vacío).
6. **`parseInt` / `parseFloat` sin radix o NaN handling** en `client-wizard.tsx:794, 853`, `edit-client-modal.tsx:245, 294`, `edit-policy-modal.tsx:156`. Si el input es `"abc"`, devuelve NaN; el cast a número se hace pero `holder_income` puede terminar como `NaN` si no se valida (en realidad se colapsa a 0 por `|| 0`). **Severidad: baja**.
7. **Nominatim rate-limit response (429) lanza "Nominatim error" genérico** — el hook no distingue 429 de otros errores. **Severidad: baja**.
8. **No UNIQUE en `clients.email`**: dos clientes con el mismo email son posibles. Combinado con el `verification_data` que match por `(ssn_last4, phone_last4, last_name)`, esto es ambiguo si hay duplicados. **Severidad: media**.
9. **`EditClientModal` no valida email/SSN/phone** (inconsistente con el wizard). **Severidad: media**.
10. **Profile page puede guardar `full_name = ""`** (no validation). **Severidad: baja**.

### Archivos huérfanos / no usados
- `src/lib/toast.ts` (no se importa en ningún archivo)
- `src/lib/pdf-utils.ts` (no se importa en ningún archivo — `usePdfDownload` y `generateSignedPdfUrl` no se usan en la UI actual)
- `src/hooks/use-auth.ts` (no se importa — la lógica equivalente está inlined en 3 sitios)
- `src/app/fonts/GeistVF.woff` y `src/app/fonts/GeistMonoVF.woff`
- `jspdf`, `html2canvas`, `pdf-lib`, `trim-canvas`, `@base-ui/react`, `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`, `@tiptap/extension-highlight`, `@tiptap/extension-image` (todos en `dependencies` sin uso)
- Las 6 server actions de `lib/actions/data.ts` (definidas pero no llamadas)
- `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-switch`, `@radix-ui/react-toast` (declaradas en `package.json` pero **no se importan en `src/components/ui/`** — el proyecto no usa progress, radio-group, switch, toast directamente; usa `sonner`).

### Faltan migraciones (schema drift)
- `005_tracking_metadata.sql` — añadir `ip_address inet`, `user_agent text`, `device_type text` a `tracking_events`.
- `006_submission_verification.sql` — añadir `verification_data jsonb` a `form_submissions`.
- Sin estas migraciones, un `supabase db pull` o un `clone` fresco tendrá un schema inconsistente con el código que se ejecuta.

---

## 14. RESUMEN DE CAMBIOS RECIENTES (vs la versión anterior de `PROJECT_CONTEXT.md`)

1. **Sistema de documentos compartido** introducido:
   - `src/lib/document-format.ts` (NEW) — geometría.
   - `src/lib/document-styles.ts` (NEW) — CSS scoped con inyección opcional de woff2.
   - `src/lib/document-logo.ts` (NEW) — shape `TemplateLogo`, `normalizeLogo`, presets.
   - `src/lib/document-substitution.ts` (NEW) — función pura `substituteTemplateVars`.
   - `src/lib/document-fonts.server.ts` (NEW) — single-flight cache de DM Sans woff2.
   - `src/components/document/document-sheet.tsx` (NEW) — hoja compartida por editor, previews y PDF.
2. **Service-role client** añadido en `src/lib/supabase/service.ts` y usado en 4 endpoints.
3. **Endpoints nuevos**:
   - `src/app/api/verify-submission/route.ts` (NEW) — verificación de identidad server-side con rate limit + lockout + `safeEq`. Renderiza el documento server-side, NO devuelve PII cruda.
   - `src/app/api/track-event/route.ts` (NEW) — endpoint público allowlist-only para tracking del firmante.
4. **Public signing page endurecido** (`src/app/forms/[id]/page.tsx` + `preview-sign-client.tsx`):
   - Ya NO trae PII al cliente.
   - Zoom controls (pinch + wheel + Fit/100%).
   - "Document Already Signed" card.
5. **Editor rico pulido** (`src/components/ui/rich-text-editor.tsx` + `src/components/forms/form-builder.tsx`):
   - Logo panel con position/size/upload/remove.
   - Live overflow detection con línea roja discontinua + amber warning + `onOverflowChange` callback + `window.confirm` en save.
   - Toolbar fixes (font family 5 options, font size +/-, line height +/-).
   - Editor visual con `bg-slate-100` "desk" y hoja `bg-white shadow` centrada.
6. **Migración `004_template_logo.sql` añadida** (logo jsonb en templates).
7. **PDF inlined DM Sans woff2** (sin CDN de Tailwind, sin Google Fonts CDN) — vía `getDmSansWoff2Base64` + `documentCssWithFonts`.
8. **Middleware matcher ampliado** para excluir `api/verify-submission`, `api/track-event`, `api/generate-pdf`, `api/upload-signed-pdf` (todos usan service-role y no dependen de la sesión).
9. **Tracking en `audit logs`**: la base ahora graba IP/UA/device server-side via `parseServerMetadata` y el cliente ya no llama a ipify para los eventos críticos (verify/signed).
10. **`tracking.ts:cleanIp` ahora retorna `null`** para loopback/localhost/dual-stack prefix, evitando `22P02 invalid input syntax for type inet`.
11. **`AUDIT_REPORT.md` (NEW)** — 700 líneas con page-by-page review, 6 user flows, 50 action items priorizados.

---

## 15. ESTADO ACTUAL DEL PROYECTO

**Funcional core**: completo. Signup → MFA → dashboard → clientes → pólizas → dependientes → plantillas → preview → envío → verificación → firma → PDF → upload → tracking. Funciona end-to-end con la combinación de las dos rutas de envío (la "correcta" es `/dashboard/clients/[id]/preview/[templateId]/send-actions`).

**Endurecido en este pase**:
- Verificación de identidad (server-side, rate limit, constant-time compare).
- PII gating (no client PII en la página pública).
- Sistema de documentos compartido (geometría, estilos, logo, sustitución, fuente).
- Logo en plantillas (jsonb, position, size).
- Live overflow detection en el editor.
- PDF inlined woff2 (sin CDNs externos).
- Tracking endpoint con allowlist y validación de UUID.

**Aún pendiente (priorizado en `AUDIT_REPORT.md` §Prioritized Action Items)**:
1. **Crítico**: `/dashboard/forms/[id]/send` no setea `verification_data`.
2. **Crítico**: `createSubmissionAction` / `updateSubmissionStatusAction` insertan `"server"` en `inet`.
3. **Crítico**: HTML de plantilla no sanitizado (`dangerouslySetInnerHTML`).
4. **Crítico**: `next` en `auth/callback` es open-redirect latente.
5. **Alto**: `Document Already Signed` card sin download link.
6. **Alto**: `signed_pdf_url` debería ser `createSignedUrl` con TTL.
7. **Alto**: faltan migraciones `005_tracking_metadata.sql` y `006_submission_verification.sql`.
8. **Alto**: dead code masivo (6 server actions, `pdf-utils.ts`, `toast.ts`, `use-auth.ts`, Geist fonts, 9 deps no usadas).
9. **Alto**: `Record<string, unknown>` en 11+ sitios — usar `lib/types.ts` o `supabase gen types`.
10. **Alto**: variable substitution duplicada en 3 sitios.
11. **Alto**: `client-wizard.tsx` es 1090 líneas en un solo archivo.
12. **Medio**: queries secuenciales (4-5 round-trips por página) que podrían ser `Promise.all`.
13. **Medio**: signature trim `O(W·H)` en `preview-sign-client.tsx:209-218` — usar `trim-canvas` (ya está instalado).
14. **Medio**: in-memory rate limiter no escala cross-instance.

---

*Fin de PROJECT_CONTEXT.md (snapshot 2026-06-09).*
