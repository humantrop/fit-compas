import type { ProgressCopy } from "./types";

/** Serbian is the source of truth — `en` and `ru` are typed against it. */
export const sr: ProgressCopy = {
  meta: {
    title: "Napredak",
    description:
      "Merenja, fotografije i grafikoni — kako se telo i treninzi menjaju kroz vreme.",
  },

  title: "Napredak",
  subtitle: "Šta se stvarno promenilo, a ne kako se osećaš danas.",

  access: {
    title: "Pretplata nije aktivna",
    body: "Tvoj pristup je istekao. Obnovi pretplatu da nastaviš tamo gde si stao.",
  },

  nav: {
    overview: "Pregled",
    measurements: "Merenja",
    photos: "Fotografije",
  },

  unavailable:
    "Merenja trenutno nisu dostupna. Podaci nisu izgubljeni — baza samo nije dostupna ovom ekranu.",
  trainingUnavailable:
    "Log treninga trenutno nije dostupan, pa su niz i grafikon treninga prazni.",

  metrics: {
    weight: "Težina",
    body_fat: "Procenat masti",
    neck: "Vrat",
    shoulders: "Ramena",
    chest: "Grudi",
    upper_arm: "Nadlaktica",
    forearm: "Podlaktica",
    waist: "Struk",
    hips: "Kukovi",
    thigh: "Butina",
    calf: "List",
  },

  poses: {
    front: "Spreda",
    side: "Sa strane",
    back: "Otpozadi",
  },

  overview: {
    bodyTitle: "Telo",
    bodyEmpty: {
      title: "Još nema nijednog merenja",
      body: "Jedan broj danas ne znači ništa. Isti taj broj za mesec dana znači sve — zato se počinje odmah, pa makar samo sa težinom.",
      action: "Upiši prvo merenje",
    },

    since: "od {date}",
    noChange: "bez promene",
    measuredOn: "mereno {date}",

    trainingTitle: "Treninzi po nedeljama",
    trainingSubtitle: "Koliko treninga nedeljno, poslednjih {n} nedelja.",
    trainingEmpty: "Još nema odrađenih treninga.",
    weekOf: "nedelja od {date}",
    sessions: {
      one: "{n} trening",
      few: "{n} treninga",
      other: "{n} treninga",
    },

    heatTitle: "Godina dana",
    heatSubtitle: "Svaki kvadrat je jedan dan. Niz je ono što se vidi kao neprekinut red.",
    heatLess: "manje",
    heatMore: "više",

    totalsTitle: "Ukupno",
    totals: {
      workouts: "Treninga",
      sets: "Serija",
      volume: "Tonaža",
      time: "Vreme",
    },

    photosTitle: "Poslednje fotografije",
    photosEmpty: "Još nema nijedne fotografije.",
    photosAction: "Dodaj fotografiju",
    seeAll: "Sve fotografije",
  },

  chart: {
    metricLabel: "Merenje",
    rangeLabel: "Period",
    ranges: {
      d90: "3 meseca",
      d180: "6 meseci",
      d365: "Godina",
      all: "Sve",
    },
    onePoint: "Jedno merenje još nije linija. Upiši drugo i grafikon se pojavljuje.",
    empty: "Za ovo merenje u izabranom periodu nema podataka.",
  },

  measure: {
    title: "Merenja",
    subtitle: "Šta su vaga i metar rekli, i kad.",

    formTitle: "Novo merenje",
    metric: "Šta se meri",
    day: "Datum",
    value: "Vrednost",
    rangeHint: "između {min} i {max} {unit}",
    submit: "Sačuvaj",
    saving: "Čuvam…",
    saved: "Sačuvano.",

    historyTitle: "Istorija",
    historyEmpty: "Ovde još nema nijednog upisa.",
    columns: {
      day: "Datum",
      metric: "Merenje",
      value: "Vrednost",
      change: "Promena",
    },
    remove: "Obriši",
    replaceNote:
      "Isto merenje na isti datum zamenjuje prethodni upis — ispravka, a ne drugi podatak.",
  },

  photos: {
    title: "Fotografije",
    subtitle: "Ono što ogledalo ne pamti, a razlika od tri meseca pokazuje.",

    uploadTitle: "Nova fotografija",
    day: "Datum",
    pose: "Ugao",
    choose: "Izaberi fotografiju",
    hint: "JPEG, PNG ili WebP, do 10 MB. Fotografije vidiš samo ti i tvoj trener.",
    preparing: "Pripremam…",
    uploading: "Šaljem",
    finishing: "Završavam…",
    cancel: "Otkaži",
    tooLarge: "Fotografija je veća od 10 MB.",
    wrongType: "Podržani formati su JPEG, PNG i WebP.",
    slotNote: "Isti ugao na isti datum zamenjuje prethodnu fotografiju.",

    galleryTitle: "Sve fotografije",
    galleryEmpty: "Još nema nijedne fotografije.",
    missing: "Slika nije dostupna",
    remove: "Obriši",

    compareTitle: "Poređenje",
    compareHint: "Isti ugao, dva datuma. Poređenje spreda sa strane ne znači ništa.",
    compareFrom: "Ranije",
    compareTo: "Kasnije",
    compareEmpty: "Za ovaj ugao treba bar dve fotografije.",
    apart: {
      one: "{n} dan razlike",
      few: "{n} dana razlike",
      other: "{n} dana razlike",
    },
  },

  errors: {
    unauthenticated: "Sesija je istekla. Prijavi se ponovo.",
    invalid_metric: "Nepoznato merenje.",
    invalid_day: "Datum nije ispravan.",
    future_day: "Merenje je zapis o onome što je bilo — datum ne može biti u budućnosti.",
    invalid_value: "Vrednost mora biti broj.",
    out_of_range: "Ta vrednost je izvan očekivanog opsega. Proveri jedinicu i decimalu.",
    not_found: "Taj upis više ne postoji.",
    invalid_pose: "Nepoznat ugao snimanja.",
    file_too_large: "Fotografija je veća od 10 MB.",
    wrong_type: "Podržani formati su JPEG, PNG i WebP.",
    upload_failed: "Slanje nije uspelo. Pokušaj ponovo.",
    unavailable: "Podaci trenutno nisu dostupni. Pokušaj za koji minut.",
    unknown: "Nešto je puklo. Pokušaj ponovo.",
  },
};
