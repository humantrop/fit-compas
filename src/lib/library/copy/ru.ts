import type { LibraryCopy } from "./types";

export const ru: LibraryCopy = {
  chrome: {
    signOut: "Выйти",
    admin: "Админ-панель",
    dashboard: "Назад в кабинет",
  },
  title: "Библиотека",
  subtitle:
    "Все упражнения, тренировки и программы в одном месте. Сузьте выбор по доступному инвентарю, целевым мышцам или текущей цели.",
  metaTitle: "Библиотека",
  metaDescription:
    "Поиск упражнений, тренировок и программ по инвентарю, мышечной группе, цели и уровню сложности.",

  kinds: {
    exercises: {
      label: "Упражнения",
      description: "Отдельные движения с видеодемонстрацией.",
    },
    workouts: {
      label: "Тренировки",
      description: "Готовые тренировки — разминка, раунды, заминка.",
    },
    programs: {
      label: "Программы",
      description: "Планы на несколько недель с разбивкой по дням.",
    },
  },

  counts: {
    exercises: {
      one: "{n} упражнение",
      few: "{n} упражнения",
      many: "{n} упражнений",
      other: "{n} упражнения",
    },
    workouts: {
      one: "{n} тренировка",
      few: "{n} тренировки",
      many: "{n} тренировок",
      other: "{n} тренировки",
    },
    programs: {
      one: "{n} программа",
      few: "{n} программы",
      many: "{n} программ",
      other: "{n} программы",
    },
  },

  pending: {
    badge: "Скоро",
    title: "Пока не готово",
    body: "Этот раздел наполнится, когда появится содержимое. Упражнения уже здесь — начните с них.",
  },

  filters: {
    heading: "Фильтры",
    open: "Фильтры",
    close: "Закрыть",
    clear: "Сбросить всё",
    clearOne: "Убрать",
    searchLabel: "Поиск",
    searchPlaceholder: "Название упражнения…",
    groups: {
      equipment: "Инвентарь",
      muscles: "Мышечные группы",
      goals: "Цели",
      activities: "Активности",
      difficulty: "Сложность",
    },
    showAll: {
      one: "Показать ещё {n}",
      few: "Показать ещё {n}",
      many: "Показать ещё {n}",
      other: "Показать ещё {n}",
    },
    showLess: "Свернуть",
    sortLabel: "Сортировка",
    sorts: {
      newest: "Сначала новые",
      title: "По названию",
      difficulty: "По сложности",
    },
  },

  difficulty: {
    beginner: "Новичок",
    novice: "Базовый",
    intermediate: "Средний",
    advanced: "Продвинутый",
    elite: "Экспертный",
  },

  card: {
    video: "Видео",
    noVideo: "Без видео",
    reps: "Повторения",
    time: "Время",
    unilateral: "На одну сторону",
    more: { one: "+{n}", few: "+{n}", many: "+{n}", other: "+{n}" },
  },

  detail: {
    back: "Назад в библиотеку",
    cues: "На что обратить внимание",
    about: "Описание",
    equipment: "Инвентарь",
    muscles: "Мышцы",
    goals: "Цели",
    activities: "Активности",
    videoPending: "Видео для этого упражнения появится позже.",
    notFound: "Такой записи нет или она ещё не опубликована.",
  },

  empty: {
    filteredTitle: "Ничего не найдено",
    filteredBody: "Под эти фильтры ничего не подходит. Снимите один и попробуйте снова.",
    emptyTitle: "Библиотека пока пуста",
    emptyBody: "Первый опубликованный материал появится здесь.",
  },

  locked: {
    title: "Нужна активная подписка",
    body: "Библиотека входит в платный доступ. Оформите подписку, чтобы открыть упражнения, тренировки и программы.",
    action: "Назад в кабинет",
  },

  pager: {
    previous: "Назад",
    next: "Вперёд",
    position: "{page} / {pages}",
  },
};
