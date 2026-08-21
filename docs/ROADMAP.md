# Fit Compas — stanje i plan

> **Kako se ovo koristi:** svaka stavka iz tabele „Sledeći koraci" je jedna sesija.
> U novoj sesiji je dovoljno napisati broj — npr. `05` ili „radimo 05" — i taj
> feature se gradi do kraja, commituje i pušuje na live.

**Live:** https://fit-compas.vercel.app · **Repo:** https://github.com/humantrop/fit-compas

Poslednje ažurirano: 21.08.2026.

---

## Gde smo sada

| # | Feature | Stanje |
|---|---|---|
| 00 | Infrastruktura — GitHub public repo, Vercel, auto-deploy na push | ✅ |
| 01 | Dizajn sistem + landing stranica | ✅ |
| 02 | i18n — srpski, engleski, ruski | ✅ |
| 03 | Autentikacija — Supabase, prijava/registracija/reset, zaštita ruta | ✅ |
| 04 | Baza — Drizzle šema, taksonomije, RLS | ✅ |

### Šta konkretno radi

**Infrastruktura.** Repo je javan. Vercel je povezan sa GitHub-om — svaki push na `main` ide na live za ~30 sekundi, bez ijedne ručne komande. Šest env promenljivih je podešeno u sva tri okruženja (Production, Preview, Development).

**Dizajn.** Tamna mornaričko-plava podloga, električna plava kao primarna, staklene površine, bento raspored. Tokeni su u [`src/app/globals.css`](../src/app/globals.css) kroz Tailwind 4 `@theme`. Sve kartice idu kroz `<Surface>` — nigde ad-hoc `bg-white/5`.

**Jezici.** `app/[lang]` segment, `proxy.ts` bira jezik po redosledu kolačić → `Accept-Language` → srpski. Rečnici su code-split, sva tri imaju identično stablo od 126 ključeva (skripta to proverava pri svakoj izmeni).

**Auth.** Registracija → potvrda mejla → prijava → zaštićena ruta → odjava, sve radi uživo. Postoji i reset lozinke. Greške se vraćaju kao kodovi pa se prevode u rečniku — korisnik vidi srpsku poruku iako Supabase odgovara engleski.

**Baza.** 13 tabela, 6 enuma, PostgreSQL 17.6. Seed: 30 komada opreme, 23 mišićne grupe sa hijerarhijom, 10 ciljeva, 12 aktivnosti, 10 zdravstvenih stanja, 27 metrika po opremi — sve na tri jezika.

---

## Sledeći koraci

Svaka stavka je jedna sesija. Redosled je namerno takav da svaka gradi na prethodnoj — preskakanje unapred obično znači da nešto nedostaje.

| # | Feature | Šta se dobija | Zavisi od |
|---|---|---|---|
| **05** | **Admin shell + Configuration** | Levi meni admin panela i ekran za uređivanje taksonomija (oprema, mišići, ciljevi, aktivnosti, zdravstvena stanja) — dodavanje, izmena, redosled, gašenje | 04 |
| **06** | **Vežbe + video** | CRUD vežbi, upload videa direktno u Supabase Storage, potpisani URL za gledanje, admin lista sa filterima | 05 |
| **07** | **Workout builder** | Sklapanje treninga: zagrevanje / grupe sa rundama / smirivanje, reps vs vreme, RPE i tempo, tri nivoa pauze, dinamička polja po opremi, live preview | 06 |
| **08** | **Programi** | Višenedeljni programi — nedelje × dani → treninzi, sa danima odmora | 07 |
| **09** | **Biblioteka za klijenta** | Pretraga i filtriranje vežbi, treninga i programa iz ugla vežbača | 06 |
| **10** | **Workout runner** | Izvođenje treninga: tajmer, runde, pauze, video, beleženje serija i težina | 07 |
| **11** | **Dashboard klijenta** | Bento dashboard — današnji trening, nedeljni raspored, niz odrađenih dana, statistika | 10 |
| **12** | **Polar naplata** | Checkout, customer portal, webhook, `getAccess()`, paywall ekrani, zaključavanje sadržaja | 11 |
| **13** | **Klijenti (admin)** | Lista klijenata, profil, dodela programa, raspored po danima, beleške vidljive samo treneru | 08, 12 |
| **14** | **Moj plan (klijent)** | Kalendar sopstvenih treninga, označavanje kao urađeno, pomeranje termina | 13 |
| **15** | **Napredak** | Merenja, progress fotografije, grafikoni kretanja, niz odrađenih dana | 14 |
| **16** | **Notifikacije** | Notification centar, zakazivanje, ponavljanje, mejl obaveštenja | 13 |
| **17** | **Nalog i podešavanja** | Profil, jedinice mere, jezik, promena lozinke, upravljanje pretplatom | 12 |
| **18** | **Mejl + poliranje** | Resend kao SMTP umesto Supabase mailera, mobilni prolaz kroz sve ekrane, Polar na production | 17 |
| **19** | **Capacitor — mobilna app** | iOS i Android build, push notifikacije, kamera, keep-awake u runneru, deep linkovi | 18 |

### Zašto ovim redosledom

Naplata (12) dolazi tek posle klijentske strane (09–11) jer paywall nema šta da zaključava dok ne postoji sadržaj koji se gleda. Klijenti (13) dolaze posle naplate jer dodela programa ima smisla tek kad postoji pretplatnik. Capacitor (19) je poslednji jer pakuje gotovu aplikaciju — nema svrhe pakovati je dok se ekrani menjaju.

Ako ti neki redosled ne odgovara, reci — nije svet.

---

## Odluke koje su već donete

Da se ne bi ponovo otvarale u svakoj sesiji.

| Odluka | Izbor | Zašto |
|---|---|---|
| Model | Jedan brend, jedan admin | Ti si jedini trener, svi pretplatnici su tvoji klijenti |
| Naplata | Klijent plaća pristup, Polar.sh | — |
| Baza + auth | Supabase | Postgres + Auth + Storage u jednom |
| ORM | Drizzle | Tipovi iz šeme, migracije u gitu |
| Video | Supabase Storage iza `VideoProvider` interfejsa | Prelazak na Mux/Bunny kasnije je nov fajl, ne migracija |
| Hosting | Vercel, auto-deploy sa `main` | — |
| Jezici | sr (podrazumevani), en, ru | — |
| Dizajn | Bento + staklo, plava primarna, tamna podloga | — |

### Šta smo namerno izbacili iz MyFitWorld-a

Marketplace, MFWNet javni feed, Stripe Connect, white-label rebranding, multi-organizacija, Assistant Coach rola, ceo Nutrition modul, skinfold merenja. Sve to služi B2B-SaaS-za-trenere modelu, a ovo nije taj proizvod.

---

## Otvorena pitanja

Ništa od ovoga ne blokira rad, ali će morati odluka pre lansiranja.

1. **Cene.** Trenutno su placeholder — 9.90 € mesečno / 29.90 € za paket sa trenerom, u [`src/lib/pricing.ts`](../src/lib/pricing.ts). Struktura je već u obliku koji Polar vraća, pa zamena ne dira UI.
2. **Naplata na iOS-u.** Apple pravilo 3.1.1 zabranjuje Polar checkout unutar WebView-a. Plan je „reader app" model za prvi release (iOS ne prikazuje cene uopšte), RevenueCat IAP kasnije. Zbog toga `getAccess()` iz feature-a 12 mora ostati apstraktan nad izvorom pretplate.
3. **Limit od 50 MB po videu.** To je plafon Supabase Free plana. Demo klip od 20-30 sekundi staje ako je kompresovan, duži ne. Rešava se Pro planom ili prelaskom na Mux.
4. **Mejl servis.** Supabase-ov ugrađeni mailer šalje 2 mejla na sat i završava u spamu. Ok za test, mora Resend pre pravih korisnika (feature 18).
5. **Domen.** Trenutno `fit-compas.vercel.app`. Pravi domen se kači kad se odluči.
6. **Email šabloni u Supabase-u.** Još nisu prebačeni na `{{ .TokenHash }}` oblik — dok se ne prebace, potvrda mejla radi samo ako se link otvori u istom pregledaču u kom je korisnik kliknuo „Napravi nalog". Uputstvo je u [SUPABASE-SETUP.md](SUPABASE-SETUP.md), korak 4b.

---

## Zamke naučene na teži način

Ovo su stvari koje su već jednom pukle. Vredi ih pročitati pre nego što se dira odgovarajući deo.

**`config.matcher` u Next 16 briše escape sekvence.** Napisano `.*\..*` postaje `.*..*`, što odgovara svakom neprazan putu. Negativni lookahead onda isključi celu aplikaciju, a proxy radi jedino na `/`. Izgleda ispravno jer locale redirect sa `/` i dalje radi. Filtriranje fajlova mora u kod. Kompajlirani matcher se proverava u `.next/server/functions-config-manifest.json`.

**Svaka nova tabela u `public` mora dobiti RLS u istoj migraciji.** Supabase preko PostgREST-a izlaže celu šemu, pa je tabela bez RLS-a čitljiva i upisiva svakome ko ima publishable ključ — a taj ključ po dizajnu ide u browser. Provera pre pušanja:
```bash
curl -H "apikey: $PUBLISHABLE_KEY" "$SUPABASE_URL/rest/v1/<tabela>?select=*"
```
Mora vratiti `[]`.

**`NEXT_PUBLIC_*` promenljive na Vercelu moraju biti Non-sensitive.** Sensitive promenljive nisu dostupne u build fazi, a `NEXT_PUBLIC_*` se ugrađuju u bundle baš tada — pa u runtime-u ispadnu prazne. Tajne koje se čitaju u runtime-u (`SUPABASE_SECRET_KEY`, `DATABASE_URL`) ostaju Sensitive.

**Direktna Postgres konekcija `db.<ref>.supabase.co` je samo IPv6.** Ne radi ni sa Vercela ni sa većine kućnih konekcija — `getaddrinfo ENOTFOUND`. Koriste se pooler adrese: `DATABASE_URL` na portu 6543 za aplikaciju, `DIRECT_URL` na 5432 za migracije. Uz transaction pooler `postgres.js` mora imati `prepare: false`, inače pod opterećenjem izbacuje „prepared statement does not exist".

**`SECURITY DEFINER` menja `current_user` u vlasnika funkcije.** Zbog toga prva verzija zaštite od promene role nije mogla da razlikuje krajnjeg korisnika od migracije u SQL editoru i blokirala je baš onu promociju zbog koje postoji. Guard funkcije koje moraju znati ko je pozivalac ne smeju biti `SECURITY DEFINER`. Funkcije koje treba da zaobiđu RLS (`is_admin`, `handle_new_user`) — moraju.

**`"use server"` fajl sme da izvozi samo async funkcije.** `export const IDLE = {...}` u takvom fajlu je build greška. Tipovi i konstante idu u zaseban fajl.

**Migracija ne sme da rekreira `profiles`.** Ta tabela je vlasništvo `supabase/migrations/0001`, gde dobija FK ka `auth.users` i RLS politike. `CREATE TABLE` iz Drizzle migracije je zakomentarisan.

---

## Komande

```bash
npm run dev          # lokalno, http://localhost:3000 → /sr
npm run build        # mora proći pre svakog push-a
npm run lint

npm run db:generate  # razlika šeme → drizzle/*.sql
npm run db:migrate   # primeni migracije (koristi DIRECT_URL)
npm run db:seed      # taksonomije, idempotentno po slug-u
npm run db:studio    # pregled podataka

vercel deploy --prod --yes   # ručni deploy; inače ide sam sa push-a
vercel env ls production
```

## Struktura

```
src/
  app/[lang]/          rute po jeziku; root layout je ovde
    (auth)/            login, signup, forgot-password, reset-password
    (app)/dashboard    zaštićene rute
  app/api/             route handleri (auth confirm, kasnije Polar webhook)
  components/ui/       Surface, Button, Field, Eyebrow
  components/site/     header, footer, prebacivač jezika
  components/auth/     forme
  components/marketing/
  db/schema/           Drizzle šema
  db/client.ts         konekcija (transaction pooler, prepare:false)
  dictionaries/        sr.json, en.json, ru.json — identično stablo ključeva
  lib/auth/            server akcije, sesija, klasifikacija ruta
  lib/supabase/        browser / server / admin klijent, refresh sesije
  lib/i18n/            konfiguracija i učitavanje rečnika
  proxy.ts             jezik + zaštita ruta
drizzle/               generisane migracije
supabase/migrations/   ručni SQL (profiles, RLS, storage bucketi)
scripts/               migrate.mjs, seed-taxonomy.mjs
docs/                  ovaj fajl i SUPABASE-SETUP.md
```
