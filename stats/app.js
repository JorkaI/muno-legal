/*
 * muno · статистика — the app's anonymous statistics, for the owner.
 *
 * Signs in with an email code (the app's own sign-in; it never creates an account) and
 * reads ONE function, `analytics_report` (migration 033 in the app's repository), which
 * sums the window in the database. The lock is there as well: this page holds only the
 * public key the app ships, and the function answers only an account on its readers'
 * list. `?demo` draws the same page from made-up numbers (demo.json), for the time
 * before real ones exist.
 *
 * Built with DOM calls only, never innerHTML: codes and names come from the data.
 */

const cfg = window.MUNO_STATS ?? {};
const DEMO = new URLSearchParams(location.search).has('demo');

const PERIODS = [
  { days: 1, label: 'Сегодня' },
  { days: 7, label: '7 дней' },
  { days: 30, label: '30 дней' },
  { days: 90, label: '90 дней' },
];
const PERIOD_KEY = 'muno-stats.period';
const CODE_LENGTH = 6;

// ─── Russian names for the codes the app records ──────────────────────────────
// The same as scripts/analytics-markdown.ts in the app's repository. A code with no
// name here shows as itself.

const STEP_ORDER = [
  'welcome', 'welcomeCards', 'learning', 'native', 'library', 'level', 'test1', 'test2', 'test3',
  'levelResult', 'firstWord', 'reveal', 'packs', 'reminders', 'push', 'account', 'signIn',
];
const STEP_NAME = {
  welcome: 'Приветствие',
  welcomeCards: 'Промо: карточки',
  learning: 'Какой язык учить',
  native: 'На какой переводить',
  library: 'Промо: библиотека',
  level: 'Уровень',
  test1: 'Тест уровня · 1',
  test2: 'Тест уровня · 2',
  test3: 'Тест уровня · 3',
  levelResult: 'Итог уровня',
  firstWord: 'Первое слово',
  reveal: 'Карточка слова',
  packs: 'Стартовые колоды',
  reminders: 'Расписание',
  push: 'Разрешение на уведомления',
  account: 'Создание аккаунта',
  signIn: 'Вход в существующий аккаунт',
};
const METHOD_NAME = { email: 'Почта', apple: 'Apple', google: 'Google' };
const PUSH_NAME = {
  granted: 'разрешили',
  denied: 'запретили',
  later: '«позже»',
  undetermined: 'не ответили',
  unavailable: 'недоступно',
};
const TAB_NAME = { home: 'Главная', library: 'Библиотека', stats: 'Статистика' };
const PLATFORM_NAME = { ios: 'iOS', android: 'Android' };
const SOURCE_NAME = { extra: 'Learn extra', deck: 'из колоды', home: 'с главной' };
const END_NAME = {
  left: 'ушли посреди',
  goalMet: 'цель дня выполнена',
  dayDone: 'день закончен',
  deckDone: 'колода закончена',
  deckRest: 'колода в выходной',
  extraDone: 'конец Learn extra',
  roundDone: 'круг без зачёта',
  noWords: 'нечего учить',
  dayOff: 'выходной',
};
const TRANSLATE_NAME = {
  ok: 'перевёл',
  not_a_word: '«не похоже на слово»',
  free_limit_reached: 'кончились бесплатные на сегодня',
  autotranslate_paused: 'пауза после 10 «не слов»',
  rate_limited: 'слишком часто',
  language_unavailable: 'язык недоступен',
  transport: 'нет связи',
  translation_unavailable: 'сервис не ответил',
};
const LIMIT_NAME = {
  month: '30 своих слов в месяц',
  collection: 'коллекция 200 слов',
  language: 'второй язык',
  unknown: 'лимит, который знал только сервер',
  add_word: 'при добавлении слова',
  library: 'в библиотеке',
  pack: 'на странице колоды',
  restore: 'при восстановлении колоды',
  language_picker: 'при выборе языка',
};
const PURCHASE_NAME = {
  yearly: 'год',
  monthly: 'месяц',
  purchased: 'купили',
  cancelled: 'передумали',
  failed: 'ошибка',
  pending: 'ждёт подтверждения',
  restored: 'восстановили',
  nothing: 'нечего восстанавливать',
};
const PACK_NAME = {
  added: 'добавили',
  restored: 'вернули из удалённых',
  duplicate: 'уже была',
  limitReached: 'упёрлись в коллекцию',
  unauthorized: 'без входа',
  failed: 'ошибка',
};
const TRIGGER_NAME = {
  month: '30 своих слов в месяц',
  collection: 'коллекция 200 слов',
  limit: 'лимит (сервер)',
  translate: 'переводы на сегодня',
  language: 'второй язык',
  settings: 'настройки',
  first: 'сам — после регистрации',
  weekly: 'сам — раз в неделю',
};
const FSRS_NAME = { moved: 'переехали', failed: 'ошибка — повторится сам' };
const WRITE_NAME = {
  add_word: 'новое слово',
  edit_word: 'правка слова',
  delete_word: 'удаление слова',
  move_word: 'перенос слова',
  reorder_words: 'порядок слов',
  meaning: 'значение слова',
  answer: 'ответ в практике',
  practice_day: 'день практики',
  create_deck: 'новая колода',
  rename_deck: 'название колоды',
  delete_deck: 'удаление колоды',
  restore_deck: 'восстановление колоды',
  purge_deck: 'удаление навсегда',
  reorder_decks: 'порядок колод',
  level: 'уровень',
  goal_cap: 'потолок дня',
  avatar: 'аватар',
};
const LOAD_NAME = {
  decks: 'колоды',
  deck: 'колода',
  practice: 'практика',
  library: 'библиотека',
  pack: 'колода из библиотеки',
  stats: 'статистика',
  languages: 'языки',
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  appendAll(el, children);
  return el;
}

function appendAll(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs ?? {})) if (value != null) el.setAttribute(key, String(value));
  appendAll(el, children);
  return el;
}

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const compactFormat = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });
const fmt = (n) => (n == null ? '—' : numberFormat.format(n));
const pct = (part, whole) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');

function plural(n, one, few, many) {
  if (!Number.isInteger(n)) return few; // 1,5 слова · 17,5 карточки
  const tens = Math.abs(n) % 100;
  const ones = tens % 10;
  if (tens > 10 && tens < 20) return many;
  if (ones === 1) return one;
  if (ones >= 2 && ones <= 4) return few;
  return many;
}
const times = (n) => `${fmt(n)} ${plural(n, 'раз', 'раза', 'раз')}`;

function seconds(value) {
  if (value == null) return '—';
  const total = Math.round(value);
  if (total < 60) return `${total} с`;
  const m = Math.floor(total / 60);
  const rest = total % 60;
  if (m < 60) return rest ? `${m} мин ${rest} с` : `${m} мин`;
  return `${Math.floor(m / 60)} ч ${m % 60} мин`;
}
const secondsFine = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1).replace('.', ',')} с`);

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const utcToday = () => new Date().toISOString().slice(0, 10);
function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
function dayLabel(iso) {
  const [, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}
const rangeLabel = (from, to) => (from === to ? dayLabel(from) : `${dayLabel(from)} — ${dayLabel(to)}`);

/** A code's Russian name, or the code itself when it has none yet. */
const name = (names, code) => (code == null ? '—' : (names[code] ?? code));
const fromCounts = (list, names = {}) => list.map(({ value, n }) => ({ label: name(names, value), n }));
const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);

function readPeriod() {
  try {
    const stored = Number(localStorage.getItem(PERIOD_KEY));
    if (PERIODS.some((p) => p.days === stored)) return stored;
  } catch {
    // Storage can be blocked (a private window); the default is fine.
  }
  return 7;
}
function savePeriod(days) {
  try {
    localStorage.setItem(PERIOD_KEY, String(days));
  } catch {
    // Remembering the period is a convenience.
  }
}

/**
 * The report's full shape with nothing in it. A report is laid over it before it is
 * drawn, so a section the database did not send (an older function, an older demo.json)
 * reads as empty instead of breaking the page. New keys belong here as they are added.
 */
const EMPTY_REPORT = {
  from: null,
  to: null,
  dev: false,
  events: 0,
  sessions: 0,
  daily: [],
  onboarding: { started: 0, resumed: 0, accounts: 0, to_account_p50: null, steps: [] },
  sign_in: { attempts: [], failures: [], codes: 0, codes_sent: 0, push: [] },
  visits: { opens: 0, signed_in: 0, foreground_p50: null, foreground_p75: null, platforms: [], versions: [], reminder_taps: 0, tabs: [] },
  practice: { starts: 0, sources: [], ends: 0, left: 0, seconds_p50: null, answers_p50: null, endings: [] },
  words: {
    opens: 0,
    closes: 0,
    closed_empty: 0,
    added: 0,
    with_meaning: 0,
    per_open_p50: null,
    open_seconds_p50: null,
    translations: 0,
    translate_ms_p50: null,
    translate_ms_p90: null,
    translate_outcomes: [],
  },
  library: { opens: 0, kinds: [], adds: [], themes: [] },
  paywall: { limits: [], doors: [], purchases: [], restores: [] },
  health: { fsrs_move: [], whats_new: 0, write_failed: [], load_failed: [] },
};

function normalizeReport(report) {
  const out = { ...EMPTY_REPORT, ...(report ?? {}) };
  for (const [key, empty] of Object.entries(EMPTY_REPORT)) {
    if (empty && typeof empty === 'object' && !Array.isArray(empty)) out[key] = { ...empty, ...(report?.[key] ?? {}) };
    else if (Array.isArray(empty) && !Array.isArray(out[key])) out[key] = [];
  }
  return out;
}

// ─── The connection ───────────────────────────────────────────────────────────

const client =
  !DEMO && window.supabase && cfg.url && cfg.key
    ? window.supabase.createClient(cfg.url, cfg.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: 'muno-stats.auth',
        },
      })
    : null;

const isNetwork = (error) =>
  error?.name === 'AuthRetryableFetchError' || error?.status === 0 || /fetch|network|load failed/i.test(error?.message ?? '');

function sendCodeMessage(error) {
  const code = String(error?.code ?? '');
  const text = String(error?.message ?? '');
  if (code === 'otp_disabled' || code === 'user_not_found' || /signups not allowed/i.test(text)) {
    return 'С этим адресом нет аккаунта muno. Нужен тот, с которым ты входишь в приложение.';
  }
  if (error?.status === 429 || /rate.?limit/i.test(code + text)) return 'Слишком много писем подряд. Подожди минуту и попробуй снова.';
  if (isNetwork(error)) return 'Нет связи. Проверь интернет и попробуй снова.';
  return `Не получилось отправить код (${code || error?.status || 'ошибка'}).`;
}

function verifyCodeMessage(error) {
  const code = String(error?.code ?? '');
  const text = String(error?.message ?? '');
  if (error?.status === 429 || /rate.?limit/i.test(code + text)) return 'Слишком много попыток. Подожди минуту.';
  if (isNetwork(error)) return 'Нет связи. Проверь интернет и попробуй снова.';
  return 'Код не подошёл или уже устарел. Проверь письмо или пришли новый.';
}

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  /** boot · signin · code · loading · ready · notYet · noAccess · failed */
  phase: 'boot',
  email: '',
  code: '',
  /** The line under a sign-in form: { text, ok }. */
  message: null,
  busy: false,
  period: readPeriod(),
  /** The last report drawn — kept on screen, dimmed, while the next one loads. */
  report: null,
  reportPeriod: null,
  refreshing: false,
  error: null,
  loadedAt: null,
};
let loadSeq = 0;
let demoData = null;
let pendingFocus = null;
/** The draw functions of the charts on screen, run again when the width changes. */
const charts = new Set();

const main = document.getElementById('app');
const envBadge = document.getElementById('env');
const signOutButton = document.getElementById('signout');
signOutButton.addEventListener('click', () => signOut());

function render() {
  envBadge.hidden = false;
  envBadge.textContent = DEMO ? 'Пример' : (cfg.label ?? '');
  envBadge.classList.toggle('demo', DEMO);
  signOutButton.hidden = DEMO || !['loading', 'ready', 'notYet', 'noAccess', 'failed'].includes(state.phase);

  charts.clear();
  pendingFocus = null;
  main.replaceChildren(view());
  requestAnimationFrame(() => {
    for (const draw of charts) draw();
    if (pendingFocus) {
      pendingFocus.focus();
      const length = pendingFocus.value.length;
      pendingFocus.setSelectionRange?.(length, length);
    }
  });
}

let lastWidth = 0;
new ResizeObserver(() => {
  if (main.clientWidth === lastWidth) return;
  lastWidth = main.clientWidth;
  for (const draw of charts) draw();
}).observe(main);

// ─── Signing in ───────────────────────────────────────────────────────────────

async function sendCode(email, again = false) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    state.message = { text: 'Похоже, в адресе опечатка.' };
    render();
    return;
  }
  state.email = email;
  state.busy = true;
  state.message = null;
  render();
  // shouldCreateUser: false — this page signs in to an account that exists, never makes one.
  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  state.busy = false;
  if (error) {
    state.message = { text: sendCodeMessage(error) };
  } else {
    state.phase = 'code';
    state.code = '';
    state.message = again ? { text: 'Отправили новый код.', ok: true } : null;
  }
  render();
}

async function verifyCode(code) {
  if (code.length !== CODE_LENGTH) {
    state.message = { text: 'В коде шесть цифр.' };
    render();
    return;
  }
  state.code = code;
  state.busy = true;
  state.message = null;
  render();
  const { error } = await client.auth.verifyOtp({ email: state.email, token: code, type: 'email' });
  state.busy = false;
  state.code = '';
  if (error) {
    state.message = { text: verifyCodeMessage(error) };
    render();
    return;
  }
  state.message = null;
  await load();
}

async function signOut() {
  if (!client) return;
  loadSeq += 1; // whatever was loading belongs to the session that is ending
  // LOCAL: this browser only. The default would end the account's sessions everywhere,
  // the phone's included.
  await client.auth.signOut({ scope: 'local' });
  state.report = null;
  state.phase = 'signin';
  state.message = null;
  render();
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function windowFor(days) {
  const to = utcToday();
  return { from: addDays(to, -(days - 1)), to };
}

async function fetchReport(days) {
  const { from, to } = windowFor(days);
  return client.rpc('analytics_report', { p_from: from, p_to: to, p_dev: false });
}

async function demoReport(days) {
  if (!demoData) {
    const response = await fetch('demo.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`demo.json — ${response.status}`);
    demoData = await response.json();
  }
  // The made-up month is moved to end today, so the dates look like the ones to come.
  const raw = demoData[String(days)];
  const shift = daysBetween(raw.to, utcToday());
  const report = structuredClone(raw);
  report.from = addDays(raw.from, shift);
  report.to = addDays(raw.to, shift);
  for (const day of report.daily) day.day = addDays(day.day, shift);
  return { data: report, error: null };
}

async function load() {
  const days = state.period;
  const seq = ++loadSeq;
  state.refreshing = Boolean(state.report);
  if (!state.report) state.phase = 'loading';
  render();

  let result;
  try {
    result = DEMO ? await demoReport(days) : await fetchReport(days);
  } catch (error) {
    result = { data: null, error: { message: String(error?.message ?? error) } };
  }
  if (seq !== loadSeq) return; // a newer request has taken over
  state.refreshing = false;

  const { data, error } = result;
  if (!error) {
    state.report = normalizeReport(data);
    state.reportPeriod = days;
    state.loadedAt = new Date();
    state.error = null;
    state.phase = 'ready';
  } else if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(error.code)) {
    // The function (or 031's table) is not in this database yet: production before 1.2.0.
    state.report = null;
    state.phase = 'notYet';
  } else if (error.code === '42501') {
    state.report = null;
    state.phase = 'noAccess';
  } else if (result.status === 401 || /jwt/i.test(String(error.message))) {
    await client.auth.signOut({ scope: 'local' });
    state.report = null;
    state.phase = 'signin';
    state.message = { text: 'Вход истёк. Войди ещё раз.' };
  } else {
    state.phase = 'failed';
    state.error = isNetwork(error) ? 'Нет связи. Проверь интернет.' : `Ошибка: ${error.code ?? ''} ${error.message ?? ''}`.trim();
  }
  render();
}

function choosePeriod(days) {
  if (days === state.period && state.report && state.reportPeriod === days) return;
  state.period = days;
  savePeriod(days);
  load();
}

// ─── Views ────────────────────────────────────────────────────────────────────

function view() {
  switch (state.phase) {
    case 'boot':
      return h('p', { class: 'boot' }, 'Загружаю…');
    case 'signin':
      return signInView();
    case 'code':
      return codeView();
    case 'notYet':
      return notYetView();
    case 'noAccess':
      return noAccessView();
    case 'failed':
      return state.report ? reportView() : failedView();
    default:
      return reportView();
  }
}

const message = () =>
  state.message ? h('p', { class: `msg${state.message.ok ? ' ok' : ''}`, role: 'status' }, state.message.text) : null;

function signInView() {
  const input = h('input', {
    class: 'field',
    type: 'email',
    name: 'email',
    autocomplete: 'email',
    inputmode: 'email',
    placeholder: 'Почта',
    'aria-label': 'Почта',
    value: state.email,
    disabled: state.busy,
    oninput: (event) => {
      state.email = event.target.value;
    },
  });
  pendingFocus = state.busy ? null : input;
  const form = h(
    'form',
    {
      class: 'form',
      onsubmit: (event) => {
        event.preventDefault();
        if (!state.busy) sendCode(input.value.trim());
      },
    },
    input,
    message(),
    h('button', { class: 'btn', type: 'submit', disabled: state.busy }, state.busy ? 'Отправляю…' : 'Прислать код'),
  );
  return h(
    'section',
    { class: 'card narrow' },
    h('h2', null, 'Вход'),
    h('p', { class: 'sub' }, 'Тот же адрес, с которым ты входишь в muno. Придёт письмо с кодом.'),
    form,
  );
}

function codeView() {
  const input = h('input', {
    class: 'field code',
    type: 'text',
    name: 'code',
    inputmode: 'numeric',
    autocomplete: 'one-time-code',
    maxlength: CODE_LENGTH,
    placeholder: '••••••',
    'aria-label': 'Код из письма',
    value: state.code,
    disabled: state.busy,
    oninput: (event) => {
      const digits = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
      event.target.value = digits;
      // Like the app: a full code checks itself.
      if (digits.length === CODE_LENGTH && !state.busy) verifyCode(digits);
    },
  });
  pendingFocus = state.busy ? null : input;
  const form = h(
    'form',
    {
      class: 'form',
      onsubmit: (event) => {
        event.preventDefault();
        if (!state.busy) verifyCode(input.value.replace(/\D/g, ''));
      },
    },
    input,
    message(),
    h('button', { class: 'btn', type: 'submit', disabled: state.busy }, state.busy ? 'Проверяю…' : 'Войти'),
    h(
      'div',
      { class: 'row' },
      h('button', { type: 'button', class: 'link', disabled: state.busy, onclick: () => sendCode(state.email, true) }, 'Прислать ещё раз'),
      h(
        'button',
        {
          type: 'button',
          class: 'link',
          disabled: state.busy,
          onclick: () => {
            state.phase = 'signin';
            state.message = null;
            render();
          },
        },
        'Другой адрес',
      ),
    ),
  );
  return h(
    'section',
    { class: 'card narrow' },
    h('h2', null, 'Код из письма'),
    h('p', { class: 'sub' }, `Отправили на ${state.email}. В коде шесть цифр.`),
    form,
  );
}

function notYetView() {
  return h(
    'section',
    { class: 'card narrow' },
    h('h2', null, 'Статистики в проде пока нет'),
    h(
      'p',
      null,
      'Она начнёт собираться с выходом 1.2.0: приложение будет присылать события, а эта страница — показывать их сама. Ссылка та же.',
    ),
    h('p', { class: 'note' }, 'В базе ещё нет отчёта: миграции 031 и 033 едут в прод вместе с 1.2.0.'),
    h('div', { class: 'form' }, h('a', { class: 'btn quiet', href: '?demo' }, 'Посмотреть на примере')),
  );
}

function noAccessView() {
  return h(
    'section',
    { class: 'card narrow' },
    h('h2', null, 'Нет доступа'),
    h('p', null, 'У этого аккаунта нет доступа к статистике. Войди с адресом владельца.'),
    h('div', { class: 'form' }, h('button', { class: 'btn', type: 'button', onclick: () => signOut() }, 'Выйти')),
  );
}

function failedView() {
  return h(
    'div',
    null,
    periodBar(),
    h(
      'section',
      { class: 'card narrow' },
      h('h2', null, 'Не получилось загрузить'),
      h('p', null, state.error),
      h('div', { class: 'form' }, h('button', { class: 'btn', type: 'button', onclick: () => load() }, 'Попробовать снова')),
    ),
  );
}

function periodBar() {
  const { from, to } = windowFor(state.period);
  const loaded =
    !DEMO && state.loadedAt && !state.refreshing
      ? ` · обновлено ${state.loadedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
      : '';
  return h(
    'div',
    { class: 'periods' },
    h(
      'div',
      { class: 'seg', role: 'group', 'aria-label': 'Период' },
      PERIODS.map((p) =>
        h('button', { type: 'button', 'aria-pressed': String(p.days === state.period), onclick: () => choosePeriod(p.days) }, p.label),
      ),
    ),
    h('span', { class: 'range' }, `${rangeLabel(from, to)}${loaded}`),
    DEMO ? null : h('button', { type: 'button', class: 'link', onclick: () => load() }, 'Обновить'),
  );
}

function reportView() {
  return h(
    'div',
    null,
    DEMO
      ? h(
          'div',
          { class: 'banner', role: 'note' },
          'Пример на выдуманных данных — не настоящая статистика.',
          h('a', { class: 'link', href: './' }, 'Выйти из примера'),
        )
      : null,
    periodBar(),
    state.phase === 'failed'
      ? h(
          'div',
          { class: 'banner', role: 'alert' },
          `Не обновилось. ${state.error}`,
          h('button', { type: 'button', class: 'link', onclick: () => load() }, 'Ещё раз'),
        )
      : null,
    state.report
      ? h('div', { class: `stack${state.refreshing ? ' stale' : ''}`, 'aria-busy': String(state.refreshing) }, reportBody(state.report))
      : skeleton(),
  );
}

function skeleton() {
  return h(
    'div',
    { class: 'stack', 'aria-busy': 'true' },
    h('div', { class: 'kpis' }, [1, 2, 3, 4, 5, 6].map(() => h('div', { class: 'skeleton', style: { height: '104px' } }))),
    h('div', { class: 'skeleton', style: { height: '300px' } }),
    h('div', { class: 'skeleton', style: { height: '300px' } }),
  );
}

// ─── The report ───────────────────────────────────────────────────────────────

const card = (title, sub, ...body) =>
  h('section', { class: 'card' }, h('h2', null, title), sub ? h('p', { class: 'sub' }, sub) : null, ...body);
const none = (text) => h('p', { class: 'none' }, text);

function reportBody(r) {
  const parts = [kpis(r)];
  if (r.events === 0) {
    parts.push(
      card(
        'За эти дни событий нет',
        r.from === r.to ? 'Сегодня приложение ещё ничего не присылало.' : 'За выбранные дни приложение ничего не присылало.',
        // Production has the report before anyone has the build that records: say so.
        h('p', null, 'События присылает приложение с версии 1.2.0: если её ещё ни у кого нет, здесь пусто.'),
        DEMO ? null : h('div', { class: 'form' }, h('a', { class: 'btn quiet', href: '?demo' }, 'Посмотреть на примере')),
      ),
    );
    return parts;
  }
  const days = r.daily.map((d) => d.day);
  if (days.length > 1) {
    parts.push(
      lineCard({
        title: 'Заходы по дням',
        sub: 'Сколько раз открывали приложение: запуск или возврат после 30 минут.',
        days,
        area: true,
        series: [{ name: 'Заходы', color: 'var(--series-1)', values: r.daily.map((d) => d.opens) }],
      }),
      lineCard({
        title: 'Онбординг по дням',
        sub: 'Сессии, которые начали онбординг в этот день, и те из них, что вошли или создали аккаунт.',
        days,
        series: [
          { name: 'Начали', color: 'var(--series-1)', values: r.daily.map((d) => d.onboarding) },
          { name: 'Дошли до аккаунта', color: 'var(--series-2)', values: r.daily.map((d) => d.accounts) },
        ],
      }),
    );
  }
  parts.push(onboardingCard(r));
  parts.push(h('div', { class: 'cols' }, signInCard(r), visitsCard(r), practiceCard(r), wordsCard(r), libraryCard(r), paywallCard(r), healthCard(r)));
  return parts;
}

function kpis(r) {
  const purchased = sum(r.paywall.purchases.filter((p) => p.outcome === 'purchased'), (p) => p.n);
  const shows = sum(r.paywall.doors, (d) => d.shows);
  const tile = (label, value, hint) =>
    h('div', { class: 'card kpi' }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, value), h('div', { class: 'hint' }, hint || ''));
  return h(
    'div',
    { class: 'kpis' },
    tile('Заходы', fmt(r.visits.opens), r.visits.opens ? `с аккаунтом — ${fmt(r.visits.signed_in)}` : ''),
    tile('Начали онбординг', fmt(r.onboarding.started), r.onboarding.resumed ? `ещё ${fmt(r.onboarding.resumed)} вернулись к нему` : ''),
    tile(
      'Дошли до аккаунта',
      fmt(r.onboarding.accounts),
      r.onboarding.started ? `${pct(r.onboarding.accounts, r.onboarding.started)} от начавших` : '',
    ),
    tile('Практик', fmt(r.practice.starts), r.practice.ends ? `ушли посреди — ${pct(r.practice.left, r.practice.ends)}` : ''),
    tile('Добавлено слов', fmt(r.words.added), r.words.opens ? `окно открывали ${times(r.words.opens)}` : ''),
    tile('Покупок', fmt(purchased), shows ? `окно покупки — ${fmt(shows)} ${plural(shows, 'показ', 'показа', 'показов')}` : ''),
  );
}

/** Labelled counts as bars, most first; labels that meet (two codes, one name) add up. */
function barList(items, { limit } = {}) {
  const merged = new Map();
  for (const item of items) merged.set(item.label, (merged.get(item.label) ?? 0) + item.n);
  let rows = [...merged.entries()]
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  if (rows.length === 0) return none('нет');
  const total = sum(rows, (row) => row.n);
  const max = rows[0].n;
  const hidden = limit && rows.length > limit ? rows.length - limit : 0;
  if (hidden) rows = rows.slice(0, limit);
  return h(
    'ul',
    { class: 'bars' },
    rows.map((row) =>
      h(
        'li',
        null,
        h('span', { class: 'name' }, row.label),
        h('span', { class: 'n' }, fmt(row.n), h('small', null, pct(row.n, total))),
        h('span', { class: 'track', 'aria-hidden': 'true' }, h('span', { class: 'fill', style: { width: `${max ? (row.n / max) * 100 : 0}%` } })),
      ),
    ),
    hidden ? h('li', { class: 'more' }, `и ещё ${hidden}`) : null,
  );
}

function onboardingCard(r) {
  const ob = r.onboarding;
  const total = ob.started;
  const byStep = new Map(ob.steps.map((row) => [row.step, row]));
  const known = new Set(STEP_ORDER);
  // The flow's order first, then any step the app records that has no name here yet.
  const rows = [
    ...STEP_ORDER.flatMap((step) => byStep.get(step) ?? []),
    ...ob.steps.filter((row) => row.step == null || !known.has(row.step)),
  ];
  const summary = total
    ? `Начали с первого экрана: ${fmt(total)}. Вошли или создали аккаунт в той же сессии: ${fmt(ob.accounts)} ` +
      `(${pct(ob.accounts, total)}), обычно за ${seconds(ob.to_account_p50)}.` +
      (ob.resumed ? ` Ещё ${fmt(ob.resumed)} вернулись к онбордингу позже, с того же места.` : '')
    : 'За эти дни онбординг никто не начинал.' + (ob.resumed ? ` Вернулись к нему, начав раньше: ${fmt(ob.resumed)}.` : '');
  const detail = (row) =>
    [
      row.left ? `ушли здесь — ${fmt(row.left)}` : null,
      row.skipped ? `пропустили — ${fmt(row.skipped)}` : null,
      row.p50 != null ? `${seconds(row.p50)} (у трёх из четырёх ≤ ${seconds(row.p75)})` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  return card(
    'Онбординг — где уходят',
    null,
    h('p', null, summary),
    rows.length
      ? h(
          'ul',
          { class: 'bars' },
          rows.map((row) =>
            h(
              'li',
              null,
              h('span', { class: 'name' }, name(STEP_NAME, row.step)),
              h('span', { class: 'n' }, fmt(row.reached), h('small', null, pct(row.reached, total))),
              h(
                'span',
                { class: 'track', 'aria-hidden': 'true' },
                h('span', { class: 'fill', style: { width: `${total ? (row.reached / total) * 100 : 0}%` } }),
              ),
              detail(row) ? h('span', { class: 'detail' }, detail(row)) : null,
            ),
          ),
        )
      : null,
    rows.length
      ? h(
          'p',
          { class: 'note' },
          '«Ушли здесь» — последний экран сессии, после которого человек так и не вошёл. Время — медиана: сколько обычно проводят на экране.',
        )
      : null,
  );
}

function signInCard(r) {
  const si = r.sign_in;
  // A row per way in: how many got in through it, and what became of the other tries.
  const methods = [...new Set(si.attempts.map((a) => a.method))];
  const count = (method, outcome) => sum(si.attempts.filter((a) => a.method === method && a.outcome === outcome), (a) => a.n);
  const rows = methods
    .map((method) => ({ method, ok: count(method, 'ok') }))
    .sort((a, b) => b.ok - a.ok || name(METHOD_NAME, a.method).localeCompare(name(METHOD_NAME, b.method)));
  const totalOk = sum(rows, (row) => row.ok);
  const maxOk = Math.max(1, ...rows.map((row) => row.ok));
  const others = (method) =>
    [
      ['cancelled', 'передумали'],
      ['failed', 'ошибка'],
      ['unavailable', 'недоступно'],
    ]
      .map(([outcome, label]) => [label, count(method, outcome)])
      .filter(([, n]) => n > 0)
      .map(([label, n]) => `${label} — ${fmt(n)}`)
      .join(' · ');
  const ways = rows.length
    ? h(
        'ul',
        { class: 'bars' },
        rows.map((row) =>
          h(
            'li',
            null,
            h('span', { class: 'name' }, name(METHOD_NAME, row.method)),
            h('span', { class: 'n' }, fmt(row.ok), h('small', null, `вошли · ${pct(row.ok, totalOk)}`)),
            h('span', { class: 'track', 'aria-hidden': 'true' }, h('span', { class: 'fill', style: { width: `${(row.ok / maxOk) * 100}%` } })),
            others(row.method) ? h('span', { class: 'detail' }, others(row.method)) : null,
          ),
        ),
      )
    : none('Входов не было.');
  const failures = si.failures.map((f) => ({ label: `${name(METHOD_NAME, f.method)} · ${f.reason ?? '—'}`, n: f.n }));
  return card(
    'Вход и уведомления',
    null,
    ways,
    h('p', null, `Код на почту запросили ${times(si.codes)}, отправлен ${fmt(si.codes_sent)}.`),
    failures.length ? [h('h3', null, 'Ошибки входа'), barList(failures)] : null,
    h('h3', null, 'Уведомления в онбординге'),
    si.push.length ? barList(fromCounts(si.push, PUSH_NAME)) : none('Вопрос никто не видел.'),
  );
}

function visitsCard(r) {
  const v = r.visits;
  return card(
    'Заходы',
    null,
    h(
      'p',
      null,
      v.foreground_p50 != null
        ? `Обычно приложение открыто ${seconds(v.foreground_p50)} за заход, у трёх из четырёх — не дольше ${seconds(v.foreground_p75)}.`
        : 'Сколько приложение было открыто — пока нет данных.',
    ),
    h('p', null, `Открыли по напоминанию: ${fmt(v.reminder_taps)}.`),
    h('h3', null, 'Вкладки'),
    barList(fromCounts(v.tabs, TAB_NAME)),
    h('h3', null, 'Платформы'),
    barList(fromCounts(v.platforms, PLATFORM_NAME)),
    h('h3', null, 'Версии'),
    barList(fromCounts(v.versions)),
  );
}

function practiceCard(r) {
  const p = r.practice;
  return card(
    'Практика',
    null,
    h('p', null, `Открыли практику ${times(p.starts)}. Ушли посреди: ${fmt(p.left)} из ${fmt(p.ends)} (${pct(p.left, p.ends)}).`),
    p.seconds_p50 != null
      ? h(
          'p',
          null,
          `Обычно в практике проводят ${seconds(p.seconds_p50)} и отвечают на ${fmt(p.answers_p50)} ` +
            `${plural(p.answers_p50, 'карточку', 'карточки', 'карточек')}.`,
        )
      : null,
    h('h3', null, 'Откуда'),
    barList(fromCounts(p.sources, SOURCE_NAME)),
    h('h3', null, 'Чем закончилось'),
    barList(fromCounts(p.endings, END_NAME)),
  );
}

function wordsCard(r) {
  const w = r.words;
  return card(
    'Добавление слов',
    null,
    h('p', null, `Окно добавления открыли ${times(w.opens)}; закрыли, ничего не добавив, — ${fmt(w.closed_empty)} (${pct(w.closed_empty, w.closes)}).`),
    h(
      'p',
      null,
      `Добавлено слов: ${fmt(w.added)}, из них со значением — ${fmt(w.with_meaning)}.` +
        (w.per_open_p50 != null
          ? ` За одно открытие обычно ${fmt(w.per_open_p50)} ${plural(w.per_open_p50, 'слово', 'слова', 'слов')}, ` +
            `окно открыто ${seconds(w.open_seconds_p50)}.`
          : ''),
    ),
    h('h3', null, 'Перевод'),
    h(
      'p',
      null,
      w.translations
        ? `Перевод ждали ${times(w.translations)}. Удачный приходит обычно за ${secondsFine(w.translate_ms_p50)}, ` +
            `у 9 из 10 — не дольше ${secondsFine(w.translate_ms_p90)}.`
        : 'Перевода никто не ждал.',
    ),
    w.translate_outcomes.length ? barList(fromCounts(w.translate_outcomes, TRANSLATE_NAME)) : null,
  );
}

function libraryCard(r) {
  const l = r.library;
  const kinds = l.kinds.map(({ value, n }) => ({ label: value === 'thematic' ? 'тематические' : 'частотные', n }));
  return card(
    'Библиотека',
    null,
    h('p', null, `Открыли колоду ${times(l.opens)}.`),
    kinds.length ? barList(kinds) : null,
    h('h3', null, '«Добавить в мои колоды»'),
    barList(fromCounts(l.adds, PACK_NAME)),
    l.themes.length ? [h('h3', null, 'Темы, которые открывают чаще'), barList(fromCounts(l.themes), { limit: 8 })] : null,
  );
}

function paywallCard(r) {
  const pw = r.paywall;
  const limits = pw.limits.map((l) => ({ label: `${name(LIMIT_NAME, l.which)} ${name(LIMIT_NAME, l.where)}`, n: l.n }));
  const purchases = pw.purchases.map((p) => ({ label: `${name(PURCHASE_NAME, p.plan)}, ${name(PURCHASE_NAME, p.outcome)}`, n: p.n }));
  const doors = pw.doors.length
    ? h(
        'div',
        { class: 'scroll' },
        h(
          'table',
          null,
          h('thead', null, h('tr', null, ['Почему открылось', 'Показов', 'Купили', 'Смотрели'].map((t) => h('th', { scope: 'col' }, t)))),
          h(
            'tbody',
            null,
            pw.doors.map((d) =>
              h('tr', null, h('td', null, name(TRIGGER_NAME, d.trigger)), h('td', null, fmt(d.shows)), h('td', null, fmt(d.bought)), h('td', null, seconds(d.seconds_p50))),
            ),
          ),
        ),
      )
    : none('Окно покупки не открывали.');
  return card(
    'Лимиты и покупка',
    null,
    h('h3', null, 'Упёрлись в лимит'),
    limits.length ? barList(limits) : none('ни разу'),
    h('h3', null, 'Окно покупки'),
    doors,
    h('h3', null, 'Попытки покупки'),
    purchases.length ? barList(purchases) : none('не было'),
    pw.restores.length ? [h('h3', null, 'Восстановление покупок'), barList(fromCounts(pw.restores, PURCHASE_NAME))] : null,
    h('p', { class: 'note' }, 'Пробные периоды и оплаты целиком — в RevenueCat. «Смотрели» — медиана, сколько окно было открыто.'),
  );
}

function healthCard(r) {
  const x = r.health;
  return card(
    'Сбои',
    null,
    h('h3', null, 'Переезд на новое расписание (первый запуск 1.2.0)'),
    x.fsrs_move.length ? barList(fromCounts(x.fsrs_move, FSRS_NAME)) : none('не было'),
    h('p', null, `«Что нового» показали ${times(x.whats_new)}.`),
    h('h3', null, 'Не сохранилось'),
    x.write_failed.length ? barList(fromCounts(x.write_failed, WRITE_NAME)) : none('ни разу'),
    h('h3', null, 'Не загрузилось'),
    x.load_failed.length ? barList(fromCounts(x.load_failed, LOAD_NAME)) : none('ни разу'),
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function lineCard({ title, sub, days, series, area = false }) {
  const legend =
    series.length > 1
      ? h('div', { class: 'legend' }, series.map((sr) => h('span', null, h('i', { style: { background: sr.color } }), sr.name)))
      : null;
  const chart = lineChart(title, days, series, area);
  return card(title, sub, legend, chart.el, chart.toggle, chart.table);
}

/** 0, a clean step, …, the first tick at or above the largest value — whole numbers only. */
function niceTicks(max) {
  const rough = Math.max(1, max) / 3;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough));
  const top = Math.max(step, Math.ceil(max / step) * step);
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/** Which days get a label under the axis: as many as fit, the first and last always. */
function labelIndexes(n, plotWidth) {
  if (n <= 1) return [0];
  const fit = Math.max(2, Math.floor(plotWidth / 66));
  if (n <= fit) return [...Array(n).keys()];
  const step = Math.ceil((n - 1) / (fit - 1));
  const out = [];
  for (let i = 0; i < n - 1; i += step) out.push(i);
  if (n - 1 - out[out.length - 1] < step * 0.6) out.pop();
  out.push(n - 1);
  return out;
}

function chartSummary(title, days, series) {
  const totals = series.map((sr) => `${sr.name.toLowerCase()} — всего ${fmt(sum(sr.values, (v) => v))}`).join('; ');
  return `${title}, ${rangeLabel(days[0], days[days.length - 1])}: ${totals}. Подробности — в таблице под графиком.`;
}

function lineChart(title, days, series, area) {
  const el = h('div', { class: 'chart', tabindex: '0', role: 'img', 'aria-label': chartSummary(title, days, series) });
  const tip = h('div', { class: 'tip', hidden: true });
  const table = h(
    'div',
    { class: 'scroll', hidden: true },
    h(
      'table',
      null,
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'День'), series.map((sr) => h('th', { scope: 'col' }, sr.name)))),
      h('tbody', null, days.map((day, i) => h('tr', null, h('td', null, dayLabel(day)), series.map((sr) => h('td', null, fmt(sr.values[i])))))),
    ),
  );
  const toggle = h('button', { type: 'button', class: 'link tablebtn', 'aria-expanded': 'false' }, 'Показать таблицей');
  toggle.addEventListener('click', () => {
    table.hidden = !table.hidden;
    toggle.setAttribute('aria-expanded', String(!table.hidden));
    toggle.textContent = table.hidden ? 'Показать таблицей' : 'Скрыть таблицу';
  });

  let geo = null;
  let active = null;

  function draw() {
    if (!el.isConnected) return;
    const width = Math.max(240, el.clientWidth);
    const height = 200;
    const top = 12;
    const bottom = 26;
    const n = days.length;
    const ticks = niceTicks(Math.max(...series.flatMap((sr) => sr.values)));
    const yTop = ticks[ticks.length - 1];
    const left = 10 + Math.max(...ticks.map((t) => compactFormat.format(t).length)) * 7;
    const right = 10 + Math.max(...series.map((sr) => fmt(sr.values[n - 1]).length)) * 7.5;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const x = (i) => left + (n === 1 ? plotWidth / 2 : (i * plotWidth) / (n - 1));
    const y = (v) => top + plotHeight - (v / yTop) * plotHeight;

    const svg = s('svg', { width, height, viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true', focusable: 'false' });
    for (const t of ticks) {
      svg.append(
        s('line', {
          x1: left,
          x2: left + plotWidth,
          y1: y(t),
          y2: y(t),
          stroke: t === 0 ? 'var(--axis)' : 'var(--grid)',
          'stroke-width': 1,
          'shape-rendering': 'crispEdges',
        }),
        s('text', { x: left - 8, y: y(t) + 4, 'text-anchor': 'end', class: 'tick' }, compactFormat.format(t)),
      );
    }
    for (const i of labelIndexes(n, plotWidth)) {
      const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      svg.append(s('text', { x: x(i), y: height - 6, 'text-anchor': anchor, class: 'tick' }, dayLabel(days[i])));
    }
    for (const sr of series) {
      const path = sr.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
      if (area) {
        svg.append(
          s('path', {
            d: `${path}L${x(n - 1).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`,
            fill: sr.color,
            'fill-opacity': 0.1,
            stroke: 'none',
          }),
        );
      }
      svg.append(s('path', { d: path, fill: 'none', stroke: sr.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    }
    // The last day: a dot per series, its value beside it — unless two would overlap,
    // when the legend and the tooltip carry them instead.
    const ends = series.map((sr) => ({ sr, value: sr.values[n - 1], py: y(sr.values[n - 1]) }));
    const collide = ends.some((a, i) => ends.some((b, j) => j > i && Math.abs(a.py - b.py) < 14));
    for (const end of ends) {
      svg.append(s('circle', { cx: x(n - 1), cy: end.py, r: 4, fill: end.sr.color, stroke: 'var(--card)', 'stroke-width': 2 }));
      if (!collide) svg.append(s('text', { x: x(n - 1) + 9, y: end.py + 4, class: 'endval' }, fmt(end.value)));
    }
    const cross = s('g', { visibility: 'hidden' });
    cross.append(s('line', { x1: 0, x2: 0, y1: top, y2: top + plotHeight, stroke: 'var(--axis)', 'stroke-width': 1 }));
    for (const sr of series) cross.append(s('circle', { r: 4, fill: sr.color, stroke: 'var(--card)', 'stroke-width': 2 }));
    svg.append(cross);

    geo = { x, y, n, left, plotWidth, width, cross };
    el.replaceChildren(svg, tip);
    if (active != null) show(Math.min(active, n - 1));
  }

  function show(i) {
    if (!geo) return;
    active = i;
    const { x, y, cross, width } = geo;
    const [line, ...dots] = cross.children;
    line.setAttribute('x1', x(i));
    line.setAttribute('x2', x(i));
    dots.forEach((dot, k) => {
      dot.setAttribute('cx', x(i));
      dot.setAttribute('cy', y(series[k].values[i]));
    });
    cross.setAttribute('visibility', 'visible');
    tip.replaceChildren(
      h('div', { class: 'd' }, dayLabel(days[i])),
      ...series.map((sr) => h('div', { class: 'r' }, h('i', { style: { background: sr.color } }), h('b', null, fmt(sr.values[i])), h('span', null, sr.name))),
    );
    tip.hidden = false;
    const tipWidth = tip.offsetWidth;
    let at = x(i) + 12;
    if (at + tipWidth > width) at = x(i) - 12 - tipWidth;
    tip.style.left = `${Math.max(0, at)}px`;
  }

  function hide() {
    active = null;
    geo?.cross.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  }

  function indexAt(clientX) {
    const { left, plotWidth, n } = geo;
    if (n === 1) return 0;
    const px = clientX - el.getBoundingClientRect().left;
    return Math.max(0, Math.min(n - 1, Math.round(((px - left) / plotWidth) * (n - 1))));
  }

  el.addEventListener('pointermove', (event) => geo && show(indexAt(event.clientX)));
  el.addEventListener('pointerdown', (event) => geo && show(indexAt(event.clientX)));
  el.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') hide();
  });
  el.addEventListener('keydown', (event) => {
    if (!geo) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const next = active == null ? geo.n - 1 : active + (event.key === 'ArrowRight' ? 1 : -1);
      show(Math.max(0, Math.min(geo.n - 1, next)));
    } else if (event.key === 'Escape') {
      hide();
    }
  });
  el.addEventListener('blur', hide);
  charts.add(draw);
  return { el, toggle, table };
}

// ─── Start ────────────────────────────────────────────────────────────────────

async function boot() {
  if (DEMO) {
    await load();
    return;
  }
  if (!client) {
    state.phase = 'failed';
    state.error = 'Не загрузилась библиотека входа. Обнови страницу.';
    render();
    return;
  }
  client.auth.onAuthStateChange((event) => {
    // A session ended elsewhere (a revoked token, another tab's sign-out).
    if (event === 'SIGNED_OUT' && state.phase !== 'signin' && state.phase !== 'code') {
      state.report = null;
      state.phase = 'signin';
      render();
    }
  });
  const { data } = await client.auth.getSession();
  if (data.session) {
    await load();
  } else {
    state.phase = 'signin';
    render();
  }
}

boot();
