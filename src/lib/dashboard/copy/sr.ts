import type { DashboardCopy } from "./types";

/** Serbian is the source of truth — `en` and `ru` are typed against it. */
export const sr: DashboardCopy = {
  meta: {
    title: "Početna",
    description:
      "Današnji trening, raspored za nedelju, niz odrađenih dana i statistika.",
  },

  chrome: {
    signOut: "Odjavi se",
    admin: "Admin panel",
    tabs: {
      today: "Danas",
      workouts: "Treninzi",
      library: "Biblioteka",
    },
  },

  greeting: {
    morning: "Dobro jutro",
    afternoon: "Zdravo",
    evening: "Dobro veče",
  },
  subtitle: "Evo kako stojiš.",

  access: {
    title: "Pretplata nije aktivna",
    body: "Tvoj pristup treninzima je istekao. Obnovi pretplatu da nastaviš tamo gde si stao.",
  },

  noProfile:
    "Nalog postoji, ali profil nije napravljen. Pokreni SQL skriptu za profiles tabelu i triger.",

  today: {
    eyebrow: "Danas",
    scheduledEyebrow: "Po planu",
    resumeEyebrow: "Nedovršen trening",
    doneEyebrow: "Gotovo za danas",

    pendingTitle: "Plan još nije dodeljen",
    pendingBody:
      "Kad ti trener dodeli program, ovde stoji tačno šta se radi tog dana. Do tada biraj sam iz treninga ispod.",

    restTitle: "Dan odmora",
    restBody: "Danas se ne trenira. Odmor je deo plana, ne pauza od njega.",

    openTitle: "Danas nije ništa zakazano",
    openBody: "Plan za danas je prazan. Ako ti se trenira, izaberi trening ispod.",

    doneTitle: "Trening je odrađen",
    doneBody: "Niz je produžen. Vidimo se sutra.",

    start: "Počni trening",
    resume: "Nastavi trening",
    browse: "Pogledaj treninge",
    resumeProgress: "{done} od {total} serija upisano",
  },

  week: {
    title: "Ova nedelja",
    weekdays: ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"],
    done: {
      one: "{n} trening",
      few: "{n} treninga",
      other: "{n} treninga",
    },
    legend: {
      done: "Odrađeno",
      today: "Danas",
      rest: "Odmor",
      planned: "Zakazano",
    },
  },

  streak: {
    title: "Niz",
    days: {
      one: "{n} dan",
      few: "{n} dana",
      other: "{n} dana",
    },
    none: "Niz počinje prvim treningom.",
    kept: "Danas je upisano.",
    atRisk: "Još danas nije bilo treninga.",
    best: "Najduži niz: {n}",
  },

  stats: {
    title: "Statistika",
    ranges: {
      week: "7 dana",
      month: "30 dana",
      all: "Ukupno",
    },
    workouts: "Treninga",
    sets: "Serija",
    volume: "Tonaža",
    time: "Vreme",
    kg: "kg",
    tonnes: "t",
    hours: "h",
    minutes: "min",
    unavailable:
      "Beleženje treninga trenutno nije dostupno, pa je statistika prazna. Sam trening radi normalno.",
  },

  suggestions: {
    title: "Izaberi trening",
    body: "Dok nema dodeljenog plana, ovo je ono što možeš da odradiš odmah.",
    demoNotice:
      "Ovo su ogledni treninzi. Pravi se pojavljuju čim admin sklopi prvi u Workout builderu.",
    empty: "Još nema nijednog treninga.",
    sets: "serija",
    minutes: "min",
  },

  recent: {
    title: "Poslednji treninzi",
    empty: "Ovde će stajati treninzi koje odradiš.",
    all: "Svi treninzi",
    sets: "serija",
  },

  quick: {
    library: {
      label: "Biblioteka",
      body: "Vežbe, treninzi i programi — pretraga po opremi, mišićima i cilju.",
    },
    workouts: {
      label: "Treninzi",
      body: "Sve što možeš da pokreneš odmah.",
    },
  },
};
