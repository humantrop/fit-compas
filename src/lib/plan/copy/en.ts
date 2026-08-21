import type { PlanCopy } from "./types";

/** Typed against `PlanCopy`, so a missing key fails the build rather than the page. */
export const en: PlanCopy = {
  meta: {
    title: "My plan",
    description:
      "Your training calendar: what each day holds, what is done, and how to move a session.",
  },

  title: "My plan",
  subtitle: "Your program, laid out on real dates.",

  access: {
    title: "Subscription inactive",
    body: "Your access to the workouts has lapsed. Renew it to pick up where you left off.",
  },

  empty: {
    title: "No plan assigned yet",
    body: "Once your coach assigns you a program, the whole calendar lives here — which workout on which day, what is done, and what is next. Until then, pick your own workouts.",
    action: "Browse workouts",
  },

  header: {
    eyebrow: "Program",
    progress: "Week {week} of {total}",
    dayOf: "Day {day}",
    percent: "{percent}% through",
    starts: "Starts {date}",
    ends: "Ends {date}",
    notStarted: "The plan has not started yet.",
    finished: "The plan is finished.",
    paused: "The plan is paused. When your coach resumes it, the dates shift forward by however long the pause lasted.",
    weeks: {
      one: "{n} week",
      other: "{n} weeks",
    },
  },

  calendar: {
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    previous: "Previous month",
    next: "Next month",
    today: "Today",
    legend: {
      workout: "Workout",
      done: "Done",
      rest: "Rest",
      moved: "Moved",
      today: "Today",
    },
  },

  day: {
    kinds: {
      workout: "Workout",
      rest: "Rest day",
      open: "Open day",
      before: "Before the plan starts",
      after: "After the plan ends",
    },
    restBody: "No training today. Rest is part of the plan, not a break from it.",
    openBody: "The plan has nothing for this day. Train anyway if you feel like it — pick a workout yourself.",
    beforeBody: "This day falls before the plan starts.",
    afterBody: "This day falls after the last day of the plan.",

    context: "Week {week} · Day {day}",

    movedFrom: "Moved from {date}",
    movedTo: "Moved to {date}",

    doneMatched: "Done",
    doneSelf: "Marked as done",
    doneOther: "You trained that day, but a different workout",
    missed: "Missed",

    start: "Start workout",
    runnerPending:
      "Starting a planned workout is waiting on the runner reading workouts from the database. Until then you can still mark the day as done.",

    markDone: "Mark as done",
    unmark: "Undo the mark",

    moveHeading: "Move this session",
    moveLabel: "New date",
    moveHint: "Up to 21 days from the planned day. The rest of the plan stays where it is.",
    move: "Move",
    undoMove: "Put it back on the planned day",

    saving: "Saving…",
  },

  upcoming: {
    title: "Next 14 days",
    empty: "The plan holds no workouts in the next two weeks.",
  },

  logUnavailable:
    "The training log is unavailable right now, so the done marks may be out of date.",

  errors: {
    unauthenticated: "Your session expired. Sign in again.",
    no_plan: "You have no plan assigned.",
    invalid_day: "That date is not valid.",
    not_movable: "That day holds no workout to move.",
    out_of_window: "A session can move at most 21 days.",
    target_busy: "That day already has a workout on it.",
    target_past: "A session cannot be moved into the past.",
    already_done: "That workout is already down as done.",
    not_marked: "There is no manual mark to undo.",
    future_day: "A day that has not arrived cannot be done.",
    unavailable: "The training log is unavailable. Try again later.",
    unknown: "Something went wrong. Try again.",
  },
};
