# Murodov Store — Admin Panel

TanStack Start (React + Vite) ilovasi. Backend — Supabase (Lovable Cloud).

## Development

```bash
bun install
bun run dev
```

## Production build

```bash
bun run build
```

**Build natijasi:** `.output/` papkasi (TanStack Start standart chiqish papkasi).
- `.output/public/` — static fayllar (HTML, CSS, JS, assetlar)
- `.output/server/` — SSR server kodi (Node.js entry)

**VPS'da production'da ishga tushirish (Node.js server):**

```bash
node .output/server/index.mjs
```

Default port: `3000`. Boshqa port kerak bo'lsa:

```bash
PORT=8080 node .output/server/index.mjs
```

Reverse proxy (nginx/caddy) orqali HTTPS va domen ulang.

### Environment variables (production VPS)

`.env` faylga (yoki systemd/PM2 environment'iga) faqat **client-side** kalitlar:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT
```

Server-side secret'lar (Telegram bot token, Google Drive API key) bu yerda
**SAQLANMAYDI** — ular Supabase Edge Function secrets'da turadi (pastga qarang).

---

## Supabase Edge Functions

Loyihada ikkita Edge Function bor:

| Funksiya | Vazifa | Kerakli secret'lar |
|---|---|---|
| `send-telegram-notification` | Telegram bot orqali xabar yuborish | `TELEGRAM_BOT_TOKEN` |
| `upload-to-drive` | Faylni Google Drive papkasiga yuklash | `LOVABLE_API_KEY`, `GOOGLE_DRIVE_API_KEY` |

### Deploy

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF

supabase functions deploy send-telegram-notification
supabase functions deploy upload-to-drive
```

### Secret'larni o'rnatish

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...
supabase secrets set LOVABLE_API_KEY=lov_...
supabase secrets set GOOGLE_DRIVE_API_KEY=...
```

Tekshirish:

```bash
supabase secrets list
```

### Lokal test

```bash
supabase functions serve send-telegram-notification --env-file .env.local
```

---

## Migratsiya

Lovable Cloud bazasidan o'z Supabase loyihangizga ko'chirish bo'yicha to'liq
qo'llanma: [`MIGRATION.md`](./MIGRATION.md).