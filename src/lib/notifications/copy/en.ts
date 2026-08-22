import type { NotificationsCopy } from "./types";

export const en: NotificationsCopy = {
  metaTitle: "Notifications",
  title: "Notifications",
  subtitle:
    "A message to your clients — now, at a time you pick, or every week on the same days. It lands in the app, and by email if you say so.",
  setup:
    "The notification tables are not in this database yet. Run this migration in the Supabase SQL editor:",

  compose: {
    heading: "New message",
    kindLabel: "Type",
    kinds: {
      announcement: "Announcement",
      reminder: "Reminder",
    },
    kindHint:
      "Only how it reads — a reminder carries a clock, an announcement a bell.",

    languageHint:
      "Write all three. Each client gets the language their account is set to; a missing translation falls back to Serbian.",
    titleLabel: "Title",
    titlePlaceholder: "A new plan is waiting",
    bodyLabel: "Message",
    bodyPlaceholder:
      "I put more legs into this week. Start on Monday and tell me how it goes.",
    fallbackNote: "An empty translation is filled in with the Serbian text.",

    hrefLabel: "Opens",
    hrefHint: "Where the client lands when they tap the notification.",
    hrefTargets: {
      "": "Nowhere",
      "/dashboard": "Today",
      "/plan": "My plan",
      "/workout": "Workouts",
      "/library": "Library",
      "/progress": "Progress",
    },

    audienceLabel: "Who",
    audiences: {
      all: "Every client",
      active_plan: "Clients on a plan",
      no_plan: "Clients without a plan",
      idle: "Clients who went quiet",
      one: "One client",
    },
    audienceHint:
      "A rule, not a list — “went quiet” means different people next week, which is the point.",
    clientLabel: "Client",
    clientEmpty: "No clients yet.",

    whenLabel: "When",
    when: {
      now: "Now",
      once: "Once, later",
      daily: "Every day",
      weekly: "On chosen days",
    },
    dateLabel: "Date",
    timeLabel: "Time",
    zoneNote: "In your time zone ({zone}).",
    weekdaysLabel: "Days",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    startsLabel: "From",
    endsLabel: "Until",
    endsHint: "Leave empty to keep going until you stop it.",

    emailLabel: "Send by email too",
    emailHint:
      "An email goes out alongside the in-app notification, to everyone who has not turned email off in their account.",

    previewLabel: "First send",
    previewNone: "This schedule never fires.",

    submitNow: "Send",
    submitSchedule: "Schedule",
    saving: "Sending…",
    reset: "Clear",
  },

  list: {
    heading: "Sent and scheduled",
    empty: "No messages yet.",
    emptyHint:
      "Write one above. Scheduled messages sit here until their time comes, and every send records how many people it reached.",

    statuses: {
      scheduled: "Scheduled",
      paused: "Paused",
      sent: "Sent",
      cancelled: "Cancelled",
    },
    audienceOne: "To {name}",

    scheduleOnce: "Once",
    scheduleAt: "at {time}",
    scheduleDaily: "Every day at {time}",
    scheduleWeekly: "{days} at {time}",

    next: "Next",
    lastRun: "Last sent",
    never: "Never",
    runs: {
      one: "{n} send",
      other: "{n} sends",
    },
    delivered: {
      one: "{n} client",
      other: "{n} clients",
    },
    readOf: "{read} read it",
    email: "Email",
    emailOffLabel: "No email",

    sendNow: "Send now",
    sending: "Sending…",
    pause: "Pause",
    resume: "Resume",
    remove: "Delete",
    confirmRemove:
      "Delete this schedule? Notifications already delivered stay in the clients' inboxes.",

    checkNow: "Check schedule",
    checking: "Checking…",
    sentToast: {
      one: "Reached {n} client.",
      other: "Reached {n} clients.",
    },
  },

  mail: {
    heading: "Email",
    configured: "Email is configured — messages with email on also go out by mail.",
    missing: "Email is not configured yet.",
    missingHint:
      "Without `RESEND_API_KEY` notifications only arrive in the app. Feature 17 turns the real mail service on.",
  },

  errors: {
    not_admin: "You are not allowed to make this change.",
    not_found: "That message no longer exists.",
    title_required: "The Serbian title is required.",
    body_too_long: "The message is too long.",
    invalid_time: "That time is not valid.",
    invalid_date: "That date is not valid.",
    no_weekdays: "Pick at least one day.",
    recipient_missing: "Pick a client.",
    past_date: "That moment has already passed.",
    unknown: "Something went wrong. Try again.",
  },

  inbox: {
    metaTitle: "Notifications",
    title: "Notifications",
    subtitle: "Messages from your coach, and anything the app had to tell you.",
    bell: "Notifications",
    empty: "Nothing here yet.",
    emptyHint:
      "When your coach sends something, or a new plan arrives, it shows up here.",
    unavailable: "Notifications are unavailable right now.",
    unreadBadge: {
      one: "{n} new",
      other: "{n} new",
    },
    markAll: "Mark all as read",
    marking: "Saving…",
    allRead: "All caught up.",
    open: "Open",
    unreadDot: "Unread",
    kinds: {
      announcement: "Announcement",
      reminder: "Reminder",
      plan: "Plan",
      system: "System",
    },
  },

  email: {
    subjectPrefix: "Fit Compas ·",
    openLabel: "Open in the app",
    footer: "fit-compas.vercel.app",
    reason:
      "You are getting this because you train with us and your coach sent you a message.",
  },
};
