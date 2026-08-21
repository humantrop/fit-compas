# Fit Compas — stanje i plan

> **Kako se ovo koristi:** svaka stavka iz tabele „Sledeći koraci" je jedna sesija.
> U novoj sesiji je dovoljno napisati broj — npr. `05` ili „radimo 05" — i taj
> feature se gradi do kraja, commituje i pušuje na live.

**Live:** https://fit-compas.vercel.app · **Repo:** https://github.com/humantrop/fit-compas

Poslednje ažurirano: 21.08.2026. · završen feature 12 — klijenti u adminu
(05–11 su stigli paralelno, svaki iz svoje sesije)

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
| 07 | Workout builder — blokovi sa rundama, tri nivoa pauze, live preview | ✅ |
| 08 | Programi — nedelje × dani, dani odmora | ✅ · birač treninga radi otkad je 07 stigao |
| 09 | Biblioteka za klijenta — pretraga i filteri | ✅ · police za treninge i programe još nisu upaljene |
| 10 | Workout runner — tajmer, runde, pauze, log serija | ✅ · vozi demo planove, ne treninge iz baze |
| 11 | Dashboard klijenta — danas, nedelja, niz, statistika | ✅ · raspored čeka 12/13 |
| 12 | Klijenti — lista, profil, dodela programa, raspored, beleške | ✅ |

### Šta konkretno radi

**Infrastruktura.** Repo je javan. Vercel je povezan sa GitHub-om — svaki push na `main` ide na live za ~30 sekundi, bez ijedne ručne komande. Šest env promenljivih je podešeno u sva tri okruženja (Production, Preview, Development).

**Dizajn.** Tamna mornaričko-plava podloga, električna plava kao primarna, staklene površine, bento raspored. Tokeni su u [`src/app/globals.css`](../src/app/globals.css) kroz Tailwind 4 `@theme`. Sve kartice idu kroz `<Surface>` — nigde ad-hoc `bg-white/5`.

**Jezici.** `app/[lang]` segment, `proxy.ts` bira jezik po redosledu kolačić → `Accept-Language` → srpski. Rečnici su code-split, sva tri imaju identično stablo od 328 ključeva (`npm run check:i18n` to proverava).

**Auth.** Registracija → potvrda mejla → prijava → zaštićena ruta → odjava, sve radi uživo. Postoji i reset lozinke. Greške se vraćaju kao kodovi pa se prevode u rečniku — korisnik vidi srpsku poruku iako Supabase odgovara engleski.

**Baza.** 18 tabela, 8 enuma, PostgreSQL 17.6. Seed: 30 komada opreme, 23 mišićne grupe sa hijerarhijom, 10 ciljeva, 12 aktivnosti, 10 zdravstvenih stanja, 27 metrika po opremi — sve na tri jezika.

**Admin.** `/[lang]/admin` — levi meni sa celim spiskom budućih ekrana (ono što još ne postoji stoji sa oznakom „uskoro“ i ne klikće se), mobilna fioka, `requireAdmin` u layout-u. Konfiguracija uređuje svih pet rečnika: dodavanje, izmena naziva na tri jezika, redosled strelicama, gašenje i vraćanje, nadgrupa kod mišića, izbor mernih vrednosti kod opreme. Pretraga i filter aktivno/ugašeno rade nad učitanom listom.

Dve stvari koje ovaj ekran namerno **ne** radi: ne briše i ne menja skraćenicu. Brisanje bi ili srušilo strani ključ ili kaskadno pojelo oznake na gotovim vežbama, pa ugašena stavka samo nestaje iz svih birača a postojeće oznake ostaju. Skraćenica je ono na šta pokazuju linkovi, seed i sačuvani filteri — preimenovanje je menja jedino ako se to dozvoli, pa se ne dozvoljava.

**Vežbe.** `/[lang]/admin/exercises` — lista sa karticama (poster, težina, način merenja, oznake, status), pretraga po nazivu na sva tri jezika i po skraćenici, i filteri: objavljeno/u izradi, mišićna grupa, oprema, aktivnost, težina, stanje videa. Filteri žive u query stringu, pa je filtrirani prikaz link koji se može poslati i preživljava osvežavanje. Izbor nadgrupe mišića hvata i njene podgrupe — „Leđa“ vraća i sve što je označeno kao „Latisimus“.

Editor uređuje naziv, opis i podsetnik na sva tri jezika kroz jezičke tabove (sva tri su uvek u DOM-u, samo skrivena, pa prebacivanje ne gubi otkucano), težinu, ponavljanja vs vreme, jednostranost i četiri grupe oznaka. Kod mišića zvezdica označava glavni mišić. Skraćenica se izvodi iz srpskog naziva i posle čuvanja se zaključava.

**Video.** Fajl ne prolazi kroz Next server. Browser traži potpisani URL, šalje bajtove pravo u Storage preko `XMLHttpRequest`-a (zbog trake napretka — `fetch` je nema) i tek onda javlja da je gotovo. Poster se hvata iz samog fajla na `<canvas>`, pa se ne plaća transkodovanje. Sve iza `VideoProvider` interfejsa u [`src/lib/video/`](../src/lib/video/) — prelazak na Mux je nova implementacija tog interfejsa i vrednost u koloni `provider`, ne migracija.

Objavljivanje je zasebna akcija, ne polje u formi, jer jedino ono ima uslov: vežba sa videom koji se još šalje ili je pukao ne sme da ode klijentu. Vežba bez videa sme. Gledanje ide kroz `signExerciseVideoAction`, koja već sad zove `getAccess()` — po pravilu iz odeljka ispod, da feature 18 ostane izmena jedne funkcije.

**Treninzi.** `/[lang]/admin/workouts` — lista sa pretragom i filterom objavljeno / u izradi, i builder na `/workouts/<id>`.

Trening ima tri nivoa: **trening → blok → linija**. Blok je zagrevanje, rad ili smirivanje; broj rundi stoji na bloku, pa je kružni trening samo blok sa tri runde, bez posebne tabele za to. Linija je jedna vežba: reps ili vreme, broj serija, RPE (dozvoljene su polovine — 7.5 je stvarna preporuka), tempo u obliku `3-1-1-0`, i napomena.

**Tri nivoa pauze**, svaki tamo gde i pripada: između serija stoji na liniji, između rundi i posle bloka stoje na bloku.

**Dinamička polja po opremi** nisu nigde ukucana. Linija čija vežba ide na traku za trčanje traži nagib, brzinu, tempo i razdaljinu; linija sa šipkom traži težinu. To se izvodi iz `vežba → oprema → equipment_metrics`, a sve tri se uređuju iz Konfiguracije — dodaš spravi metriku i ona se pojavi u builderu, bez ijedne izmene u kodu.

**Live preview** ispod forme prikazuje trening onako kako će ga videti klijent, i menja se dok kucaš. Lepljiva traka na vrhu drži trajanje, broj blokova, vežbi i serija. Trajanje se ne kuca — računa ga [`src/lib/workouts/estimate.ts`](../src/lib/workouts/estimate.ts), isti kod i u pregledu i pri čuvanju, pa kartica i builder ne mogu da pokažu različit broj. Jednostrane vežbe se broje dvaput.

Čuvanje briše i ponovo upisuje sve blokove i linije u jednoj transakciji. Diff ovde ništa ne bi kupio — trening je nekoliko desetina redova, uređuje ga jedna osoba, a ovako je i promena redosleda besplatna: pozicija je prosto indeks u nizu.

Građen je paralelno sa 06, na grani, pa builder čita `exercises` direktno i ne dira nijedan fajl koji 06 nosi. Birač vežbi prikazuje prazno stanje sve dok u biblioteci nema nijedne vežbe.

**Programi.** `/[lang]/admin/programs` — lista sa pretragom i filterom objavljeno/u izradi, i editor koji je mreža: nedelje jedna ispod druge, u svakoj `days_per_week` polja. Polje je trening, odmor ili prazno — a prazno i odmor su namerno različita stanja, jer „još nisam odlučio“ nije isto što i „ovaj dan se ne trenira“. Nedelja se dodaje, duplira (sa svim danima i oznakama odmora), pomera strelicama i briše; program se objavljuje i vraća u izradu kao i vežba.

Napravljeno je paralelno sa feature-om 07, pa `program_days.workout_id` nema Drizzle relaciju — pravi strani ključ dodaje migracija čim `public.workouts` postoji, a [`src/lib/programs/workout-source.ts`](../src/lib/programs/workout-source.ts) pita bazu u runtime-u da li ta tabela postoji. Dok ne postoji, birač treninga stoji zaključan uz poruku, a odmor, beleške i cela mreža rade. Kad 07 sleti, birač se popuni sam — bez izmene koda ovde.

**Biblioteka.** `/[lang]/library` — isti katalog iz ugla vežbača. Prikazuje samo objavljeno; nacrt sa videom koji se još šalje ne postoji za klijenta ni kroz filter ni kroz pogođenu skraćenicu. Filtriranje ide po opremi, mišićnoj grupi, cilju, aktivnosti i težini — unutar jedne grupe uslovi se sabiraju, između grupa presecaju, kao u prodavnici. Ponuđene su samo oznake koje stvarno stoje na nekoj objavljenoj vežbi, sa brojem pored, a ne ceo rečnik; nadgrupa mišića hvata i podgrupe. Sve stanje je u query stringu, pa je filtriran prikaz link, a `Nazad` znači nešto. Lista je serverska komponenta — jedina klijentska je panel sa filterima, koji samo prepisuje URL.

Police za treninge i programe stoje uz poruku „uskoro“, jer 07 i 08 nose svoje tabele. Ekran je zato pisan nad [`src/lib/library/sources.ts`](../src/lib/library/sources.ts), a ne nad tri skupa tabela — paljenje police je izmena dva reda u tom fajlu, ostalo se ne dira.

`getAccess()` se zove u layout-u biblioteke, ne u svakoj stranici. Time je pravilo iz odeljka ispod strukturno: zaključanom čitaocu se `children` uopšte ne renderuje, pa se ni upiti ne izvrše, i nova stranica pod `/library` ne može da zaboravi proveru.

Tekst ove sekcije je u [`src/lib/library/copy/`](../src/lib/library/copy/) kao tipizovani moduli, ne u tri zajednička rečnika: TypeScript tako odbija jezik kome fali ključ, što `npm run check:i18n` hvata tek kad se pokrene.

**Dashboard.** `/[lang]/dashboard` — bento početni ekran klijenta. Gore stoji jedna kartica koja odgovara na „šta sad“: nedovršen trening ako ga ima, pa „odrađeno za danas“, pa ono što plan kaže za danas, pa — dok plana nema — predlog koji se pokreće odmah. Uz nju idu niz odrađenih dana, traka nedelje od ponedeljka, poslednji treninzi i brojke u tri prozora (7 dana, 30 dana, ukupno).

Ništa od toga nema svoju tabelu. Sve se izvodi iz `workout_sessions`, koje runner ionako piše, pa dashboard i runner ne mogu da se raziđu oko istog broja. Jedino što se ne može izvesti jeste šta je trener *planirao* — dodela programa je feature 12, kalendar je 13 — pa to ide kroz šav [`src/lib/dashboard/schedule-source.ts`](../src/lib/dashboard/schedule-source.ts) i dok ga nema piše „plan još nije dodeljen“. Prazna nedelja bez objašnjenja izgleda kao kvar, a nije.

Dan odmora i prazan dan su i ovde namerno različita stanja, isto kao u editoru programa: reći klijentu „danas se odmara“ kad to niko nije rekao je uputstvo za trening koje je aplikacija izmislila.

Sve se broji po kalendarskom danu u *čitaočevoj* vremenskoj zoni, ne u UTC-u. Server ne zna gde je čitalac, pa je pregledač jednom upiše u kolačić `fc-tz`, a grupisanje po danima radi Postgres kroz `at time zone`. Bez toga trening u 23:30 pada u sutrašnji dan i niz pukne bez razloga. Feature 14 treba da čita istu zonu za svoje grafikone.

**Klijenti.** `/[lang]/admin/clients` — spisak svih koji imaju nalog, sa pretragom po imenu i mejlu i filterima: sa planom, bez plana, utihnuli (bez odrađenog treninga 14 dana). U redu stoji plan na kom je klijent, kada je poslednji put trenirao i koliko beleški o njemu postoji. Mejl i vreme poslednje prijave dolaze iz `auth.users`, koju Supabase poseduje — čita se kroz običan SQL i nikad se ne prijavljuje Drizzle šemi, jer bi drizzle-kit onda pokušao da je menja. Ta tri izvora (profil, `auth.users`, `workout_sessions`) čitaju se odvojenim upitima namerno: ako jedan otkaže, gubi se kolona, a ne ceo ekran.

Na profilu klijenta stoje četiri stvari: plan, raspored, beleške i log treninga.

**Dodela plana** je jedan red u `client_assignments`: koji program, od kog dana, i u kom je stanju (aktivan, pauziran, završen, prekinut). Nema materijalizovanog kalendara — dan N posle početka je nedelja `floor(N / days_per_week)`, polje `N mod days_per_week`, i to je cela računica. Zato pomeranje celog plana za tri dana menja jedan datum umesto 84 reda, i zato raspored ne može da se raziđe sa programom na koji pokazuje. Delimičan `unique` indeks drži pravilo „jedan živ plan po klijentu" u bazi, a ne u akciji. Pauza pamti dan kad je uvedena: kad se plan vrati, početak se pomeri za tačno onoliko dana koliko je pauza trajala — inače bi dve nedelje odmora ostavile klijenta dve nedelje iza sopstvenog plana.

**Raspored** je plan položen na prave datume, sa onim što se stvarno desilo pored: tri dana unazad i dve nedelje unapred, sa oznakom da li je taj dan odrađen. Runner beleži trening po skraćenici (`workout_ref`), pa sesija na pravi dan mora biti i pravi trening da bi se računala kao ispunjen plan; bilo koji drugi trening tog dana prikazuje se kao „trenirao, ali drugi trening" — što je druga, i tačna, stvar. Dan odmora i prazan dan su i ovde različita stanja, kao u editoru programa.

**Beleške** su jedina stvar u aplikaciji koju subjekt ne sme da vidi. `client_notes` nema nijednu RLS politiku za vlasnika reda — samo za admina — i nijedan klijentski ekran je ne dodiruje. Odsustvo politike je ovde pravilo, ne propust, i zato na ekranu piše „vidiš samo ti": trener piše iskrenu verziju samo ako zna da je iskrena verzija privatna.

Brojke o treningu ne vode se nigde posebno — čitaju se iz `workout_sessions`, iz istog reda iz kog klijent gleda svoj dashboard, pa dva ekrana ne mogu da se posvađaju oko istog broja.

Sve to nosi migracija [`supabase/migrations/0012_clients.sql`](../supabase/migrations/0012_clients.sql), pisana ručno da bi RLS stigao u istoj migraciji koja pravi tabele (provera preko PostgREST-a vraća `[]`, a upis anon ključem `42501`). Tabele su u `src/db/schema/clients.ts` i još nisu izvezene iz `schema/index.ts` — isti dogovor koji drži i runner, dok paralelne sesije ne slegnu. Tekst ekrana je u [`src/lib/clients/copy/`](../src/lib/clients/copy/), tipizovan, iz istog razloga iz kog i biblioteka ima svoj.

**Feature 13 nasleđuje gotovu računicu.** [`src/lib/clients/schedule.ts`](../src/lib/clients/schedule.ts) je čist modul bez servera: `planDayFor`, `planRange` i `planProgress` prevode „nedelja 3, dan 2" u „četvrtak, 9." Kalendar klijenta i `dbScheduleSource` iz [`src/lib/dashboard/schedule-source.ts`](../src/lib/dashboard/schedule-source.ts) treba da ga pozovu nad aktivnim redom iz `client_assignments`, a ne da pišu svoju verziju — dva različita računa istog dana su način na koji trener i klijent vide različit raspored.

**Ljuska klijentskog dela.** Feature 09 i 10 su imali svako svoje zaglavlje, uz napomenu da 11 pravi pravo — evo ga: [`src/components/app/app-shell.tsx`](../src/components/app/app-shell.tsx), sa linkovima u zaglavlju na širokom ekranu i donjom trakom sa tabovima na telefonu. `library-chrome.tsx` i `runner-shell.tsx` su obrisani, a biblioteka i runner sada idu kroz njega. I dalje je komponenta a ne `layout.tsx` u grupi ruta: runner je jedini ekran koji traku sa tabovima **ne** sme da ima, jer je promašen dodir usred serije prekinut trening — to je `tabs={false}`, a ne druga grupa ruta.

---

## Sledeći koraci

Svaka stavka je jedna sesija. Redosled je namerno takav da svaka gradi na prethodnoj — preskakanje unapred obično znači da nešto nedostaje.

| # | Feature | Šta se dobija | Zavisi od |
|---|---|---|---|
| **10** ✅ | **Workout runner** | Izvođenje treninga: tajmer, runde, pauze, video, beleženje serija i težina | 07 |
| **12** ✅ | **Klijenti (admin)** | Lista klijenata, profil, dodela programa, raspored po danima, beleške vidljive samo treneru | 08 |
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

**Više sesija radi u istom radnom folderu, pa je `git` indeks zajednički.** Ako
sesija uradi `git add`, a druga u međuvremenu commituje, u komit ode i tuđ
nedovršen rad. Gore od toga: stablo napravljeno od starog `HEAD`-a pa
commitovano na novi obriše sve što je u međuvremenu sletelo — tako je 24f292c
pojeo ceo feature 10, a b291873 ga vratio. Recept koji radi:

```bash
export GIT_INDEX_FILE=/tmp/idx          # svoj indeks, ne dira zajednički
PARENT=$(git rev-parse refs/heads/main) # roditelj se čita TU, ne ranije
git read-tree "$PARENT"
git update-index --add --cacheinfo 100644,<blob>,<putanja>   # samo svoji fajlovi
git update-ref refs/heads/main "$(git commit-tree ...)" "$PARENT"  # CAS
```

Poslednji red je ključan: `git update-ref` sa očekivanom starom vrednošću
odbije da pomeri granu ako je neko drugi u međuvremenu commitovao.

**Zajednički fajl se sme commitovati samo kao „HEAD + moja izmena".** Rečnici,
`db/schema/index.ts`, `admin-shell.tsx` i ROADMAP menja svaka sesija. Radna
kopija tog fajla u datom trenutku sadrži i tuđe nedovršene izmene, pa se
sadržaj za komit pravi tako što se `git show HEAD:<fajl>` ponovo obradi. Izmena
mora ostati i u radnoj kopiji — ako se samo stage-uje, sledeća sesija je
commitom vrati unazad.

**Broj migracije se rezerviše po broju feature-a.** `drizzle/0008_programs.sql`,
`supabase/migrations/0010_workout_runner.sql`. Dve sesije koje istovremeno
puste `db:generate` obe dobiju `0002_*.sql`. Drizzle primenjuje migracije redom
iz `_journal.json`, ne po imenu, pa rupa u numeraciji ništa ne košta.

**`rm -rf` na Windows junction-u briše ono na šta pokazuje.** Junction ka
`node_modules` napravljen radi izolovanog builda je pri brisanju odneo pravi
`node_modules` i zaustavio sve sesije. Vraća se sa `npm ci`; junction se briše
sa `rmdir` (bez `-r`).


**`sr-RS` u `Intl`-u daje ćirilicu.** Ceo UI je latinica, a svaki `Intl.DateTimeFormat` je ispisivao „петак, 21. август“. ICU za goli `sr-RS` bira ćirilično pismo — tag mora nositi i pismo, `sr-Latn-RS`. Brojevi i pravila za množinu su identična, menja se samo pismo. Ispravljeno u `localeTags`, pa važi i za biblioteku i za runner.

**Modul koji uvozi `next/headers` ne sme da dođe do klijentske komponente.** Čitanje kolačića i naziv tog kolačića su bili u istom fajlu; klijentski `TimezoneProbe` je uvezao samo konstantu i time povukao `next/headers` u browser bundle, a build je pukao. Konstante idu u fajl odvojen od serverskog čitanja (`timezone.ts` naspram `timezone-server.ts`).

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

**Drizzle umotava greške iz drajvera.** `catch (error) { error.code === "23505" }` nikad ne pogodi — u drizzle-orm 0.45 stiže `DrizzleQueryError`, a pravi `PostgresError` sa SQLSTATE kodom visi na `error.cause`. Bez odmotavanja svaki prekršaj ograničenja izađe kao „nepoznata greška", pa korisnik dobije „pokušaj ponovo" na duplikat skraćenice — do kraja sveta. Rešeno u [`src/lib/workouts/actions.ts`](../src/lib/workouts/actions.ts) funkcijom `pgErrorCode`, koja prošeta lanac `cause`. **Isti obrazac postoji i u `src/lib/taxonomy/actions.ts` iz feature-a 05 i tamo još nije popravljen.**

**Unutar `` sql`` `` šablona Drizzle ispušta kvalifikator tabele.** `` sql`... where ${a.workoutId} = ${b.id}` `` se renderuje kao `where "workout_id" = "id"`, a ne kao `where "a"."workout_id" = "b"."id"`. U korelisanom podupitu to je `column reference "id" is ambiguous` — greška koja se vidi tek u runtime-u, jer se tip poklapa. U podupitima idu ispisana imena tabela i sopstveni aliasi, ne interpolacija.

**Drizzle veže JS niz kao jedan parametar.** `` sql`... where id = any(${ids}::uuid[])` `` izgleda ispravno i tipovi se poklapaju, ali Postgres dobije ceo niz kao jednu vrednost i vrati `malformed array literal: "6d6f94da-…"`. Pogađa svaki upit koji filtrira po listi id-jeva, i vidi se tek u runtime-u. Umesto toga ide `in (...)` sa po jednim placeholderom po vrednosti — `sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)` — čime svaka vrednost ostaje vezana, a ne interpolirana. Primer je `idList()` u [`src/lib/clients/queries.ts`](../src/lib/clients/queries.ts).

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
    workouts/          lista, builder, birač vežbi, live preview
  components/site/     header, footer, prebacivač jezika
  components/auth/     forme
  components/marketing/
  db/schema/           Drizzle šema
  db/client.ts         konekcija (transaction pooler, prepare:false)
  dictionaries/        sr.json, en.json, ru.json — identično stablo ključeva
  lib/auth/            server akcije, sesija, klasifikacija ruta
  lib/taxonomy/        rečnici: definicije, upiti, server akcije
  lib/workouts/        builder: zod šema, upiti, akcije, procena trajanja
  lib/supabase/        browser / server / admin klijent, refresh sesije
  lib/i18n/            konfiguracija i učitavanje rečnika
  proxy.ts             jezik + zaštita ruta
drizzle/               generisane migracije
supabase/migrations/   ručni SQL (profiles, RLS, storage bucketi)
scripts/               migrate.mjs, seed-taxonomy.mjs, check-dictionaries.mjs
docs/                  ovaj fajl i SUPABASE-SETUP.md
```
