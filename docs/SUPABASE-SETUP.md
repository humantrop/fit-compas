# Supabase — šta treba da uradiš

Ceo kod je napisan i čeka ključeve. Ovo je 6 koraka, oko 10 minuta.

---

## 1. Napravi projekat

1. Otvori https://supabase.com/dashboard i klikni **New project**
2. **Name:** `fit-compas`
3. **Database Password:** klikni *Generate a password* i **sačuvaj ga** — treba ti u koraku 3 i ne može se ponovo videti
4. **Region:** `Central EU (Frankfurt)` — najbliži je i tebi i korisnicima u regionu
5. **Create new project**, pa sačekaj ~2 minuta da se projekat digne

---

## 2. Pokreni SQL

Ovo pravi `profiles` tabelu, trigger koji automatski pravi profil za svakog novog korisnika, RLS politike, zaštitu od toga da klijent sam sebe proglasi adminom, i sva četiri storage bucketa.

1. U levom meniju: **SQL Editor** → **New query**
2. Otvori fajl [`supabase/migrations/0001_profiles_and_storage.sql`](../supabase/migrations/0001_profiles_and_storage.sql) iz repoa, kopiraj **ceo sadržaj**, nalepi
3. **Run** (ili Ctrl+Enter)
4. Očekivano: `Success. No rows returned`

> Ako pukne, pošalji mi grešku — skripta je idempotentna, može se puštati više puta bez štete.

Provera da je prošlo: **Table Editor** → treba da vidiš tabelu `profiles`. **Storage** → treba da vidiš `exercise-videos`, `exercise-thumbnails`, `avatars`, `progress-photos`.

---

## 3. Pokupi ključeve

Trebaju mi **četiri vrednosti**. Pošalji mi ih ovde u četu ili ih sam upiši (korak 5).

### a) URL i dva ključa
**Project Settings** (zupčanik dole levo) → **API Keys**

| Šta | Gde piše | Ide u |
|---|---|---|
| Project URL | vrh strane, `https://xxxxx.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| **Publishable** key (stariji projekti: `anon`) | sekcija API Keys | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| **Secret** key (stariji projekti: `service_role`) | sekcija API Keys, mora se otkriti klikom | `SUPABASE_SECRET_KEY` |

> ⚠️ **Secret key zaobilazi sva RLS pravila.** Nikad ga ne stavljaj u frontend kod, ne šalji screenshotom u javnu grupu i ne commituj. Ako ti nekad procuri — **Project Settings → API Keys → Rotate**.

### b) Connection string
**Project Settings** → **Database** → **Connection string** → tab **URI**

Kopiraj, pa **zameni `[YOUR-PASSWORD]`** lozinkom iz koraka 1. Ide u `DATABASE_URL`.

---

## 4. Podesi Auth

### a) Redirect URLs
**Authentication** → **URL Configuration**

- **Site URL:** `https://fit-compas.vercel.app`
- **Redirect URLs** — dodaj obe linije:
  ```
  https://fit-compas.vercel.app/**
  http://localhost:3000/**
  ```

Bez ovoga linkovi iz mejla neće raditi.

### b) Email šabloni — bitno, ne preskači

Podrazumevani Supabase šablon koristi link koji radi **samo u istom pregledaču** u kom je korisnik kliknuo „Napravi nalog". Ako neko otvori mejl na telefonu a registrovao se na laptopu, potvrda pukne.

**Authentication** → **Emails** → **Templates**

U šablonu **Confirm signup** zameni telo linka. Nađi red sa `{{ .ConfirmationURL }}` i zameni ceo `<a href="...">` ovim:

```html
<a href="{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/sr/dashboard">
  Potvrdi nalog
</a>
```

Isto uradi u šablonu **Reset password**, samo sa drugim `type` i `next`:

```html
<a href="{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/sr/reset-password">
  Postavi novu lozinku
</a>
```

> Kod podržava i stari i novi oblik linka, tako da ništa neće pući ako ovo uradiš kasnije — samo će potvrda raditi lošije dok ne uradiš.

### c) Potvrda mejla
**Authentication** → **Sign In / Providers** → **Email**

Ostavi **Confirm email** uključeno. Ako hoćeš da testiraš brže bez čekanja mejlova, privremeno ga isključi — samo ga vrati pre nego što pustiš prave korisnike.

> Supabase-ov ugrađeni mejl servis šalje **max 2 mejla na sat** i završava u spamu. To je ok za testiranje. Pre pravog lansiranja kačimo Resend kao SMTP — javi kad stignemo dotle.

---

## 5. Upiši promenljive

**Opcija A — pošalji mi ih**, ja ih upišem i lokalno i na Vercel.

**Opcija B — sam:**

Lokalno: napravi fajl `.env.local` u korenu projekta po uzoru na [`.env.example`](../.env.example).

Na Vercelu — u terminalu iz foldera projekta:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel env add SUPABASE_SECRET_KEY production
vercel env add DATABASE_URL production
```
Ili kroz sajt: **vercel.com → fit-compas → Settings → Environment Variables**.

> Vercel ne primenjuje nove promenljive na postojeći deploy. Posle dodavanja treba novi deploy — ja ću ga pokrenuti.

---

## 6. Napravi svoj nalog i proglasi se adminom

1. Otvori https://fit-compas.vercel.app/sr/signup i registruj se
2. Potvrdi mejl
3. Vrati se u **SQL Editor** → **New query**
4. Nalepi sadržaj [`supabase/migrations/0003_fix_role_guard_and_promote.sql`](../supabase/migrations/0003_fix_role_guard_and_promote.sql)
5. Proveri da je mejl u skripti tvoj (podrazumevano stoji `trope93@gmail.com`)
6. **Run** — na dnu treba da vidiš svoj red sa `role = admin`

Ovo mora preko SQL-a jer zaštita iz koraka 2 blokira svakog ko nije admin da menja svoju rolu. To je isto ono što sprečava klijenta koji plaća pretplatu da sam sebi da admin prava.

---

## Kad završiš

Javi mi i ja odmah:
- upisujem promenljive (ako si izabrao opciju A) i deployujem
- proveravam ceo tok uživo: registracija → mejl → potvrda → prijava → `/dashboard` → odjava
- krećem na korak 4 iz plana — Drizzle šema, taksonomije i admin Configuration ekran

## Kad nešto pukne

| Simptom | Uzrok |
|---|---|
| „Baza još nije povezana" na formi | Promenljive nisu upisane ili nije bilo novog deploya |
| Link iz mejla vodi na `?error=invalid_link` | Redirect URLs iz koraka 4a nisu dodati, ili je link već iskorišćen |
| Prijava radi ali `/dashboard` prikazuje žuto upozorenje | SQL iz koraka 2 nije pušten — nema `profiles` reda |
| Mejl ne stiže | Supabase limit od 2/sat, ili je u spamu |
| `role` i dalje `client` posle koraka 6 | Mejl u skripti se ne poklapa sa onim kojim si se registrovao |
| `P0001: changing role is not permitted` | Pustio si stari `0002` umesto `0003` |
