import type { LibraryCopy } from "./types";

export const sr: LibraryCopy = {
  chrome: {
    signOut: "Odjavi se",
    admin: "Admin panel",
    dashboard: "Nazad na dashboard",
  },
  title: "Biblioteka",
  subtitle:
    "Sve vežbe, treninzi i programi na jednom mestu. Suzi izbor po opremi koju imaš, mišićima koje gađaš ili cilju koji ti je trenutno bitan.",
  metaTitle: "Biblioteka",
  metaDescription:
    "Pretraži vežbe, treninge i programe po opremi, mišićnoj grupi, cilju i težini.",

  kinds: {
    exercises: {
      label: "Vežbe",
      description: "Pojedinačni pokreti sa video demonstracijom.",
    },
    workouts: {
      label: "Treninzi",
      description: "Sklopljeni treninzi — zagrevanje, runde, smirivanje.",
    },
    programs: {
      label: "Programi",
      description: "Višenedeljni planovi sa rasporedom po danima.",
    },
  },

  counts: {
    exercises: { one: "{n} vežba", few: "{n} vežbe", other: "{n} vežbi" },
    workouts: { one: "{n} trening", few: "{n} treninga", other: "{n} treninga" },
    programs: { one: "{n} program", few: "{n} programa", other: "{n} programa" },
  },

  pending: {
    badge: "Uskoro",
    title: "Još nije spremno",
    body: "Ovaj deo biblioteke se puni kad sadržaj bude napravljen. Vežbe su već tu — počni od njih.",
  },

  filters: {
    heading: "Filteri",
    open: "Filteri",
    close: "Zatvori",
    clear: "Poništi sve",
    clearOne: "Ukloni",
    searchLabel: "Pretraga",
    searchPlaceholder: "Naziv vežbe…",
    groups: {
      equipment: "Oprema",
      muscles: "Mišićne grupe",
      goals: "Ciljevi",
      activities: "Aktivnosti",
      difficulty: "Težina",
    },
    showAll: { one: "Prikaži još {n}", few: "Prikaži još {n}", other: "Prikaži još {n}" },
    showLess: "Prikaži manje",
    sortLabel: "Redosled",
    sorts: {
      newest: "Najnovije",
      title: "Po nazivu",
      difficulty: "Po težini",
    },
  },

  difficulty: {
    beginner: "Početnik",
    novice: "Osnovni",
    intermediate: "Srednji",
    advanced: "Napredni",
    elite: "Vrhunski",
  },

  card: {
    video: "Video",
    noVideo: "Bez videa",
    reps: "Ponavljanja",
    time: "Vreme",
    unilateral: "Jednostrano",
    more: { one: "+{n}", few: "+{n}", other: "+{n}" },
  },

  detail: {
    back: "Nazad na biblioteku",
    cues: "Na šta da paziš",
    about: "Opis",
    equipment: "Oprema",
    muscles: "Mišići",
    goals: "Ciljevi",
    activities: "Aktivnosti",
    videoPending: "Video stiže uz ovu vežbu.",
    notFound: "Ova stavka ne postoji ili još nije objavljena.",
  },

  empty: {
    filteredTitle: "Nema rezultata",
    filteredBody: "Nijedna stavka ne odgovara ovim filterima. Skloni neki i probaj ponovo.",
    emptyTitle: "Biblioteka je još prazna",
    emptyBody: "Kad se objavi prvi sadržaj, pojaviće se ovde.",
  },

  locked: {
    title: "Potrebna je aktivna pretplata",
    body: "Biblioteka je deo plaćenog pristupa. Aktiviraj pretplatu da bi otvorio vežbe, treninge i programe.",
    action: "Nazad na dashboard",
  },

  pager: {
    previous: "Prethodna",
    next: "Sledeća",
    position: "{page} / {pages}",
  },
};
