# Fit Compas

Subscription fitness platform. A coach publishes exercise videos, assembles them
into workouts and multi-week programs, assigns them to clients, and tracks what
actually got done. Clients subscribe to get access.

**Live:** https://fit-compas.vercel.app

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

## Local development

```bash
npm install
npm run dev     # http://localhost:3000 → redirects to /sr
npm run build   # must pass before every push
```

Environment variables live in `.env.local` (git-ignored) and mirror the Vercel
project settings.
