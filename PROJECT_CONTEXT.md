# PROJECT_CONTEXT.md — Easy Forms

Resumen estructurado del proyecto. Datos recogidos el 2026-06-09 contra el código fuente de `easy-forms-new` y el schema real desplegado en Supabase.

---

## 1. ESTRUCTURA DEL PROYECTO

Árbol completo excluyendo `node_modules`, `.next`, `.git` y binarios.

```
easy-forms-new/
├── AGENTS.md
├── README.md                     (boilerplate de create-next-app, no describe el proyecto)
├── components.json               (shadcn/ui new-york, Tailwind, css variables)
├── .eslintrc.json                (next/core-web-vitals + next/typescript)
├── next.config.mjs               (images.remotePatterns: { hostname: "**" })
├── next-env.d.ts
├── package.json / package-lock.json
├── pnpm-lock.yaml                (también lockfile de pnpm presente)
├── pnpm-workspace.yaml           (allowBuilds: core-js, msw, unrs-resolver)
├── postcss.config.mjs            (solo tailwindcss)
├── tailwind.config.ts            (paleta navy / slate-blue / emerald + HSL tokens)
├── tsconfig.json                 (strict, paths: @/* → ./src/*)
├── .env.local                    (Supabase + Browserless; ver §8)
├── .gitignore
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql     (7 tablas + 7 políticas RLS + trigger)
│       ├── 002_storage_setup.sql      (bucket signed_forms + 4 RLS)
│       └── 003_consent_fields.sql     (ALTER clients tax_*/marital_status)
└── src/
    ├── middleware.ts                          (matcher excluye /forms y assets)
    ├── hooks/
    │   ├── use-auth.ts                        (sesión + onAuthStateChange)
    │   └── use-address-autocomplete.ts        (Nominatim, throttle 1s)
    ├── lib/
    │   ├── actions/data.ts                    (server actions *Action)
    │   ├── supabase/
    │   │   ├── client.ts                      (browser client)
    │   │   ├── server.ts                      (RSC, await cookies())
    │   │   └── middleware.ts                  (request/response cookie bridge)
    │   ├── insurance-data.ts                  (~85 carriers, ~95 plans hardcoded)
    │   ├── pdf-utils.ts                       (usePdfDownload + generateSignedPdfUrl)
    │   ├── search.ts                          (smartSearch con alias/abbrev)
    │   ├── toast.ts                           (event bus, no se usa en runtime)
    │   ├── tracking.ts                        (IP + UA + device parse)
    │   ├── types.ts                           (dominio TS)
    │   └── utils.ts                           (cn = clsx + tailwind-merge)
    ├── components/
    │   ├── auth/
    │   │   ├── enroll-mfa.tsx
    │   │   ├── verify-mfa.tsx
    │   │   └── mfa-banner.tsx
    │   ├── dashboard/
    │   │   ├── header.tsx
    │   │   └── sidebar.tsx                    (incluye MobileNavSheet)
    │   ├── forms/
    │   │   ├── client-wizard.tsx              (3 pasos, 1090 líneas)
    │   │   └── form-builder.tsx               (TipTap, 342 líneas)
    │   └── ui/                                (20 primitivas shadcn, ver §10)
    └── app/
        ├── layout.tsx                         (root, monta <Toaster />)
        ├── globals.css
        ├── page.tsx                           (redirect("/dashboard"))
        ├── fonts/                             (Geist VF, GeistMonoVF)
        ├── api/
        │   ├── generate-pdf/route.ts          (POST → Browserless → base64)
        │   └── upload-signed-pdf/route.ts     (POST multipart → signed_forms)
        ├── auth/callback/route.ts             (PKCE exchange)
        ├── login/page.tsx
        ├── signup/page.tsx
        ├── forgot-password/page.tsx
        ├── reset-password/page.tsx
        ├── forms/                             (PÚBLICO, sin auth)
        │   ├── layout.tsx
        │   └── [id]/
        │       ├── page.tsx                   (server: trae submission + client + policy + agent)
        │       └── preview-sign-client.tsx    (verify + sign + upload)
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
            │           ├── page.tsx
            │           └── send-actions.tsx
            ├── forms/
            │   ├── page.tsx
            │   ├── builder/page.tsx
            │   ├── builder/[id]/page.tsx
            │   └── [id]/send/
            │       ├── page.tsx
            │       └── send-form-client.tsx
            └── submissions/
                ├── page.tsx
                ├── submissions-search-wrapper.tsx
                ├── submissions-client.tsx     (acciones fila + dialog tracking)
                └── [id]/page.tsx
```

### Qué contiene cada carpeta principal
- **`src/app/api/`** — dos Route Handlers: generación de PDF vía Browserless y subida del PDF firmado a Storage.
- **`src/app/{login,signup,forgot-password,reset-password,auth}`** — flujo auth completo de Supabase con callback PKCE.
- **`src/app/forms/[id]/`** — flujo público de firmado: verificación de identidad (SSN-4 + phone-4 + last name) → previsualización → firma → upload.
- **`src/app/dashboard/`** — zona privada tras middleware: clientes, pólizas, plantillas, envíos, perfil, 2FA.
- **`src/components/ui/`** — 20 primitivas shadcn/ui (button, card, dialog, select, combobox, date-input, table, sheet, tabs, badge, etc.) más `toaster.tsx` y `rich-text-editor.tsx`.
- **`src/components/forms/`** — `client-wizard.tsx` (3 pasos) y `form-builder.tsx` (editor TipTap con variables).
- **`src/components/auth/`** — pantallas de enrolamiento y verificación TOTP.
- **`src/components/dashboard/`** — `sidebar.tsx` (con `MobileNavSheet`) y `header.tsx`.
- **`src/lib/actions/data.ts`** — server actions para clientes, pólizas, dependientes, plantillas y submissions.
- **`src/lib/supabase/`** — 3 factories (browser, RSC, middleware).
- **`src/lib/insurance-data.ts`** — datos estáticos de aseguradoras y planes (carriers, plans, aliases, estados).
- **`src/lib/search.ts`** — búsqueda ponderada (alias, abreviaturas, matching por palabra).
- **`src/lib/tracking.ts`** — IP via ipify + parseo UA y device.
- **`src/lib/types.ts`** — modelos del dominio (Agent, Client, Policy, Dependent, Template, FormSubmission, TrackingEvent).
- **`supabase/migrations/`** — 3 SQL, primer `001_initial_schema.sql` crea el modelo entero, `002_storage_setup.sql` crea el bucket y RLS, `003_consent_fields.sql` añade 3 columnas a `clients`.

---

## 2. STACK TECNOLÓGICO

### Lenguajes
- TypeScript 5 (`tsconfig.json:67`, `"strict": true`)
- JavaScript implícito vía `allowJs: true` y JSX (`tsconfig.json:3-13`)
- SQL procedural (PL/pgSQL) para el trigger `handle_new_user` (`001_initial_schema.sql:209-220`)
- HTML/CSS (Tailwind + CSS variables)

### Framework y runtime
- **Next.js 14.2.35** (App Router, RSC, Route Handlers, `next/font` Geist, `next/image`)
- **React 18** + `react-dom 18`
- **Node 20** declarado en `@types/node: "^20"`
- Gestor de paquetes ambiguo: coexisten `package-lock.json` (npm) y `pnpm-lock.yaml` + `pnpm-workspace.yaml`. El proyecto no fija uno en `package.json` y `AGENTS.md` no lo aclara.

### UI y estilos
- **Tailwind CSS 3.4** + `tailwindcss-animate` no presente, usa `tw-animate-css: ^1.4.0`
- **shadcn/ui** (new-york, slate base, lucide icons, css variables) — `components.json`
- **Radix UI** primitives: avatar, checkbox, dialog, dropdown-menu, label, progress, radio-group, scroll-area, select, separator, slot, switch, tabs, toast
- **`@base-ui/react ^1.4.1`** declarada pero **no usada en el código** (búsqueda exhaustiva: 0 imports)
- **DM Sans** vía `next/font/google` (`src/app/layout.tsx:7-11`), declarado como `font-sans` global
- **Geist VF** y **GeistMonoVF** (woff en `src/app/fonts/`) — declarados pero **no importados** en layout (queda el `Geist` que sí usa `next/font/google` en el boilerplate de README, pero la implementación real usa DM Sans)
- `tailwind.config.ts` añade paleta propia: `navy #1a3a5c`, `slate-blue #2d5a7b`, `emerald` con tonos

### Formularios y validación
- **react-hook-form 7.75** (en `dependencies`) — **no se usa en el código**; los wizards implementan su propio estado con `useState`
- **zod 4.4** + **@hookform/resolvers 5.2** (en `dependencies`) — **no se usan en el código**
- Validación implementada a mano en `client-wizard.tsx:288-361` y `edit-client-modal.tsx:111-153`

### Rich text
- **TipTap 3.22** (`@tiptap/react`, `starter-kit`, `font-family`, `highlight`, `image`, `link`, `text-align`, `text-style`, `underline`)
- Extensiones custom inline: `FontSize` (`src/components/ui/rich-text-editor.tsx:45-72`) y `LineHeight` (`rich-text-editor.tsx:74-110`)

### PDF y manipulación
- **jspdf 4.2** + **html2canvas 1.4** + **pdf-lib 1.17** + **trim-canvas 0.1** (en `dependencies`) — **ninguno se importa en el código**; el único render real de PDF lo hace Browserless vía fetch

### Backend / servicios
- **Supabase JS 2.105** + **@supabase/ssr 0.10** (auth, RSC, middleware)
- **Browserless.io** (`https://chrome.browserless.io/pdf` por defecto)

### Tracking
- `api.ipify.org` para IP pública en cliente
- `nominatim.openstreetmap.org` para autocompletar dirección (con throttle 1s y rate-limit global de módulo)

### Iconos y utilidades
- **lucide-react ^1.14.0** (pinned raro — ver §12)
- `class-variance-authority 0.7`, `clsx 2.1`, `tailwind-merge 3.5`, `cmdk 1.1`, `date-fns 4.1`, `sonner 2.0.7`, `react-signature-canvas 1.1.0-alpha.2`, `shadcn 4.7.0` (CLI)

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
- **Backend / API**: Route Handlers en `src/app/api/generate-pdf/route.ts` y `src/app/api/upload-signed-pdf/route.ts`, más `src/app/auth/callback/route.ts` (intercambio de código PKCE).
- **Middleware**: `src/middleware.ts` aplica `updateSession` (`src/lib/supabase/middleware.ts`) a todo excepto `_next/static`, `_next/image`, `favicon.ico`, `forms/*` y assets de imagen.

### Flujo de una petición típica — agente envía un formulario
1. Agente entra a `/dashboard/clients` → server component (`src/app/dashboard/clients/page.tsx:1-54`) llama `supabase.auth.getUser()` y selecciona `clients(*, policies(...))` filtrado por `agent_id`.
2. Cliente abre su perfil → `src/app/dashboard/clients/[id]/page.tsx:38-441` carga cliente + policy + dependents + submissions + templates.
3. Agente hace clic en "Send Form" → `SendFormSection` (`send-form-section.tsx`) navega a `/dashboard/clients/[id]/preview/[templateId]`.
4. Server component `.../preview/[templateId]/page.tsx:1-204` selecciona cliente + template + agente, **renderiza el HTML con variables sustituidas en el servidor** (`renderContent()` en `page.tsx:65-113`) y muestra el preview + el `SendActions` (client).
5. Agente hace clic en "Generate Secure Link" → `send-actions.tsx:21-81`:
   - Inserta `form_submissions` con `status: "sent"` + `verification_data: { ssn_last4, phone_last4, last_name }`.
   - Inserta `tracking_events` con `event_type: "sent"` + `getTrackingMetadata()`.
   - Construye `${origin}/forms/${submission.id}` y la muestra.
6. Cliente abre el link público `/forms/[id]` → `src/app/forms/[id]/page.tsx:5-46` selecciona `form_submissions(*, clients(*, policies(*), dependents(*)), agents(*), templates(name, content))` **sin auth** (la ruta `forms/.*` está excluida del middleware).
7. `PreviewAndSign` (`preview-sign-client.tsx:33`) muestra formulario de verificación (SSN-4 + phone-4 + last name). Si pasa:
   - Inserta `tracking_events` "verified" + "opened".
   - Pinta el documento con variables resueltas en cliente (`renderContent` en `preview-sign-client.tsx:116-165`).
8. Cliente firma en canvas (`react-signature-canvas`) y pulsa "Sign Document & Generate PDF" → `generateAndUploadPdf` en `preview-sign-client.tsx:181-275`:
   1. Recorta la firma con un loop manual de píxeles (`preview-sign-client.tsx:186-215`).
   2. `fetch("/api/generate-pdf", { html, signature })` → Route Handler en `src/app/api/generate-pdf/route.ts:1-114`:
      - Envuelve el HTML con `<!DOCTYPE html>` + Tailwind 2.2 CDN + `@import` Google Fonts (`route.ts:14-60`).
      - `fetch("https://chrome.browserless.io/pdf?token=…")` con `{ html, options: { printBackground: true } }`.
      - Devuelve `{ pdf: <base64> }`.
   3. Cliente decodifica base64 → Blob → descarga automática.
   4. `fetch("/api/upload-signed-pdf", FormData)` → `src/app/api/upload-signed-pdf/route.ts:5-80`:
      - Crea cliente Supabase con **`SUPABASE_SERVICE_ROLE_KEY`**.
      - `storage.from("signed_forms").upload(${agentId}/${submissionId}/signed.pdf, buffer, { upsert: true })`.
      - `getPublicUrl(...)` (la URL resultante no es realmente pública: el bucket es privado, pero la app la usa como si lo fuera — ver §12).
      - Actualiza `form_submissions.status = "signed"`, `signed_pdf_url`, `signature_data`, `signed_at`.
      - Inserta `tracking_events` "signed" con `parseServerMetadata`.

### Flujo de una petición típica — agente crea plantilla
1. `/dashboard/forms/builder` o `/dashboard/forms/builder/[id]` → monta `FormBuilder` (`src/components/forms/form-builder.tsx:73-342`).
2. Editor TipTap en `RichTextEditor` (`src/components/ui/rich-text-editor.tsx:122-520`) con barra completa.
3. Panel lateral `VARIABLE_SECTIONS` (`form-builder.tsx:24-67`) — 24 tokens: `{first_name}`, `{carrier}`, `{premium}`, etc.
4. `insertText` mueve el cursor del editor y pega el token (`rich-text-editor.tsx:154-171`).
5. `handleSave` (`form-builder.tsx:149-189`) hace `upsert` en `templates` con `agent_id = user.id` directamente desde el cliente (no usa server action).

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
  - `components/{auth,dashboard,forms}/` — compuestos de dominio
  - `lib/supabase/` — factories de cliente
  - `lib/actions/` — server actions (mutaciones con `revalidatePath`)
  - `lib/*.ts` — utilidades puras (search, tracking, types, utils, insurance-data, pdf-utils)
  - `hooks/` — hooks de cliente (`use-auth`, `use-address-autocomplete`)
- **Tres variantes del cliente Supabase** (browser, RSC, middleware) — patrón `@supabase/ssr` estándar.

### Patrones
- **Server components primero**: layouts y páginas hacen `await createClient()` + queries y pasan datos a client components. RSC + cookies de Next 15-style (`await cookies()` en `src/lib/supabase/server.ts:5`).
- **Server actions en `lib/actions/data.ts`**: todas con sufijo `*Action`, revalidan el path relevante tras `insert`/`update`. **Pero** la mayoría del código real (wizard, builder, modales de edición) hace `insert`/`update` directamente desde el cliente Supabase, saltándose los server actions. Solo `createClientAction`, `createPolicyAction`, `createDependentAction`, `createTemplateAction`, `createSubmissionAction` y `updateSubmissionStatusAction` están definidos pero la app los ignora (ver §12).
- **Toaster dual**: `sonner` real (importado en `src/app/layout.tsx:5` como `<Toaster />`) y shim `src/components/ui/toaster.tsx` (no se monta en layout).
- **Tracking-first**: cada acción del cliente (verify, open, send, sign) escribe su evento en `tracking_events` con `getTrackingMetadata()`. La columna `event_type` es `text` libre (no enum): `created | sent | opened | verified | verification_failed | signed`.
- **Modales como client components** montados en server pages: `EditClientModal`, `EditPolicyModal`, `EditDependentsModal` se pasan los `initialData` desde la página servidor.
- **Búsqueda estática** sobre datasets en memoria: `lib/insurance-data.ts` + `lib/search.ts` (alias, abreviaturas, scoring por palabra). Sin consultas a la DB para carriers/plans.
- **Variable substitution por regex**: `template.content.replace(/\{(\w+)\}/g, …)` se hace en **tres sitios distintos** con su propio `varMap`/`vars`:
  - `src/components/forms/form-builder.tsx:116-147` (preview en el editor, con datos dummy "John Smith")
  - `src/app/dashboard/clients/[id]/preview/[templateId]/page.tsx:65-113` (preview antes de enviar, con datos reales del cliente)
  - `src/app/forms/[id]/preview-sign-client.tsx:116-165` (preview público, con datos del submission)

### Convenciones de nomenclatura
- **Componentes**: `PascalCase` (`ClientWizard`, `FormBuilder`, `DashboardSidebar`).
- **Hooks**: prefijo `use-` en archivo, `useXxx` en export (`use-auth.ts`, `use-address-autocomplete.ts`).
- **Server actions**: `*Action` (`createClientAction`, `createSubmissionAction`).
- **Tipos**: interfaces `PascalCase`, tipos unión `PascalCase` (`FormSubmissionStatus`, `PlanType`).
- **Archivos UI**: kebab-case (`date-input.tsx`, `rich-text-editor.tsx`, `combobox.tsx`).
- **Variables placeholder de plantilla**: snake_case envuelto en `{...}` (`{first_name}`, `{policy_number}`, `{coverage_count}`).
- **Tokens CSS**: definidos en `src/app/globals.css:6-76` como HSL y referenciados en `tailwind.config.ts:19-68`.
- **Event types en tracking**: lowercase con guiones (`verification_failed`).

---

## 5. INTEGRACIÓN CON SUPABASE

### Clientes
- **Browser** (`src/lib/supabase/client.ts:1-8`): `createBrowserClient` con `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Usado por todos los client components y hooks.
- **RSC** (`src/lib/supabase/server.ts:1-25`): `createServerClient` con `await cookies()` (Next 15 style). Usado por todos los server components y server actions.
- **Middleware** (`src/lib/supabase/middleware.ts:1-68`): rehidrata cookies en request/response, llama `auth.getUser()` + `auth.mfa.getAuthenticatorAssuranceLevel()` y redirige a `/login` si:
  - no hay user y la ruta no es `/login|signup|auth|forgot-password|reset-password`, o
  - hay user pero `aal1 → aal2` (necesita MFA) y no está en ruta de auth, o
  - ya autenticado y completo `aal2` e intenta entrar a una ruta de auth (lo manda a `/dashboard`).
- **Service role** (`src/app/api/upload-signed-pdf/route.ts:20-24`): `createClient` con `SUPABASE_SERVICE_ROLE_KEY` y `{ auth: { autoRefreshToken: false, persistSession: false } }`. Solo se usa en este endpoint para saltarse RLS al subir el PDF.

### Schema (extraído de la DB real, no solo del SQL)

| Tabla | Filas | RLS | Columnas clave |
|---|---|---|---|
| `agents` | 2 | ✅ | `id uuid PK→auth.users`, `email`, `full_name`, `agency_name`, `npn`, `phone`, `created_at` |
| `policies` | 2 | ✅ | `id uuid PK`, `agent_id →agents`, `carrier`, `plan`, `policy_number`, `premium numeric(10,2)`, `effective_date date` |
| `clients` | 3 | ✅ | `id`, `agent_id`, `policy_id?`, `first_name`, `last_name`, `ssn_encrypted text`, `applies_to_policy bool`, `email`, `phone`, `address`, `city`, `state`, `zip`, `date_of_birth`, `subscriber_number`, `holder_income numeric`, `tax_filing_status`, `marital_status`, `tax_dependents_count int` |
| `dependents` | 3 | ✅ | `id`, `client_id`, `policy_id`, `first_name`, `last_name`, `applies_to_policy`, `date_of_birth`, `ssn_encrypted` |
| `templates` | 1 | ✅ | `id`, `agent_id`, `name`, `content text` (HTML con `{variables}`) |
| `form_submissions` | 1 | ✅ | `id`, `agent_id`, `client_id`, `template_id`, `status form_submission_status`, `signed_pdf_url?`, `signature_data?`, `signed_at?`, `verification_data jsonb?`, `created_at` |
| `tracking_events` | 4 | ✅ | `id`, `submission_id`, `event_type text`, `ip_address inet?`, `user_agent text?`, `device_type text?`, `created_at` |

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

### RLS
Siete políticas `FOR ALL` (todas con `USING` + `WITH CHECK`):
- `agents`: `id = auth.uid()`
- `policies`: `agent_id = auth.uid()`
- `clients`: `agent_id = auth.uid()`
- `dependents`: `EXISTS clients WHERE clients.id = dependents.client_id AND clients.agent_id = auth.uid()`
- `templates`: `agent_id = auth.uid()`
- `form_submissions`: `agent_id = auth.uid()`
- `tracking_events`: `EXISTS form_submissions WHERE form_submissions.id = tracking_events.submission_id AND form_submissions.agent_id = auth.uid()`

> **Estado real**: las políticas en la DB son `FOR ALL` con `TO authenticated` implícito. No usan `TO authenticated` explícito (lo cual, per Supabase skill, es "auth sin authz" potencial si la policy dependiera solo del role — aquí todas tienen `agent_id = auth.uid()` así que el riesgo de BOLA está mitigado, pero ver §12 por la policy implícita sin `TO` y por el `auth.role()`-deprecation concern).

### Triggers / funciones
- `public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER` (`001_initial_schema.sql:209-220`): en `AFTER INSERT ON auth.users` inserta en `agents (id, email, full_name)` leyendo `NEW.raw_user_meta_data->>'full_name'` con fallback al email. Es `SECURITY DEFINER` (ejecuta con privilegios del owner, normalmente `postgres` con `bypassrls`). Está en `public` (esquema expuesto vía Data API), pero solo la invoca el trigger del propio auth — no es accesible externamente de forma directa (la función no se concede a `anon`/`authenticated` explícitamente, pero Postgres por defecto concede `EXECUTE` a `PUBLIC`; ver §12).

### Storage
- Bucket `signed_forms` (privado, `public: false`), `file_size_limit = 10MB`, `MIME: pdf/png/jpeg` (`002_storage_setup.sql:6-14`).
- 4 policies en `storage.objects` con `bucket_id = 'signed_forms' AND auth.uid()::text = (storage.foldername(name))[1]`: INSERT, SELECT, UPDATE, DELETE. La convención del folder es `${agentId}/${submissionId}/signed.pdf` (lo respeta `upload-signed-pdf/route.ts:26`).
- **Inconsistencia detectada**: `upload-signed-pdf/route.ts:45-49` llama `getPublicUrl` para guardar `signed_pdf_url`, pero el bucket es **privado** y las policies de SELECT solo permiten `auth.uid() = folder[1]`. El cliente solo descarga el PDF cuando es el **mismo agente**; el `signed_pdf_url` guardado no funciona como URL pública real. La app lo muestra como `<a href={signed_pdf_url} target="_blank">` y descarga en `submissions-client.tsx:124,130` y `[id]/page.tsx:181,189` — funciona porque el path cumple la policy. Pero el nombre `getPublicUrl` es engañoso y rompe si el agente pierde la sesión.

### Auth y MFA
- Auth: `supabase.auth.signInWithPassword` (`src/app/login/page.tsx:59`), `signUp` con `data: { full_name }` (`signup/page.tsx:35`), `resetPasswordForEmail` con `redirectTo: ${origin}/auth/callback?next=/reset-password` (`forgot-password/page.tsx:31`).
- MFA TOTP: `supabase.auth.mfa.enroll({ factorType: "totp" })` (`enroll-mfa.tsx:37`), `challenge` + `verify` (`enroll-mfa.tsx:64-72`, `verify-mfa.tsx:37-46`).
- Callback PKCE: `src/app/auth/callback/route.ts:4-18` — intercambia el código y redirige.
- `MfaBanner` (`mfa-banner.tsx:9-52`) se muestra en el dashboard si `currentLevel === aal1 && nextLevel === aal1` (es decir, ni siquiera tiene un factor enrolado, lo cual es informativo y no bloqueante).

### Migraciones
`supabase/migrations/`:
- `001_initial_schema.sql` — modelo completo, RLS, trigger
- `002_storage_setup.sql` — bucket + RLS de storage
- `003_consent_fields.sql` — 3 columnas nuevas en `clients` (tax_filing_status, marital_status, tax_dependents_count)

> **No hay** archivo `supabase/config.toml`, ni `seed.sql`, ni `supabase/.gitignore` propio del CLI. La carpeta es un simple dropbox de SQLs.

### Extensiones disponibles
La DB tiene 80+ extensiones disponibles; en uso real: `uuid-ossp` (PK default), `pgcrypto` (1.3), `pg_stat_statements` (1.11), `pg_graphql` (1.5.11), `vector` (0.8.0, pgvector). `pg_trgm` y `unaccent` (sin uso) serían útiles para búsqueda fuzzy de clientes/templates.

---

## 6. GENERACIÓN DE PDF CON BROWSERLESS

### Conexión
- Variable de entorno `BROWSERLESS_TOKEN` (y opcional `BROWSERLESS_URL`, default `https://chrome.browserless.io/pdf`) — `src/app/api/generate-pdf/route.ts:62-75`.
- POST a `${url}?token=${token}` con `Content-Type: application/json` y body `{ html, options: { printBackground: true } }`. Browserless responde con `application/pdf` (binario).
- `.env.local` actual: `BROWSERLESS_TOKEN=` **vacío** → la API responde 500 con el mensaje de error "BROWSERLESS_TOKEN environment variable is not set" (`route.ts:64-72`). En este estado el flujo de firma **no puede completar la generación de PDF**.

### Flujo completo

1. **Origen del HTML**: `template.content` (HTML con tokens `{first_name}` etc.) guardado en `templates` por el agente.
2. **Sustitución de variables**: ocurre **dos veces** (server-side en `/dashboard/clients/[id]/preview/[templateId]/page.tsx:65-113` para preview antes de enviar, client-side en `preview-sign-client.tsx:116-165` para el preview público tras verificar). No hay re-sustitución server-side: el HTML renderizado con datos reales viaja como JSON.
3. **Inyección a Browserless**: `route.ts:14-60` envuelve el HTML en una plantilla con:
   - DOCTYPE y `<meta>` viewport
   - **Tailwind 2.2 desde CDN** (`https://cdn.jsdelivr.net/npm/tailwindcss@2.2/dist/tailwind.min.css`)
   - **Google Fonts DM Sans** vía `@import` y `font-family: 'DM Sans', system-ui, sans-serif`
   - **CSS ad-hoc**: `print-color-adjust: exact`, clase `.prose` (clase de `@tailwindcss/typography`), reglas para `.signature-block`
   - Padding `40px`, color base `#1a3a5c` (navy), fondo blanco
4. **Firma**: se renderiza inline como `<img src="${signatureDataUrl}">` (`route.ts:50-56`), con timestamp de firma en `<p>` debajo.
5. **Respuesta**: `Buffer.from(arrayBuffer).toString("base64")` → JSON `{ pdf: <base64> }` (`route.ts:100-103`).
6. **Cliente decodifica** (`preview-sign-client.tsx:232-234`): `Uint8Array.from(atob(pdf), c => c.charCodeAt(0))` → `Blob` con `type: "application/pdf"`.
7. **Cliente dispara descarga** (`preview-sign-client.tsx:236-245`): `<a download="signed-document-YYYY-MM-DD.pdf">` + `URL.revokeObjectURL`.
8. **Upload a Storage**: `POST /api/upload-signed-pdf` con `FormData({ file, submissionId, agentId, signatureData })`. El server route usa service-role para `storage.from("signed_forms").upload(${agentId}/${submissionId}/signed.pdf, buffer, { upsert: true, contentType: "application/pdf" })` (`upload-signed-pdf/route.ts:30-35`).
9. **Update DB**: `form_submissions.status = "signed"`, `signed_pdf_url = getPublicUrl(...)`, `signature_data`, `signed_at = now()`.
10. **Tracking**: `tracking_events` insert con `event_type: "signed"` + `parseServerMetadata(ua, x-forwarded-for, x-real-ip)`.

### Motor de plantillas
No hay `react-pdf`, no hay `@react-pdf/renderer`, no hay `handlebars`, no hay `mustache`, no hay `ejs`. **El "motor" de plantillas es `String.prototype.replace(/\{(\w+)\}/g, fn)`** ejecutado 24 veces (una por variable) en cada render — en el preview público se itera con `for…of Object.entries(vars)` (`preview-sign-client.tsx:159-161`) que es un poco más eficiente.

### Ineficiencias y problemas detectados

1. **Tailwind y Google Fonts por CDN en cada PDF** (`route.ts:19-21`): cada request a Browserless descarga Tailwind 2.2 (no 3.x, que es la que usa la app) y la fuente. Si Browserless no cachea, son ~300 KB extra por PDF. La fuente se usa dos veces (CDN `@import` + `font-family`), el CDN `@import` es síncrono.
2. **No hay `viewport` ni `width/height`/`format` en las options de Puppeteer** (`route.ts:82-87`): solo `printBackground: true`. El PDF sale a tamaño A4 por defecto con márgenes internos pero no se controla el ancho exacto del `max-w-[210mm]` del contenedor.
3. **CSS `print-color-adjust: exact`** está, pero no se controla `preferCSSPageSize` ni `margin`. No hay header/footer configurable.
4. **Buffer completo en memoria** (`route.ts:100`): `Buffer.from(arrayBuffer)` y `pdfBlob` en el navegador (`preview-sign-client.tsx:233-234`). Para PDFs de muchos MB esto puede tumbar la pestaña en móviles.
5. **Auto-descarga forzada en cliente** (`preview-sign-client.tsx:236-245`): el usuario no puede cancelar. En iOS Safari a veces falla.
6. **Firma recortada con loop manual de píxeles** (`preview-sign-client.tsx:186-215`): O(W·H) en el hilo principal. Para un canvas 1000×200 son 200k iteraciones de 4 accesos al buffer — perceptible en móviles. La dep `trim-canvas` ya está instalada y haría esto mismo.
7. **Firma enviada como `data:image/png;base64,…` en JSON** (`preview-sign-client.tsx:221-225`): la codifica otra vez en el servidor para el HTML. Doble roundtrip base64.
8. **Doble inserción de `tracking_events` consecutivos en verificación** (`preview-sign-client.tsx:77,90,103-108`): si pasa verificación y el status era `sent`, hace un `update` + 2 `insert` ("verified" y "opened") en serie (no en paralelo).
9. **Re-extracción de IP en cliente** (`preview-sign-client.tsx:77,90,103`): `getIp()` cachea la IP en variable de módulo (`tracking.ts:1`) → segunda llamada retorna el cache, pero la **primera** llamada por sesión hace un `fetch` extra a `api.ipify.org` desde el cliente del firmante.
10. **Sin timeout/abort en la llamada a Browserless**: un PDF grande puede colgar la request sin posibilidad de cancelar.
11. **Sin reintentos ni circuit breaker**: si Browserless devuelve 5xx, la API responde 500 directamente.
12. **`signed_pdf_url` se guarda como `getPublicUrl(...)`** (`upload-signed-pdf/route.ts:45-49`) pero el bucket es privado: la URL "pública" realmente solo funciona si el cliente está autenticado como el mismo agente (la policy de SELECT exige `auth.uid() = folder[1]`). Para el agente está bien; para compartir el PDF con el cliente, no.
13. **No se valida la firma antes de generar el PDF**: si el cliente dibuja tres puntos y pulsa "Sign", el `getCanvas()` devuelve un canvas con muy poca información y el PDF sale con una firma "fantasma" sin aviso.

### Configuración mejorable
- Subir Tailwind y la fuente a un asset estático servido por la app (o inlining) y referenciarlos por URL absoluta hacia el propio dominio.
- Pasar `{ options: { format: 'Letter', printBackground: true, preferCSSPageSize: true, margin: { top: '0.5in', … } } }`.
- Validar la firma con un threshold de pixels pintados antes de `setIsSigned(true)`.
- Usar `pdf-lib` (ya instalado) para estampar la firma, fecha y hash del documento **en el server** en lugar de pedirle a Browserless que renderice un `<img>`. Esto reduce el tamaño y permite añadir campos AcroForm.
- Mover la generación de PDF a una **Supabase Edge Function** para no gastar tiempo de Vercel/Next con el binario.
- Generar dos páginas: cuerpo + página final con metadatos de auditoría (hash SHA-256 del contenido, IP, UA, timestamp ISO, agent NPN, submission_id) como pie de página.

---

## 7. SISTEMA DE PLANTILLAS Y FORMULARIOS

### Definición
- Una plantilla = un registro en `templates` con `name text` y `content text` (HTML crudo con tokens `{snake_case}`).
- Creación: editor TipTap con barra completa (`src/components/ui/rich-text-editor.tsx`) y panel de variables (`src/components/forms/form-builder.tsx:24-67`).
- **Variables soportadas (24)**:
  - Cliente: `{first_name}`, `{last_name}`, `{email}`, `{phone}`, `{address}`, `{city}`, `{state}`, `{zip}`, `{date_of_birth}`, `{subscriber_number}`, `{tax_filing_status}`, `{marital_status}`, `{projected_annual_income}`, `{tax_dependents_count}`, `{coverage_count}`
  - Póliza: `{policy_number}`, `{carrier}`, `{plan}`, `{premium}`, `{effective_date}`
  - Agencia: `{agency_name}`, `{npn}`, `{agent_name}`
  - Formulario: `{today_date}`
- El editor expone el botón "Variables" con `editorRef.current?.insertText(token)` (`form-builder.tsx:112-114`) que inserta el token literal en el cursor.

### Almacenamiento
- `templates.content` es un `text` plano en Postgres. No hay validación de HTML, no hay sanitización, no hay control de versión.
- Se inserta/actualiza directamente desde el cliente con `supabase.from('templates').insert/update` (`form-builder.tsx:155-178`).
- No hay plantillas globales / de sistema, todas son por agente.

### Renderizado
- En el **editor**: `renderPreview()` con `varMap` hardcoded de datos dummy ("John", "Smith", etc.) para mostrar cómo quedará (`form-builder.tsx:116-147`).
- En el **preview antes de enviar**: server component con datos reales del cliente (`.../preview/[templateId]/page.tsx:65-113`).
- En el **preview público** (tras verificar): client component con datos reales del cliente + coverage_count calculado (`preview-sign-client.tsx:116-165`).
- En el **PDF**: el HTML se envía tal cual a Browserless junto con la firma.

### Mapeo datos → formato final
- `coverage_count` se calcula en runtime como `1 (si applies_to_policy) + N(dependientes con applies_to_policy)` (`preview-sign-client.tsx:120-123`, `.../preview/[templateId]/page.tsx:71-74`).
- `premium` se formatea como `"$250.00/mo"` (preview público) o `"$250.00"` con `.toFixed(2)`, mientras que el preview antes de enviar hace `"$250.00/mo"` con template literal (`.../preview/[templateId]/page.tsx:101`). Inconsistencia menor.
- `date_of_birth` se renderiza como string ISO (`YYYY-MM-DD`) sin formatear a `MM/DD/YYYY` para humanos.
- `today_date` se calcula con `new Date().toLocaleDateString("en-US")` → "6/9/2026" en navegador, pero la zona horaria del agente puede hacer que sea "6/8/2026" en el cliente del firmante.
- Strings vacíos se sustituyen por el valor (no por `""` limpio): p. ej. `address` vacío produce literalmente `{address}` reemplazado por `""` y deja un espacio en blanco en el PDF.
- Faltan fallbacks: si una variable está en la plantilla pero el cliente no tiene el dato, sale vacío (no `N/A`).

### Limitaciones actuales

1. **Sin validación de HTML**: un agente puede meter `<script>` o atributos `onerror=` y se sirven sin sanitizar a otros usuarios. En el preview público se renderiza con `dangerouslySetInnerHTML` (`preview-sign-client.tsx:432`, `.../preview/[templateId]/page.tsx:151`).
2. **No hay un DSL de campos**: las variables son text-sustitution. No se puede poner `{if first_name}Estimado {first_name}{endif}` ni `{repeat:dependents}` para listas. El agente tiene que saber a priori cuántos dependientes hay.
3. **`coverage_count` se calcula en cliente y servidor por separado**, con código duplicado. No es recalculable en runtime si el agente edita el cliente tras enviar.
4. **Sin versionado de plantillas**: editar una plantilla afecta a envíos futuros pero no a los `form_submissions` ya creados (que tienen el HTML congelado en `signed_pdf_url`).
5. **No se pueden reutilizar "bloques"** (firma común, footer legal, header con logo). El agente tiene que duplicar HTML entre plantillas.
6. **Sin tipos de campo**: no se distingue entre campo de texto, fecha, checkbox, firma. Todo es HTML+token.
7. **Variables en otros idiomas**: el panel expone etiquetas en inglés pero el cliente puede escribir en español — el editor no impide mezclar idiomas en la misma plantilla.
8. **Editor no soporta tablas** (TipTap StarterKit no las incluye) — no se puede pedir "tabla de dependientes" con 5 filas dinámicas.
9. **Variables en mayúsculas**: si la plantilla tiene `{FIRST_NAME}` no se sustituye (la regex es `\{(\w+)\}` case-sensitive).
10. **No hay preview con datos reales hasta que hay un cliente** — el dummy "John Smith" puede llevar a creer que la plantilla está lista.
11. **`date_of_birth` en el PDF sale como `2025-01-15`** (ISO crudo), no `01/15/1985` (humano).
12. **Plantilla sin CSS de página**: la clase `.prose` del CDN de Tailwind 2.2 no tiene las mismas reglas que `@tailwindcss/typography` v0.5 en el resto de la app → el preview en el editor (que sí usa v0.5) se ve distinto al PDF final.
13. **Sin templates "de sistema"** (e.g. una plantilla por defecto para consentimientos ACA/Marketplace).
14. **Firma embebida como `<img>` al final** — no aparece anclada en una zona específica de la plantilla. No se puede firmar dentro de un campo del propio documento.
15. **No hay auditoría de cambios** en la plantilla (quién/cuándo la editó, historial).

---

## 8. CONFIGURACIÓN Y ENTORNO

### Archivos de configuración
- `package.json` — nombre `easy-forms-new`, versión `0.1.0`, privado.
- `tsconfig.json` — strict, `noEmit`, `moduleResolution: "bundler"`, alias `@/* → ./src/*`.
- `next.config.mjs` — solo `images.remotePatterns: [{ protocol: "https", hostname: "**" }]` (riesgo: cualquier CDN/host puede ser proxied).
- `tailwind.config.ts` — content paths, paleta custom, plugins `[require("@tailwindcss/typography")]`. Usa `var(--font-dm-sans)` para `font-sans`.
- `postcss.config.mjs` — solo Tailwind.
- `components.json` — shadcn new-york, slate, lucide, css variables, alias `components`/`ui`/`lib`/`utils`/`hooks` → `@/*`.
- `.eslintrc.json` — `next/core-web-vitals` + `next/typescript`.
- `pnpm-workspace.yaml` — `allowBuilds: core-js / msw / unrs-resolver` (placeholder, sin packages).

### Variables de entorno (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://jaqatfmyjadxmtxprvrz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc…(JWT anon role)
SUPABASE_SERVICE_ROLE_KEY=        ← VACÍO en local
BROWSERLESS_TOKEN=                ← VACÍO en local
```
> ⚠️ **Anon key está commiteada**: el JWT termina en `…7PVkSCnrb19I0JSAwsKjaJMvRfVz5iowCk4jcI65oMI` y es de rol `anon`. Por diseño las anon keys son públicas (viven en el cliente), así que esto no es un leak — pero el repo no incluye `.env.example` y `.env.local` está en `.gitignore`. Ver §12.

### No hay `.env.example`, `docker-compose.yml`, ni archivo de CI
El README es el boilerplate de `create-next-app` y no menciona estas variables. AGENTS.md sí las lista.

### Gestión de entornos
- **No hay distinción dev/staging/prod** documentada. El proyecto asume un único `.env.local` apuntando a un proyecto Supabase de desarrollo (`jaqatfmyjadxmtxprvrz`).
- No hay configuración de Supabase CLI (`config.toml`), ni `db diff` en CI, ni políticas de promoción de migraciones.

---

## 9. SCRIPTS Y COMANDOS

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

## 10. TESTS Y CALIDAD

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
- El tipo de muchos componentes que reciben data de Supabase es `Record<string, unknown>` (visto en `dashboard/page.tsx:150`, `submissions/page.tsx:37`, `clients-search-wrapper.tsx:19`, `submissions-search-wrapper.tsx:21`, `forms/page.tsx:47`, `submissions-client.tsx`, `send-form-client.tsx:28`, `forms/[id]/send/page.tsx:35`). Esto es type-erasure masivo que oculta errores reales. Una capa de tipos generados (`supabase gen types typescript`) eliminaría esto.

---

## 11. DOCUMENTACIÓN EXISTENTE

### `README.md`
Boilerplate de `create-next-app` (36 líneas). Menciona `next dev` y el uso de Geist font de Vercel, pero **no describe la app real**. No hay instrucciones específicas de Supabase, Browserless, ni de las variables de entorno. No es útil para onboarding.

### `AGENTS.md`
227 líneas de contexto real, muy bien organizado. Cubre:
- Stack (Next 14 App Router, Supabase, Browserless, TipTap, react-hook-form, zod, shadcn new-york).
- Comandos disponibles (los 4 de `package.json`).
- Aliases de paths.
- Variables de entorno requeridas.
- Mapa de arquitectura (middleware, layout root, dashboard, forms, API routes, factories Supabase, server actions, tracking, types).
- Convenciones (shadcn, `next.config.mjs`, eslint pinned, server actions `*Action`, hooks).
- Gotchas verificados contra SQL/schema.
- Limitaciones declaradas (no CI, no tests, no formato).

Es el único documento de verdad del proyecto.

### Otros
- **No hay** `docs/`, `wiki/`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE`, `SECURITY.md`.
- **No hay** comentarios JSDoc en funciones clave (ni en `getTrackingMetadata`, ni en `smartSearch`, ni en `parseServerMetadata`).
- **No hay** OpenAPI/Swagger para las dos rutas API.
- **No hay** schema diagram; toda la info de relaciones está dispersa en `001_initial_schema.sql` y AGENTS.md.

---

## 12. DEUDA TÉCNICA Y RIESGOS

### Código duplicado
- **Sustitución de variables `template.content.replace(/\{(\w+)\}/g, …)` en 3 lugares** (`form-builder.tsx:116-147`, `.../preview/[templateId]/page.tsx:65-113`, `preview-sign-client.tsx:116-165`) con `varMap`/`vars` muy parecidos pero no idénticos. Falta: `coverage_count` en el preview del builder, formato de `premium` difiere (`.toFixed(2)` vs literal), formato de `date_of_birth` (ISO vs vacío). Cualquier nueva variable requiere tocar 3 archivos.
- **State options y status de matrimonio duplicados** entre `client-wizard.tsx:83-110, 112-124` y `edit-client-modal.tsx:21-62` (mismo array de 51 estados + 4 status + 4 marital). Mover a `src/lib/constants/`.
- **`formatSsn` y `formatPhone` duplicados** en `client-wizard.tsx:132-145` y `edit-client-modal.tsx:64-77`.
- **Manejo de `usePdfDownload` declarado pero solo se usa en `lib/pdf-utils.ts`** y ningún consumidor real lo invoca. El PDF se descarga con `<a download>` inline (`preview-sign-client.tsx:236-245`).
- **`getPublicUrl` se llama en 2 sitios con misma path** (`upload-signed-pdf/route.ts:45-49` y `pdf-utils.ts:46-50`).
- **`createClientAction`/`createPolicyAction`/`createDependentAction`/`createTemplateAction`/`createSubmissionAction`/`updateSubmissionStatusAction` en `lib/actions/data.ts`**: **definidos pero no usados** por la UI. La UI hace `supabase.from('clients').insert(...)` directamente desde el cliente en `client-wizard.tsx:394-422`, `form-builder.tsx:155-178`, `edit-client-modal.tsx:118-141`, `edit-policy-modal.tsx:62-95`, `edit-dependents-modal.tsx:67-98`, `send-form-client.tsx:48-57`, `send-actions.tsx:49-58`. Esto es `console.log` + `revalidatePath` + bypass potencial de RLS (no, la RLS los filtra igual, pero pierdes la revalidation central y la auditabilidad).
- **`src/lib/toast.ts` define `createToast`/`onToast`**: un event bus propio que **no se usa** en ningún componente (todos usan `sonner` directamente).
- **`src/lib/pdf-utils.ts:usePdfDownload`**: hook que **no se importa en ningún archivo del repo**.
- **Inserción de `tracking_events`** con `ip_address: "server", user_agent: "server", device_type: "Desktop"` en server actions (`data.ts:154-160, 186-192`) — es metadata falsa hardcodeada. Si el evento no se origina en el cliente, mejor omitir el insert o esperar al evento real del cliente.
- **El duplicado `submissions-client.tsx` (cliente)** repite el `eventIcons` map que también está en `submissions/[id]/page.tsx:27-32`.

### Tipos inseguros
- `Record<string, unknown>` en `submissions` y `clients` propagado por toda la UI. Hace casts manuales con `String(sub.x)` y `Boolean(sub.x)`. Un rename de columna en la DB pasa desapercibido.
- `dangerouslySetInnerHTML` con HTML que viene de la DB (`clients/[id]/preview/[templateId]/page.tsx:151`, `preview-sign-client.tsx:432`, `form-builder.tsx:317`).

### Dependencias desactualizadas o con pinning extraño
- **`lucide-react ^1.14.0`**: el ecosistema espera `0.x`. `lucide-react@1.x` es un package separado y más pequeño. Riesgo: nuevos iconos pueden no existir en v1, e iconos viejos pueden tener paths distintos.
- **`react-signature-canvas 1.1.0-alpha.2`**: alpha. Sin typings oficiales buenos.
- **`@tiptap/* 3.22`**: stable, pero el repo no aprovecha Tables/Image-upload extension.
- **`jspdf`, `html2canvas`, `pdf-lib`, `trim-canvas` instaladas sin uso** (≈ 2 MB de bundle si se importaran).
- **`@base-ui/react ^1.4.1` instalado sin uso**.
- **`react-hook-form` + `zod` + `@hookform/resolvers` instalados sin uso** (la validación es manual).
- **`@tailwindcss/typography` versión 0.5.19** declarada pero no usada en `rich-text-editor.tsx`; el editor usa el CDN de Tailwind 2.2 dentro del PDF (`generate-pdf/route.ts:19`), generando inconsistencia visual.
- **`date-fns 4.1` instalado sin uso**.
- **Lockfiles duplicados**: `package-lock.json` (npm) **y** `pnpm-lock.yaml` + `pnpm-workspace.yaml` (pnpm). Imposible saber cuál es la fuente de verdad.

### Seguridad
- **`getPublicUrl` sobre bucket privado** (`upload-signed-pdf/route.ts:45-49`): la URL "pública" solo funciona porque el path es `${agentId}/${submissionId}` y la policy valida `auth.uid() = folder[1]`. Cualquiera que conozca el `submissionId` y la sesión del agente puede abrir el PDF. No hay signed URL con expiración.
- **Anon key commiteada en `.env.local`**: técnicamente las anon keys son públicas, pero el repo no incluye `.env.example`, así que cualquier commit futuro con `service_role` o `browserless` quedaría expuesto. `.gitignore` lista `.env*.local` correctamente.
- **Falta `TO authenticated` en las policies RLS**: todas son `FOR ALL USING (...)` sin `TO`. La policy `agents` es `id = auth.uid()` — sin `TO`, en Postgres esto se evalúa también para `anon`. La RLS hace que el `USING` falle para `anon` (porque `auth.uid()` es NULL), pero es mejor hygiene ponerlo explícito. Recomendación de Supabase: usar siempre `TO authenticated`.
- **`handle_new_user` es `SECURITY DEFINER` en `public`**: ejecuta con privilegios del owner. Está bien porque solo el trigger la invoca, pero cualquier rol con `EXECUTE` en la función puede ejecutarla. Postgres concede `EXECUTE` a `PUBLIC` por defecto → un `anon` puede llamar `SELECT public.handle_new_user()`. No es directamente explotable (la firma es trigger, no user-call), pero es superficie de ataque.
- **`getPublicUrl` se llama desde un endpoint con service-role** pero la URL se guarda en la tabla y luego la sirve el cliente con su sesión RLS. El `signed_pdf_url` es persistente y no expira.
- **Validación de identidad de cliente débil**: comparación `ssn_last4 === input` con strings de 4 dígitos. Vulnerable a fuerza bruta (10 000 combinaciones). El tracking `verification_failed` se inserta pero no hay rate limiting. Tampoco hay captcha ni lockout por submission.
- **Nominatim sin User-Agent** (`use-address-autocomplete.ts:70-74`): la API pública Nominatim exige `User-Agent` identificable. Uso actual puede ser bloqueado.
- **`fetch` sin `signal` abortable** en muchos puntos (`generate-pdf` route, `upload-signed-pdf` route, `MfaBanner`).
- **No hay rate limiting en `/api/generate-pdf`**: cualquiera con el `BROWSERLESS_URL` válido puede gastarse el token de Browserless.
- **No hay CSRF check explícito** (las acciones confían en el `getUser()` de Supabase — si la cookie está, pasa).
- **`createClient` browser guarda la sesión en `localStorage` por defecto** (no en cookie HttpOnly), a menos que `@supabase/ssr` use cookie mode (en este proyecto, sí, vía `cookieStore` en server.ts y request.cookies en middleware). En cliente, las cookies httpOnly las maneja el server.

### RLS — issues concretos a corregir
- Todas las policies usan la forma antigua sin `TO authenticated` (Supabase recomienda incluir el `TO` explícito).
- No hay policies de `INSERT/UPDATE/DELETE` por separado: `FOR ALL` cubre todo. Si en el futuro se quiere que un agente no pueda borrar su propia `agents` (su row), no se puede granularizar sin reescribir la policy.
- La policy `tracking_events` tiene sub-SELECT en `USING` + `WITH CHECK`. No es problema, pero `WITH CHECK` no es estrictamente necesario en `FOR ALL` con un `USING` de sub-SELECT — basta con que el `USING` falle para `INSERT`. El `WITH CHECK` actual es redundante pero inofensivo.
- No hay policy que restrinja `DELETE` de `form_submissions` por estado (p. ej. no se debería poder borrar un `signed`).
- `dependents.ssn_encrypted` no se usa (la columna existe en DB pero `edit-dependents-modal.tsx` no la edita; el wizard no la pide; el PDF no la imprime). Si se va a guardar SSN de dependientes, falta la UI.

### Otros
- `pnpm-workspace.yaml` tiene `allowBuilds: set this to true or false` (literal, no son booleans). Es un archivo placeholder no funcional.
- `src/app/fonts/GeistVF.woff` y `GeistMonoVF.woff` están copiados pero **no se usan** (el layout usa `DM_Sans` de `next/font/google`).
- `next.config.mjs:7` permite `hostname: "**"` para `images.remotePatterns` — facilita SSRF vía proxied images.
- `globals.css:42-75` define tema `.dark` pero la app no tiene toggle de tema y la navbar usa colores fijos.
- En `tracking.ts:60`, `getTrackingMetadataClient` devuelve `ip_address: "loading"` (string literal) cuando se le llama desde el cliente y todavía no se resolvió la IP. El site que inserta ese evento usa `getTrackingMetadata()` (async) en `preview-sign-client.tsx`; pero `MfaBanner` y otros usan el sync que se queda con "loading" en `ip_address` si se llegase a loguear. Riesgo bajo (nadie loguea `MfaBanner`), pero el literal "loading" en una columna `inet` petará la inserción.
- `tracking_events.ip_address` es `inet` en la DB; el server action inserta `"server"` (string) en `data.ts:157` — eso fallará en runtime. **Bug activo en código que actualmente se ejecuta** si se llama a `createSubmissionAction` o `updateSubmissionStatusAction` (que la UI no usa, pero están en el código). Si en el futuro alguien migra de `ipify` o cambia la policy, esto explotará.
- `tracking_events.device_type` permite `"loading"` también si se mete `getTrackingMetadataClient` — pero es `text` así que pasa.
- `getIp()` cachea la IP a nivel de módulo (`tracking.ts:1`). En SSR el primer request cachea la IP del primer visitante, no la del actual. No es problema porque `getIp` solo se llama desde el cliente, pero el patrón es frágil.
- `parseServerMetadata` en `tracking.ts:74-84` no limpia `localhost` ni dual-stack — si el server está detrás de un proxy que devuelve `::1`, lo guarda tal cual.
- El matcher del middleware (`src/middleware.ts:10`) excluye `forms/.*`, lo cual es correcto para que el cliente firme sin sesión, pero **también excluye el `HEAD/GET` a archivos subidos vía Storage** (no es problema porque Supabase Storage usa su propio dominio). Sin embargo, **no excluye `/api/auth/*`**, por lo que el callback route handler de Supabase pasa por el middleware antes del exchange — funciona, pero el exchange requiere que el middleware ya haya establecido las cookies, lo que es OK porque `updateSession` siempre escribe.
- `signOut` en `sidebar.tsx:79-80` y `header.tsx:38-40` usa `window.location.href = "/login"` en lugar de `router.push`. Tras un sign-out, esto fuerza recarga completa (puede romper estado en memoria de React Query si se añadiera en el futuro).
- `parseInt/parseFloat` sin radix o NaN handling en `client-wizard.tsx:794, 853` — si el input es `"abc"`, devuelve NaN; el cast a número se hace pero `holder_income` puede terminar como `NaN` si no se valida.
- `parseInt` sin radix en `form-builder.tsx`, `edit-client-modal.tsx:294`.
- `auth.callback/route.ts:7` redirige a `${origin}${next}` sin validar `next` → potencial open redirect (`?next=https://evil.com`). El flow actual de reset-password siempre pone `next=/reset-password`, pero si se permite un `?next=` arbitrario en otra ruta, sería vulnerable.
- La action `getPublicUrl` no comprueba si la URL es accesible desde el cliente: si el bucket fuera público accidentalmente en producción, el PDF sería world-readable.

### TODOs / FIXMEs
Búsqueda exhaustiva: `grep -r "TODO\|FIXME\|XXX\|HACK"` en `src/` → **0 resultados**. No hay marcadores explícitos de deuda.

### Archivos huérfanos / no usados
- `src/lib/toast.ts` (no se importa en ningún archivo)
- `src/lib/pdf-utils.ts` (no se importa en ningún archivo — `usePdfDownload` y `generateSignedPdfUrl` no se usan en la UI actual)
- `src/app/fonts/GeistVF.woff` y `GeistMonoVF.woff`
- `jspdf`, `html2canvas`, `pdf-lib`, `trim-canvas`, `@base-ui/react`, `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns` (todos en `dependencies` sin uso)
- Las 6 server actions de `lib/actions/data.ts` (definidas pero no llamadas)

---

## 13. OPORTUNIDADES DE MEJORA (PRIORIZADAS)

Lista priorizada de las 10 mejoras de mayor impacto, separadas por categoría.

### (a) Optimización de rendimiento

**A1. Eliminar el uso de CDN de Tailwind 2.2 y Google Fonts en `generate-pdf/route.ts`** — Problema: cada PDF se renderiza con 2 requests extra (Tailwind 2.2 CDN, Google Fonts) dentro de Browserless, +latencia 200-700 ms por PDF, +inconsistencia visual con el preview (que usa Tailwind 3 + DM Sans local). Impacto: reducción de latencia por PDF (≈30%), menor dependencia externa, mejor consistencia de marca en el documento. Esfuerzo: **bajo**. Acción: copiar el CSS final de la app a un archivo estático y referenciarlo por URL absoluta hacia el dominio propio (Next puede servirlo desde `/public/`); pasar el `font-family` como inline `<style>` para evitar el `@import` externo.

**A2. Reemplazar `getIp()` cliente→ipify por extracción server-side en `parseServerMetadata`** — Problema: el cliente del firmante hace un `fetch` a `api.ipify.org` en cada sesión de firma. Bloquea la UI hasta que resuelve, falla en redes restringidas, y la IP cacheada a nivel de módulo es compartida entre usuarios. Impacto: 0-300 ms menos en el primer `tracking_events.insert`, menos requests externos, mejor privacidad (no leak de la IP del cliente a ipify). Esfuerzo: **bajo**. Acción: extender `parseServerMetadata` para usar `x-forwarded-for`/`x-real-ip` (ya implementado, pero solo se llama en upload) y llamar `getTrackingMetadata()` (server) desde un endpoint interno al que el cliente le pase solo el submissionId.

**A3. Batch inserts de `tracking_events` y eliminar la serie secuencial `verified` → `opened`** — Problema: `preview-sign-client.tsx:77,90,103-108` hace 3 round-trips a Supabase en serie para la misma operación lógica (verificar identidad). Multiplicado por el patrón de `getTrackingMetadata()` que también es await. Impacto: latencia del flujo de firma reducida 200-500 ms. Esfuerzo: **bajo**. Acción: combinar los 3 inserts en uno con `array` de filas, o usar una sola mutación atómica con `supabase.rpc()` o `Promise.all`.

**A4. Pre-renderizar el HTML con variables en el server (no en el cliente) y cachear** — Problema: el preview público (`/forms/[id]`) hace la sustitución de 24 variables en cliente en cada visita. Para un submission con 1k vistas (viral, enviado por WhatsApp), son 1k ejecuciones. Impacto: -100 ms por carga en cliente, -transfer de HTML procesado. Esfuerzo: **medio**. Acción: mover la sustitución al server component `forms/[id]/page.tsx` y pasar el HTML ya renderizado al cliente. Caché por `submissionId` con `unstable_cache` (Next) o revalidación on-sign.

**A5. Acelerar la sustitución de variables y añadir caché de "compiled template"** — Problema: la regex `template.content.replace(/\{(\w+)\}/g, fn)` se compila 24 veces en cada render y re-escanea el HTML entero. Para una plantilla de 5 KB se notan ms innecesarios. Impacto: en escala (100+ submissions simultáneos, render de preview) ahorra CPU. Esfuerzo: **bajo-medio**. Acción: pre-compilar las regexes por variable una vez al cargar la plantilla; o usar un mini-parser Mustache/Handlebars en server.

### (b) Mejora de formatos/plantillas y generación de PDF

**B1. Migrar la sustitución de variables a un motor de plantillas con lógica (if/repeat)** — Problema: el `String.replace(/\{(\w+)\}/g)` no soporta condicionales ni loops. El agente no puede escribir "Estimado {first_name}, y sus {N} dependientes" donde N viene de un `length(depientes)`. No puede firmar dentro de un campo del documento. Impacto: habilita consentimientos ACA con cláusulas condicionales (tax_dependents_count ≥ 3 → "incluir spouses"), tablas de dependientes, firmas múltiples. Esfuerzo: **medio-alto**. Acción: usar `handlebars` o `mustache` (o implementar un mini-parser con `{if:cond}…{/if}`, `{repeat:dependents}…{/repeat}`). Crear un set de plantillas "starter" del sistema (ACA consent, Medigap, Short Term).

**B2. Estampar la firma con `pdf-lib` (no como `<img>` en HTML)** — Problema: la firma se inyecta como `<img>` al final del HTML, Browserless la rasteriza, no se ancla a una zona del documento, no se valida, no se pueden añadir campos AcroForm. Impacto: PDFs más pequeños, mejor validación legal, habilita flujos de firma múltiple, hash embebido. Esfuerzo: **medio**. Acción: en `generate-pdf`, generar el PDF sin firma → descargar binario → usar `pdf-lib` para añadir la firma en una posición fija (placeholder `{{signature_anchor}}` en el template) y metadata (autor, fecha ISO, hash SHA-256, agent NPN, submission_id). Devolver PDF final.

**B3. Generar el PDF en una Supabase Edge Function (Deno) en vez de Vercel/Next** — Problema: `generate-pdf/route.ts` corre como Route Handler de Next, que en serverless tiene timeouts duros (10-60s) y consume Function Units de Vercel. El binario del PDF pasa entero por la red (browser → Next → Browserless → Next → browser → /api/upload-signed-pdf → Supabase Storage). Impacto: reduce latencia, evita timeouts en PDFs grandes, ahorra cost de Vercel, y desacopla. Esfuerzo: **medio**. Acción: crear `supabase/functions/generate-pdf/index.ts` que reciba `{ html, signature }`, llame a Browserless, devuelva el binario directo al cliente (o lo escriba directo a Storage). Cliente lo sube vía Signed Upload URL.

**B4. Estandarizar el formato de `premium`, `date_of_birth`, `today_date`, y añadir fallbacks `N/A`** — Problema: inconsistencias entre los 3 renderers (preview en builder con dummy "John", preview antes de enviar con template literal "$250.00/mo", preview público con `.toFixed(2)`). `date_of_birth` se imprime como ISO. Variables no presentes salen vacías en vez de "N/A". Impacto: aspecto profesional consistente, menos confusión para el cliente final, menos soporte. Esfuerzo: **bajo**. Acción: centralizar formatters en `src/lib/template-engine.ts` (función `formatValue(key, value)`); usar `Intl.DateTimeFormat("en-US", { dateStyle: "long" })` para fechas.

**B5. Auditoría visible en el PDF** (pie de página con hash + IP + UA + agent NPN + timestamp) — Problema: el PDF final no lleva marca de auditoría, lo cual es necesario para e-sign de seguros. Impacto: cumple con E-SIGN Act / state-specific requirements; permite validar integridad. Esfuerzo: **bajo** (con `pdf-lib`) o **medio** (con `@react-pdf/renderer`). Acción: pasarle a la generación de PDF la metadata de la submission y estamparla en un footer de cada página.

### (c) Calidad de código y mantenibilidad

**C1. Eliminar `Record<string, unknown>` con tipos generados de Supabase** — Problema: 7+ archivos tipan datos de DB como `Record<string, unknown>`, haciendo casts con `String(sub.x)` y `Boolean(sub.x)`. Un rename de columna pasa desapercibido. Impacto: detección temprana de bugs, autocompletado real, menos casts. Esfuerzo: **bajo-medio**. Acción: `npx supabase gen types typescript --project-id jaqatfmyjadxmtxprvrz --schema public > src/lib/database.types.ts`, importar `Database` de ahí, tipar helpers `SupabaseClient` como `createClient<Database>()`. Eliminar todos los `Record<string, unknown>`.

**C2. Eliminar dependencias no usadas** — Problema: 11 paquetes en `dependencies` no se importan en ningún archivo (`jspdf`, `html2canvas`, `pdf-lib`, `trim-canvas`, `@base-ui/react`, `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`, `lucide-react@1.14.0` requiere atención). Bundle y lockfile inflados, signal de descuido. Impacto: ~500 KB menos en node_modules, install más rápido, menos superficie de auditoría. Esfuerzo: **bajo**. Acción: ejecutar `depcheck` (instalar como devDep), eliminar listados en `package.json`, regenerar lockfile.

**C3. Mover toda mutación de DB a las server actions y eliminar las mutaciones cliente** — Problema: 7+ archivos hacen `supabase.from('...').insert/update` desde el cliente. Las server actions de `lib/actions/data.ts` están definidas y abandonadas. Impacto: un único lugar para revalidación, logging, autorización, sanitización; menos código duplicado. Esfuerzo: **medio**. Acción: convertir cada `supabase.from('x').insert(...)` en un `<form action={createXAction}>` o un `await createXAction(...)` desde el handler. Añadir zod schemas en cada action.

**C4. Centralizar la lógica de variables/formatters de plantilla en un módulo compartido** — Problema: 3 archivos duplican el `varMap` con diferencias. Si añades una variable nueva, tienes que tocar 3 sitios y rezar para no olvidar uno. Impacto: un solo sitio para mantener, formatters consistentes, test unitario trivial. Esfuerzo: **bajo**. Acción: crear `src/lib/template-engine.ts` con `renderTemplate(content, data: { client, policy, agent }): string` y `formatValue(key, raw): string`. Importar desde los 3 lugares. Bonus: tests Vitest.

**C5. Cambiar `getPublicUrl` por `createSignedUrl` con expiración** — Problema: el bucket es privado pero la app guarda `getPublicUrl(...)` como si fuera público. El link solo funciona porque la policy valida `auth.uid() = folder[1]` — pero si en producción se quita la policy o se cambia el folder, los PDFs quedan inaccesibles. El link tampoco expira. Impacto: URLs firmadas con TTL (15 min) que el cliente puede mandar al firmante sin perder acceso. Esfuerzo: **bajo**. Acción: en `upload-signed-pdf/route.ts`, generar `createSignedUrl(filePath, 60 * 60 * 24 * 7)` y guardar esa URL. Regenerar on-demand en el dashboard.

**C6. Añadir tests mínimos con Vitest** — Problema: 0 tests en todo el repo. Cualquier cambio rompe sin avisar. Impacto: red de seguridad para refactors (CRÍTICO si se va a reescribir el template engine, B1, C4). Esfuerzo: **medio**. Acción: añadir `vitest`, escribir tests para: `smartSearch`, `renderTemplate` (motor nuevo), `formatSsn`/`formatPhone`, `getTrackingMetadataClient`, `parseServerMetadata`. Bonus: tests E2E con Playwright para el flujo de firma.

**C7. Sanitizar el HTML de plantilla antes de renderizar** — Problema: `template.content` se inyecta con `dangerouslySetInnerHTML` en 3 sitios. Un agente malicioso (o comprometido) puede meter `<script>`, `<iframe>`, `onerror=`. El preview público se sirve a no-autenticados. Impacto: XSS en el firmante, robo de cookies. Esfuerzo: **bajo**. Acción: usar `dompurify` con allowlist de tags y atributos (mantener los que TipTap genera: `h1-h3, p, ul, ol, li, strong, em, u, s, a, img, span, br, mark, code, pre, blockquote, table, thead, tbody, tr, th, td`). Aplicar antes de cada `dangerouslySetInnerHTML`.

**C8. Aplicar migraciones al Supabase desde el repo y versionar la DB** — Problema: las 3 migraciones están en `supabase/migrations/` pero no hay un flujo claro de aplicación (`supabase db push` no se ejecuta automáticamente en CI, no hay `supabase/config.toml`). El estado real de la DB (con `verification_data`, `ip_address inet`, `user_agent text`, `device_type text` en `tracking_events`) **no está reflejado en las migraciones** — se aplicó a mano, y el próximo agente que clone el repo tendrá un schema inconsistente. Impacto: schema reproducible, deploy seguro. Esfuerzo: **bajo-medio**. Acción: crear `004_tracking_metadata.sql` y `005_submission_verification.sql` reflejando el estado real; ejecutar `supabase db pull` periódicamente; documentar `supabase db push` en AGENTS.md.

**C9. Eliminar las server actions muertas o conectarlas a la UI** — Problema: `createSubmissionAction` y `updateSubmissionStatusAction` en `lib/actions/data.ts:130-194` insertan `ip_address: "server"` (string) en una columna `inet` — **fallarán en runtime** si se llaman. El tracking "server"/"Desktop" no es real. Impacto: bug latente. Esfuerzo: **bajo**. Acción: o bien eliminar las actions, o bien reescribir para que la action **no inserte** el `tracking_events` (dejar que el cliente lo haga con la IP real) y quitar la metadata falsa.

**C10. Reemplazar `ipify` + `Nominatim` por servicios propios o de pago con SLA** — Problema: dependencias de servicios gratuitos con rate limit (Nominatim: 1 req/s, ipify: 50K/mes). En producción pueden fallar y romper el alta de clientes. Impacto: robustez, soporte SLA. Esfuerzo: **medio**. Acción: Nominatim → Mapbox/USPS API; ipify → Cloudflare headers en Edge Function; o como mínimo cachear IP por sesión (ya cacheado a nivel de módulo, pero con TTL).
