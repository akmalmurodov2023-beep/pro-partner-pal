# Migration Guide — Lovable Cloud → Personal Supabase

This document describes everything required to move this project off the
Lovable‑managed Supabase instance (`ukqadssqzobvwbugwrxx`) onto your own
Supabase project (e.g. `wjvapozkvwypnmodujft`).

The companion file **`supabase/init.sql`** contains a single, runnable
migration that recreates the entire database structure on a fresh Supabase
project (sections 1–4 + 6 of this document, consolidated).

Existing row data is exported separately under `supabase-export/` (CSV +
`02_data.sql`) — see step 12.

---

## 1. Database schema (SQL)

Tables are listed in dependency order (parents first). Full SQL with all
columns, types, defaults, NOT NULL, FK and indexes is in
`supabase/init.sql`. Summary:

| # | Table | Purpose | FKs |
|---|---|---|---|
| 1 | `public.clients` | Companies / customers | — |
| 2 | `public.workers` | Employees / contractors | — |
| 3 | `public.projects` | Projects per client | `client_id → clients.id` |
| 4 | `public.project_workers` | M2M: which worker on which client | `client_id`, `worker_id` |
| 5 | `public.promocodes` | Promo codes assigned to workers | `worker_id → workers.id` |
| 6 | `public.payments` | Payments to workers / from clients | `client_id`, `worker_id` |
| 7 | `public.monthly_results` | CPA monthly results per client | `client_id → clients.id` |

No custom schemas other than `public` are used. No CHECK constraints
currently exist.

Indexes added in `init.sql`:
- `idx_projects_client_id`
- `idx_project_workers_client_id`, `idx_project_workers_worker_id`
- `idx_promocodes_worker_id`
- `idx_payments_client_id`, `idx_payments_worker_id`
- `idx_monthly_results_client_id`, `idx_monthly_results_year_month`

---

## 2. Row Level Security (RLS)

RLS is **enabled on all 7 public tables**.

Currently the app is a single‑tenant internal admin tool, so every table
uses one permissive policy: any authenticated user can read/write
everything.

```sql
CREATE POLICY "auth all clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);
-- …same shape for workers, projects, project_workers, promocodes,
-- payments, monthly_results.
```

Each policy says: *"any logged‑in user can SELECT/INSERT/UPDATE/DELETE
rows in this table."* If you later add multi‑tenancy, restrict these to
`auth.uid() = owner_id` style checks.

---

## 3. Database functions, triggers, views

### Functions

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

Used by `BEFORE UPDATE` triggers to keep `updated_at` fresh.

### Triggers

`init.sql` attaches `set_updated_at()` to every table that has an
`updated_at` column:

| Trigger | Table |
|---|---|
| `trg_clients_updated_at` | `clients` |
| `trg_workers_updated_at` | `workers` |
| `trg_projects_updated_at` | `projects` |
| `trg_monthly_results_updated_at` | `monthly_results` |

(`payments`, `project_workers`, `promocodes` only have `created_at`, so
no trigger is needed.)

### Views

None.

---

## 4. Database extensions

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- legacy uuid helpers (safe default)
```

`pg_cron` is **not** used.

---

## 5. Edge Functions

This project does **not** use any Supabase Edge Functions. All server
logic runs as **TanStack Start `createServerFn` handlers** that are
bundled and deployed together with the frontend (Cloudflare Worker /
Node.js — wherever you host the SSR build).

Files:

### 5.1 `src/server/telegram.functions.ts` — `sendTelegramMessage`

- **Purpose:** sends a Telegram message to a specific `chat_id`.
- **Called from:** the frontend (e.g. `src/lib/notify.ts`) via
  `useServerFn(sendTelegramMessage)`. Triggered when payments are
  confirmed and when monthly results are saved.
- **Secrets used:** `TELEGRAM_BOT_TOKEN`.
- **Trigger model:** synchronous RPC from the browser.

### 5.2 `src/server/gdrive.functions.ts` — `uploadToDrive`

- **Purpose:** uploads a base64 file into a fixed Google Drive folder
  through the Lovable Connector Gateway and makes the resulting file
  publicly readable by link.
- **Called from:** file upload UI (workers passport scans, contracts,
  receipts, monthly result documents).
- **Secrets used:** `LOVABLE_API_KEY`, `GOOGLE_DRIVE_API_KEY`.
- **Trigger model:** synchronous RPC from the browser.

> When migrating off Lovable Cloud you have two choices for these
> server functions:
> 1. Keep them as TanStack server functions in your own Node host /
>    VPS (recommended) — just provide the secrets via `.env`.
> 2. Re‑implement them as Supabase Edge Functions in your new project.
>    In that case, copy the body of each `.handler()` into a Deno
>    `serve()` handler and call it through `supabase.functions.invoke()`.

The Google Drive upload currently goes through the Lovable Connector
Gateway (`https://connector-gateway.lovable.dev/google_drive`). Once
off Lovable, switch to Google's official Drive REST API
(`https://www.googleapis.com/upload/drive/v3/...`) using a Google
service‑account JSON key.

---

## 6. Storage buckets

| Bucket | Public | Size limit | Allowed MIME |
|---|---|---|---|
| `documents` | No (private) | default (no explicit limit) | any |

Files are accessed via signed URLs from the app code (`src/lib/storage.ts`).

### Storage RLS policies (in `init.sql`)

```sql
CREATE POLICY "auth read documents"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "auth insert documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "auth update documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "auth delete documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');
```

All four mean: *any logged‑in user can interact with files in the
`documents` bucket.*

To migrate existing files: download every object from the old project's
`documents` bucket and re‑upload them into the new project's bucket
keeping the same paths (so existing URLs stored in DB still resolve).

---

## 7. Authentication settings

- **Providers enabled:** Email + Password only.
- **Magic link / OTP / Google / GitHub / etc.:** disabled.
- **Email confirmations:** required (no auto‑confirm).
- **Email templates:** default Supabase templates (not customised).
- **Site URL / Redirect URLs:** set these in your new project's
  *Authentication → URL Configuration* to:
  - Site URL: `https://your-domain.com`
  - Additional redirect URLs: `https://your-domain.com/**`,
    `http://localhost:3000/**` (for local dev).

> Existing user passwords cannot be exported from Supabase. After
> migration, either invite users again or trigger a password‑reset
> email per user.

---

## 8. Cron jobs / scheduled tasks

None. The app uses no `pg_cron` jobs and no external schedulers.

---

## 9. Frontend code: places that reference Supabase

No Supabase URL / anon key is hardcoded in app code — they are read
from environment variables. The relevant files are:

| File | Reads | Notes |
|---|---|---|
| `src/integrations/supabase/client.ts` | `import.meta.env.VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (with `process.env` SSR fallback) | **Auto‑generated** — do not edit. Replace its env values via `.env`. |
| `src/integrations/supabase/client.server.ts` | `process.env.SUPABASE_URL`, `process.env.SUPABASE_SERVICE_ROLE_KEY` | Server‑only admin client. |
| `src/integrations/supabase/auth-middleware.ts` | `process.env.SUPABASE_URL`, `process.env.SUPABASE_PUBLISHABLE_KEY` | Server FN auth middleware. |
| `src/integrations/supabase/types.ts` | — | Auto‑generated typed schema. Regenerate against new project with `supabase gen types`. |
| `supabase/config.toml` | `project_id = "ukqadssqzobvwbugwrxx"` | Update to your new project ref if you keep the Supabase CLI workflow. |
| `.env` | All `VITE_SUPABASE_*` values | Replace with new project credentials (see below). |

There are **no Edge Function calls** (`supabase.functions.invoke(...)`)
anywhere in the codebase.

### Required `.env` values for the new project

```env
# Public (browser-safe)
VITE_SUPABASE_URL=https://wjvapozkvwypnmodujft.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<new project anon / publishable key>
VITE_SUPABASE_PROJECT_ID=wjvapozkvwypnmodujft

# Server-only (do NOT prefix with VITE_)
SUPABASE_URL=https://wjvapozkvwypnmodujft.supabase.co
SUPABASE_PUBLISHABLE_KEY=<same anon key>
SUPABASE_SERVICE_ROLE_KEY=<new project service role key>

# Telegram bot used by src/server/telegram.functions.ts
TELEGRAM_BOT_TOKEN=<your bot token>

# Google Drive (only if you keep using Lovable's connector gateway)
LOVABLE_API_KEY=<lovable api key>
GOOGLE_DRIVE_API_KEY=<google drive connector key>
```

---

## 10. Single migration SQL file

Sections **1–4 and 6** are consolidated into one runnable file:

> **`supabase/init.sql`**

How to use:

1. Create a new Supabase project.
2. Open *SQL Editor → New query*.
3. Paste the entire contents of `supabase/init.sql`.
4. Run. This creates extensions, the `set_updated_at()` function, all 7
   tables, indexes, triggers, RLS + policies, and the private
   `documents` storage bucket with its RLS.
5. (Optional) Run `supabase-export/02_data.sql` to load existing rows.
6. Manually re‑upload files from the old `documents` bucket.
7. Configure Authentication URL settings (section 7).
8. Update `.env` (section 9) and redeploy your frontend / VPS.

Done — the new Supabase project is a 1:1 replacement of the old one.