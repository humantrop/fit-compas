import type { ClientsCopy } from "./types";

export const en: ClientsCopy = {
  metaTitle: "Clients",
  title: "Clients",
  subtitle:
    "Who is training, on which plan, and when they last showed up. The notes here are yours alone.",

  list: {
    search: "Search by name or email",
    filterAll: "All",
    filterAssigned: "On a plan",
    filterUnassigned: "No plan",
    filterIdle: "Gone quiet",
    empty: "No clients yet.",
    emptyHint:
      "A client appears here as soon as they create an account. You assign a plan from their page.",
    emptyFiltered: "No client matches this filter.",
    count: {
      one: "{n} client",
      other: "{n} clients",
    },
    assignedOf: "{a} on an active plan",
    noPlan: "No plan",
    lastSession: "Last workout",
    never: "Never",
    notConfirmed: "Email not confirmed",
    open: "Open",
  },

  statuses: {
    active: "Active",
    paused: "Paused",
    completed: "Finished",
    cancelled: "Stopped",
  },

  detail: {
    back: "All clients",
    joined: "Account created",
    lastSignIn: "Last sign-in",
    locale: "Language",
    units: "Units",
    idLabel: "ID",

    planHeading: "Plan",
    planNone: "No plan assigned",
    planNoneHint:
      "Until there is one, the client's own screen says the schedule has not been assigned yet — rather than showing an empty week.",
    planStart: "Starts",
    planProgress: "Week {week} of {total} · day {day}",
    planEnds: "Last day",
    planEnded: "The plan has run out",
    planPaused: "The plan is paused",
    planPausedHint:
      "While it is paused the schedule stands still. Resuming moves the start forward by however long the pause lasted.",

    assign: "Assign a plan",
    reassign: "Change plan",
    assignHeading: "Assign a plan",
    program: "Program",
    programDraft: "draft",
    programEmpty: "There are no programs yet. Build one under Programs.",
    startDate: "First day",
    startDateHint:
      "The day week one, day one falls on. Everything else is counted from it.",
    assignNote: "Note on this plan",
    assignNoteHint: "Only you can see it.",
    confirmReplace:
      "This client is already on a plan. Assigning a new one closes it. Continue?",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",

    pause: "Pause",
    resume: "Resume",
    complete: "Mark as finished",
    cancelPlan: "Stop the plan",
    move: "Move the start",
    moveHint: "Moves the whole plan, every week with it.",

    scheduleHeading: "Schedule",
    scheduleHint: "The next two weeks, and three days back.",
    scheduleEmpty: "The schedule appears as soon as the client has a plan.",
    today: "Today",
    kinds: {
      workout: "Workout",
      rest: "Rest",
      open: "Open day",
      before: "Before the start",
      after: "After the end",
    },
    doneMatched: "Done",
    doneOther: "Trained, but a different workout",
    missed: "Missed",

    historyHeading: "Earlier plans",
    historyEmpty: "This is their first plan.",
    historyRange: "{from} → {to}",

    notesHeading: "Notes",
    notesPrivate: "Only you can see these",
    notesEmpty: "No notes yet.",
    notePlaceholder:
      "Knee still bothering them, keep squats light. Trains better in the morning.",
    noteAdd: "Add a note",
    noteEdit: "Edit",
    notePin: "Pin to top",
    noteUnpin: "Unpin",
    notePinned: "Pinned",
    noteDelete: "Delete",
    noteConfirmDelete: "Delete this note?",
    noteEdited: "edited",

    activityHeading: "Recent workouts",
    activityEmpty: "No workout has been logged yet.",
    activityUnavailable:
      "The workout log is unreachable right now, so the numbers are empty.",
    sessions: "Workouts",
    sets: "Sets",
    volume: "Volume",
    time: "Time",
    inProgress: "In progress",
    abandoned: "Abandoned",
    rpe: "RPE",
  },

  errors: {
    not_admin: "You are not allowed to make this change.",
    not_found: "That record no longer exists.",
    program_missing: "Pick a program.",
    invalid_date: "That date is not valid.",
    note_required: "A note cannot be empty.",
    note_too_long: "That note is too long.",
    unknown: "Something broke. Try again.",
  },
};
