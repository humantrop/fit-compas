import type { PlanCopy } from "./types";

/** Serbian is the source of truth — `en` and `ru` are typed against it. */
export const sr: PlanCopy = {
  meta: {
    title: "Moj plan",
    description:
      "Kalendar tvojih treninga: šta je za koji dan, šta je odrađeno i kako da pomeriš termin.",
  },

  title: "Moj plan",
  subtitle: "Tvoj program, položen na prave datume.",

  access: {
    title: "Pretplata nije aktivna",
    body: "Tvoj pristup treninzima je istekao. Obnovi pretplatu da nastaviš tamo gde si stao.",
  },

  empty: {
    title: "Plan još nije dodeljen",
    body: "Kad ti trener dodeli program, ovde stoji ceo kalendar — koji trening kog dana, šta je odrađeno i šta sledi. Do tada biraj sam iz treninga.",
    action: "Pogledaj treninge",
  },

  header: {
    eyebrow: "Program",
    progress: "Nedelja {week} od {total}",
    dayOf: "Dan {day}",
    percent: "{percent}% pređeno",
    starts: "Počinje {date}",
    ends: "Završava se {date}",
    notStarted: "Plan još nije počeo.",
    finished: "Plan je odrađen do kraja.",
    paused: "Plan je pauziran. Kad ga trener vrati, datumi se pomeraju za onoliko dana koliko je pauza trajala.",
    weeks: {
      one: "{n} nedelja",
      few: "{n} nedelje",
      other: "{n} nedelja",
    },
  },

  calendar: {
    weekdays: ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"],
    previous: "Prethodni mesec",
    next: "Sledeći mesec",
    today: "Danas",
    legend: {
      workout: "Trening",
      done: "Odrađeno",
      rest: "Odmor",
      moved: "Pomereno",
      today: "Danas",
    },
  },

  day: {
    kinds: {
      workout: "Trening",
      rest: "Dan odmora",
      open: "Slobodan dan",
      before: "Pre početka plana",
      after: "Posle kraja plana",
    },
    restBody: "Danas se ne trenira. Odmor je deo plana, ne pauza od njega.",
    openBody: "Za ovaj dan plan nema ništa. Ako ti se trenira, izaberi trening sam.",
    beforeBody: "Ovaj dan je pre nego što plan počne.",
    afterBody: "Ovaj dan je posle poslednjeg dana plana.",

    context: "Nedelja {week} · Dan {day}",

    movedFrom: "Pomereno sa {date}",
    movedTo: "Pomereno na {date}",

    doneMatched: "Odrađeno",
    doneSelf: "Označeno kao odrađeno",
    doneOther: "Trenirao si tog dana, ali drugi trening",
    missed: "Preskočeno",

    start: "Počni trening",
    runnerPending:
      "Pokretanje treninga iz plana čeka da runner počne da čita treninge iz baze. Do tada dan možeš da označiš kao odrađen.",

    markDone: "Označi kao odrađeno",
    unmark: "Poništi oznaku",

    moveHeading: "Pomeri termin",
    moveLabel: "Novi datum",
    moveHint: "Najviše 21 dan u odnosu na dan iz plana. Ostatak plana ostaje gde jeste.",
    move: "Pomeri",
    undoMove: "Vrati na dan iz plana",

    saving: "Čuvam…",
  },

  upcoming: {
    title: "Sledećih 14 dana",
    empty: "U sledeće dve nedelje plan nema nijedan trening.",
  },

  logUnavailable:
    "Log treninga trenutno nije dostupan, pa oznake „odrađeno“ možda nisu tačne.",

  errors: {
    unauthenticated: "Prijava je istekla. Prijavi se ponovo.",
    no_plan: "Nemaš dodeljen plan.",
    invalid_day: "Datum nije ispravan.",
    not_movable: "Taj dan nema trening koji može da se pomeri.",
    out_of_window: "Termin može da se pomeri najviše 21 dan.",
    target_busy: "Na tom danu već stoji trening.",
    target_past: "Termin ne može da se pomeri u prošlost.",
    already_done: "Taj trening je već zaveden kao odrađen.",
    not_marked: "Nema ručne oznake koja bi se poništila.",
    future_day: "Dan koji još nije došao ne može da bude odrađen.",
    unavailable: "Log treninga nije dostupan. Pokušaj ponovo kasnije.",
    unknown: "Nešto nije uspelo. Pokušaj ponovo.",
  },
};
