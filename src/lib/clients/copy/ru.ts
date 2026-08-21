import type { ClientsCopy } from "./types";

export const ru: ClientsCopy = {
  metaTitle: "Клиенты",
  title: "Клиенты",
  subtitle:
    "Кто тренируется, по какому плану и когда был на тренировке в последний раз. Заметки здесь видите только вы.",

  list: {
    search: "Поиск по имени или почте",
    filterAll: "Все",
    filterAssigned: "С планом",
    filterUnassigned: "Без плана",
    filterIdle: "Затихли",
    empty: "Клиентов пока нет.",
    emptyHint:
      "Клиент появится здесь, как только создаст аккаунт. План назначается на его странице.",
    emptyFiltered: "Ни один клиент не подходит под этот фильтр.",
    count: {
      one: "{n} клиент",
      few: "{n} клиента",
      many: "{n} клиентов",
      other: "{n} клиента",
    },
    assignedOf: "{a} с активным планом",
    noPlan: "Без плана",
    lastSession: "Последняя тренировка",
    never: "Никогда",
    notConfirmed: "Почта не подтверждена",
    open: "Открыть",
  },

  statuses: {
    active: "Активен",
    paused: "На паузе",
    completed: "Завершён",
    cancelled: "Прерван",
  },

  detail: {
    back: "Все клиенты",
    joined: "Аккаунт создан",
    lastSignIn: "Последний вход",
    locale: "Язык",
    units: "Единицы",
    idLabel: "ID",

    planHeading: "План",
    planNone: "План не назначен",
    planNoneHint:
      "Пока плана нет, на своём экране клиент видит, что расписание ещё не назначено, — а не пустую неделю.",
    planStart: "Начало",
    planProgress: "Неделя {week} из {total} · день {day}",
    planEnds: "Последний день",
    planEnded: "План закончился",
    planPaused: "План на паузе",
    planPausedHint:
      "Пока пауза, расписание стоит. При возобновлении начало сдвигается ровно на длительность паузы.",

    assign: "Назначить план",
    reassign: "Сменить план",
    assignHeading: "Назначение плана",
    program: "Программа",
    programDraft: "черновик",
    programEmpty: "Программ пока нет. Создайте её в разделе «Программы».",
    startDate: "Первый день",
    startDateHint:
      "День, на который приходится первая неделя, первый день программы. Всё остальное считается от него.",
    assignNote: "Заметка к плану",
    assignNoteHint: "Её видите только вы.",
    confirmReplace:
      "У клиента уже есть план. Назначение нового закроет текущий. Продолжить?",
    save: "Сохранить",
    saving: "Сохраняю…",
    cancel: "Отмена",

    pause: "Пауза",
    resume: "Продолжить",
    complete: "Отметить завершённым",
    cancelPlan: "Прервать план",
    move: "Сдвинуть начало",
    moveHint: "Сдвигает весь план целиком, вместе со всеми неделями.",

    scheduleHeading: "Расписание",
    scheduleHint: "Ближайшие две недели и три дня назад.",
    scheduleEmpty: "Расписание появится, как только у клиента будет план.",
    today: "Сегодня",
    kinds: {
      workout: "Тренировка",
      rest: "Отдых",
      open: "Свободный день",
      before: "До начала",
      after: "После окончания",
    },
    doneMatched: "Сделано",
    doneOther: "Тренировался, но другую тренировку",
    missed: "Пропущено",
    movedFrom: "Клиент перенёс с {date}",
    movedTo: "Клиент перенёс на {date}",

    historyHeading: "Прежние планы",
    historyEmpty: "Это его первый план.",
    historyRange: "{from} → {to}",

    notesHeading: "Заметки",
    notesPrivate: "Видите только вы",
    notesEmpty: "Заметок пока нет.",
    notePlaceholder:
      "Колено всё ещё беспокоит, приседания полегче. Утром тренируется лучше.",
    noteAdd: "Добавить заметку",
    noteEdit: "Изменить",
    notePin: "Закрепить сверху",
    noteUnpin: "Открепить",
    notePinned: "Закреплено",
    noteDelete: "Удалить",
    noteConfirmDelete: "Удалить эту заметку?",
    noteEdited: "изменено",

    activityHeading: "Последние тренировки",
    activityEmpty: "Ни одной тренировки пока не записано.",
    activityUnavailable:
      "Журнал тренировок сейчас недоступен, поэтому цифры пустые.",
    sessions: "Тренировок",
    sets: "Подходов",
    volume: "Тоннаж",
    time: "Время",
    inProgress: "Идёт",
    abandoned: "Прервана",
    rpe: "RPE",
  },

  errors: {
    not_admin: "У вас нет прав на это изменение.",
    not_found: "Такой записи больше нет.",
    program_missing: "Выберите программу.",
    invalid_date: "Дата неверная.",
    note_required: "Заметка не может быть пустой.",
    note_too_long: "Заметка слишком длинная.",
    unknown: "Что-то сломалось. Попробуйте ещё раз.",
  },
};
