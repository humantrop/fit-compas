import type { LibraryCopy } from "./types";

export const en: LibraryCopy = {
  chrome: {
    signOut: "Sign out",
    admin: "Admin panel",
    dashboard: "Back to dashboard",
  },
  title: "Library",
  subtitle:
    "Every exercise, workout and program in one place. Narrow it down by the equipment you have, the muscles you are training, or the goal you are chasing.",
  metaTitle: "Library",
  metaDescription:
    "Search exercises, workouts and programs by equipment, muscle group, goal and difficulty.",

  kinds: {
    exercises: {
      label: "Exercises",
      description: "Single movements with a video demonstration.",
    },
    workouts: {
      label: "Workouts",
      description: "Built sessions — warm-up, rounds, cool-down.",
    },
    programs: {
      label: "Programs",
      description: "Multi-week plans laid out day by day.",
    },
  },

  counts: {
    exercises: { one: "{n} exercise", other: "{n} exercises" },
    workouts: { one: "{n} workout", other: "{n} workouts" },
    programs: { one: "{n} program", other: "{n} programs" },
  },

  pending: {
    badge: "Soon",
    title: "Not ready yet",
    body: "This shelf fills up once the content exists. Exercises are already here — start there.",
  },

  filters: {
    heading: "Filters",
    open: "Filters",
    close: "Close",
    clear: "Clear all",
    clearOne: "Remove",
    searchLabel: "Search",
    searchPlaceholder: "Exercise name…",
    groups: {
      equipment: "Equipment",
      muscles: "Muscle groups",
      goals: "Goals",
      activities: "Activities",
      difficulty: "Difficulty",
    },
    showAll: { one: "Show {n} more", other: "Show {n} more" },
    showLess: "Show less",
    sortLabel: "Sort",
    sorts: {
      newest: "Newest",
      title: "By name",
      difficulty: "By difficulty",
    },
  },

  difficulty: {
    beginner: "Beginner",
    novice: "Novice",
    intermediate: "Intermediate",
    advanced: "Advanced",
    elite: "Elite",
  },

  card: {
    video: "Video",
    noVideo: "No video",
    reps: "Reps",
    time: "Time",
    unilateral: "Single side",
    more: { one: "+{n}", other: "+{n}" },
  },

  detail: {
    back: "Back to library",
    cues: "Watch for",
    about: "About",
    equipment: "Equipment",
    muscles: "Muscles",
    goals: "Goals",
    activities: "Activities",
    videoPending: "A video is coming for this exercise.",
    notFound: "This item does not exist, or is not published yet.",
  },

  empty: {
    filteredTitle: "No results",
    filteredBody: "Nothing matches these filters. Drop one and try again.",
    emptyTitle: "The library is still empty",
    emptyBody: "The first published content will show up here.",
  },

  locked: {
    title: "An active subscription is required",
    body: "The library is part of paid access. Activate a subscription to open exercises, workouts and programs.",
    action: "Back to dashboard",
  },

  pager: {
    previous: "Previous",
    next: "Next",
    position: "{page} / {pages}",
  },
};
