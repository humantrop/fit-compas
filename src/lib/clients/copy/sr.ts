import type { ClientsCopy } from "./types";

/** Serbian is the source text; `en` and `ru` are typed against this shape. */
export const sr: ClientsCopy = {
  metaTitle: "Klijenti",
  title: "Klijenti",
  subtitle:
    "Ko trenira, po kom planu i kada je poslednji put bio na treningu. Beleške ovde vidiš samo ti.",

  list: {
    search: "Pretraži po imenu ili mejlu",
    filterAll: "Svi",
    filterAssigned: "Sa planom",
    filterUnassigned: "Bez plana",
    filterIdle: "Neaktivni",
    empty: "Još nema nijednog klijenta.",
    emptyHint:
      "Klijent se pojavi ovde čim napravi nalog i potvrdi mejl. Plan mu dodeljuješ sa njegove stranice.",
    emptyFiltered: "Nijedan klijent ne odgovara ovom filteru.",
    count: {
      one: "{n} klijent",
      few: "{n} klijenta",
      other: "{n} klijenata",
    },
    assignedOf: "{a} sa aktivnim planom",
    noPlan: "Bez plana",
    lastSession: "Poslednji trening",
    never: "Nikad",
    notConfirmed: "Mejl nije potvrđen",
    open: "Otvori",
  },

  statuses: {
    active: "Aktivan",
    paused: "Pauziran",
    completed: "Završen",
    cancelled: "Prekinut",
  },

  detail: {
    back: "Svi klijenti",
    joined: "Nalog napravljen",
    lastSignIn: "Poslednja prijava",
    locale: "Jezik",
    units: "Jedinice",
    idLabel: "ID",

    planHeading: "Plan",
    planNone: "Nema dodeljen plan",
    planNoneHint:
      "Dok plan ne postoji, klijent na svom ekranu vidi da raspored još nije dodeljen — a ne praznu nedelju.",
    planStart: "Počinje",
    planProgress: "Nedelja {week} od {total} · dan {day}",
    planEnds: "Poslednji dan",
    planEnded: "Plan je istekao",
    planPaused: "Plan je pauziran",
    planPausedHint:
      "Dok traje pauza raspored stoji. Kad ga vratiš, početak se pomera za onoliko dana koliko je pauza trajala.",

    assign: "Dodeli plan",
    reassign: "Promeni plan",
    assignHeading: "Dodela plana",
    program: "Program",
    programDraft: "u izradi",
    programEmpty: "Nema nijednog programa. Napravi ga u Programima.",
    startDate: "Prvi dan",
    startDateHint:
      "Dan na koji pada prva nedelja, prvi dan programa. Sve ostalo se računa od njega.",
    assignNote: "Napomena uz plan",
    assignNoteHint: "Vidiš je samo ti.",
    confirmReplace:
      "Klijent već ima plan. Dodela novog zatvara postojeći. Nastaviti?",
    save: "Sačuvaj",
    saving: "Čuvam…",
    cancel: "Odustani",

    pause: "Pauziraj",
    resume: "Nastavi",
    complete: "Označi kao završen",
    cancelPlan: "Prekini plan",
    move: "Pomeri početak",
    moveHint: "Pomera ceo plan, sve nedelje zajedno.",

    scheduleHeading: "Raspored",
    scheduleHint: "Naredne dve nedelje, i tri dana unazad.",
    scheduleEmpty:
      "Raspored se pojavljuje čim klijent dobije plan.",
    today: "Danas",
    kinds: {
      workout: "Trening",
      rest: "Odmor",
      open: "Slobodan dan",
      before: "Pre početka",
      after: "Posle kraja",
    },
    doneMatched: "Odrađeno",
    doneOther: "Trenirao, ali drugi trening",
    missed: "Propušteno",
    movedFrom: "Klijent pomerio sa {date}",
    movedTo: "Klijent pomerio na {date}",

    historyHeading: "Raniji planovi",
    historyEmpty: "Ovo mu je prvi plan.",
    historyRange: "{from} → {to}",

    notesHeading: "Beleške",
    notesPrivate: "Vidiš samo ti",
    notesEmpty: "Još nema beleški.",
    notePlaceholder:
      "Koleno i dalje smeta, čučnjevi lagano. Radi bolje ujutru.",
    noteAdd: "Dodaj belešku",
    noteEdit: "Izmeni",
    notePin: "Zakači na vrh",
    noteUnpin: "Otkači",
    notePinned: "Zakačeno",
    noteDelete: "Obriši",
    noteConfirmDelete: "Obrisati ovu belešku?",
    noteEdited: "izmenjeno",

    activityHeading: "Poslednji treninzi",
    activityEmpty: "Nijedan trening još nije odrađen.",
    activityUnavailable:
      "Log treninga trenutno nije dostupan, pa su brojke prazne.",
    sessions: "Treninga",
    sets: "Serija",
    volume: "Tonaža",
    time: "Vreme",
    inProgress: "U toku",
    abandoned: "Prekinut",
    rpe: "RPE",
  },

  errors: {
    not_admin: "Nemaš dozvolu za ovu izmenu.",
    not_found: "Zapis više ne postoji.",
    program_missing: "Izaberi program.",
    invalid_date: "Datum nije ispravan.",
    note_required: "Beleška ne može biti prazna.",
    note_too_long: "Beleška je predugačka.",
    unknown: "Nešto je puklo. Pokušaj ponovo.",
  },
};
