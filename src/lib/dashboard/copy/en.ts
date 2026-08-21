import type { DashboardCopy } from "./types";

export const en: DashboardCopy = {
  meta: {
    title: "Home",
    description:
      "Today's workout, the week ahead, your streak and what you have lifted.",
  },

  chrome: {
    signOut: "Sign out",
    admin: "Admin panel",
    tabs: {
      today: "Today",
      plan: "Plan",
      workouts: "Workouts",
      library: "Library",
    },
  },

  greeting: {
    morning: "Good morning",
    afternoon: "Hello",
    evening: "Good evening",
  },
  subtitle: "Here is where you stand.",

  access: {
    title: "Subscription inactive",
    body: "Your access to the workouts has lapsed. Renew it to pick up where you left off.",
  },

  noProfile:
    "The account exists but has no profile row. Run the SQL script for the profiles table and its trigger.",

  today: {
    eyebrow: "Today",
    scheduledEyebrow: "On the plan",
    resumeEyebrow: "Unfinished workout",
    doneEyebrow: "Done for today",

    pendingTitle: "No plan assigned yet",
    pendingBody:
      "Once your coach assigns a program, this says exactly what that day holds. Until then, pick one of the workouts below.",

    restTitle: "Rest day",
    restBody: "Nothing today. Rest is part of the plan, not a break from it.",

    openTitle: "Nothing scheduled today",
    openBody: "Today is empty on the plan. If you feel like training, pick one below.",

    doneTitle: "Workout logged",
    doneBody: "Streak extended. See you tomorrow.",

    start: "Start workout",
    resume: "Resume workout",
    browse: "Browse workouts",
    resumeProgress: "{done} of {total} sets logged",
  },

  week: {
    title: "This week",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    done: {
      one: "{n} workout",
      other: "{n} workouts",
    },
    legend: {
      done: "Done",
      today: "Today",
      rest: "Rest",
      planned: "Planned",
    },
  },

  streak: {
    title: "Streak",
    days: {
      one: "{n} day",
      other: "{n} days",
    },
    none: "Your streak starts with the first workout.",
    kept: "Today is in.",
    atRisk: "Nothing logged today yet.",
    best: "Best streak: {n}",
  },

  stats: {
    title: "Numbers",
    ranges: {
      week: "7 days",
      month: "30 days",
      all: "All time",
    },
    workouts: "Workouts",
    sets: "Sets",
    volume: "Volume",
    time: "Time",
    kg: "kg",
    tonnes: "t",
    hours: "h",
    minutes: "min",
    unavailable:
      "The training log is unavailable, so these are empty. The workouts themselves run fine.",
  },

  suggestions: {
    title: "Pick a workout",
    body: "While there is no assigned plan, this is what you can do right now.",
    demoNotice:
      "These are the built-in demo workouts. Real ones appear as soon as the first is built in the workout builder.",
    empty: "No workouts yet.",
    sets: "sets",
    minutes: "min",
  },

  recent: {
    title: "Recent workouts",
    empty: "Workouts you finish will show up here.",
    all: "All workouts",
    sets: "sets",
  },

  quick: {
    library: {
      label: "Library",
      body: "Exercises, workouts and programs — filtered by equipment, muscle and goal.",
    },
    workouts: {
      label: "Workouts",
      body: "Everything you can start right now.",
    },
  },
};
