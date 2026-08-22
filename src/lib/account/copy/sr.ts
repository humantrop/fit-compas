import type { AccountCopy } from "./types";

/** Serbian is the source of truth — `en` and `ru` are typed against it. */
export const sr: AccountCopy = {
  meta: {
    title: "Nalog",
    description:
      "Ime, jedinice mere, jezik, obaveštenja i lozinka — sve što aplikacija zna o tebi.",
  },

  nav: "Nalog",

  title: "Nalog",
  subtitle: "Kako te aplikacija zove, u čemu meri i na kom jeziku govori.",

  identity: {
    title: "Profil",
    subtitle: "Ime koje trener vidi pored tvojih treninga.",

    name: "Ime i prezime",
    namePlaceholder: "Petar Petrović",

    email: "Mejl adresa",
    emailNote:
      "Mejl je i tvoje korisničko ime, pa se ne menja odavde — piši treneru ako ti treba druga adresa.",
    unconfirmed: "Adresa još nije potvrđena.",

    role: { admin: "Trener", client: "Klijent" },
    joined: "Član od {date}",

    save: "Sačuvaj",
    saving: "Čuvam…",
    saved: "Sačuvano.",
  },

  preferences: {
    title: "Podešavanja",
    subtitle: "Važe svuda u aplikaciji, na svakom uređaju na koji se prijaviš.",

    units: {
      label: "Jedinice mere",
      hint: "Menja se samo prikaz. Sve što si do sada upisao ostaje na svom mestu i preračunava se.",
      metric: "Metričke",
      imperial: "Imperijalne",
      metricNote: "kg · cm",
      imperialNote: "lb · in",
    },

    language: {
      label: "Jezik",
      hint: "Jezik ekrana i jezik na kom stižu obaveštenja od trenera.",
    },

    email: {
      label: "Obaveštenja i na mejl",
      hint: "Obaveštenja u aplikaciji stižu svakako — ovo odlučuje samo da li ide i kopija na mejl.",
      unavailable:
        "Ovo podešavanje još nije dostupno: migracija 0016 nije primenjena na bazu.",
    },

    save: "Sačuvaj",
    saving: "Čuvam…",
    saved: "Sačuvano.",
  },

  password: {
    title: "Lozinka",
    subtitle: "Traži se i trenutna lozinka — tuđi otvoren telefon ne sme da bude dovoljan.",

    current: "Trenutna lozinka",
    next: "Nova lozinka",
    confirm: "Ponovi novu lozinku",
    hint: "Najmanje 8 znakova.",

    submit: "Promeni lozinku",
    saving: "Menjam…",
    saved: "Lozinka je promenjena. Ostali uređaji su odjavljeni.",

    forgot: "Ne sećaš se trenutne?",
  },

  signOut: {
    title: "Odjava",
    body: "Odjavljuje samo ovaj uređaj. Sve ostaje gde je i čeka te sledeći put.",
    action: "Odjavi se",
  },

  errors: {
    unauthenticated: "Sesija je istekla. Prijavi se ponovo.",
    not_configured: "Nalog trenutno nije dostupan.",
    invalid_name: "Ime mora imati između 2 i 80 znakova.",
    invalid_units: "Nepoznat sistem jedinica.",
    invalid_locale: "Nepoznat jezik.",
    wrong_password: "Trenutna lozinka nije tačna.",
    weak_password: "Nova lozinka mora imati najmanje 8 znakova.",
    passwords_mismatch: "Lozinke se ne poklapaju.",
    same_password: "Nova lozinka mora biti različita od trenutne.",
    rate_limited: "Previše pokušaja. Sačekaj koji minut pa probaj ponovo.",
    unavailable: "Izmena nije sačuvana. Pokušaj za koji minut.",
    unknown: "Nešto je puklo. Pokušaj ponovo.",
  },
};
