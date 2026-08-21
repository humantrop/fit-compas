import type { RunnerItem, RunnerPlan, RunnerSection } from "./types";

/**
 * Three workouts that exist only so the runner has something to run.
 *
 * The workout builder is roadmap feature 07. Until it lands there are no
 * `workouts` rows, and a runner with nothing to run cannot be tested — which
 * is how a timer that drifts, a rest that stacks, or a set log that silently
 * fails gets discovered three features later. These plans exercise all three
 * modes the builder will produce: rounds with rests, reps with weight, and
 * timed intervals.
 *
 * They disappear the day `dbRunnerSource` replaces `demoRunnerSource` in
 * source.ts. Nothing else imports this file.
 */

let counter = 0;

/** Trimmed-down item constructor — the demo data only sets what it varies. */
function item(
  partial: Pick<RunnerItem, "title"> & Partial<RunnerItem>,
): RunnerItem {
  counter += 1;
  return {
    exerciseId: null,
    cues: null,
    videoUrl: null,
    posterUrl: null,
    mode: "reps",
    reps: null,
    durationSec: null,
    tempo: null,
    rpe: null,
    restSec: 30,
    metrics: [],
    isUnilateral: false,
    ...partial,
    key: partial.key ?? `i${counter}`,
  };
}

function section(
  kind: RunnerSection["kind"],
  partial: Partial<RunnerSection> & Pick<RunnerSection, "items">,
): RunnerSection {
  return {
    title: null,
    rounds: 1,
    restBetweenRoundsSec: 60,
    restAfterSec: 60,
    ...partial,
    key: partial.key ?? kind,
    kind,
  };
}

const WARMUP_TITLE = { sr: "Zagrevanje", en: "Warm-up", ru: "Разминка" };
const MAIN_TITLE = { sr: "Glavni deo", en: "Main set", ru: "Основная часть" };
const COOLDOWN_TITLE = { sr: "Smirivanje", en: "Cool-down", ru: "Заминка" };

const fullBody: RunnerPlan = {
  id: "demo-full-body",
  slug: "full-body-start",
  title: {
    sr: "Celo telo — start",
    en: "Full body — start",
    ru: "Всё тело — старт",
  },
  summary: {
    sr: "Tri runde bez opreme. Prvi trening ako se vraćaš posle pauze.",
    en: "Three rounds, no equipment. The one to start with after a break.",
    ru: "Три раунда без оборудования. С него стоит начать после перерыва.",
  },
  difficulty: "beginner",
  sections: [
    section("warmup", {
      title: WARMUP_TITLE,
      rounds: 1,
      restAfterSec: 45,
      items: [
        item({
          key: "jacks",
          title: { sr: "Poskoci", en: "Jumping jacks", ru: "Прыжки «звёздочка»" },
          cues: {
            sr: "Ravnomeran ritam, ne juri.",
            en: "Steady rhythm, no rushing.",
            ru: "Ровный ритм, без спешки.",
          },
          mode: "time",
          durationSec: 40,
          restSec: 15,
        }),
        item({
          key: "circles",
          title: { sr: "Kruženje rukama", en: "Arm circles", ru: "Круги руками" },
          mode: "time",
          durationSec: 30,
          restSec: 0,
        }),
      ],
    }),
    section("main", {
      title: MAIN_TITLE,
      rounds: 3,
      restBetweenRoundsSec: 90,
      restAfterSec: 60,
      items: [
        item({
          key: "squat",
          title: { sr: "Čučanj", en: "Bodyweight squat", ru: "Приседания" },
          cues: {
            sr: "Kolena prate pravac stopala, peta na podu.",
            en: "Knees track the toes, heels stay down.",
            ru: "Колени по линии стоп, пятки на полу.",
          },
          reps: 12,
          tempo: "3-1-1-0",
          rpe: 7,
          restSec: 45,
        }),
        item({
          key: "pushup",
          title: { sr: "Sklek", en: "Push-up", ru: "Отжимания" },
          cues: {
            sr: "Laktovi uz telo, telo u jednoj liniji.",
            en: "Elbows tucked, body in one line.",
            ru: "Локти вдоль корпуса, тело в одну линию.",
          },
          reps: 10,
          rpe: 8,
          restSec: 45,
        }),
        item({
          key: "bridge",
          title: { sr: "Most za karlicu", en: "Glute bridge", ru: "Ягодичный мостик" },
          reps: 15,
          restSec: 45,
        }),
        item({
          key: "plank",
          title: { sr: "Plank", en: "Plank", ru: "Планка" },
          cues: {
            sr: "Stisni trbuh, ne spuštaj karlicu.",
            en: "Brace the core, hips stay level.",
            ru: "Напряги пресс, таз не провисает.",
          },
          mode: "time",
          durationSec: 40,
          restSec: 0,
        }),
      ],
    }),
    section("cooldown", {
      title: COOLDOWN_TITLE,
      rounds: 1,
      restAfterSec: 0,
      items: [
        item({
          key: "hamstring",
          title: {
            sr: "Istezanje zadnje lože",
            en: "Hamstring stretch",
            ru: "Растяжка задней поверхности бедра",
          },
          mode: "time",
          durationSec: 45,
          isUnilateral: true,
          restSec: 10,
        }),
        item({
          key: "chest",
          title: {
            sr: "Istezanje grudi",
            en: "Chest stretch",
            ru: "Растяжка груди",
          },
          mode: "time",
          durationSec: 40,
          restSec: 0,
        }),
      ],
    }),
  ],
};

const upperStrength: RunnerPlan = {
  id: "demo-upper-strength",
  slug: "upper-strength",
  title: {
    sr: "Gornji deo — snaga",
    en: "Upper body — strength",
    ru: "Верх тела — сила",
  },
  summary: {
    sr: "Četiri runde sa tegovima, duže pauze. Beleži kilažu za svaku seriju.",
    en: "Four loaded rounds, long rests. Log the weight for every set.",
    ru: "Четыре раунда с весом, длинные паузы. Записывай вес каждого подхода.",
  },
  difficulty: "intermediate",
  sections: [
    section("warmup", {
      title: WARMUP_TITLE,
      rounds: 1,
      restAfterSec: 60,
      items: [
        item({
          key: "band",
          title: {
            sr: "Rotacije sa gumom",
            en: "Band pull-apart",
            ru: "Разведение с резиной",
          },
          reps: 15,
          metrics: ["resistance"],
          restSec: 20,
        }),
        item({
          key: "row-light",
          title: {
            sr: "Veslanje — lagana serija",
            en: "Row — light set",
            ru: "Тяга — лёгкий подход",
          },
          reps: 12,
          metrics: ["weight"],
          restSec: 0,
        }),
      ],
    }),
    section("main", {
      title: MAIN_TITLE,
      rounds: 4,
      restBetweenRoundsSec: 120,
      restAfterSec: 90,
      items: [
        item({
          key: "bench",
          title: { sr: "Potisak sa klupe", en: "Bench press", ru: "Жим лёжа" },
          cues: {
            sr: "Lopatice skupljene, šipka do sredine grudi.",
            en: "Shoulder blades pinched, bar to mid-chest.",
            ru: "Лопатки сведены, штанга к середине груди.",
          },
          reps: 8,
          tempo: "2-1-1-0",
          rpe: 8,
          metrics: ["weight"],
          restSec: 90,
        }),
        item({
          key: "row",
          title: { sr: "Veslanje u pretklonu", en: "Barbell row", ru: "Тяга в наклоне" },
          reps: 10,
          rpe: 7,
          metrics: ["weight"],
          restSec: 90,
        }),
        item({
          key: "press",
          title: { sr: "Potisak iznad glave", en: "Overhead press", ru: "Жим над головой" },
          reps: 8,
          rpe: 8,
          metrics: ["weight"],
          restSec: 0,
        }),
      ],
    }),
    section("cooldown", {
      title: COOLDOWN_TITLE,
      rounds: 1,
      restAfterSec: 0,
      items: [
        item({
          key: "lat-stretch",
          title: {
            sr: "Istezanje leđa",
            en: "Lat stretch",
            ru: "Растяжка широчайших",
          },
          mode: "time",
          durationSec: 40,
          isUnilateral: true,
          restSec: 0,
        }),
      ],
    }),
  ],
};

const hiit: RunnerPlan = {
  id: "demo-hiit-20",
  slug: "hiit-20",
  title: { sr: "HIIT 20", en: "HIIT 20", ru: "HIIT 20" },
  summary: {
    sr: "Pet rundi, 40 sekundi rada i 20 pauze. Tajmer vodi, ti pratiš.",
    en: "Five rounds, 40 seconds on and 20 off. The timer leads.",
    ru: "Пять раундов, 40 секунд работы и 20 отдыха. Ведёт таймер.",
  },
  difficulty: "advanced",
  sections: [
    section("warmup", {
      title: WARMUP_TITLE,
      rounds: 1,
      restAfterSec: 30,
      items: [
        item({
          key: "skip",
          title: { sr: "Preskakanje u mestu", en: "Skipping in place", ru: "Прыжки на месте" },
          mode: "time",
          durationSec: 60,
          restSec: 0,
        }),
      ],
    }),
    section("main", {
      key: "intervals",
      title: { sr: "Intervali", en: "Intervals", ru: "Интервалы" },
      rounds: 5,
      restBetweenRoundsSec: 60,
      restAfterSec: 45,
      items: [
        item({
          key: "burpee",
          title: { sr: "Burpee", en: "Burpee", ru: "Бёрпи" },
          mode: "time",
          durationSec: 40,
          rpe: 9,
          restSec: 20,
        }),
        item({
          key: "mountain",
          title: {
            sr: "Penjanje uz planinu",
            en: "Mountain climbers",
            ru: "Скалолаз",
          },
          mode: "time",
          durationSec: 40,
          restSec: 20,
        }),
        item({
          key: "jump-squat",
          title: { sr: "Čučanj sa skokom", en: "Jump squat", ru: "Приседания с выпрыгиванием" },
          cues: {
            sr: "Doskok mek, kroz prste pa petu.",
            en: "Land soft, toes then heel.",
            ru: "Мягкое приземление: носок, затем пятка.",
          },
          mode: "time",
          durationSec: 40,
          restSec: 0,
        }),
      ],
    }),
    section("cooldown", {
      title: COOLDOWN_TITLE,
      rounds: 1,
      restAfterSec: 0,
      items: [
        item({
          key: "breathe",
          title: {
            sr: "Disanje i hod",
            en: "Walk and breathe",
            ru: "Ходьба и дыхание",
          },
          mode: "time",
          durationSec: 90,
          restSec: 0,
        }),
      ],
    }),
  ],
};

export const DEMO_PLANS: readonly RunnerPlan[] = [fullBody, upperStrength, hiit];
