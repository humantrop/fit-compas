# Fit Compas — stanje i plan

> **Kako se ovo koristi:** svaka stavka iz tabele „Sledeći koraci" je jedna sesija.
> U novoj sesiji je dovoljno napisati broj — npr. `05` ili „radimo 05" — i taj
> feature se gradi do kraja, commituje i pušuje na live.

**Live:** https://fit-compas.vercel.app · **Repo:** https://github.com/humantrop/fit-compas

Poslednje ažurirano: 21.08.2026. · završen feature 08 — programi

---

## Gde smo sada

| # | Feature | Stanje |
|---|---|---|
| 00 | Infrastruktura — GitHub public repo, Vercel, auto-deploy na push | ✅ |
| 01 | Dizajn sistem + landing stranica | ✅ |
| 02 | i18n — srpski, engleski, ruski | ✅ |
| 03 | Autentikacija — Supabase, prijava/registracija/reset, zaštita ruta | ✅ |
| 04 | Baza — Drizzle šema, taksonomije, RLS | ✅ |
| 05 | Admin shell + Configuration | ✅ |
| 06 | Vežbe + video — CRUD, upload u Storage, potpisani URL | ✅ |
| 08 | Programi — nedelje × dani, dani odmora | ✅ · birač treninga čeka 07 |

### Šta konkretno radi

**Infrastruktura.** Repo je javan. Vercel je povezan sa GitHub-om — svaki push na `main` ide na live za ~30 sekundi, bez ijedne ručne komande. Šest env promenljivih je podešeno u sva tri okruženja (Production, Preview, Development).

**Dizajn.** Tamna mornaričko-plava podloga, električna plava kao primarna, staklene površine, bento raspored. Tokeni su u [`src/app/globals.css`](../src/app/globals.css) kroz Tailwind 4 `@theme`. Sve kartice idu kroz `<Surface>` — nigde ad-hoc `bg-white/5`.

**Jezici.** `app/[lang]` segment, `proxy.ts` bira jezik po redosledu kolačić → `Accept-Language` → srpski. Rečnici su code-split, sva tri imaju identično stablo od 209 ključeva (`npm run check:i18n` to proverava).

**Auth.** Registracija → potvrda mejla → prijava → zaštićena ruta → odjava, sve radi uživo. Postoji i reset lozinke. Greške se vraćaju kao kodovi pa se prevode u rečniku — korisnik vidi srpsku poruku iako Supabase odgovara engleski.

**Baza.** 13 tabela, 6 enuma, PostgreSQL 17.6. Seed: 30 komada opreme, 23 mišićne grupe sa hijerarhijom, 10 ciljeva, 12 aktivnosti, 10 zdravstvenih stanja, 27 metrika po opremi — sve na tri jezika.

**Admin.** `/[lang]/admin` — levi meni sa celim spiskom budućih ekrana (ono što još ne postoji stoji sa oznakom „uskoro“ i ne klikće se), mobilna fioka, `requireAdmin` u layout-u. Konfiguracija uređuje svih pet rečnika: dodavanje, izmena naziva na tri jezika, redosled strelicama, gašenje i vraćanje, nadgrupa kod mišića, izbor mernih vrednosti kod opreme. Pretraga i filter aktivno/ugašeno rade nad učitanom listom.

Dve stvari koje ovaj ekran namerno **ne** radi: ne briše i ne menja skraćenicu. Brisanje bi ili srušilo strani ključ ili kaskadno pojelo oznake na gotovim vežbama, pa ugašena stavka samo nestaje iz svih birača a postojeće oznake ostaju. Skraćenica je ono na šta pokazuju linkovi, seed i sačuvani filteri — preimenovanje je menja jedino ako se to dozvoli, pa se ne dozvoljava.

**Vežbe.** `/[lang]/admin/exercises` — lista sa karticama (poster, težina, način merenja, oznake, status), pretraga po nazivu na sva tri jezika i po skraćenici, i filteri: objavljeno/u izradi, mišićna grupa, oprema, aktivnost, težina, stanje videa. Filteri žive u query stringu, pa je filtrirani prikaz link koji se može poslati i preživljava osvežavanje. Izbor nadgrupe mišića hvata i njene podgrupe — „Leđa“ vraća i sve što je označeno kao „Latisimus“.

Editor uređuje naziv, opis i podsetnik na sva tri jezika kroz jezičke tabove (sva tri su uvek u DOM-u, samo skrivena, pa prebacivanje ne gubi otkucano), težinu, ponavljanja vs vreme, jednostranost i četiri grupe oznaka. Kod mišića zvezdica označava glavni mišić. Skraćenica se izvodi iz srpskog naziva i posle čuvanja se zaključava.

**Video.** Fajl ne prolazi kroz Next server. Browser traži potpisani URL, šalje bajtove pravo u Storage preko `XMLHttpRequest`-a (zbog trake napretka — `fetch` je nema) i tek onda javlja da je gotovo. Poster se hvata iz samog fajla na `<canvas>`, pa se ne plaća transkodovanje. Sve iza `VideoProvider` interfejsa u [`src/lib/video/`](../src/lib/video/) — prelazak na Mux je nova implementacija tog interfejsa i vrednost u koloni `provider`, ne migracija.

Objavljivanje je zasebna akcija, ne polje u formi, jer jedino ono ima uslov: vežba sa videom koji se još šalje ili je pukao ne sme da ode klijentu. Vežba bez videa sme. Gledanje ide kroz `signExerciseVideoAction`, koja već sad zove `getAccess()` — po pravilu iz odeljka ispod, da feature 18 ostane izmena jedne funkcije.

**Programi.** `/[lang]/admin/programs` — lista sa pretragom i filterom objavljeno/u izradi, i editor koji je mreža: nedelje jedna ispod druge, u svakoj `days_per_week` polja. Polje je trening, odmor ili prazno — a prazno i odmor su namerno različita stanja, jer „još nisam odlučio“ nije isto što i „ovaj dan se ne trenira“. Nedelja se dodaje, duplira (sa svim danima i oznakama odmora), pomera strelicama i briše; program se objavljuje i vraća u izradu kao i vežba.

Napravljeno je paralelno sa feature-om 07, pa `program_days.workout_id` nema Drizzle relaciju — pravi strani ključ dodaje migracija čim `public.workouts` postoji, a [`src/lib/programs/workout-source.ts`](../src/lib/programs/workout-source.ts) pita bazu u runtime-u da li ta tabela postoji. Dok ne postoji, birač treninga stoji zaključan uz poruku, a odmor, beleške i cela mreža rade. Kad 07 sleti, birač se popuni sam — bez izmene koda ovde.

---

## Sledeći koraci

Svaka stavka je jedna sesija. Redosled je namerno takav da svaka gradi na prethodnoj — preskakanje unapred obično znači da nešto nedostaje.

| # | Feature | Šta se dobija | Zavisi od |
|---|---|---|---|
| **07** | **Workout builder** | Sklapanje treninga: zagrevanje / grupe sa rundama / smirivanje, reps vs vreme, RPE i tempo, tri nivoa pauze, dinamička polja po opremi, live preview | 06 |
| **09** | **Biblioteka za klijenta** | Pretraga i filtriranje vežbi, treninga i programa iz ugla vežbača | 06 |
| **10** ✅ | **Workout runner** | Izvođenje treninga: tajmer, runde, pauze, video, beleženje serija i težina | 07 |
| **11** | **Dashboard klijenta** | Bento dashboard — današnji trening, nedeljni raspored, niz odrađenih dana, statistika | 10 |
| **12** | **Klijenti (admin)** | Lista klijenata, profil, dodela programa, raspored po danima, beleške vidljive samo treneru | 08 |
| **13** | **Moj plan (klijent)** | Kalendar sopstvenih treninga, označavanje kao urađeno, pomeranje termina | 12 |
| **14** | **Napredak** | Merenja, progress fotografije, grafikoni kretanja, niz odrađenih dana | 13 |
| **15** | **Notifikacije** | Notification centar, zakazivanje, ponavljanje, mejl obaveštenja | 12 |
| **16** | **Nalog i podešavanja** | Profil, jedinice mere, jezik, promena lozinke | 11 |
| **17** | **Mejl + poliranje** | Resend kao SMTP umesto Supabase mailera, mobilni prolaz kroz sve ekrane | 16 |
| **18** | **Polar naplata** | Checkout, customer portal, webhook, popunjavanje `getAccess()`, paywall ekrani, upravljanje pretplatom u nalogu | 17 |
| **19** | **Capacitor — mobilna app** | iOS i Android build, push notifikacije, kamera, keep-awake u runneru, deep linkovi | 18 |

### Zašto ovim redosledom

Prvo se gradi sadržaj (05–08), pa klijentska strana koja ga troši (09–11), pa petlja trener↔klijent (12–15). Naplata je pretposlednja jer paywall nema šta da zaključava dok ne postoji ceo proizvod, a Capacitor je poslednji jer pakuje gotovu aplikaciju — nema svrhe pakovati je dok se ekrani menjaju.

**Posledica toga što naplata ide na kraj, i kako je rešena.** Sve do feature-a 18 aplikacija se pravi bez ijedne provere pristupa. Da se to ostavi tako, feature 18 bi značio vraćanje u desetak gotovih ruta da se doda gating — a to je način na koji zaključavanje završi sa rupama.

Zato [`src/lib/billing/access.ts`](../src/lib/billing/access.ts) **već postoji**. `getAccess()` za sada uvek vraća „ima pristup" (polje `bypassed: true`), ali je zove svaka zaključana ruta od trenutka kad se piše. Feature 18 menja telo te jedne funkcije, ne deset ruta.

> **Pravilo za svaku sesiju od 09 nadalje:** ekran koji prikazuje plaćeni sadržaj mora zvati `getAccess()`, čak i dok ta funkcija svakoga propušta. Ako se preskoči, feature 18 postaje refaktor umesto jedne izmene.

---

### Feature 10 — urađeno, uz jedan šav koji čeka 07

Runner živi na `/{jezik}/workout` — lista treninga i sam ekran izvođenja: tajmer
po satu a ne po otkucajima (zaključan telefon se vraća sa tačnim vremenom), runde,
tri nivoa pauze, video, upis serija i kilaže, nastavak prekinutog treninga i
sažetak sa RPE i beleškom. Ekran drži budnim `wakeLock` dok trening traje.

Pisan je pre feature-a 07, pa plan ne čita iz baze nego kroz šav u
[`src/lib/runner/source.ts`](../src/lib/runner/source.ts). Sada vraća tri ogledna
treninga. **Feature 07: dodati `dbRunnerSource` i vratiti ga iz `getRunnerSource()`
— ništa u `components/runner/` se ne menja.**

Log ide u `workout_sessions` i `set_logs`, sa RLS-om u istoj migraciji
[`supabase/migrations/0010_workout_runner.sql`](../supabase/migrations/0010_workout_runner.sql)
(primenjena na živu bazu, PostgREST provera vraća `[]`). Totali se ne sabiraju u
hodu nego se preračunavaju iz redova, pa dvaput poslata serija ne broji duplo.

Dve stvari su namerno odvojene dok paralelne sesije ne slegnu, obe objašnjene na
mestu: tabele nisu izvezene iz `src/db/schema/index.ts`, a prevodi runnera su u
`src/dictionaries/runner/*.json` umesto u tri glavna rečnika.

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

1. **Cene.** Trebaju tek za feature 18. Trenutno su placeholder — 9.90 € mesečno / 29.90 € za paket sa trenerom, u [`src/lib/pricing.ts`](../src/lib/pricing.ts). Struktura je već u obliku koji Polar vraća, pa zamena ne dira UI.
2. **Naplata na iOS-u.** Apple pravilo 3.1.1 zabranjuje Polar checkout unutar WebView-a. Plan je „reader app" model za prvi release (iOS ne prikazuje cene uopšte), RevenueCat IAP kasnije. Zbog toga `getAccess()` mora ostati apstraktan nad *izvorom* pretplate — RevenueCat webhook kasnije piše u istu `subscriptions` tabelu i funkcija ne sme da zna koji je od ta dva.
3. **Limit od 50 MB po videu.** To je plafon Supabase Free plana. Demo klip od 20-30 sekundi staje ako je kompresovan, duži ne. Rešava se Pro planom ili prelaskom na Mux.
4. **Mejl servis.** Supabase-ov ugrađeni mailer šalje 2 mejla na sat i završava u spamu. Ok za test, mora Resend pre pravih korisnika (feature 17).
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

**Stranica ispod `[lang]` se prerenderuje i kad nema šta da se prerenderuje.** Roditeljski `app/[lang]/layout.tsx` ima `generateStaticParams`, pa build pokušava da unapred izgradi i `/sr/admin/configuration` — bez sesije, bez zahteva, ali sa pozivom ka bazi. Radnik onda visi dok ne istekne 60 sekundi i build pukne. `cookies()` u layout-u to ne spreči jer se stranica renderuje kao zaseban segment. Rešenje je `await connection()` iz `next/server` na vrhu **svake** takve stranice, ne u layout-u. `export const dynamic` više nije u dokumentovanom spisku opcija za segment u Next 16.

**Seed ne sme da prepiše ono što admin uredi.** Prva verzija `seed-taxonomy.mjs` je na `on conflict` upisivala i `position`, pa bi ponovno pokretanje seeda zbog ispravke jednog prevoda poništilo sav ručno podešen redosled. Sada se `position` i `is_active` postavljaju samo pri prvom umetanju; naziv se i dalje osvežava, jer je seed izvor istine za prevode.

**`"use server"` fajl sme da izvozi samo async funkcije.** `export const IDLE = {...}` u takvom fajlu je build greška. Tipovi i konstante idu u zaseban fajl.

**Migracija ne sme da rekreira `profiles`.** Ta tabela je vlasništvo `supabase/migrations/0001`, gde dobija FK ka `auth.users` i RLS politike. `CREATE TABLE` iz Drizzle migracije je zakomentarisan.

---

## Komande

```bash
npm run dev          # lokalno, http://localhost:3000 → /sr
npm run build        # mora proći pre svakog push-a
npm run lint
npm run check:i18n   # sva tri rečnika moraju imati isto stablo ključeva

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
    admin/             admin panel; layout radi requireAdmin
  app/api/             route handleri (auth confirm, kasnije Polar webhook)
  components/ui/       Surface, Button, Field, Eyebrow
  components/admin/    admin shell, editor taksonomija
  components/site/     header, footer, prebacivač jezika
  components/auth/     forme
  components/marketing/
  db/schema/           Drizzle šema
  db/client.ts         konekcija (transaction pooler, prepare:false)
  dictionaries/        sr.json, en.json, ru.json — identično stablo ključeva
  lib/auth/            server akcije, sesija, klasifikacija ruta
  lib/taxonomy/        rečnici: definicije, upiti, server akcije
  lib/supabase/        browser / server / admin klijent, refresh sesije
  lib/i18n/            konfiguracija i učitavanje rečnika
  proxy.ts             jezik + zaštita ruta
drizzle/               generisane migracije
supabase/migrations/   ručni SQL (profiles, RLS, storage bucketi)
scripts/               migrate.mjs, seed-taxonomy.mjs, check-dictionaries.mjs
docs/                  ovaj fajl i SUPABASE-SETUP.md
```
