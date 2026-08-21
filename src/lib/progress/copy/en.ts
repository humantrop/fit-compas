import type { ProgressCopy } from "./types";

/** Typed against `ProgressCopy`, so a missing key fails the build rather than the page. */
export const en: ProgressCopy = {
  meta: {
    title: "Progress",
    description:
      "Measurements, photos and charts — how your body and your training change over time.",
  },

  title: "Progress",
  subtitle: "What actually changed, rather than how today feels.",

  access: {
    title: "Subscription inactive",
    body: "Your access has lapsed. Renew it to pick up where you left off.",
  },

  nav: {
    overview: "Overview",
    measurements: "Measurements",
    photos: "Photos",
  },

  unavailable:
    "Measurements are unavailable right now. Nothing is lost — the database just cannot be reached from this screen.",
  trainingUnavailable:
    "The workout log is unavailable right now, so the streak and the training chart are empty.",

  metrics: {
    weight: "Weight",
    body_fat: "Body fat",
    neck: "Neck",
    shoulders: "Shoulders",
    chest: "Chest",
    upper_arm: "Upper arm",
    forearm: "Forearm",
    waist: "Waist",
    hips: "Hips",
    thigh: "Thigh",
    calf: "Calf",
  },

  poses: {
    front: "Front",
    side: "Side",
    back: "Back",
  },

  overview: {
    bodyTitle: "Body",
    bodyEmpty: {
      title: "Nothing measured yet",
      body: "One number today means nothing. The same number a month from now means everything — which is why you start today, even if it is only your weight.",
      action: "Log your first measurement",
    },

    since: "since {date}",
    noChange: "no change",
    measuredOn: "measured {date}",

    trainingTitle: "Training by week",
    trainingSubtitle: "Workouts per week over the last {n} weeks.",
    trainingEmpty: "No workouts logged yet.",
    weekOf: "week of {date}",
    sessions: {
      one: "{n} workout",
      other: "{n} workouts",
    },

    heatTitle: "The last year",
    heatSubtitle: "One square per day. A streak is the unbroken run you can see.",
    heatLess: "less",
    heatMore: "more",

    totalsTitle: "All time",
    totals: {
      workouts: "Workouts",
      sets: "Sets",
      volume: "Volume",
      time: "Time",
    },

    photosTitle: "Latest photos",
    photosEmpty: "No photos yet.",
    photosAction: "Add a photo",
    seeAll: "All photos",
  },

  chart: {
    metricLabel: "Measurement",
    rangeLabel: "Range",
    ranges: {
      d90: "3 months",
      d180: "6 months",
      d365: "1 year",
      all: "All",
    },
    onePoint: "One measurement is not a line yet. Add a second and the chart appears.",
    empty: "Nothing recorded for this measurement in the selected range.",
  },

  measure: {
    title: "Measurements",
    subtitle: "What the scale and the tape said, and when.",

    formTitle: "New measurement",
    metric: "What you measured",
    day: "Date",
    value: "Value",
    rangeHint: "between {min} and {max} {unit}",
    submit: "Save",
    saving: "Saving…",
    saved: "Saved.",

    historyTitle: "History",
    historyEmpty: "Nothing recorded here yet.",
    columns: {
      day: "Date",
      metric: "Measurement",
      value: "Value",
      change: "Change",
    },
    remove: "Delete",
    replaceNote:
      "The same measurement on the same date replaces the earlier entry — a correction, not a second reading.",
  },

  photos: {
    title: "Photos",
    subtitle: "What the mirror does not remember, and three months makes obvious.",

    uploadTitle: "New photo",
    day: "Date",
    pose: "Angle",
    choose: "Choose a photo",
    hint: "JPEG, PNG or WebP, up to 10 MB. Only you and your coach can see these.",
    preparing: "Preparing…",
    uploading: "Uploading",
    finishing: "Finishing…",
    cancel: "Cancel",
    tooLarge: "That photo is larger than 10 MB.",
    wrongType: "Supported formats are JPEG, PNG and WebP.",
    slotNote: "The same angle on the same date replaces the previous photo.",

    galleryTitle: "All photos",
    galleryEmpty: "No photos yet.",
    missing: "Image unavailable",
    remove: "Delete",

    compareTitle: "Compare",
    compareHint: "Same angle, two dates. Front against side compares nothing.",
    compareFrom: "Earlier",
    compareTo: "Later",
    compareEmpty: "This angle needs at least two photos.",
    apart: {
      one: "{n} day apart",
      other: "{n} days apart",
    },
  },

  errors: {
    unauthenticated: "Your session expired. Sign in again.",
    invalid_metric: "Unknown measurement.",
    invalid_day: "That date is not valid.",
    future_day: "A measurement records what happened — the date cannot be in the future.",
    invalid_value: "The value has to be a number.",
    out_of_range: "That value is outside the expected range. Check the unit and the decimal point.",
    not_found: "That entry is gone.",
    invalid_pose: "Unknown angle.",
    file_too_large: "That photo is larger than 10 MB.",
    wrong_type: "Supported formats are JPEG, PNG and WebP.",
    upload_failed: "The upload did not go through. Try again.",
    unavailable: "That data is unavailable right now. Try again in a minute.",
    unknown: "Something broke. Try again.",
  },
};
