import type { AccountCopy } from "./types";

export const en: AccountCopy = {
  meta: {
    title: "Account",
    description:
      "Name, units, language, notifications and password — everything the app knows about you.",
  },

  nav: "Account",

  title: "Account",
  subtitle: "What the app calls you, what it measures in, and what language it speaks.",

  identity: {
    title: "Profile",
    subtitle: "The name your coach sees next to your sessions.",

    name: "Full name",
    namePlaceholder: "Alex Morgan",

    email: "Email address",
    emailNote:
      "Your email is also your username, so it is not changed from here — ask your coach if you need a different address.",
    unconfirmed: "This address has not been confirmed yet.",

    role: { admin: "Coach", client: "Client" },
    joined: "Member since {date}",

    save: "Save",
    saving: "Saving…",
    saved: "Saved.",
  },

  preferences: {
    title: "Preferences",
    subtitle: "They apply everywhere in the app, on every device you sign in on.",

    units: {
      label: "Units",
      hint: "Only the display changes. Everything you have already entered stays where it is and is converted.",
      metric: "Metric",
      imperial: "Imperial",
      metricNote: "kg · cm",
      imperialNote: "lb · in",
    },

    language: {
      label: "Language",
      hint: "The language of the screens, and of the notifications your coach sends.",
    },

    email: {
      label: "Also send notifications by email",
      hint: "In-app notifications arrive either way — this only decides whether a copy goes to your inbox.",
      unavailable:
        "This setting is not available yet: migration 0016 has not been applied to the database.",
    },

    save: "Save",
    saving: "Saving…",
    saved: "Saved.",
  },

  password: {
    title: "Password",
    subtitle: "The current password is asked for too — somebody else's unlocked phone must not be enough.",

    current: "Current password",
    next: "New password",
    confirm: "Repeat new password",
    hint: "At least 8 characters.",

    submit: "Change password",
    saving: "Changing…",
    saved: "Password changed. Other devices have been signed out.",

    forgot: "Cannot remember the current one?",
  },

  signOut: {
    title: "Sign out",
    body: "Signs out this device only. Everything stays where it is, waiting for next time.",
    action: "Sign out",
  },

  errors: {
    unauthenticated: "Your session expired. Sign in again.",
    not_configured: "Accounts are not available right now.",
    invalid_name: "A name has to be between 2 and 80 characters.",
    invalid_units: "Unknown unit system.",
    invalid_locale: "Unknown language.",
    wrong_password: "That is not your current password.",
    weak_password: "The new password needs at least 8 characters.",
    passwords_mismatch: "The two passwords do not match.",
    same_password: "The new password has to differ from the current one.",
    rate_limited: "Too many attempts. Wait a minute and try again.",
    unavailable: "The change was not saved. Try again in a minute.",
    unknown: "Something broke. Try again.",
  },
};
