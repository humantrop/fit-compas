import type { ProgressCopy } from "./types";

/** Typed against `ProgressCopy`, so a missing key fails the build rather than the page. */
export const ru: ProgressCopy = {
  meta: {
    title: "Прогресс",
    description:
      "Замеры, фотографии и графики — как меняются тело и тренировки со временем.",
  },

  title: "Прогресс",
  subtitle: "Что изменилось на самом деле, а не что кажется сегодня.",

  access: {
    title: "Подписка неактивна",
    body: "Доступ закончился. Продлите подписку, чтобы продолжить с того же места.",
  },

  nav: {
    overview: "Обзор",
    measurements: "Замеры",
    photos: "Фото",
  },

  unavailable:
    "Замеры сейчас недоступны. Ничего не потеряно — просто база не отвечает этому экрану.",
  trainingUnavailable:
    "Журнал тренировок сейчас недоступен, поэтому серия и график тренировок пустые.",

  metrics: {
    weight: "Вес",
    body_fat: "Процент жира",
    neck: "Шея",
    shoulders: "Плечи",
    chest: "Грудь",
    upper_arm: "Бицепс",
    forearm: "Предплечье",
    waist: "Талия",
    hips: "Бёдра",
    thigh: "Бедро",
    calf: "Голень",
  },

  poses: {
    front: "Спереди",
    side: "Сбоку",
    back: "Сзади",
  },

  overview: {
    bodyTitle: "Тело",
    bodyEmpty: {
      title: "Замеров пока нет",
      body: "Одно число сегодня не значит ничего. То же число через месяц значит всё — поэтому начинают сразу, пусть даже только с веса.",
      action: "Записать первый замер",
    },

    since: "с {date}",
    noChange: "без изменений",
    measuredOn: "замер {date}",

    trainingTitle: "Тренировки по неделям",
    trainingSubtitle: "Сколько тренировок в неделю за последние {n} недель.",
    trainingEmpty: "Пока нет ни одной тренировки.",
    weekOf: "неделя с {date}",
    sessions: {
      one: "{n} тренировка",
      few: "{n} тренировки",
      many: "{n} тренировок",
      other: "{n} тренировок",
    },

    heatTitle: "Год",
    heatSubtitle: "Каждый квадрат — день. Серия — это непрерывный ряд, который видно.",
    heatLess: "меньше",
    heatMore: "больше",

    totalsTitle: "Всего",
    totals: {
      workouts: "Тренировок",
      sets: "Подходов",
      volume: "Тоннаж",
      time: "Время",
    },

    photosTitle: "Последние фото",
    photosEmpty: "Фотографий пока нет.",
    photosAction: "Добавить фото",
    seeAll: "Все фото",
  },

  chart: {
    metricLabel: "Замер",
    rangeLabel: "Период",
    ranges: {
      d90: "3 месяца",
      d180: "6 месяцев",
      d365: "Год",
      all: "Всё",
    },
    onePoint: "Один замер — ещё не линия. Добавьте второй, и график появится.",
    empty: "За выбранный период по этому замеру ничего нет.",
  },

  measure: {
    title: "Замеры",
    subtitle: "Что показали весы и сантиметр, и когда.",

    formTitle: "Новый замер",
    metric: "Что измеряем",
    day: "Дата",
    value: "Значение",
    rangeHint: "от {min} до {max} {unit}",
    submit: "Сохранить",
    saving: "Сохраняю…",
    saved: "Сохранено.",

    historyTitle: "История",
    historyEmpty: "Записей пока нет.",
    columns: {
      day: "Дата",
      metric: "Замер",
      value: "Значение",
      change: "Изменение",
    },
    remove: "Удалить",
    replaceNote:
      "Тот же замер на ту же дату заменяет прежнюю запись — это исправление, а не второе значение.",
  },

  photos: {
    title: "Фотографии",
    subtitle: "То, что зеркало не помнит, а три месяца показывают.",

    uploadTitle: "Новое фото",
    day: "Дата",
    pose: "Ракурс",
    choose: "Выбрать фото",
    hint: "JPEG, PNG или WebP, до 10 МБ. Фото видите только вы и ваш тренер.",
    preparing: "Готовлю…",
    uploading: "Загружаю",
    finishing: "Завершаю…",
    cancel: "Отмена",
    tooLarge: "Фото больше 10 МБ.",
    wrongType: "Поддерживаются JPEG, PNG и WebP.",
    slotNote: "Тот же ракурс на ту же дату заменяет прежнее фото.",

    galleryTitle: "Все фотографии",
    galleryEmpty: "Фотографий пока нет.",
    missing: "Изображение недоступно",
    remove: "Удалить",

    compareTitle: "Сравнение",
    compareHint: "Один ракурс, две даты. Сравнивать вид спереди с видом сбоку бессмысленно.",
    compareFrom: "Раньше",
    compareTo: "Позже",
    compareEmpty: "Для этого ракурса нужно хотя бы два фото.",
    apart: {
      one: "разница {n} день",
      few: "разница {n} дня",
      many: "разница {n} дней",
      other: "разница {n} дней",
    },
  },

  errors: {
    unauthenticated: "Сессия истекла. Войдите ещё раз.",
    invalid_metric: "Неизвестный замер.",
    invalid_day: "Некорректная дата.",
    future_day: "Замер — это запись о том, что было. Дата не может быть в будущем.",
    invalid_value: "Значение должно быть числом.",
    out_of_range: "Значение вне ожидаемого диапазона. Проверьте единицу и запятую.",
    not_found: "Этой записи больше нет.",
    invalid_pose: "Неизвестный ракурс.",
    file_too_large: "Фото больше 10 МБ.",
    wrong_type: "Поддерживаются JPEG, PNG и WebP.",
    upload_failed: "Загрузка не прошла. Попробуйте ещё раз.",
    unavailable: "Данные сейчас недоступны. Попробуйте через минуту.",
    unknown: "Что-то сломалось. Попробуйте ещё раз.",
  },
};
