import type { NotificationsCopy } from "./types";

/** Serbian is the source text; `en` and `ru` are typed against this shape. */
export const sr: NotificationsCopy = {
  metaTitle: "Obaveštenja",
  title: "Obaveštenja",
  subtitle:
    "Poruka klijentima — odmah, zakazano ili svake nedelje u isto vreme. Stiže u aplikaciju, a po izboru i na mejl.",
  setup:
    "Tabele za obaveštenja još ne postoje u bazi. Pokreni ovu migraciju u Supabase SQL editoru:",

  compose: {
    heading: "Nova poruka",
    kindLabel: "Vrsta",
    kinds: {
      announcement: "Obaveštenje",
      reminder: "Podsetnik",
    },
    kindHint:
      "Razlika je samo u tome kako se čita — podsetnik nosi ikonicu sata, obaveštenje zvonce.",

    languageHint:
      "Piši na sva tri jezika. Klijent dobija onaj koji mu je podešen; ako prevod nedostaje, ide srpski.",
    titleLabel: "Naslov",
    titlePlaceholder: "Novi plan te čeka",
    bodyLabel: "Tekst",
    bodyPlaceholder:
      "Ubacio sam ti nedelju sa više nogu. Kreni u ponedeljak, javi kako ide.",
    fallbackNote: "Prazan prevod se popunjava srpskim.",

    hrefLabel: "Vodi na",
    hrefHint: "Gde klijent stiže kad klikne na obaveštenje.",
    hrefTargets: {
      "": "Nigde",
      "/dashboard": "Danas",
      "/plan": "Moj plan",
      "/workout": "Treninzi",
      "/library": "Biblioteka",
      "/progress": "Napredak",
    },

    audienceLabel: "Kome",
    audiences: {
      all: "Svim klijentima",
      active_plan: "Onima koji imaju plan",
      no_plan: "Onima bez plana",
      idle: "Onima koji su utihnuli",
      one: "Jednom klijentu",
    },
    audienceHint:
      "Pravilo, ne spisak — „utihnuli“ svake nedelje znači druge ljude, a to je i poenta.",
    clientLabel: "Klijent",
    clientEmpty: "Još nema nijednog klijenta.",

    whenLabel: "Kada",
    when: {
      now: "Odmah",
      once: "Jednom, kasnije",
      daily: "Svaki dan",
      weekly: "Odabranim danima",
    },
    dateLabel: "Datum",
    timeLabel: "Vreme",
    zoneNote: "Po tvojoj zoni ({zone}).",
    weekdaysLabel: "Dani",
    weekdays: ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"],
    startsLabel: "Od",
    endsLabel: "Do",
    endsHint: "Ostavi prazno da ide dok ga ne zaustaviš.",

    emailLabel: "Pošalji i na mejl",
    emailHint: "Uz obaveštenje u aplikaciji stiže i mejl.",

    previewLabel: "Prvo slanje",
    previewNone: "Ovaj raspored nema nijedno slanje.",

    submitNow: "Pošalji",
    submitSchedule: "Zakaži",
    saving: "Šaljem…",
    reset: "Isprazni",
  },

  list: {
    heading: "Poslato i zakazano",
    empty: "Još nema nijedne poruke.",
    emptyHint:
      "Napravi je gore. Zakazane stoje ovde dok im ne dođe vreme, a posle svakog slanja piše koliko je ljudi dobilo.",

    statuses: {
      scheduled: "Zakazano",
      paused: "Pauzirano",
      sent: "Poslato",
      cancelled: "Otkazano",
    },
    audienceOne: "Za {name}",

    scheduleOnce: "Jednom",
    scheduleAt: "u {time}",
    scheduleDaily: "Svaki dan u {time}",
    scheduleWeekly: "{days} u {time}",

    next: "Sledeće",
    lastRun: "Poslednji put",
    never: "Nijednom",
    runs: {
      one: "{n} slanje",
      few: "{n} slanja",
      other: "{n} slanja",
    },
    delivered: {
      one: "{n} klijent",
      few: "{n} klijenta",
      other: "{n} klijenata",
    },
    readOf: "{read} pročitalo",
    email: "Mejl",
    emailOffLabel: "Bez mejla",

    sendNow: "Pošalji sad",
    sending: "Šaljem…",
    pause: "Pauziraj",
    resume: "Nastavi",
    remove: "Obriši",
    confirmRemove:
      "Obrisati raspored? Obaveštenja koja su već stigla klijentima ostaju kod njih.",

    checkNow: "Proveri raspored",
    checking: "Proveravam…",
    sentToast: {
      one: "Stiglo do {n} klijenta.",
      few: "Stiglo do {n} klijenta.",
      other: "Stiglo do {n} klijenata.",
    },
  },

  mail: {
    heading: "Mejl",
    configured: "Mejl je podešen — poruke sa uključenim mejlom idu i tamo.",
    missing: "Mejl još nije podešen.",
    missingHint:
      "Bez `RESEND_API_KEY` obaveštenja stižu samo u aplikaciju. Feature 17 uključuje pravi mejl servis.",
  },

  errors: {
    not_admin: "Nemaš pravo na ovu izmenu.",
    not_found: "Poruka ne postoji.",
    title_required: "Naslov na srpskom je obavezan.",
    body_too_long: "Tekst je predugačak.",
    invalid_time: "Vreme nije ispravno.",
    invalid_date: "Datum nije ispravan.",
    no_weekdays: "Izaberi bar jedan dan.",
    recipient_missing: "Izaberi klijenta.",
    past_date: "Taj trenutak je već prošao.",
    unknown: "Nešto nije uspelo. Pokušaj ponovo.",
  },

  inbox: {
    metaTitle: "Obaveštenja",
    title: "Obaveštenja",
    subtitle: "Poruke od trenera i sve što je aplikacija imala da ti javi.",
    bell: "Obaveštenja",
    empty: "Nemaš nijedno obaveštenje.",
    emptyHint: "Kad ti trener nešto pošalje ili dobiješ novi plan, pojaviće se ovde.",
    unavailable: "Obaveštenja trenutno nisu dostupna.",
    unreadBadge: {
      one: "{n} novo",
      few: "{n} nova",
      other: "{n} novih",
    },
    markAll: "Označi sve kao pročitano",
    marking: "Čuvam…",
    allRead: "Sve je pročitano.",
    open: "Otvori",
    unreadDot: "Nepročitano",
    kinds: {
      announcement: "Obaveštenje",
      reminder: "Podsetnik",
      plan: "Plan",
      system: "Sistem",
    },
  },

  email: {
    subjectPrefix: "Fit Compas ·",
    openLabel: "Otvori u aplikaciji",
    footer: "fit-compas.vercel.app",
    reason: "Dobijaš ovaj mejl jer treniraš sa nama i tvoj trener ti je poslao poruku.",
  },
};
