import { readFileSync } from "node:fs";
import postgres from "postgres";

/**
 * Seeds the tag vocabularies the library filters on.
 *
 * Idempotent: keyed on slug, so re-running updates names and leaves ids alone.
 * Ids must be stable — exercises reference them.
 */

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnv(".env.local");

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL is not set.");
  process.exit(1);
}

// [slug, sr, en, ru]
const EQUIPMENT = [
  ["bodyweight", "Sopstvena težina", "Bodyweight", "Собственный вес"],
  ["barbell", "Šipka", "Barbell", "Штанга"],
  ["dumbbell", "Bučice", "Dumbbells", "Гантели"],
  ["kettlebell", "Girja", "Kettlebell", "Гиря"],
  ["bench", "Klupa", "Bench", "Скамья"],
  ["incline-bench", "Kosa klupa", "Incline bench", "Наклонная скамья"],
  ["pull-up-bar", "Vratilo", "Pull-up bar", "Турник"],
  ["dip-bars", "Razboj", "Dip bars", "Брусья"],
  ["cable-machine", "Kabl mašina", "Cable machine", "Блочный тренажёр"],
  ["smith-machine", "Smit mašina", "Smith machine", "Машина Смита"],
  ["leg-press", "Presa za noge", "Leg press", "Жим ногами"],
  ["lat-pulldown", "Lat mašina", "Lat pulldown", "Верхняя тяга"],
  ["leg-curl", "Mašina za zadnju ložu", "Leg curl machine", "Сгибание ног"],
  ["leg-extension", "Mašina za kvadriceps", "Leg extension machine", "Разгибание ног"],
  ["resistance-band", "Elastična traka", "Resistance band", "Резиновая лента"],
  ["trx", "TRX", "TRX", "TRX"],
  ["medicine-ball", "Medicinka", "Medicine ball", "Медбол"],
  ["pilates-ball", "Pilates lopta", "Pilates ball", "Пилатес-мяч"],
  ["bosu-ball", "Bosu lopta", "Bosu ball", "Босу"],
  ["foam-roller", "Foam roler", "Foam roller", "Массажный ролик"],
  ["ankle-weights", "Tegovi za noge", "Ankle weights", "Утяжелители"],
  ["treadmill", "Traka za trčanje", "Treadmill", "Беговая дорожка"],
  ["stationary-bike", "Sobni bicikl", "Stationary bike", "Велотренажёр"],
  ["rowing-machine", "Veslački ergometar", "Rowing machine", "Гребной тренажёр"],
  ["elliptical", "Eliptični trenažer", "Elliptical", "Эллипс"],
  ["jump-rope", "Vijača", "Jump rope", "Скакалка"],
  ["battle-rope", "Battle rope", "Battle rope", "Канаты"],
  ["box", "Pliometrijska kutija", "Plyo box", "Плиобокс"],
  ["ab-wheel", "Točak za trbušnjake", "Ab wheel", "Ролик для пресса"],
  ["yoga-mat", "Prostirka", "Mat", "Коврик"],
];

/** Which numeric inputs each machine asks for in the workout builder. */
const EQUIPMENT_METRICS = {
  treadmill: ["incline", "speed", "pace", "distance"],
  "stationary-bike": ["level", "power", "distance", "speed"],
  "rowing-machine": ["pace", "distance", "power"],
  elliptical: ["level", "resistance", "distance"],
  barbell: ["weight"],
  dumbbell: ["weight"],
  kettlebell: ["weight"],
  "cable-machine": ["weight"],
  "smith-machine": ["weight"],
  "leg-press": ["weight"],
  "lat-pulldown": ["weight"],
  "leg-curl": ["weight"],
  "leg-extension": ["weight"],
  "ankle-weights": ["weight"],
  "medicine-ball": ["weight"],
  "resistance-band": ["resistance"],
  box: ["height"],
};

// [slug, sr, en, ru, parentSlug|null]
const MUSCLE_GROUPS = [
  ["chest", "Grudi", "Chest", "Грудь", null],
  ["upper-chest", "Gornje grudi", "Upper chest", "Верх груди", "chest"],
  ["back", "Leđa", "Back", "Спина", null],
  ["lats", "Latisimus", "Lats", "Широчайшие", "back"],
  ["traps", "Trapez", "Traps", "Трапеции", "back"],
  ["lower-back", "Donja leđa", "Lower back", "Поясница", "back"],
  ["shoulders", "Ramena", "Shoulders", "Плечи", null],
  ["front-delts", "Prednji deltoid", "Front delts", "Передние дельты", "shoulders"],
  ["side-delts", "Bočni deltoid", "Side delts", "Средние дельты", "shoulders"],
  ["rear-delts", "Zadnji deltoid", "Rear delts", "Задние дельты", "shoulders"],
  ["biceps", "Biceps", "Biceps", "Бицепс", null],
  ["triceps", "Triceps", "Triceps", "Трицепс", null],
  ["forearms", "Podlaktice", "Forearms", "Предплечья", null],
  ["core", "Trup", "Core", "Кор", null],
  ["abs", "Trbušnjaci", "Abs", "Пресс", "core"],
  ["obliques", "Kosi trbušni", "Obliques", "Косые мышцы", "core"],
  ["glutes", "Zadnjica", "Glutes", "Ягодицы", null],
  ["quads", "Kvadriceps", "Quads", "Квадрицепс", null],
  ["hamstrings", "Zadnja loža", "Hamstrings", "Бицепс бедра", null],
  ["calves", "Listovi", "Calves", "Икры", null],
  ["adductors", "Primicači", "Adductors", "Приводящие", null],
  ["abductors", "Odmicači", "Abductors", "Отводящие", null],
  ["full-body", "Celo telo", "Full body", "Всё тело", null],
];

const GOALS = [
  ["muscle-gain", "Povećanje mišićne mase", "Muscle gain", "Набор массы"],
  ["fat-loss", "Gubitak masti", "Fat loss", "Снижение жира"],
  ["strength", "Snaga", "Strength", "Сила"],
  ["endurance", "Izdržljivost", "Endurance", "Выносливость"],
  ["mobility", "Pokretljivost", "Mobility", "Подвижность"],
  ["posture", "Držanje tela", "Posture", "Осанка"],
  ["rehab", "Rehabilitacija", "Rehabilitation", "Реабилитация"],
  ["antistress", "Antistres", "Antistress", "Антистресс"],
  ["athletic-performance", "Sportski učinak", "Athletic performance", "Спортивные результаты"],
  ["general-fitness", "Opšta kondicija", "General fitness", "Общая форма"],
];

const ACTIVITIES = [
  ["strength-training", "Trening snage", "Strength training", "Силовая тренировка"],
  ["hypertrophy", "Hipertrofija", "Hypertrophy", "Гипертрофия"],
  ["hiit", "HIIT", "HIIT", "ВИИТ"],
  ["cardio", "Kardio", "Cardio", "Кардио"],
  ["mobility-work", "Mobilnost", "Mobility work", "Мобилити"],
  ["stretching", "Istezanje", "Stretching", "Растяжка"],
  ["pilates", "Pilates", "Pilates", "Пилатес"],
  ["yoga", "Joga", "Yoga", "Йога"],
  ["functional", "Funkcionalni trening", "Functional training", "Функциональный тренинг"],
  ["calisthenics", "Kalistenika", "Calisthenics", "Калистеника"],
  ["warmup", "Zagrevanje", "Warm-up", "Разминка"],
  ["cooldown", "Smirivanje", "Cool-down", "Заминка"],
];

const HEALTH_ISSUES = [
  ["lower-back-pain", "Bol u donjem delu leđa", "Lower back pain", "Боль в пояснице"],
  ["knee-injury", "Povreda kolena", "Knee injury", "Травма колена"],
  ["shoulder-injury", "Povreda ramena", "Shoulder injury", "Травма плеча"],
  ["hip-issues", "Problemi sa kukom", "Hip issues", "Проблемы с тазобедренным суставом"],
  ["neck-pain", "Bol u vratu", "Neck pain", "Боль в шее"],
  ["wrist-pain", "Bol u zglobu ruke", "Wrist pain", "Боль в запястье"],
  ["hypertension", "Povišen pritisak", "Hypertension", "Гипертония"],
  ["pregnancy", "Trudnoća", "Pregnancy", "Беременность"],
  ["scoliosis", "Skolioza", "Scoliosis", "Сколиоз"],
  ["hernia", "Diskus hernija", "Disc herniation", "Грыжа диска"],
];

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

const name = (sr, en, ru) => JSON.stringify({ sr, en, ru });

async function seedSimple(table, rows) {
  let n = 0;
  for (const [slug, sr, en, ru] of rows) {
    await sql`
      insert into ${sql(table)} (slug, name, position)
      values (${slug}, ${name(sr, en, ru)}::jsonb, ${n})
      on conflict (slug) do update
        set name = excluded.name, position = excluded.position, updated_at = now()
    `;
    n += 1;
  }
  console.log(`${table.padEnd(16)} ${n} rows`);
}

try {
  await seedSimple("equipment", EQUIPMENT);
  await seedSimple("goals", GOALS);
  await seedSimple("activities", ACTIVITIES);
  await seedSimple("health_issues", HEALTH_ISSUES);

  // Muscle groups: parents first, then wire up children by slug.
  let i = 0;
  for (const [slug, sr, en, ru] of MUSCLE_GROUPS) {
    await sql`
      insert into public.muscle_groups (slug, name, position)
      values (${slug}, ${name(sr, en, ru)}::jsonb, ${i})
      on conflict (slug) do update
        set name = excluded.name, position = excluded.position, updated_at = now()
    `;
    i += 1;
  }
  for (const [slug, , , , parent] of MUSCLE_GROUPS) {
    if (!parent) continue;
    await sql`
      update public.muscle_groups
      set parent_id = (select id from public.muscle_groups where slug = ${parent})
      where slug = ${slug}
    `;
  }
  console.log(`muscle_groups    ${i} rows`);

  let metrics = 0;
  for (const [slug, list] of Object.entries(EQUIPMENT_METRICS)) {
    const rows = await sql`select id from public.equipment where slug = ${slug}`;
    if (!rows.length) continue;
    let pos = 0;
    for (const metric of list) {
      await sql`
        insert into public.equipment_metrics (equipment_id, metric, position)
        values (${rows[0].id}, ${metric}::public.metric_kind, ${pos})
        on conflict (equipment_id, metric) do update set position = excluded.position
      `;
      pos += 1;
      metrics += 1;
    }
  }
  console.log(`equipment_metrics ${metrics} rows`);

  console.log("\nseed complete");
} catch (err) {
  console.error("seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}
