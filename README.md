# Fit Compas

Subscription fitness platform. A coach publishes exercise videos, assembles them
into workouts and multi-week programs, assigns them to clients, and tracks what
actually got done. Clients subscribe to get access.

**Live:** https://fit-compas.vercel.app

**Where the project stands and what comes next: [docs/ROADMAP.md](docs/ROADMAP.md).**
Read it before starting work — it carries the numbered feature list, the
decisions already made, and the failure modes this codebase has already hit.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4, CSS-first tokens in `src/app/globals.css` |
| Database | Supabase Postgres via Drizzle ORM |
| Auth | Supabase Auth |
| Video | Supabase Storage behind a provider interface (Mux/Bunny swappable) |
| Billing | Polar.sh |
| Hosting | Vercel, auto-deploy on push to `main` |
| Mobile | Capacitor (planned) |

## Layout

```
src/
  app/[lang]/        locale-scoped routes; the root layout lives here
  app/api/           route handlers (Polar webhooks, signed video URLs)
  components/ui/     design primitives — Surface, Button, Eyebrow
  components/site/   header, footer, locale switcher
  components/marketing/
  dictionaries/      sr.json, en.json, ru.json — identical key trees
  lib/i18n/          locale config and server-only dictionary loader
  proxy.ts           locale resolution (Next 16's renamed middleware)
```

## Conventions that are not optional

- **Glass comes from one place.** Use `<Surface>` or the `glass` / `glass-strong`
  utilities. Hand-rolling `bg-white/5 backdrop-blur` anywhere else makes the
  surfaces drift apart until the UI stops reading as one system.
- **Safe areas and touch targets are load-bearing.** Controls are ≥44px, insets
  come from the `pt-safe` / `pb-safe` / `pb-tabbar` utilities, and nothing
  depends on `:hover`. This ships inside a Capacitor WebView later.
- **`<video>` always gets `playsInline`.** Without it iOS hijacks playback into
  a fullscreen player and breaks the workout runner.
- **Dictionaries stay in sync.** All three files must have the same key tree.
- **Next 16 renamed middleware to `proxy.ts`** and `params` is a Promise.
- **Never put a regex escape in `config.matcher`.** Next strips the backslash
  when it compiles the matcher, so `.*\..*` silently becomes `.*..*`, which
  matches everything and disables the proxy for the whole app. Filter in code.
- **Every new table in `public` gets RLS enabled in the same migration.**
  PostgREST exposes the whole schema, so a table without RLS is readable and
  writable by anyone holding the publishable key — which ships to the browser
  by design. Default-deny plus a narrow read grant. Verify with an anon
  `curl $SUPABASE_URL/rest/v1/<table>` before shipping.
- **Both `DATABASE_URL` and `DIRECT_URL` point at the session pooler (5432).**
  The transaction pooler (6543) hangs instead of answering once a couple of
  queries queue on one connection, which reads as the whole app loading
  forever and ends in a Vercel function timeout — see `src/db/client.ts`. It
  also cannot hold session state, so DDL through it half-applies.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000 → redirects to /sr
npm run build        # must pass before every push

npm run db:generate  # diff schema -> drizzle/*.sql
npm run db:migrate   # apply pending migrations (uses DIRECT_URL)
npm run db:seed      # taxonomy vocabularies, idempotent on slug
npm run db:studio    # browse the data
```

Environment variables live in `.env.local` (git-ignored) and mirror the Vercel
project settings.
