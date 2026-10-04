/* =========================================================
   app.js — Health & Habit Tracker app logic.
   Plain script (no modules) so index.html works when opened
   straight from disk. Relies on globals from data.js, and on
   Chart.js (optional: charts show a fallback without it).

   Sections:
     1. Constants
     2. Utilities (general, dates, numbers)
     3. Storage (load, save, migrate)
     4. Backup (export, import, merge)
     5. UI helpers (toast, dialogs, icons)
     6. Sound, vibration, screen wake, countdowns
     7. Charts
     8. Navigation
     9. Schedule helpers (incl. today's override)
    10. Habit logic (due days, check-offs, streaks)
    11. Today tab
    12. Habits tab
    13. Routines tab (list + editor)
    14. Session mode (routine checklist)
    15. Hold timer
    16. Lifts tab (logger, rest timer, history, progress)
    17. Rehab tab
    18. Notes tab
    19. Settings tab
    20. Startup
   ========================================================= */
"use strict";

/* ---------- 1. Constants ---------- */
const APP_VERSION = "0.11.1";
const SCHEMA_VERSION = 7;
const STORAGE_KEY = "tracker.v1";
const SAFETY_KEY = "tracker.v1.safety";   // copy of the data taken right before an import or reset
const TABS = ["today", "habits", "routines", "timer", "lifts", "rehab", "notes", "settings", "calendar"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const HEATMAP_WEEKS = 12;
// Thin outline icons (24×24, drawn with the current text colour). Habits store
// the icon's name (e.g. "bed"); the picker in the habit form offers these.
const LINE_ICONS = {
  bed: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6M2 17h20"/>',
  sunrise: '<path d="M12 2v7M4.9 10.9l1.4 1.4M2 18h2M20 18h2M19.1 10.9l-1.4 1.4M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  pill: '<path d="M10.5 20.5l10-10a5 5 0 1 0-7-7l-10 10a5 5 0 1 0 7 7z"/><path d="M8.5 8.5l7 7"/>',
  news: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>',
  pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  dumbbell: '<path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5.5 12 3c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  snow: '<path d="M12 2v20M4.9 7l14.2 10M19.1 7L4.9 17"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="M10 22l2-6-3-3 1-5 4 3 3 1M9 13l-3 3"/>',
  // Used elsewhere in the UI (not offered in the habit picker)
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>'
};
const HABIT_ICON_CHOICES = ["bed", "sunrise", "heart", "pill", "news", "pulse", "dumbbell", "moon", "pen", "book", "drop", "leaf", "smile", "sun", "snow", "walk"];
// Older versions stored emoji; the v7 upgrade maps them to line icons.
const EMOJI_TO_ICON = {
  "🛏️": "bed", "🌅": "sunrise", "🙏": "heart", "💊": "pill", "📰": "news", "🩹": "pulse", "🏋️": "dumbbell",
  "🌙": "moon", "📓": "pen", "📖": "book", "💧": "drop", "🧘": "smile", "🚶": "walk", "😴": "moon",
  "🥗": "leaf", "🧊": "snow", "☀️": "sun"
};

function lineIcon(name, cls = "") {
  return LINE_ICONS[name] ? `<svg class="line-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${LINE_ICONS[name]}</svg>` : "";
}
const LEAD_IN_SECONDS = 3;
const DEFAULT_REHAB_AREAS = [
  { id: "knee", name: "Left knee" },
  { id: "hamstring", name: "Hamstring" },
  { id: "shoulder", name: "Shoulder" }
];
const SEED_TAGS = ["training", "rehab", "general"];
const EXERCISE_TYPES = { reps: "Reps", hold: "Hold (gets timer)", time: "Timed", lift: "Lift (logged in Lifts)", info: "Info text" };
const LIFT_KINDS = { lift: "Lift (weight × reps)", bodyweight: "Bodyweight (reps)", hold: "Hold (seconds)" };
const DEFAULT_SETTINGS = {
  scheduleStartWeekday: 1,
  restSeconds: 120,       // lift rest timer
  restTimerOn: true,
  holdRestSeconds: 60,    // rest between hold-timer sets
  holdRestOn: true,
  sound: true,
  vibrate: true
};

/* ---------- 2. Utilities ---------- */

// Short random ID, e.g. "k3f9x2ab".
function uid(len = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

// Escape text before putting it into HTML strings.
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function isPlainObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
function plural(n, word) { return `${n} ${word}${n === 1 ? "" : "s"}`; }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

// 45 -> "45s", 60 -> "1 min", 90 -> "1:30", 1500 -> "25 min"
function fmtSeconds(s) {
  if (s >= 60 && s % 60 === 0) return `${s / 60} min`;
  if (s >= 60) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return `${s}s`;
}

// Seconds -> "m:ss" for timers.
function fmtClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Milliseconds -> "52 min" / "1 h 5 min".
function fmtDuration(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

// Parse a number typed by the user ("135", "62.5", "62,5"). Empty -> null, junk -> undefined.
function parseNum(text) {
  const t = String(text).trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// Round to at most 1 decimal for display.
function num(n) { return Math.round(n * 10) / 10; }

// --- Dates. All in the device's local time; days are keyed "YYYY-MM-DD". ---

function dateKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

// setDate() handles month ends and daylight-saving changes correctly.
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a, b) { return dateKey(a) === dateKey(b); }

function dayLabel(d) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function shortDate(key) { return parseKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function timeLabel(iso) { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }

/* ---------- 3. Storage ---------- */
// Everything lives in localStorage under one key as one JSON object.
// `schemaVersion` lets future versions migrate old data instead of wiping it.

const startupNotices = [];   // messages to show once the UI is ready

// Copy of DEFAULT_ROUTINES with a stable ID on every exercise
// (session checklists remember ticked items by these IDs).
function seedRoutines() {
  const routines = clone(DEFAULT_ROUTINES);
  routines.forEach((r) => r.sections.forEach((s) => s.items.forEach((it) => { it.id = uid(); })));
  return routines;
}

// Built-in habits, in the order of the day. `key` marks them so the app can
// find them later (finishing a routine or check-in auto-checks its habit,
// and merges between devices match them up).
const HABIT_DEFS = [
  { key: "bed", name: "Make bed", icon: "bed" },
  { key: "morning", name: "Morning mobility and stretching routine", icon: "sunrise" },
  { key: "gratitude", name: "Morning gratitude", icon: "heart" },
  { key: "supps-am", name: "Morning supplements", icon: "pill" },
  { key: "news", name: "Read the news", icon: "news" },
  { key: "rehab", name: "Rehab check-in", icon: "pulse" },
  { key: "session", name: "Today's training session", icon: "dumbbell" },
  { key: "supps-pm", name: "Evening supplements", icon: "moon" },
  { key: "journal", name: "Journaling", icon: "pen" },
  { key: "book", name: "Read 1 page of a book", icon: "book" }
];

function newHabit(def, now = new Date().toISOString()) {
  return { id: uid(), ...def, days: ALL_DAYS.slice(), archived: false, createdAt: now };
}

function defaultHabits() {
  const now = new Date().toISOString();
  return HABIT_DEFS.map((def) => newHabit(def, now));
}

// Guess how an exercise is logged from its name.
function guessKind(name) {
  return /push-?ups?|pull-?ups?|chin-?ups?|\bdips?\b|back extensions?/i.test(name) ? "bodyweight" : "lift";
}

// Exercise catalog for the Lifts tab, built from the routines' lifts and holds.
// Built-in exercises get IDs from their names ("ex-front-squats") so phone and
// laptop data line up when merged.
function seedExercises(routines) {
  const out = [];
  const seen = new Set();
  routines.forEach((r) => (r.sections || []).forEach((s) => (s.items || []).forEach((it) => {
    if (it.type !== "lift" && it.type !== "hold") return;
    const id = `ex-${slug(it.name)}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, name: it.name, kind: it.type === "hold" ? "hold" : guessKind(it.name), custom: false });
  })));
  return out;
}

function defaultState() {
  const routines = seedRoutines();
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    habits: defaultHabits(),
    habitLog: {},
    routines,
    sessionOverrides: {},
    routineCompletions: [],
    exercises: seedExercises(routines),
    workouts: [],
    rehabAreas: clone(DEFAULT_REHAB_AREAS),
    rehabLog: {},
    notes: []
  };
}

// One function per schema bump. Each takes data at version N, changes it
// in place to version N + 1, and sets schemaVersion.
const MIGRATIONS = {
  // v1 → v2 (Phase 2): add the default habits if there are none yet.
  1: (d) => {
    if (!Array.isArray(d.habits) || d.habits.length === 0) d.habits = defaultHabits();
    d.schemaVersion = 2;
  },
  // v2 → v3 (Phases 3–5): exercise catalog and rehab areas.
  2: (d) => {
    if (!Array.isArray(d.exercises) || d.exercises.length === 0) {
      d.exercises = seedExercises(Array.isArray(d.routines) ? d.routines : DEFAULT_ROUTINES);
    }
    if (!Array.isArray(d.rehabAreas)) d.rehabAreas = clone(DEFAULT_REHAB_AREAS);
    d.schemaVersion = 3;
  },
  // v3 → v4: full daily habit list, renamed built-ins, habits in order of the day.
  3: (d) => {
    if (!Array.isArray(d.habits)) d.habits = [];
    const byKey = (k) => d.habits.find((h) => h.key === k);
    const renames = { morning: ["Morning routine", "Morning mobility and stretching routine"], session: ["Today's session", "Today's training session"] };
    for (const [key, [oldName, newName]] of Object.entries(renames)) {
      const h = byKey(key);
      if (h && h.name === oldName) h.name = newName;   // only if you hadn't renamed it yourself
    }
    const now = new Date().toISOString();
    for (const def of HABIT_DEFS) {
      if (byKey(def.key)) continue;
      // A habit you already made with the same name becomes the built-in one.
      const same = d.habits.find((h) => !h.key && String(h.name).trim().toLowerCase() === def.name.toLowerCase());
      if (same) same.key = def.key;
      else d.habits.push(newHabit(def, now));
    }
    // Built-ins in order of the day; any other habits keep their order after them.
    const rank = (h) => { const i = HABIT_DEFS.findIndex((def) => def.key === h.key); return i < 0 ? HABIT_DEFS.length : i; };
    d.habits = d.habits.map((h, i) => [h, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([h]) => h);
    d.schemaVersion = 4;
  },
  // v4 → v5: the morning routine's lymphatic flow section becomes one checkbox,
  // and the Lower routine's "knee is cranky" note is removed.
  4: (d) => {
    const lower = (d.routines || []).find((r) => r.id === "lower");
    if (lower && /knee is cranky/i.test(lower.notes || "")) delete lower.notes;
    const morning = (d.routines || []).find((r) => r.id === "morning");
    const section = morning && (morning.sections || []).find((s) => /lymphatic/i.test(s.title));
    const def = DEFAULT_ROUTINES.find((r) => r.id === "morning").sections.find((s) => /lymphatic/i.test(s.title)).items[0];
    if (section && section.items.length > 1) section.items = [{ id: uid(), ...clone(def) }];
    d.schemaVersion = 5;
  },
  // v5 → v6: Upper's band openers + finisher become one "Band work" group
  // (items keep their IDs, so today's ticks survive); Lower's "Iso block" → "Iso work".
  5: (d) => {
    const upper = (d.routines || []).find((r) => r.id === "upper");
    if (upper && Array.isArray(upper.sections)) {
      const openers = upper.sections.find((s) => /band openers/i.test(s.title));
      const finisher = upper.sections.find((s) => /band finisher/i.test(s.title));
      if (openers && finisher) {
        openers.title = "Band work";
        openers.items = [...openers.items, ...finisher.items];
        upper.sections = upper.sections.filter((s) => s !== finisher);
      }
    }
    const lower = (d.routines || []).find((r) => r.id === "lower");
    const iso = lower && (lower.sections || []).find((s) => s.title === "Iso block");
    if (iso) iso.title = "Iso work";
    d.schemaVersion = 6;
  },
  // v6 → v7: emoji habit icons become outline icons. Built-in habits get their
  // default icon; other emoji are mapped where there's a match, else cleared
  // (the habit then shows its first letter).
  6: (d) => {
    (d.habits || []).forEach((h) => {
      const def = HABIT_DEFS.find((x) => x.key === h.key);
      if (def && (!h.icon || EMOJI_TO_ICON[h.icon])) h.icon = def.icon;
      else if (h.icon && !LINE_ICONS[h.icon]) h.icon = EMOJI_TO_ICON[h.icon] || "";
    });
    d.schemaVersion = 7;
  }
};

function migrate(data) {
  const d = clone(data);
  if (!Number.isInteger(d.schemaVersion)) d.schemaVersion = 1;
  while (d.schemaVersion < SCHEMA_VERSION) {
    const step = MIGRATIONS[d.schemaVersion];
    if (!step) throw new Error(`No migration from schema ${d.schemaVersion}`);
    step(d);
  }
  return normalize(d);
}

// Fill in anything missing or the wrong type so the rest of the app can
// trust the shape. Unknown keys are kept, never dropped.
function normalize(d) {
  const base = defaultState();
  for (const key of Object.keys(base)) {
    const want = base[key];
    const have = d[key];
    if (Array.isArray(want)) {
      if (!Array.isArray(have)) d[key] = ["habits", "exercises"].includes(key) ? [] : want;
    } else if (isPlainObject(want)) {
      if (!isPlainObject(have)) d[key] = want;
      else if (key === "settings") d[key] = { ...want, ...have };
    } else if (have === undefined) {
      d[key] = want;
    }
  }

  d.routines.forEach((r) => {
    if (!Array.isArray(r.sections)) r.sections = [];
    r.sections.forEach((s) => {
      if (!Array.isArray(s.items)) s.items = [];
      s.items.forEach((it) => { if (!it.id) it.id = uid(); });
    });
  });

  d.habits = d.habits.filter((h) => isPlainObject(h) && h.id).map((h) => ({
    icon: "",
    archived: false,
    createdAt: new Date().toISOString(),
    ...h,
    name: String(h.name || "Untitled habit"),
    days: Array.isArray(h.days) && h.days.length ? h.days.filter((x) => ALL_DAYS.includes(x)) : ALL_DAYS.slice()
  }));

  d.exercises = d.exercises.filter((e) => isPlainObject(e) && e.id && e.name)
    .map((e) => ({ custom: false, ...e, kind: LIFT_KINDS[e.kind] ? e.kind : "lift" }));

  d.workouts = d.workouts.filter((w) => isPlainObject(w) && w.id).map((w) => ({
    notes: "",
    painScore: null,
    routineId: null,
    ...w,
    entries: (Array.isArray(w.entries) ? w.entries : [])
      .filter((e) => isPlainObject(e) && e.exerciseId)
      .map((e) => ({ ...e, sets: Array.isArray(e.sets) ? e.sets.filter(isPlainObject) : [] }))
  }));

  d.rehabAreas = d.rehabAreas.filter((a) => isPlainObject(a) && a.id && a.name);
  d.notes = d.notes.filter((n) => isPlainObject(n) && n.id)
    .map((n) => ({ title: "", body: "", ...n, tags: Array.isArray(n.tags) ? n.tags : [] }));
  return d;
}

function writeState(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch (err) {
    console.error("Save failed", err);
    toast("Couldn't save. Storage may be full or blocked; export a backup now.", true);
    return false;
  }
}

function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.error("Storage unavailable", err);
    startupNotices.push({ msg: "Storage is blocked in this browser, so changes won't be kept.", error: true });
    return defaultState();
  }

  if (!raw) {                       // first run
    const fresh = defaultState();
    writeState(fresh);
    return fresh;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) throw new Error("Saved data is not an object");
  } catch (err) {
    // Never throw away unreadable data: park it under a side key first.
    console.error("Couldn't read saved data", err);
    const parkedKey = `${STORAGE_KEY}.unreadable-${Date.now()}`;
    try { localStorage.setItem(parkedKey, raw); } catch (_) { /* nothing more we can do */ }
    startupNotices.push({ msg: `Saved data couldn't be read. A copy was kept as "${parkedKey}".`, error: true });
    const fresh = defaultState();
    writeState(fresh);
    return fresh;
  }

  if (parsed.schemaVersion > SCHEMA_VERSION) {
    startupNotices.push({ msg: "This data was saved by a newer version of the app.", error: true });
  }

  try {
    const s = migrate(parsed);
    // Persist migrations right away so seeded IDs stay stable between loads.
    if (parsed.schemaVersion <= SCHEMA_VERSION && JSON.stringify(s) !== raw) writeState(s);
    return s;
  } catch (err) {
    // Readable but can't be upgraded: keep the original untouched, run on defaults.
    console.error("Migration failed", err);
    startupNotices.push({ msg: `Couldn't upgrade saved data (${err.message}). It was left untouched.`, error: true });
    return defaultState();
  }
}

let state = loadState();

// Call after every change.
function save() { return writeState(state); }

// For typing: save shortly after the last keystroke. flushSave() forces it now.
let saveTimer = null;
let afterSave = null;
function saveSoon(callback) {
  clearTimeout(saveTimer);
  afterSave = callback || null;
  saveTimer = setTimeout(flushSave, 400);
}
function flushSave() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  save();
  if (afterSave) { afterSave(); afterSave = null; }
}

// Last-resort undo: stash the current data before replacing it.
function keepSafetyCopy() {
  try { localStorage.setItem(SAFETY_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data: state })); }
  catch (err) { console.warn("Couldn't keep safety copy", err); }
}

/* ---------- 4. Backup (export / import / merge) ---------- */

function exportData() {
  flushSave();
  const payload = { ...state, exportedAt: new Date().toISOString(), appVersion: APP_VERSION };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `health-tracker-${dateKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Backup downloaded");
}

// Returns an error message, or null if the file looks like a valid backup.
function validateImport(obj) {
  if (!isPlainObject(obj)) return "This file isn't a tracker backup.";
  if (!Number.isInteger(obj.schemaVersion) || obj.schemaVersion < 1) {
    return "This file has no schemaVersion, so it isn't a tracker backup.";
  }
  if (obj.schemaVersion > SCHEMA_VERSION) {
    return `This backup is from a newer version of the app (schema ${obj.schemaVersion}). Update the app first.`;
  }
  for (const k of ["habits", "routines", "exercises", "workouts", "notes", "routineCompletions", "rehabAreas"]) {
    if (k in obj && !Array.isArray(obj[k])) return `"${k}" in this file should be a list.`;
  }
  for (const k of ["settings", "habitLog", "sessionOverrides", "rehabLog"]) {
    if (k in obj && !isPlainObject(obj[k])) return `"${k}" in this file should be an object.`;
  }
  return null;
}

// Union two lists by id. On a clash keep the newer one (by updatedAt), else keep local.
function mergeById(local, incoming) {
  const map = new Map(local.map((x) => [x.id, x]));
  for (const item of incoming) {
    if (!item || !item.id) continue;
    const mine = map.get(item.id);
    if (!mine || (item.updatedAt && mine.updatedAt && item.updatedAt > mine.updatedAt)) map.set(item.id, item);
  }
  return [...map.values()];
}

// Built-in habits (morning/session/rehab) get different IDs on each device.
// Match them by `key` so a merge doesn't create duplicates; idMap translates
// the incoming habit IDs to the local ones for the check-off log.
function mergeHabits(local, incoming) {
  const localByKey = new Map(local.filter((h) => h.key).map((h) => [h.key, h]));
  const idMap = {};
  const rest = [];
  for (const h of incoming) {
    const twin = h.key && localByKey.get(h.key);
    if (twin && twin.id !== h.id) idMap[h.id] = twin.id;
    else rest.push(h);
  }
  return { habits: mergeById(local, rest), idMap };
}

// Exercises created on both devices with the same name are the same exercise.
function mergeExercises(local, incoming) {
  const localIds = new Set(local.map((e) => e.id));
  const localByName = new Map(local.map((e) => [e.name.trim().toLowerCase(), e]));
  const idMap = {};
  const rest = [];
  for (const e of incoming) {
    const twin = localByName.get(e.name.trim().toLowerCase());
    if (!localIds.has(e.id) && twin) idMap[e.id] = twin.id;
    else rest.push(e);
  }
  return { exercises: mergeById(local, rest), idMap };
}

function mergeStates(local, incoming) {
  const out = clone(local);
  for (const k of ["routines", "notes", "rehabAreas"]) out[k] = mergeById(local[k], incoming[k]);

  const ex = mergeExercises(local.exercises, incoming.exercises);
  out.exercises = ex.exercises;
  const incomingWorkouts = incoming.workouts.map((w) => ({
    ...w,
    entries: w.entries.map((e) => ({ ...e, exerciseId: ex.idMap[e.exerciseId] || e.exerciseId }))
  }));
  out.workouts = mergeById(local.workouts, incomingWorkouts);

  const { habits, idMap } = mergeHabits(local.habits, incoming.habits);
  out.habits = habits;

  // Habit check-offs: a habit counts as done if either copy has it done.
  for (const [day, checks] of Object.entries(incoming.habitLog)) {
    const merged = { ...(out.habitLog[day] || {}) };
    for (const [habitId, done] of Object.entries(checks)) {
      const id = idMap[habitId] || habitId;
      if (done) merged[id] = true;
    }
    out.habitLog[day] = merged;
  }

  // Per-day records: local wins, missing days come from the import.
  out.sessionOverrides = { ...incoming.sessionOverrides, ...local.sessionOverrides };
  out.rehabLog = { ...incoming.rehabLog, ...local.rehabLog };

  const seen = new Set(local.routineCompletions.map((c) => `${c.date}|${c.routineId}`));
  for (const c of incoming.routineCompletions) {
    const key = `${c.date}|${c.routineId}`;
    if (!seen.has(key)) { out.routineCompletions.push(c); seen.add(key); }
  }
  return out; // settings stay as they are on this device
}

function describeData(d) {
  return [
    plural(d.habits.length, "habit"),
    plural(d.workouts.length, "workout"),
    plural(Object.keys(d.rehabLog).length, "rehab check-in"),
    plural(d.notes.length, "note")
  ].join(", ");
}

async function importFromFile(file) {
  let obj;
  try {
    obj = JSON.parse(await file.text());
  } catch (err) {
    await alertBox("Can't import", "That file isn't valid JSON.");
    return;
  }

  const problem = validateImport(obj);
  if (problem) { await alertBox("Can't import", problem); return; }

  delete obj.exportedAt;
  delete obj.appVersion;
  let incoming;
  try {
    incoming = migrate(obj);
  } catch (err) {
    await alertBox("Can't import", err.message);
    return;
  }

  const choice = await ask({
    title: "Import backup",
    body: `The backup has ${describeData(incoming)}.\nThis device has ${describeData(state)}.\n\n` +
          "Replace: this device's data is swapped for the backup.\nMerge: anything missing here is added from the backup.",
    buttons: [
      { label: "Cancel", value: "cancel" },
      { label: "Merge", value: "merge" },
      { label: "Replace", value: "replace", kind: "btn-danger" }
    ]
  });
  if (choice !== "merge" && choice !== "replace") return;

  flushSave();
  keepSafetyCopy();
  state = choice === "replace" ? incoming : mergeStates(state, incoming);
  if (save()) toast(choice === "replace" ? "Data replaced from backup" : "Backup merged");
  renderAll();
}

/* ---------- 5. UI helpers ---------- */

let toastTimer = null;
function toast(msg, isError = false) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("is-error", isError);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), isError ? 5000 : 2400);
}

// Promise-based dialog. Resolves to the clicked button's value, or null if dismissed (Esc).
// buttons: [{ label, value, kind }] where kind is an extra class like "btn-primary".
// stacked: true shows the buttons as a full-width list (for picking from options).
function ask({ title, body, buttons, stacked = false }) {
  return new Promise((resolve) => {
    const dlg = document.getElementById("modal");
    dlg.querySelector(".modal-title").textContent = title;
    dlg.querySelector(".modal-body").textContent = body || "";
    dlg.querySelector(".modal-body").hidden = !body;
    const actions = dlg.querySelector(".modal-actions");
    actions.classList.toggle("is-stacked", stacked);
    actions.innerHTML = "";
    // Resolve right away on a click; the close event only matters for Esc.
    let settled = false;
    const onClose = () => { if (!dlg.open) settle(dlg.returnValue || null); };   // ignore a late event from a previous dialog
    const settle = (value) => {
      if (settled) return;
      settled = true;
      dlg.removeEventListener("close", onClose);
      resolve(value);
    };
    for (const b of buttons) {
      const btn = document.createElement("button");
      btn.className = `btn ${b.kind || ""}`;
      btn.textContent = b.label;
      btn.addEventListener("click", () => { settle(b.value); dlg.close(b.value); });
      actions.appendChild(btn);
    }
    dlg.returnValue = "";
    dlg.addEventListener("close", onClose);
    dlg.showModal();
  });
}

function alertBox(title, body) { return ask({ title, body, buttons: [{ label: "OK", value: "ok" }] }); }

async function confirmBox(title, body, okLabel = "Delete") {
  const r = await ask({ title, body, buttons: [{ label: "Cancel", value: "no" }, { label: okLabel, value: "yes", kind: "btn-danger" }] });
  return r === "yes";
}

// Generic form dialog. `html` is the form's fields; `read(form)` returns the
// result, or an error string to show. `setup(form, finish)` can wire extra
// behaviour; finish(value) closes the dialog with that value.
function formDialog({ title, html, submitLabel = "Save", setup, read }) {
  return new Promise((resolve) => {
    const dlg = document.getElementById("form-dialog");
    const form = document.createElement("form");   // fresh element = no leftover listeners
    form.noValidate = true;
    form.innerHTML = `
      <h2 class="modal-title">${esc(title)}</h2>
      ${html}
      <p class="form-error" hidden></p>
      <div class="modal-actions">
        <button type="button" class="btn" data-form="cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">${esc(submitLabel)}</button>
      </div>`;
    dlg.replaceChildren(form);

    // Resolve right away on Save/Cancel; the close event only matters for Esc.
    let settled = false;
    const onClose = () => { if (!dlg.open) settle(null); };   // ignore a late event from a previous dialog
    const settle = (value) => {
      if (settled) return;
      settled = true;
      dlg.removeEventListener("close", onClose);
      resolve(value);
    };
    const finish = (value) => { settle(value); dlg.close("save"); };
    form.addEventListener("click", (e) => {
      if (e.target.closest('[data-form="cancel"]')) { settle(null); dlg.close(""); }
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const out = read(form);
      if (typeof out === "string") {
        const err = form.querySelector(".form-error");
        err.textContent = out;
        err.hidden = false;
        return;
      }
      finish(out);
    });
    if (setup) setup(form, finish);

    dlg.addEventListener("close", onClose);
    dlg.returnValue = "";
    dlg.showModal();
    const first = form.querySelector("input:not([type=checkbox]), textarea");
    if (first) first.focus();
  });
}

const ICONS = {
  chevron: '<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>',
  alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  trend: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
};

// Expand/collapse a card without re-rendering, so the animation plays.
function toggleOpen(container, button, set, id) {
  const open = !container.classList.contains("open");
  container.classList.toggle("open", open);
  button.setAttribute("aria-expanded", String(open));
  if (open) set.add(id); else set.delete(id);
}

function prefersReducedMotion() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

function painClass(v) { return v <= 3 ? "ok" : v <= 6 ? "warn" : "bad"; }

/* ---------- 6. Sound, vibration, screen wake, countdowns ---------- */

// Browsers only allow audio after a tap, so call unlockAudio() from a click handler.
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (_) { /* no audio support */ }
}

function beep({ freq = 880, duration = 0.15, volume = 0.25, when = 0 } = {}) {
  if (!state.settings.sound || !audioCtx) return;
  const t = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function buzz(pattern) {
  if (!state.settings.vibrate || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch (_) { /* ignore */ }
}

const signals = {
  tick() { beep({ freq: 660, duration: 0.07, volume: 0.15 }); },
  go() { beep({ freq: 1180, duration: 0.14 }); buzz(80); },
  holdEnd() { beep({ freq: 990, duration: 0.18 }); beep({ freq: 990, duration: 0.18, when: 0.24 }); buzz([200, 100, 200]); },
  allDone() {
    beep({ freq: 880, duration: 0.15 }); beep({ freq: 1110, duration: 0.15, when: 0.18 }); beep({ freq: 1320, duration: 0.35, when: 0.36 });
    buzz([200, 100, 200, 100, 400]);
  },
  restEnd() { beep({ freq: 880, duration: 0.2 }); beep({ freq: 1320, duration: 0.3, when: 0.25 }); buzz([300, 120, 300]); }
};

// Keep the phone screen on while a timer runs (where supported).
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && "wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (_) { /* not allowed here (e.g. opened from a file) */ }
}

// Drift-free countdown based on the clock, not on counting ticks.
// onTick(msLeft) runs ~10x a second; onDone() once at zero.
function createCountdown(seconds, onTick, onDone) {
  let endAt = Date.now() + seconds * 1000;
  let remaining = seconds * 1000;
  let paused = false;
  let finished = false;
  let timer = null;
  const loop = () => {
    if (paused || finished) return;
    const left = Math.max(0, endAt - Date.now());
    onTick(left);
    if (left <= 0) { finished = true; clearInterval(timer); onDone(); }
  };
  return {
    start() { timer = setInterval(loop, 100); loop(); },
    stop() { finished = true; clearInterval(timer); },
    pause() { if (paused) return; paused = true; remaining = Math.max(0, endAt - Date.now()); },
    resume() { if (!paused) return; paused = false; endAt = Date.now() + remaining; loop(); },
    add(sec) {
      if (paused) { remaining = Math.max(0, remaining + sec * 1000); onTick(remaining); }
      else { endAt += sec * 1000; loop(); }
    },
    get paused() { return paused; }
  };
}

/* ---------- 7. Charts ---------- */
// Thin wrapper over Chart.js with the app's dark theme. Returns false if
// Chart.js didn't load (offline first run), so callers can show a fallback.

const charts = {};
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function drawLineChart(canvasId, { labels, datasets, yMin, yMax, unit = "" }) {
  if (charts[canvasId]) { charts[canvasId].destroy(); delete charts[canvasId]; }
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return false;

  const text = cssVar("--text");
  const muted = cssVar("--text-muted");
  const grid = cssVar("--chart-grid");
  const seriesCount = datasets.filter((d) => !d.reference).length;

  charts[canvasId] = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: datasets.map((d) => ({
        borderWidth: d.reference ? 1 : 2,
        pointRadius: d.reference ? 0 : 4,
        pointHoverRadius: d.reference ? 0 : 6,
        pointBorderWidth: 2,
        pointBorderColor: cssVar("--surface"),
        pointBackgroundColor: d.color,
        borderColor: d.color,
        backgroundColor: d.color,
        borderDash: d.reference ? [4, 4] : [],
        tension: 0.25,
        spanGaps: true,
        ...d
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: prefersReducedMotion() ? false : { duration: 350 },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: seriesCount > 1,
          align: "start",
          labels: { color: text, boxWidth: 14, boxHeight: 3, padding: 14, filter: (item, data) => !data.datasets[item.datasetIndex].reference }
        },
        tooltip: {
          backgroundColor: cssVar("--surface-3"),
          borderColor: cssVar("--border-strong"),
          borderWidth: 1,
          titleColor: text,
          bodyColor: text,
          padding: 10,
          boxPadding: 4,
          filter: (item) => !item.dataset.reference,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}${unit}` }
        }
      },
      scales: {
        x: { grid: { display: false }, border: { color: grid }, ticks: { color: muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
        y: { min: yMin, max: yMax, grid: { color: grid }, border: { display: false }, ticks: { color: muted, maxTicksLimit: 6 } }
      }
    }
  });
  return true;
}

function chartFallbackHTML() {
  return '<p class="hint chart-fallback">Charts need an internet connection the first time the app loads. The numbers are in the table below.</p>';
}

/* ---------- 8. Navigation ---------- */
// The URL hash (#routines etc.) picks the tab, so refresh and back/forward work.

let currentTab = "today";
function showTab(name) {
  if (!TABS.includes(name)) name = "today";
  if (currentTab === "notes" && name !== "notes" && notesUI.editingId) closeNoteEditor(false);
  currentTab = name;
  document.body.dataset.tab = name;   // lets CSS hide the ⏱ button on the Timer tab
  for (const t of TABS) {
    document.getElementById(`tab-${t}`).hidden = t !== name;
  }
  const navTab = name === "calendar" ? "today" : name;   // the calendar lives under Today
  document.querySelectorAll(".nav-link").forEach((a) => {
    if (a.dataset.tab === navTab) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  // Charts can't size themselves while hidden, so draw them when shown.
  if (name === "lifts") renderLifts();
  if (name === "rehab") renderRehab();
  if (name === "timer") renderTimerTab();
  if (name === "calendar") renderCalendar();
  window.scrollTo(0, 0);
}

function goToTab(name) {
  if (location.hash === `#${name}`) showTab(name);
  else location.hash = name;   // triggers showTab via hashchange
}

/* ---------- 9. Schedule helpers ---------- */

// Which schedule day (1–7) a date falls on, given the configured start weekday.
function scheduleDayNumber(date = new Date()) {
  return ((date.getDay() - state.settings.scheduleStartWeekday + 7) % 7) + 1;
}

// Weekday index (0 = Sunday) for a schedule day number.
function weekdayForDay(dayNum) {
  return (state.settings.scheduleStartWeekday + dayNum - 1) % 7;
}

function scheduledRoutineId(date = new Date()) {
  const entry = DEFAULT_SCHEDULE.find((s) => s.day === scheduleDayNumber(date));
  return entry ? entry.routineId : "rest";
}

// What's actually planned for a date: a one-day override if set, else the schedule.
function effectiveRoutineId(date = new Date()) {
  return state.sessionOverrides[dateKey(date)] || scheduledRoutineId(date);
}

function setTodayOverride(routineId) {
  const key = dateKey();
  if (routineId === scheduledRoutineId()) delete state.sessionOverrides[key];
  else state.sessionOverrides[key] = routineId;
  save();
}

function getRoutine(id) { return state.routines.find((r) => r.id === id); }
function routineName(id) { const r = getRoutine(id); return r ? r.name : id; }

// Session choices for the override picker, in schedule order.
const SESSION_CHOICES = ["upper", "lower", "active-rest", "rest"];

/* ---------- 10. Habit logic ---------- */

function activeHabits() { return state.habits.filter((h) => !h.archived); }
function findHabit(id) { return state.habits.find((h) => h.id === id); }

// Is the habit due on this date? "Today's session" follows the schedule
// (due on any non-Rest day); other habits use their chosen weekdays.
function appliesOn(h, date) {
  if (h.key === "session") return effectiveRoutineId(date) !== "rest";
  return h.days.includes(date.getDay());
}

function isDone(h, key) {
  const day = state.habitLog[key];
  return !!(day && day[h.id]);
}

function setDone(habitId, key, done) {
  if (done) {
    if (!state.habitLog[key]) state.habitLog[key] = {};
    state.habitLog[key][habitId] = true;
  } else if (state.habitLog[key]) {
    delete state.habitLog[key][habitId];
    if (Object.keys(state.habitLog[key]).length === 0) delete state.habitLog[key];
  }
  save();
}

// Tick a built-in habit (by key) for a date. Returns the habit, or null.
function autoCheckHabit(key, date = dateKey()) {
  if (!key) return null;
  const h = state.habits.find((x) => x.key === key && !x.archived);
  if (!h) return null;
  if (!isDone(h, date)) setDone(h.id, date, true);
  return h;
}

function habitKeyForRoutine(routineId) {
  if (routineId === "morning") return "morning";
  if (["upper", "lower", "active-rest"].includes(routineId)) return "session";
  return null;
}

// Earliest day the habit has data for: its creation day or its first check-off.
function firstTrackedDate(h) {
  let first = startOfDay(new Date(h.createdAt || Date.now()));
  for (const [key, checks] of Object.entries(state.habitLog)) {
    if (checks[h.id]) {
      const d = parseKey(key);
      if (d < first) first = d;
    }
  }
  return first;
}

// Walk forward from the first tracked day. Days the habit isn't due are
// skipped (they neither count nor break a streak), and today not being done
// yet doesn't break it either, so `run` at the end is the current streak.
function habitStreaks(h) {
  const today = startOfDay();
  let run = 0;
  let best = 0;
  for (let d = firstTrackedDate(h); d <= today; d = addDays(d, 1)) {
    if (!appliesOn(h, d)) continue;
    if (isDone(h, dateKey(d))) {
      run++;
      if (run > best) best = run;
    } else if (!sameDay(d, today)) {
      run = 0;
    }
  }
  return { current: run, best };
}

function describeDays(h) {
  if (h.key === "session") return "Training days";
  const days = h.days.slice().sort();
  if (days.length === 7) return "Every day";
  if (days.join() === "1,2,3,4,5") return "Weekdays";
  if (days.join() === "0,6") return "Weekends";
  // List in week order, starting from the schedule's Day 1.
  const start = state.settings.scheduleStartWeekday;
  return days.slice().sort((a, b) => ((a - start + 7) % 7) - ((b - start + 7) % 7))
    .map((d) => WEEKDAYS_SHORT[d]).join(", ");
}

function streakLabel(s) {
  return s.current > 0 ? `${s.current}-day streak` : "No streak yet";
}

// Outline icon in a quiet tile; habits without an icon show their first letter.
function habitIconHTML(h) {
  if (LINE_ICONS[h.icon]) return `<span class="habit-icon" aria-hidden="true">${lineIcon(h.icon)}</span>`;
  return `<span class="habit-icon is-letter" aria-hidden="true">${esc(h.name.trim().charAt(0).toUpperCase() || "•")}</span>`;
}

/* ---------- 11. Today tab ---------- */

const RING_CIRCUMFERENCE = 2 * Math.PI * 28;   // r = 28 in the ring's viewBox

// Highest pain score logged today, from the rehab check-in or a workout.
function painToday() {
  const key = dateKey();
  const scores = [];
  const rehab = state.rehabLog[key];
  if (rehab && isPlainObject(rehab.areas)) scores.push(...Object.values(rehab.areas).map(Number));
  state.workouts.forEach((w) => { if (w.date === key && w.painScore != null) scores.push(Number(w.painScore)); });
  const valid = scores.filter((n) => Number.isFinite(n));
  return valid.length ? Math.max(...valid) : null;
}

function renderToday() {
  const now = new Date();
  document.getElementById("today-date").textContent =
    now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const pain = painToday();
  const active = activeWorkout();
  const needsCheckIn = !state.rehabLog[dateKey()] && state.rehabAreas.length > 0;
  document.getElementById("today-content").innerHTML = `
    ${dayCardHTML()}
    ${pain !== null && pain > 3 ? `
      <section class="card alert-card" role="alert">
        <h2 class="card-title">${ICONS.alert}Pain was ${pain}/10 today</h2>
        <p class="hint">${esc(PAIN_RULE)}</p>
      </section>` : ""}
    ${active ? `
      <button class="card resume-card" data-action="resume-lifts">
        <span><span class="mini-label">Lift session in progress</span>
        <span class="resume-title">${esc(workoutTitle(active))} · started ${timeLabel(active.startedAt)}</span></span>
        ${ICONS.arrow}
      </button>` : ""}
    ${todaySessionHTML()}
    ${todayHabitsHTML()}
    ${needsCheckIn ? `
      <section class="card">
        <h2 class="card-title">Rehab check-in</h2>
        <p class="hint check-in-hint">How do things feel today? 0 = nothing, 10 = worst.</p>
        ${rehabFormHTML("today", dateKey())}
      </section>` : ""}
  `;
}

// --- Whole-day progress: morning routine + every habit due + training ---
// Only reaches 100% when the morning routine session is finished, every
// habit due today is ticked, and today's training is done.

const DAY_RING = 2 * Math.PI * 52;   // r = 52 in the day ring's viewBox

// Works for any date (the Calendar uses it for past days). A habit only counts
// on days it existed: from its creation day or first check-off, whichever is earlier.
function habitsDueOn(date, starts) {
  const day = startOfDay(date);
  return activeHabits().filter((h) => appliesOn(h, day) && day >= (starts ? starts.get(h.id) : firstTrackedDate(h)));
}

function dayProgress(date = new Date(), starts = null) {
  const day = startOfDay(date);
  const key = dateKey(day);
  const due = habitsDueOn(day, starts);
  const habitsDone = due.filter((h) => isDone(h, key)).length;

  const morning = getRoutine("morning");
  const morningDone = morning ? routineProgress(morning, key).finished : false;

  const id = effectiveRoutineId(day);
  const r = getRoutine(id);
  const trainingDue = id !== "rest" && !!r && sessionItems(r).length > 0;
  const liftDay = trainingDue && sessionItems(r).some((i) => i.type === "lift");
  const training = trainingDue ? trainingParts(r, key) : [];

  const parts = [];
  if (morning) parts.push({ id: "morning", label: "Morning mobility", detail: morningDone ? "Done" : "Not finished", done: morningDone });
  parts.push({ id: "habits", label: "Habits", detail: `${habitsDone} of ${due.length}`, done: habitsDone === due.length });
  parts.push(...training);

  // Each habit counts once; the morning routine and each training part count once each.
  const total = due.length + (morning ? 1 : 0) + training.length;
  const done = habitsDone + (morningDone ? 1 : 0) + training.filter((p) => p.done).length;
  return { parts, frac: total ? done / total : 0, liftDay, routineId: id, due, key };
}

// Today's training, split into parts that each have to be done:
//  - lift days: "Lifts" (a logged lift session, or every lift ticked in the checklist)
//    plus one part per non-lift group, e.g. "Band work" or "Iso work" (every item ticked);
//  - other days (Active Rest): the whole checklist.
function trainingParts(r, key) {
  const c = findCompletion(key, r.id);
  const ticked = new Set(c ? c.completedItemIds : []);
  const liftItems = sessionItems(r).filter((i) => i.type === "lift");

  if (!liftItems.length) {
    const p = routineProgress(r, key);
    const done = p.finished || (p.total > 0 && p.done === p.total);
    return [{ id: "session", label: r.name, detail: done ? "Done" : `${p.done} of ${p.total}`, done }];
  }

  // A finished lift session today for this routine (or a blank session) counts.
  const liftLogged = state.workouts.some((w) => w.finishedAt && w.date === key && (!w.routineId || w.routineId === r.id));
  const liftsTicked = liftItems.filter((i) => ticked.has(i.id)).length;
  const liftsDone = liftLogged || liftsTicked === liftItems.length;
  const parts = [{
    id: "lifts",
    label: `Lifts · ${r.name}`,
    detail: liftsDone ? (liftLogged ? "Logged" : "Done") : "Not logged yet",
    done: liftsDone
  }];
  for (const s of workSections(r)) {
    const items = s.items.filter((i) => i.type !== "info");
    const n = items.filter((i) => ticked.has(i.id)).length;
    parts.push({ id: "work", label: s.title, detail: `${n} of ${items.length}`, done: n === items.length });
  }
  return parts;
}

// Groups in a routine that aren't lifts (Band work, Iso work).
function workSections(r) {
  return r.sections.filter((s) => {
    const items = s.items.filter((i) => i.type !== "info");
    return items.length && !items.some((i) => i.type === "lift");
  });
}

function dayCardHTML(offsetOverride) {
  const p = dayProgress();
  const pct = Math.round(p.frac * 100);
  const offset = offsetOverride ?? (DAY_RING * (1 - p.frac)).toFixed(2);
  return `<section class="card day-card ${p.frac === 1 ? "is-complete" : ""}" id="day-card">
    <div class="day-ring-wrap">
      <svg class="day-ring" viewBox="0 0 120 120" aria-hidden="true">
        <circle class="day-ring-track" cx="60" cy="60" r="52"/>
        <circle class="day-ring-fill" id="day-ring-fill" cx="60" cy="60" r="52" transform="rotate(-90 60 60)"
          stroke-dasharray="${DAY_RING.toFixed(2)}" stroke-dashoffset="${offset}" data-target="${(DAY_RING * (1 - p.frac)).toFixed(2)}"/>
      </svg>
      <span class="day-ring-label"><span class="day-pct">${pct}%</span><span class="day-sub">${p.frac === 1 ? "Day done" : "of today"}</span></span>
    </div>
    <ul class="day-parts" aria-label="Today's progress: ${pct}%">
      ${p.parts.map((part) => `<li>
        <button class="day-part ${part.done ? "done" : ""}" data-day-part="${part.id}">
          <span class="check">${ICONS.check}</span>
          <span class="day-part-text"><span class="day-part-label">${esc(part.label)}</span><span class="day-part-detail">${esc(part.detail)}</span></span>
        </button>
      </li>`).join("")}
    </ul>
  </section>`;
}

// Re-render the day card, animating the ring from where it was.
function updateDayCard() {
  const card = document.getElementById("day-card");
  if (!card) return;
  const old = card.querySelector("#day-ring-fill").getAttribute("stroke-dashoffset");
  card.outerHTML = dayCardHTML(old);
  const fill = document.getElementById("day-ring-fill");
  requestAnimationFrame(() => requestAnimationFrame(() => fill.setAttribute("stroke-dashoffset", fill.dataset.target)));
}

function onDayPartClick(part) {
  if (part === "morning") openSession("morning");
  if (part === "habits") {
    const card = document.querySelector(".today-habits");
    if (card) scrollToCard(card.closest(".card"));
  }
  const p = dayProgress();
  if (part === "lifts") startOrResumeWorkout(p.routineId);
  if (part === "work" || part === "session") openSession(p.routineId);
}

function todaySessionHTML() {
  const scheduledId = scheduledRoutineId();
  const id = effectiveRoutineId();
  const r = getRoutine(id);
  const overridden = id !== scheduledId;
  const progress = r && id !== "rest" ? routineProgress(r) : null;
  const morning = getRoutine("morning");
  const morningProgress = morning ? routineProgress(morning) : null;
  const hasLifts = r && sessionItems(r).some((i) => i.type === "lift");

  let detail;
  if (id === "rest") detail = "Full rest. Morning routine only.";
  else if (progress && progress.finished) detail = "Finished today ✓";
  else if (progress && progress.done) detail = `In progress · ${progress.done} of ${progress.total} done`;
  else if (overridden) detail = `Changed for today · schedule says ${esc(routineName(scheduledId))}`;
  else detail = `Day ${scheduleDayNumber()} of your week${progress ? ` · ${plural(progress.total, "item")}` : ""}`;

  const startId = id === "rest" ? "morning" : id;
  const startLabel = progress && progress.done && !progress.finished ? "Continue" : "Start";
  return `<section class="card session-card">
    <p class="mini-label">Today's training session</p>
    <h2 class="session-name">${esc(routineName(id))}${overridden ? ' <span class="pill pill-warning">Changed</span>' : ""}</h2>
    <p class="hint">${detail}</p>
    <div class="btn-row">
      <button class="btn btn-primary" data-start-session="${esc(startId)}">${ICONS.play}${startLabel} ${esc(routineName(startId))}</button>
      ${hasLifts ? `<button class="btn" data-action="log-lifts" data-routine="${esc(id)}">${activeWorkout() ? "Resume lifts" : "Log lifts"}</button>` : ""}
      <button class="btn" data-action="change-session">Change</button>
    </div>
    ${id !== "rest" && morning ? `
      <button class="link-row" data-start-session="morning">
        <span class="link-row-label">${lineIcon("sunrise")}Morning mobility and stretching <span class="muted">· ${morningProgress.finished ? "done ✓" : `${morningProgress.done}/${morningProgress.total}`}</span></span>${ICONS.arrow}
      </button>` : ""}
  </section>`;
}

function todayHabitsHTML() {
  const today = startOfDay();
  const key = dateKey();
  const due = activeHabits().filter((h) => appliesOn(h, today));
  const done = due.filter((h) => isDone(h, key)).length;

  const rows = due.map((h) => {
    const checked = isDone(h, key);
    return `<li>
      <button class="today-habit ${checked ? "done" : ""}" data-today-check="${esc(h.id)}" aria-pressed="${checked}">
        <span class="check">${ICONS.check}</span>
        ${habitIconHTML(h)}
        <span class="habit-text">
          <span class="habit-name">${esc(h.name)}</span>
          <span class="habit-meta">${esc(todayHabitMeta(h))}</span>
        </span>
      </button>
    </li>`;
  }).join("");

  return `<section class="card">
    <div class="progress-head">
      ${ringHTML(done, due.length)}
      <div class="progress-text">
        <h2 class="card-title">Habits</h2>
        <p class="hint" id="today-progress-text">${progressText(done, due.length)}</p>
      </div>
      <a class="btn btn-ghost" href="#habits">Manage</a>
    </div>
    ${due.length
      ? `<ul class="today-habits">${rows}</ul>`
      : `<p class="hint">No habits are due today. Add or edit them in the Habits tab.</p>`}
  </section>`;
}

function todayHabitMeta(h) {
  return [h.key === "session" ? routineName(effectiveRoutineId()) : "", streakLabel(habitStreaks(h))]
    .filter(Boolean).join(" · ");
}

function progressText(done, total) {
  if (!total) return "Nothing due today";
  return done === total ? "All done today" : `${done} of ${total} done`;
}

function ringHTML(done, total) {
  const frac = total ? done / total : 0;
  return `<div class="ring-wrap" id="today-ring">
    <svg class="ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle class="ring-track" cx="32" cy="32" r="28"/>
      <circle class="ring-fill ${frac === 1 ? "is-full" : ""}" cx="32" cy="32" r="28" transform="rotate(-90 32 32)"
        stroke-dasharray="${RING_CIRCUMFERENCE.toFixed(2)}"
        stroke-dashoffset="${(RING_CIRCUMFERENCE * (1 - frac)).toFixed(2)}"/>
    </svg>
    <span class="ring-label">${done}/${total}</span>
  </div>`;
}

// Update the ring and checklist row in place so the fill and pop animate.
function patchTodayHabit(row, h) {
  const key = dateKey();
  const checked = isDone(h, key);
  row.classList.toggle("done", checked);
  row.setAttribute("aria-pressed", String(checked));
  row.classList.remove("pop");
  if (checked) { void row.offsetWidth; row.classList.add("pop"); }   // restart the pop animation
  row.querySelector(".habit-meta").textContent = todayHabitMeta(h);

  const due = activeHabits().filter((x) => appliesOn(x, startOfDay()));
  const done = due.filter((x) => isDone(x, key)).length;
  const frac = due.length ? done / due.length : 0;
  const ring = document.getElementById("today-ring");
  const fill = ring.querySelector(".ring-fill");
  fill.setAttribute("stroke-dashoffset", (RING_CIRCUMFERENCE * (1 - frac)).toFixed(2));
  fill.classList.toggle("is-full", frac === 1);
  ring.querySelector(".ring-label").textContent = `${done}/${due.length}`;
  document.getElementById("today-progress-text").textContent = progressText(done, due.length);
  updateDayCard();
}

async function changeTodaySession() {
  const current = effectiveRoutineId();
  const scheduled = scheduledRoutineId();
  const choice = await ask({
    title: "Change today's session",
    body: `Your schedule says ${routineName(scheduled)}. The change only applies to today.`,
    stacked: true,
    buttons: [
      ...SESSION_CHOICES.map((id) => ({
        label: id === scheduled ? `${routineName(id)} (scheduled)` : routineName(id),
        value: id,
        kind: id === current ? "btn-primary" : ""
      })),
      { label: "Cancel", value: "cancel", kind: "btn-ghost" }
    ]
  });
  if (!choice || choice === "cancel" || choice === current) return;
  setTodayOverride(choice);
  renderAll();
  toast(choice === scheduled ? "Back to the scheduled session" : `Today is now ${routineName(choice)}`);
}

function onTodayClick(e) {
  const row = e.target.closest("[data-today-check]");
  if (row) {
    const h = findHabit(row.dataset.todayCheck);
    if (!h) return;
    setDone(h.id, dateKey(), !isDone(h, dateKey()));
    patchTodayHabit(row, h);
    renderHabits();
    return;
  }
  const part = e.target.closest("[data-day-part]");
  if (part) { onDayPartClick(part.dataset.dayPart); return; }
  const start = e.target.closest("[data-start-session]");
  if (start) { openSession(start.dataset.startSession); return; }
  if (e.target.closest('[data-action="change-session"]')) { changeTodaySession(); return; }
  const lifts = e.target.closest('[data-action="log-lifts"]');
  if (lifts) { startOrResumeWorkout(lifts.dataset.routine); return; }
  if (e.target.closest('[data-action="resume-lifts"]')) { liftsUI.view = "log"; liftsUI.editingId = null; goToTab("lifts"); return; }
  onRehabFormClick(e);
}

/* ---------- 12. Habits tab ---------- */

const habitUI = { open: new Set() };

function renderHabits() {
  const active = activeHabits();
  const archived = state.habits.filter((h) => h.archived);
  document.getElementById("habits-content").innerHTML = `
    ${active.length
      ? active.map((h, i) => habitCardHTML(h, i, active.length)).join("")
      : `<section class="card empty">
           <h2 class="card-title">No habits yet</h2>
           <p class="hint">Tap “Add habit” to create one.</p>
         </section>`}
    ${archived.length ? `
      <details class="archived">
        <summary>Archived (${archived.length})</summary>
        <ul class="archived-list">
          ${archived.map((h) => `<li class="archived-row">
            ${habitIconHTML(h)}
            <span class="habit-name">${esc(h.name)}</span>
            <button class="btn btn-small" data-habit-action="restore" data-id="${esc(h.id)}">Restore</button>
            <button class="btn btn-small btn-danger" data-habit-action="delete" data-id="${esc(h.id)}">Delete</button>
          </li>`).join("")}
        </ul>
      </details>` : ""}
  `;
}

function habitCardHTML(h, index, total) {
  const today = startOfDay();
  const dueToday = appliesOn(h, today);
  const checked = isDone(h, dateKey(today));
  const s = habitStreaks(h);
  const open = habitUI.open.has(h.id);
  const meta = `${streakLabel(s)} · best ${s.best} · ${describeDays(h)}`;

  return `<article class="card habit ${open ? "open" : ""}" id="habit-${esc(h.id)}">
    <div class="habit-head">
      <button class="check-btn ${checked ? "done" : ""}" data-habit-check="${esc(h.id)}"
        aria-pressed="${checked}" ${dueToday ? "" : "disabled"}
        aria-label="${dueToday ? `Mark ${esc(h.name)} done today` : `${esc(h.name)} isn't due today`}">
        <span class="check">${dueToday ? ICONS.check : '<span class="not-due">–</span>'}</span>
      </button>
      <button class="habit-toggle" data-toggle-habit="${esc(h.id)}" aria-expanded="${open}">
        ${habitIconHTML(h)}
        <span class="habit-text">
          <span class="habit-name">${esc(h.name)}</span>
          <span class="habit-meta">${esc(meta)}</span>
        </span>
        ${ICONS.chevron}
      </button>
    </div>
    <div class="collapse"><div class="collapse-inner"><div class="habit-body">
      <h3 class="mini-label">Last 7 days</h3>
      ${weekStripHTML(h)}
      <h3 class="mini-label">Last ${HEATMAP_WEEKS} weeks</h3>
      ${heatmapHTML(h)}
      <div class="btn-row habit-actions">
        <button class="btn btn-small" data-habit-action="edit" data-id="${esc(h.id)}">Edit</button>
        <button class="btn btn-small" data-habit-action="up" data-id="${esc(h.id)}" ${index === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
        <button class="btn btn-small" data-habit-action="down" data-id="${esc(h.id)}" ${index === total - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
        <button class="btn btn-small" data-habit-action="archive" data-id="${esc(h.id)}">Archive</button>
        <button class="btn btn-small btn-danger" data-habit-action="delete" data-id="${esc(h.id)}">Delete</button>
      </div>
    </div></div></div>
  </article>`;
}

// State of one day for one habit: done, missed, pending (today), off (not due), empty (before tracking), future.
function dayStatus(h, d, today, first) {
  if (d > today) return "future";
  if (!appliesOn(h, d)) return "off";
  if (isDone(h, dateKey(d))) return "done";
  if (sameDay(d, today)) return "pending";
  return d < first ? "empty" : "missed";
}

const STATUS_WORDS = { done: "done", missed: "missed", pending: "not done yet", off: "not due", empty: "not tracked", future: "" };

// Big buttons for the last 7 days: the easy way to fix a missed check-off.
function weekStripHTML(h) {
  const today = startOfDay();
  const first = firstTrackedDate(h);
  let out = "";
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const status = dayStatus(h, d, today, first);
    const canToggle = status !== "off";
    out += `<button class="day-btn ${status} ${i === 0 ? "is-today" : ""}" ${canToggle ? "" : "disabled"}
      data-day-toggle="${esc(h.id)}" data-date="${dateKey(d)}"
      aria-pressed="${status === "done"}" aria-label="${dayLabel(d)}: ${STATUS_WORDS[status]}">
      <span class="dow">${i === 0 ? "Today" : WEEKDAYS_SHORT[d.getDay()]}</span>
      <span class="dnum">${d.getDate()}</span>
    </button>`;
  }
  return `<div class="week-strip">${out}</div>`;
}

// GitHub-style grid: one column per week, one row per weekday,
// weeks starting on the schedule's Day 1. Tap a past cell to toggle it.
function heatmapHTML(h) {
  const today = startOfDay();
  const weekStart = state.settings.scheduleStartWeekday;
  const offset = (today.getDay() - weekStart + 7) % 7;
  const gridStart = addDays(today, -offset - 7 * (HEATMAP_WEEKS - 1));
  const first = firstTrackedDate(h);
  let html = "";

  // Month labels: put one on the column where a new month's days begin.
  const labelCols = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const colEnd = addDays(gridStart, w * 7 + 6);
    const prevEnd = addDays(gridStart, (w - 1) * 7 + 6);
    if (w === 0 || colEnd.getMonth() !== prevEnd.getMonth()) labelCols.push({ w, month: colEnd });
  }
  if (labelCols.length > 1 && labelCols[1].w <= 2) labelCols.shift();   // avoid overlapping labels
  for (const { w, month } of labelCols) {
    html += `<span class="hm-month" style="grid-column:${w + 2} / span 3">${month.toLocaleDateString("en-US", { month: "short" })}</span>`;
  }

  // Weekday labels on every other row.
  for (let r = 0; r < 7; r += 2) {
    html += `<span class="hm-day" style="grid-row:${r + 2}">${WEEKDAYS_SHORT[(weekStart + r) % 7].charAt(0)}</span>`;
  }

  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    for (let r = 0; r < 7; r++) {
      const d = addDays(gridStart, w * 7 + r);
      const status = dayStatus(h, d, today, first);
      const pos = `grid-column:${w + 2};grid-row:${r + 2}`;
      if (status === "future") {
        html += `<span class="hm-cell future" style="${pos}"></span>`;
      } else if (status === "off") {
        html += `<span class="hm-cell off" style="${pos}" title="${dayLabel(d)}: not due"></span>`;
      } else {
        html += `<button class="hm-cell ${status} ${sameDay(d, today) ? "is-today" : ""}" style="${pos}"
          data-day-toggle="${esc(h.id)}" data-date="${dateKey(d)}" aria-pressed="${status === "done"}"
          title="${dayLabel(d)}: ${STATUS_WORDS[status]}" aria-label="${dayLabel(d)}: ${STATUS_WORDS[status]}"></button>`;
      }
    }
  }

  return `<div class="heatmap">${html}</div>
    <div class="hm-legend">
      <span><i class="hm-cell done"></i>Done</span>
      <span><i class="hm-cell missed"></i>Missed</span>
      <span><i class="hm-cell off"></i>Not due</span>
    </div>`;
}

// Re-render one habit card (keeps its open state) and refresh Today.
function refreshHabit(id) {
  const h = findHabit(id);
  const card = document.getElementById(`habit-${id}`);
  if (!h || !card) { renderHabits(); renderToday(); return; }
  const active = activeHabits();
  card.outerHTML = habitCardHTML(h, active.indexOf(h), active.length);
  renderToday();
}

function moveHabit(id, dir) {
  const list = state.habits;
  const from = list.findIndex((h) => h.id === id);
  // Find the nearest active habit in that direction and swap with it.
  let to = from + dir;
  while (to >= 0 && to < list.length && list[to].archived) to += dir;
  if (from < 0 || to < 0 || to >= list.length) return;
  [list[from], list[to]] = [list[to], list[from]];
  save();
  renderHabits();
  renderToday();
}

async function deleteHabit(h) {
  const checkOffs = Object.values(state.habitLog).filter((day) => day[h.id]).length;
  const choice = await ask({
    title: `Delete “${h.name}”?`,
    body: `This erases the habit and its history (${plural(checkOffs, "check-off")}). Archiving hides it but keeps the history.`,
    buttons: [
      { label: "Cancel", value: "cancel" },
      ...(h.archived ? [] : [{ label: "Archive instead", value: "archive" }]),
      { label: "Delete", value: "delete", kind: "btn-danger" }
    ]
  });
  if (choice === "archive") { setArchived(h, true); return; }
  if (choice !== "delete") return;

  state.habits = state.habits.filter((x) => x.id !== h.id);
  for (const [key, day] of Object.entries(state.habitLog)) {
    delete day[h.id];
    if (Object.keys(day).length === 0) delete state.habitLog[key];
  }
  habitUI.open.delete(h.id);
  save();
  renderHabits();
  renderToday();
  toast(`Deleted “${h.name}”`);
}

function setArchived(h, archived) {
  h.archived = archived;
  h.updatedAt = new Date().toISOString();
  save();
  renderHabits();
  renderToday();
  toast(archived ? `Archived “${h.name}”` : `Restored “${h.name}”`);
}

// Add/edit form. Resolves to { name, icon, days } or null.
function habitForm(h) {
  const isSession = h && h.key === "session";
  const selected = new Set(h ? h.days : ALL_DAYS);
  let icon = h && LINE_ICONS[h.icon] ? h.icon : "";
  const start = state.settings.scheduleStartWeekday;
  const weekOrder = ALL_DAYS.map((i) => (start + i) % 7);

  return formDialog({
    title: h ? "Edit habit" : "New habit",
    html: `
      <label class="field">
        <span>Name</span>
        <input name="name" maxlength="60" autocomplete="off" value="${esc(h ? h.name : "")}" placeholder="e.g. Drink 3L of water">
      </label>
      <div class="field">
        <span>Icon</span>
        <div class="icon-picker" role="group" aria-label="Icon">
          <button type="button" class="icon-choice is-letter" data-icon="" aria-pressed="${!icon}" aria-label="No icon (use first letter)">Aa</button>
          ${HABIT_ICON_CHOICES.map((name) => `<button type="button" class="icon-choice" data-icon="${name}" aria-pressed="${icon === name}" aria-label="${name}">${lineIcon(name)}</button>`).join("")}
        </div>
      </div>
      <div class="field">
        <span>Days</span>
        ${isSession
          ? `<p class="hint">Follows your schedule: due every day except Rest days, including days you change the session.</p>`
          : `<div class="day-chips">
               ${weekOrder.map((d) => `<button type="button" class="day-chip" data-day="${d}" aria-pressed="${selected.has(d)}">${WEEKDAYS_SHORT[d].slice(0, 2)}</button>`).join("")}
             </div>`}
      </div>`,
    setup(form) {
      form.addEventListener("click", (e) => {
        const chip = e.target.closest(".day-chip");
        if (chip) {
          const d = Number(chip.dataset.day);
          if (selected.has(d)) selected.delete(d); else selected.add(d);
          chip.setAttribute("aria-pressed", String(selected.has(d)));
        }
        const choice = e.target.closest(".icon-choice");
        if (choice) {
          icon = choice.dataset.icon;
          form.querySelectorAll(".icon-choice").forEach((b) => b.setAttribute("aria-pressed", String(b === choice)));
        }
      });
    },
    read(form) {
      const name = form.elements.name.value.trim();
      if (!name) return "Give the habit a name.";
      if (!isSession && selected.size === 0) return "Pick at least one day.";
      return {
        name,
        icon,
        days: isSession ? (h ? h.days : ALL_DAYS.slice()) : ALL_DAYS.filter((d) => selected.has(d))
      };
    }
  });
}

async function editHabit(id) {
  const h = id ? findHabit(id) : null;
  const result = await habitForm(h);
  if (!result) return;
  const now = new Date().toISOString();
  if (h) {
    Object.assign(h, result, { updatedAt: now });
    toast("Habit saved");
  } else {
    state.habits.push({ id: uid(), ...result, archived: false, createdAt: now, updatedAt: now });
    toast(`Added “${result.name}”`);
  }
  save();
  renderHabits();
  renderToday();
}

function onHabitsClick(e) {
  const check = e.target.closest("[data-habit-check]");
  if (check) {
    const h = findHabit(check.dataset.habitCheck);
    if (!h) return;
    const nowDone = !isDone(h, dateKey());
    setDone(h.id, dateKey(), nowDone);
    refreshHabit(h.id);
    if (nowDone) {
      const fresh = document.querySelector(`#habit-${h.id} .check-btn`);
      if (fresh) fresh.classList.add("pop");
    }
    return;
  }

  const day = e.target.closest("[data-day-toggle]");
  if (day) {
    const h = findHabit(day.dataset.dayToggle);
    if (!h) return;
    setDone(h.id, day.dataset.date, !isDone(h, day.dataset.date));
    refreshHabit(h.id);
    return;
  }

  const toggle = e.target.closest("[data-toggle-habit]");
  if (toggle) {
    toggleOpen(toggle.closest(".habit"), toggle, habitUI.open, toggle.dataset.toggleHabit);
    return;
  }

  const action = e.target.closest("[data-habit-action]");
  if (action) {
    const h = findHabit(action.dataset.id);
    if (!h) return;
    switch (action.dataset.habitAction) {
      case "edit": editHabit(h.id); break;
      case "up": moveHabit(h.id, -1); break;
      case "down": moveHabit(h.id, 1); break;
      case "archive": setArchived(h, true); break;
      case "restore": setArchived(h, false); break;
      case "delete": deleteHabit(h); break;
    }
  }
}

/* ---------- 13. Routines tab (list + editor) ---------- */

// Which cards are expanded / being edited. UI-only, not saved.
const routineUI = { openRoutines: new Set(), openCues: new Set(), editing: null };

function findItem(itemId) {
  for (const r of state.routines) {
    for (const s of r.sections) {
      const item = s.items.find((it) => it.id === itemId);
      if (item) return { routine: r, section: s, item };
    }
  }
  return null;
}

function isTimed(it) { return (it.type === "hold" || it.type === "time") && it.holdSeconds > 0; }

function renderRoutines() {
  const todayId = effectiveRoutineId();
  document.getElementById("routines-content").innerHTML = `
    <h2 class="section-label">Weekly schedule</h2>
    ${scheduleCardHTML()}
    <h2 class="section-label">Routines</h2>
    ${state.routines.map((r) => routineCardHTML(r, todayId)).join("")}
    <h2 class="section-label">Guidelines</h2>
    <section class="card guide-card">
      <h3 class="card-title">${ICONS.alert}Pain rule</h3>
      <p class="hint">${esc(PAIN_RULE)}</p>
    </section>
    <section class="card guide-card">
      <h3 class="card-title">${ICONS.trend}Later progressions</h3>
      <ol class="progressions">${PROGRESSIONS.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
    </section>
  `;
}

function scheduleCardHTML() {
  const todayNum = scheduleDayNumber();
  const scheduledId = scheduledRoutineId();
  const actualId = effectiveRoutineId();
  const rows = DEFAULT_SCHEDULE.map((s) => {
    const isToday = s.day === todayNum;
    return `<li>
      <button class="schedule-row ${isToday ? "is-today" : ""}" data-goto-routine="${esc(s.routineId)}">
        <span class="sched-weekday">${WEEKDAYS_SHORT[weekdayForDay(s.day)]}</span>
        <span class="sched-day">Day ${s.day}</span>
        <span class="sched-routine">${esc(routineName(s.routineId))}</span>
        ${isToday ? '<span class="pill pill-accent">Today</span>' : ""}
      </button>
    </li>`;
  }).join("");
  const foot = actualId === scheduledId
    ? `Today is Day ${todayNum}: ${esc(routineName(actualId))}.`
    : `Today is Day ${todayNum} (${esc(routineName(scheduledId))}), changed to ${esc(routineName(actualId))}.`;
  return `<section class="card">
    <ul class="schedule">${rows}</ul>
    <p class="hint schedule-foot">Morning routine every day. ${foot}</p>
  </section>`;
}

function routineCardHTML(r, todayId) {
  const editing = routineUI.editing === r.id;
  const open = editing || routineUI.openRoutines.has(r.id);
  const count = sessionItems(r).length;
  const isToday = r.id === todayId;
  const meta = [r.when, count ? plural(count, "item") : ""].filter(Boolean).join(" · ");
  const p = routineProgress(r);
  const status = p.finished ? '<span class="pill pill-accent">Done today</span>'
    : p.done ? `<span class="pill">${p.done}/${p.total} today</span>` : "";

  return `<article class="card routine ${open ? "open" : ""}" id="routine-${esc(r.id)}">
    <button class="routine-head" data-toggle-routine="${esc(r.id)}" aria-expanded="${open}">
      <span class="routine-title">
        <span class="routine-name">${esc(r.name)}</span>
        ${isToday ? '<span class="pill pill-accent">Today</span>' : ""}
        ${status}
      </span>
      <span class="routine-meta">${esc(meta)}</span>
      ${ICONS.chevron}
    </button>
    <div class="collapse"><div class="collapse-inner"><div class="routine-body">
      ${editing ? routineEditHTML(r) : routineViewHTML(r)}
    </div></div></div>
  </article>`;
}

function routineViewHTML(r) {
  const canStart = sessionItems(r).length > 0;
  return `
    <div class="btn-row routine-actions">
      ${canStart ? `<button class="btn btn-primary btn-small" data-start-session="${esc(r.id)}">${ICONS.play}Start session</button>` : ""}
      <button class="btn btn-small" data-routine-action="edit" data-id="${esc(r.id)}">${ICONS.edit}Edit</button>
    </div>
    ${r.notes ? `<p class="callout">${esc(r.notes)}</p>` : ""}
    ${r.sections.map((s) => `
      <div class="routine-section">
        <h3>${esc(s.title)}</h3>
        <ul class="ex-list">${s.items.map(exerciseHTML).join("")}</ul>
      </div>`).join("")}`;
}

function exerciseHTML(it) {
  if (it.type === "info") return `<li class="ex ex-info">${esc(it.name)}</li>`;

  const inner = `
    <span class="ex-main">
      <span class="ex-name">${esc(it.name)}</span>
      ${it.dose ? `<span class="ex-dose">${esc(it.dose)}</span>` : ""}
    </span>
    ${exerciseBadge(it)}`;

  // Rows with nothing to expand get a spacer so badges stay aligned.
  if (!it.cue && !isTimed(it)) return `<li class="ex"><div class="ex-row">${inner}<span class="chevron-spacer"></span></div></li>`;

  const open = routineUI.openCues.has(it.id);
  return `<li class="ex ${open ? "open" : ""}">
    <button class="ex-row" data-toggle-cue="${esc(it.id)}" aria-expanded="${open}">${inner}${ICONS.chevron}</button>
    <div class="collapse"><div class="collapse-inner"><div class="ex-cue">
      ${it.cue ? `<p>${esc(it.cue)}</p>` : ""}
      ${isTimed(it) ? `<button class="btn btn-small timer-inline" data-routine-timer="${esc(it.id)}">${ICONS.clock}Start timer</button>` : ""}
    </div></div></div>
  </li>`;
}

// Small pill showing timer length for holds/timed items, or "Lift".
function exerciseBadge(it) {
  if (isTimed(it)) {
    let label = fmtSeconds(it.holdSeconds);
    if (it.sets > 1) label += ` × ${it.sets}`;
    if (it.perSide) label += " /side";
    return `<span class="badge badge-${it.type}">${ICONS.clock}${esc(label)}</span>`;
  }
  if (it.type === "lift") return '<span class="badge badge-lift">Lift</span>';
  return "";
}

// --- Editor ---

function routineEditHTML(r) {
  const hasDefault = DEFAULT_ROUTINES.some((d) => d.id === r.id);
  return `
    <p class="edit-banner">${ICONS.edit}Editing ${esc(r.name)}. Changes save as you go.</p>
    ${r.sections.map((s, si) => `
      <div class="routine-section">
        <h3>${esc(s.title)}</h3>
        <ul class="ex-list">
          ${s.items.map((it, ii) => `
            <li class="ex edit-row">
              <span class="ex-main">
                <span class="ex-name">${esc(it.name)}</span>
                <span class="ex-dose">${esc(EXERCISE_TYPES[it.type] || it.type)}${it.dose ? ` · ${esc(it.dose)}` : ""}</span>
              </span>
              <span class="edit-actions">
                <button class="icon-btn" data-edit-item="up" data-r="${esc(r.id)}" data-s="${si}" data-i="${ii}" ${ii === 0 ? "disabled" : ""} aria-label="Move ${esc(it.name)} up">${ICONS.up}</button>
                <button class="icon-btn" data-edit-item="down" data-r="${esc(r.id)}" data-s="${si}" data-i="${ii}" ${ii === s.items.length - 1 ? "disabled" : ""} aria-label="Move ${esc(it.name)} down">${ICONS.down}</button>
                <button class="icon-btn" data-edit-item="edit" data-r="${esc(r.id)}" data-s="${si}" data-i="${ii}" aria-label="Edit ${esc(it.name)}">${ICONS.edit}</button>
                <button class="icon-btn icon-btn-danger" data-edit-item="delete" data-r="${esc(r.id)}" data-s="${si}" data-i="${ii}" aria-label="Delete ${esc(it.name)}">${ICONS.trash}</button>
              </span>
            </li>`).join("")}
        </ul>
        <button class="btn btn-small add-item-btn" data-edit-item="add" data-r="${esc(r.id)}" data-s="${si}">+ Add to ${esc(s.title)}</button>
      </div>`).join("")}
    <div class="btn-row edit-foot">
      <button class="btn btn-primary" data-routine-action="done-edit" data-id="${esc(r.id)}">Done</button>
      ${hasDefault ? `<button class="btn btn-danger btn-small" data-routine-action="reset" data-id="${esc(r.id)}">Reset to default</button>` : ""}
    </div>`;
}

// Add/edit one exercise. Resolves to the new item fields, or null.
function exerciseForm(it) {
  const type = it ? it.type : "reps";
  return formDialog({
    title: it ? "Edit exercise" : "Add exercise",
    html: `
      <label class="field"><span>Name</span>
        <input name="name" maxlength="80" autocomplete="off" value="${esc(it ? it.name : "")}"></label>
      <label class="field"><span>Type</span>
        <select name="type">${Object.entries(EXERCISE_TYPES).map(([k, v]) => `<option value="${k}" ${k === type ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="field"><span>Dose (optional)</span>
        <input name="dose" maxlength="80" autocomplete="off" value="${esc(it ? it.dose : "")}" placeholder="e.g. 3 x 30s/side"></label>
      <label class="field"><span>How-to cue (optional)</span>
        <textarea name="cue" rows="3" maxlength="400">${esc(it ? it.cue : "")}</textarea></label>
      <fieldset class="timer-fields" ${type === "hold" || type === "time" ? "" : "hidden"}>
        <div class="field-grid">
          <label class="field"><span>Timer (seconds)</span>
            <input name="holdSeconds" inputmode="numeric" value="${esc(it && it.holdSeconds ? it.holdSeconds : 30)}"></label>
          <label class="field"><span>Sets</span>
            <input name="sets" inputmode="numeric" value="${esc(it && it.sets ? it.sets : 1)}"></label>
        </div>
        <label class="check-field"><input type="checkbox" name="perSide" ${it && it.perSide ? "checked" : ""}> Each side (left, then right)</label>
      </fieldset>`,
    setup(form) {
      form.elements.type.addEventListener("change", () => {
        form.querySelector(".timer-fields").hidden = !["hold", "time"].includes(form.elements.type.value);
      });
    },
    read(form) {
      const name = form.elements.name.value.trim();
      if (!name) return "Give the exercise a name.";
      const out = {
        name,
        type: form.elements.type.value,
        dose: form.elements.dose.value.trim(),
        cue: form.elements.cue.value.trim()
      };
      if (out.type === "hold" || out.type === "time") {
        const secs = parseNum(form.elements.holdSeconds.value);
        const sets = parseNum(form.elements.sets.value);
        if (!secs) return "Timer length should be a number of seconds.";
        out.holdSeconds = Math.round(secs);
        out.sets = Math.max(1, Math.round(sets || 1));
        out.perSide = form.elements.perSide.checked;
      }
      return out;
    }
  });
}

async function editRoutineItem(action, routineId, si, ii) {
  const r = getRoutine(routineId);
  if (!r || !r.sections[si]) return;
  const items = r.sections[si].items;

  if (action === "up" || action === "down") {
    const to = action === "up" ? ii - 1 : ii + 1;
    if (to < 0 || to >= items.length) return;
    [items[ii], items[to]] = [items[to], items[ii]];
  } else if (action === "delete") {
    if (!(await confirmBox(`Remove “${items[ii].name}”?`, `It will be removed from ${r.name}. Past logs are kept.`, "Remove"))) return;
    items.splice(ii, 1);
  } else if (action === "edit") {
    const result = await exerciseForm(items[ii]);
    if (!result) return;
    const { id } = items[ii];
    items[ii] = { id, ...result };
  } else if (action === "add") {
    const result = await exerciseForm(null);
    if (!result) return;
    items.push({ id: uid(), ...result });
  }
  r.updatedAt = new Date().toISOString();
  save();
  renderRoutines();
  renderToday();
}

async function resetRoutine(routineId) {
  const def = DEFAULT_ROUTINES.find((d) => d.id === routineId);
  if (!def) return;
  if (!(await confirmBox(`Reset ${def.name}?`, "Your edits to this routine will be replaced with the original from data.js.", "Reset"))) return;
  const fresh = clone(def);
  fresh.sections.forEach((s) => s.items.forEach((it) => { it.id = uid(); }));
  const i = state.routines.findIndex((r) => r.id === routineId);
  state.routines[i] = fresh;
  routineUI.editing = null;
  save();
  renderRoutines();
  renderToday();
  toast(`${def.name} reset to default`);
}

async function resetAllRoutines() {
  if (!(await confirmBox("Reset all routines?", "Every routine goes back to the original in data.js. Habits, logs and notes are not affected.", "Reset all"))) return;
  state.routines = seedRoutines();
  routineUI.editing = null;
  save();
  renderAll();
  toast("Routines reset to defaults");
}

function scrollToCard(card) {
  card.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

function onRoutinesClick(e) {
  const start = e.target.closest("[data-start-session]");
  if (start) { openSession(start.dataset.startSession); return; }

  const timerBtn = e.target.closest("[data-routine-timer]");
  if (timerBtn) {
    const found = findItem(timerBtn.dataset.routineTimer);
    if (found) openHoldTimer(found.item, null);
    return;
  }

  const editBtn = e.target.closest("[data-edit-item]");
  if (editBtn) {
    editRoutineItem(editBtn.dataset.editItem, editBtn.dataset.r, Number(editBtn.dataset.s), Number(editBtn.dataset.i));
    return;
  }

  const action = e.target.closest("[data-routine-action]");
  if (action) {
    const id = action.dataset.id;
    if (action.dataset.routineAction === "edit") { routineUI.editing = id; routineUI.openRoutines.add(id); renderRoutines(); }
    if (action.dataset.routineAction === "done-edit") { routineUI.editing = null; renderRoutines(); toast("Routine saved"); }
    if (action.dataset.routineAction === "reset") resetRoutine(id);
    return;
  }

  const routineBtn = e.target.closest("[data-toggle-routine]");
  if (routineBtn) {
    const id = routineBtn.dataset.toggleRoutine;
    if (routineUI.editing === id) return;   // keep the editor open
    toggleOpen(routineBtn.closest(".routine"), routineBtn, routineUI.openRoutines, id);
    return;
  }
  const cueBtn = e.target.closest("[data-toggle-cue]");
  if (cueBtn) {
    toggleOpen(cueBtn.closest(".ex"), cueBtn, routineUI.openCues, cueBtn.dataset.toggleCue);
    return;
  }
  const gotoBtn = e.target.closest("[data-goto-routine]");
  if (gotoBtn) {
    const id = gotoBtn.dataset.gotoRoutine;
    const card = document.getElementById(`routine-${id}`);
    if (!card) return;
    if (!card.classList.contains("open")) toggleOpen(card, card.querySelector(".routine-head"), routineUI.openRoutines, id);
    scrollToCard(card);
  }
}

/* ---------- 14. Session mode (routine checklist) ---------- */

const sessionUI = { routineId: null, openCues: new Set() };

// Items you can tick (info lines don't count).
function sessionItems(r) { return r.sections.flatMap((s) => s.items).filter((i) => i.type !== "info"); }

function findCompletion(date, routineId) {
  return state.routineCompletions.find((c) => c.date === date && c.routineId === routineId);
}

function getOrCreateCompletion(routineId) {
  const date = dateKey();
  let c = findCompletion(date, routineId);
  if (!c) {
    c = { date, routineId, completedItemIds: [], finished: false, startedAt: new Date().toISOString() };
    state.routineCompletions.push(c);
  }
  return c;
}

function routineProgress(r, date = dateKey()) {
  const items = sessionItems(r);
  const c = findCompletion(date, r.id);
  const doneIds = new Set(c ? c.completedItemIds : []);
  return {
    done: items.filter((i) => doneIds.has(i.id)).length,
    total: items.length,
    finished: !!(c && c.finished)
  };
}

function openSession(routineId) {
  const r = getRoutine(routineId);
  if (!r) return;
  sessionUI.routineId = routineId;
  sessionUI.openCues.clear();
  renderSession();
  const view = document.getElementById("session-view");
  view.hidden = false;
  view.scrollTop = 0;
  document.body.classList.add("no-scroll");
}

function closeSession() {
  document.getElementById("session-view").hidden = true;
  document.body.classList.remove("no-scroll");
  sessionUI.routineId = null;
  renderAll();
}

function renderSession() {
  const r = getRoutine(sessionUI.routineId);
  if (!r) return;
  const c = findCompletion(dateKey(), r.id);
  const doneIds = new Set(c ? c.completedItemIds : []);
  const p = routineProgress(r);
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  const hasLifts = sessionItems(r).some((i) => i.type === "lift");

  document.getElementById("session-view").innerHTML = `
    <header class="session-top">
      <div class="session-top-row">
        <button class="icon-btn" data-session="close" aria-label="Close session">${ICONS.close}</button>
        <div class="session-title">
          <p class="eyebrow">${p.finished ? "Finished today ✓" : "Session"}</p>
          <h2>${esc(r.name)}</h2>
        </div>
        <span class="session-count" id="session-count">${p.done}/${p.total}</span>
      </div>
      <div class="progress-bar" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}" id="session-progress">
        <span id="session-bar" style="width:${pct}%"></span>
      </div>
    </header>
    <div class="session-body">
      ${r.notes ? `<p class="callout">${esc(r.notes)}</p>` : ""}
      ${r.sections.map((s) => `
        <div class="routine-section">
          <h3>${esc(s.title)}</h3>
          <ul class="s-list">${s.items.map((it) => sessionItemHTML(it, doneIds)).join("")}</ul>
        </div>`).join("")}
      <footer class="session-foot">
        ${hasLifts ? `<button class="btn" data-session="lifts">Log lifts</button>` : ""}
        <button class="btn btn-primary" data-session="finish">${p.finished ? "Close" : "Finish session"}</button>
      </footer>
    </div>`;
}

function sessionItemHTML(it, doneIds) {
  if (it.type === "info") return `<li class="s-item s-info">${esc(it.name)}</li>`;
  const done = doneIds.has(it.id);
  const cueOpen = sessionUI.openCues.has(it.id);
  return `<li class="s-item ${done ? "done" : ""}" data-item="${esc(it.id)}">
    <div class="s-row">
      <button class="s-check" data-s-check="${esc(it.id)}" aria-pressed="${done}">
        <span class="check">${ICONS.check}</span>
        <span class="ex-main">
          <span class="ex-name">${esc(it.name)}</span>
          ${it.dose ? `<span class="ex-dose">${esc(it.dose)}</span>` : ""}
        </span>
      </button>
      ${it.cue ? `<button class="icon-btn" data-s-cue="${esc(it.id)}" aria-expanded="${cueOpen}" aria-label="How to do ${esc(it.name)}">${ICONS.info}</button>` : ""}
      ${isTimed(it) ? `<button class="icon-btn icon-btn-accent" data-s-timer="${esc(it.id)}" aria-label="Start timer for ${esc(it.name)}">${ICONS.clock}</button>` : ""}
    </div>
    ${it.cue ? `<p class="s-cue" ${cueOpen ? "" : "hidden"}>${esc(it.cue)}</p>` : ""}
  </li>`;
}

// Tick or untick one routine item for today. Shared by the session checklist
// and the band/iso cards on the Lifts screen, so both stay in sync.
function setRoutineItemDone(routineId, itemId, done) {
  const c = getOrCreateCompletion(routineId);
  const ids = new Set(c.completedItemIds);
  if (done) ids.add(itemId); else ids.delete(itemId);
  c.completedItemIds = [...ids];
  save();
}

function setSessionItem(itemId, done) {
  if (!sessionUI.routineId) return;
  setRoutineItemDone(sessionUI.routineId, itemId, done);

  // Patch in place so the check pops and the bar animates.
  const view = document.getElementById("session-view");
  const li = view.querySelector(`[data-item="${itemId}"]`);
  if (li) {
    li.classList.toggle("done", done);
    li.querySelector(".s-check").setAttribute("aria-pressed", String(done));
    li.classList.remove("pop");
    if (done) { void li.offsetWidth; li.classList.add("pop"); }
  }
  const p = routineProgress(getRoutine(sessionUI.routineId));
  document.getElementById("session-count").textContent = `${p.done}/${p.total}`;
  document.getElementById("session-bar").style.width = `${p.total ? (p.done / p.total) * 100 : 0}%`;
  document.getElementById("session-progress").setAttribute("aria-valuenow", String(p.done));
}

async function finishSession() {
  const r = getRoutine(sessionUI.routineId);
  const p = routineProgress(r);
  if (p.finished) { closeSession(); return; }
  if (p.done < p.total) {
    const ok = await ask({
      title: "Finish session?",
      body: `${p.total - p.done} of ${p.total} items aren't ticked yet.`,
      buttons: [{ label: "Keep going", value: "no" }, { label: "Finish anyway", value: "yes", kind: "btn-primary" }]
    });
    if (ok !== "yes") return;
  }
  const c = getOrCreateCompletion(r.id);
  c.finished = true;
  c.finishedAt = new Date().toISOString();
  save();
  const habit = autoCheckHabit(habitKeyForRoutine(r.id));
  closeSession();
  toast(habit ? `${r.name} finished · “${habit.name}” checked ✓` : `${r.name} finished`);
}

function onSessionClick(e) {
  const check = e.target.closest("[data-s-check]");
  if (check) {
    const id = check.dataset.sCheck;
    setSessionItem(id, check.getAttribute("aria-pressed") !== "true");
    return;
  }
  const cue = e.target.closest("[data-s-cue]");
  if (cue) {
    const id = cue.dataset.sCue;
    const p = cue.closest(".s-item").querySelector(".s-cue");
    p.hidden = !p.hidden;
    cue.setAttribute("aria-expanded", String(!p.hidden));
    if (p.hidden) sessionUI.openCues.delete(id); else sessionUI.openCues.add(id);
    return;
  }
  const timer = e.target.closest("[data-s-timer]");
  if (timer) {
    const found = findItem(timer.dataset.sTimer);
    if (found) openHoldTimer(found.item, () => setSessionItem(found.item.id, true));
    return;
  }
  const action = e.target.closest("[data-session]");
  if (!action) return;
  if (action.dataset.session === "close") closeSession();
  if (action.dataset.session === "finish") finishSession();
  if (action.dataset.session === "lifts") {
    const id = sessionUI.routineId;
    closeSession();
    startOrResumeWorkout(id);
  }
}

/* ---------- 15. Hold timer ---------- */
// Flow per set: 3s lead-in → hold (→ lead-in → hold for the other side)
// → rest countdown (or wait for a tap) → next set … → done.

const TIMER_RING = 2 * Math.PI * 100;   // r = 100 in the timer's viewBox
let holdTimer = null;

function openHoldTimer(item, onComplete) {
  stopHoldTimer();
  unlockAudio();
  holdTimer = {
    item,
    onComplete,
    holdSeconds: item.holdSeconds || 30,
    sets: Math.max(1, item.sets || 1),
    perSide: !!item.perSide,
    restOn: state.settings.holdRestOn,
    restSeconds: state.settings.holdRestSeconds,
    step: null,
    countdown: null,
    total: 0,
    left: 0,
    lastWhole: null
  };
  const dlg = document.getElementById("timer-dialog");
  dlg.innerHTML = timerShellHTML(item);
  dlg.showModal();
  syncWakeLock();
  advanceTimer();
}

function timerShellHTML(item) {
  return `
    <div class="timer-top">
      <div><p class="eyebrow">Timer</p><h2>${esc(item.name)}</h2></div>
      <button class="icon-btn" data-timer="close" aria-label="Close timer">${ICONS.close}</button>
    </div>
    <p class="timer-phase" id="t-phase" aria-live="polite"></p>
    <div class="timer-ring-wrap" id="t-wrap">
      <svg class="timer-ring" viewBox="0 0 220 220" aria-hidden="true">
        <circle class="timer-track" cx="110" cy="110" r="100"/>
        <circle class="timer-fill" id="t-ring" cx="110" cy="110" r="100" transform="rotate(-90 110 110)"
          stroke-dasharray="${TIMER_RING.toFixed(1)}" stroke-dashoffset="0"/>
      </svg>
      <div class="timer-center">
        <span class="timer-time" id="t-time">0:00</span>
        <span class="timer-sub" id="t-sub"></span>
      </div>
    </div>
    <div class="timer-controls">
      <button class="btn" data-timer="minus" aria-label="5 seconds less">−5s</button>
      <button class="btn btn-primary timer-main" data-timer="main" id="t-main">Pause</button>
      <button class="btn" data-timer="plus" aria-label="5 seconds more">+5s</button>
    </div>
    <button class="btn btn-ghost timer-skip" data-timer="skip">Skip ›</button>
    <div class="timer-settings">
      <div class="stepper-row">
        <span>Sets</span>
        <span class="stepper">
          <button class="icon-btn" data-timer="sets-" aria-label="One fewer set">−</button>
          <output id="t-sets"></output>
          <button class="icon-btn" data-timer="sets+" aria-label="One more set">+</button>
        </span>
      </div>
      <div class="stepper-row">
        <label class="switch"><input type="checkbox" id="t-rest-on" ${holdTimer.restOn ? "checked" : ""}><span class="switch-ui"></span>Rest between sets</label>
        <span class="stepper">
          <button class="icon-btn" data-timer="rest-" aria-label="Shorter rest">−</button>
          <output id="t-rest"></output>
          <button class="icon-btn" data-timer="rest+" aria-label="Longer rest">+</button>
        </span>
      </div>
    </div>`;
}

// The step after `cur` (null = first step).
function nextTimerStep(t, cur) {
  const sides = t.perSide ? 2 : 1;
  if (!cur) return { kind: "lead", set: 1, side: 0 };
  switch (cur.kind) {
    case "lead": return { kind: "hold", set: cur.set, side: cur.side };
    case "hold":
      if (cur.side + 1 < sides) return { kind: "lead", set: cur.set, side: cur.side + 1 };
      if (cur.set < t.sets) return t.restOn ? { kind: "rest", set: cur.set, side: 0 } : { kind: "wait", set: cur.set + 1, side: 0 };
      return { kind: "done", set: cur.set, side: 0 };
    case "rest": return { kind: "lead", set: cur.set + 1, side: 0 };
    case "wait": return { kind: "lead", set: cur.set, side: 0 };
    default: return { kind: "done", set: cur.set, side: 0 };
  }
}

function stepSeconds(t, step) {
  if (step.kind === "lead") return LEAD_IN_SECONDS;
  if (step.kind === "hold") return t.holdSeconds;
  if (step.kind === "rest") return t.restSeconds;
  return 0;
}

function advanceTimer() {
  const t = holdTimer;
  if (!t) return;
  if (t.countdown) t.countdown.stop();
  t.step = nextTimerStep(t, t.step);
  const step = t.step;

  if (step.kind === "wait" || step.kind === "done") {
    t.countdown = null;
    if (step.kind === "done") {
      signals.allDone();
      if (t.onComplete) { t.onComplete(); t.onComplete = null; }
    }
    updateTimerUI();
    return;
  }

  if (step.kind === "hold") signals.go();
  t.total = stepSeconds(t, step);
  t.left = t.total * 1000;
  t.lastWhole = null;
  t.countdown = createCountdown(t.total, (left) => { t.left = left; timerTick(); }, onTimerStepEnd);
  updateTimerUI();
  t.countdown.start();
}

function onTimerStepEnd() {
  const t = holdTimer;
  if (!t) return;
  const next = nextTimerStep(t, t.step);
  if (t.step.kind === "hold" && next.kind !== "done") signals.holdEnd();
  if (t.step.kind === "rest") signals.restEnd();
  advanceTimer();
}

// Runs ~10x a second: update numbers and ring, and tick on whole seconds.
function timerTick() {
  const t = holdTimer;
  if (!t) return;
  const whole = Math.ceil(t.left / 1000);
  if (whole !== t.lastWhole) {
    t.lastWhole = whole;
    if (whole > 0 && (t.step.kind === "lead" || (t.step.kind === "rest" && whole <= 3))) signals.tick();
  }
  document.getElementById("t-time").textContent = fmtClock(t.left / 1000);
  const frac = t.total ? clamp(t.left / (t.total * 1000), 0, 1) : 1;
  document.getElementById("t-ring").setAttribute("stroke-dashoffset", (TIMER_RING * (1 - frac)).toFixed(1));
}

function updateTimerUI() {
  const t = holdTimer;
  if (!t) return;
  const s = t.step;
  const labels = { lead: "Get ready", hold: "Hold", rest: "Rest", wait: `Ready for set ${s.set}`, done: "Done!" };
  document.getElementById("t-wrap").dataset.phase = s.kind;
  document.getElementById("t-phase").textContent = labels[s.kind];
  const side = t.perSide ? ` · ${s.side === 0 ? "Left" : "Right"} side` : "";
  document.getElementById("t-sub").textContent = s.kind === "done"
    ? `${plural(t.sets, "set")} complete`
    : s.kind === "rest" ? `Next: set ${s.set + 1} of ${t.sets}` : `Set ${s.set} of ${t.sets}${side}`;

  const main = document.getElementById("t-main");
  if (s.kind === "wait") main.textContent = `Start set ${s.set}`;
  else if (s.kind === "done") main.textContent = "Close";
  else main.textContent = t.countdown && t.countdown.paused ? "Resume" : "Pause";

  if (s.kind === "wait" || s.kind === "done") {
    document.getElementById("t-time").textContent = s.kind === "done" ? "✓" : fmtClock(t.holdSeconds);
    document.getElementById("t-ring").setAttribute("stroke-dashoffset", "0");
  } else {
    timerTick();
  }
  document.getElementById("t-sets").textContent = String(t.sets);
  document.getElementById("t-rest").textContent = `${t.restSeconds}s`;
  document.querySelector('[data-timer="minus"]').disabled = !t.countdown;
  document.querySelector('[data-timer="plus"]').disabled = !t.countdown;
  document.querySelector('[data-timer="skip"]').hidden = s.kind === "done";
}

function stopHoldTimer() {
  if (holdTimer && holdTimer.countdown) holdTimer.countdown.stop();
  holdTimer = null;
  syncWakeLock();   // stays on if the stopwatch or countdown is still running
}

function closeHoldTimer() {
  stopHoldTimer();
  const dlg = document.getElementById("timer-dialog");
  if (dlg.open) dlg.close();
}

function onTimerClick(e) {
  const t = holdTimer;
  const btn = e.target.closest("[data-timer]");
  if (!t || !btn) return;
  unlockAudio();
  switch (btn.dataset.timer) {
    case "close": closeHoldTimer(); break;
    case "main":
      if (t.step.kind === "done") { closeHoldTimer(); return; }
      if (t.step.kind === "wait") advanceTimer();
      else if (t.countdown.paused) t.countdown.resume();
      else t.countdown.pause();
      updateTimerUI();
      break;
    case "skip": advanceTimer(); break;
    case "minus":
    case "plus": {
      const delta = btn.dataset.timer === "plus" ? 5 : -5;
      if (!t.countdown) break;
      if (delta < 0 && t.left <= 5000) break;
      t.total = Math.max(1, t.total + delta);
      if (t.step.kind === "hold") t.holdSeconds = Math.max(5, t.holdSeconds + delta);   // later sets too
      t.countdown.add(delta);
      break;
    }
    case "sets-": t.sets = Math.max(t.step.set, t.sets - 1); updateTimerUI(); break;
    case "sets+": t.sets = Math.min(20, t.sets + 1); updateTimerUI(); break;
    case "rest-":
    case "rest+":
      t.restSeconds = clamp(t.restSeconds + (btn.dataset.timer === "rest+" ? 15 : -15), 15, 600);
      state.settings.holdRestSeconds = t.restSeconds;
      save();
      updateTimerUI();
      break;
  }
}

function onTimerChange(e) {
  if (e.target.id === "t-rest-on" && holdTimer) {
    holdTimer.restOn = e.target.checked;
    state.settings.holdRestOn = e.target.checked;
    save();
  }
}

/* ---------- 15b. Stopwatch / countdown (floating timer button) ---------- */
// Runs from timestamps, so it keeps going while you use other tabs and even
// survives a reload. Kept under its own key: it isn't part of your data or backups.

const TOOL_KEY = "tracker.v1.timer";
const COUNTDOWN_PRESETS = [30, 60, 90, 120, 180, 300];

function loadTool() {
  const base = {
    mode: "stopwatch",
    sw: { running: false, startedAt: 0, elapsed: 0, laps: [] },
    cd: { running: false, endAt: 0, remaining: 60000, total: 60000 }
  };
  try {
    const t = JSON.parse(localStorage.getItem(TOOL_KEY));
    if (isPlainObject(t)) return { ...base, ...t, sw: { ...base.sw, ...t.sw }, cd: { ...base.cd, ...t.cd } };
  } catch (_) { /* start fresh */ }
  return base;
}
const tool = loadTool();
function saveTool() { try { localStorage.setItem(TOOL_KEY, JSON.stringify(tool)); } catch (_) { /* not critical */ } }

function swElapsed() { return tool.sw.elapsed + (tool.sw.running ? Date.now() - tool.sw.startedAt : 0); }
function cdLeft() { return tool.cd.running ? Math.max(0, tool.cd.endAt - Date.now()) : tool.cd.remaining; }

// 83456 ms -> "1:23.4" (or "1:02:03.4" past an hour); tenths optional.
function fmtStopwatch(ms, tenths = true) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  const base = h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  return tenths ? `${base}.${Math.floor((ms % 1000) / 100)}` : base;
}

function openTool() {
  unlockAudio();
  renderTool();
  const dlg = document.getElementById("tool-dialog");
  if (!dlg.open) dlg.showModal();
}

function renderTool() {
  const sw = tool.sw;
  const cd = tool.cd;
  const isSw = tool.mode === "stopwatch";
  let body;
  if (isSw) {
    const elapsed = swElapsed();
    const laps = sw.laps.map((t, i) => ({ n: i + 1, total: t, split: t - (sw.laps[i - 1] || 0) })).reverse();
    body = `
      <div class="tool-time" id="tool-time">${fmtStopwatch(elapsed)}</div>
      <div class="tool-controls">
        <button class="btn" data-tool="sw-reset" ${sw.running || !elapsed ? "disabled" : ""}>Reset</button>
        <button class="btn ${sw.running ? "btn-danger" : "btn-primary"} tool-main" data-tool="sw-toggle">${sw.running ? "Stop" : elapsed ? "Resume" : "Start"}</button>
        <button class="btn" data-tool="sw-lap" ${sw.running ? "" : "disabled"}>Lap</button>
      </div>
      ${laps.length ? `<ol class="laps">${laps.map((l) => `<li><span>Lap ${l.n}</span><span>${fmtStopwatch(l.split)}</span><span class="muted">${fmtStopwatch(l.total)}</span></li>`).join("")}</ol>` : ""}`;
  } else {
    const left = cdLeft();
    body = `
      <div class="tool-time ${cd.running ? "" : left === 0 ? "is-done" : ""}" id="tool-time">${fmtClock(left / 1000)}</div>
      <div class="tool-presets" role="group" aria-label="Countdown length">
        ${COUNTDOWN_PRESETS.map((s) => `<button class="tag-chip" data-tool-preset="${s}" ${cd.running ? "disabled" : ""} aria-pressed="${!cd.running && cd.total === s * 1000}">${s < 60 ? `${s}s` : fmtClock(s)}</button>`).join("")}
      </div>
      <div class="tool-controls">
        <button class="btn" data-tool="cd-minus" aria-label="15 seconds less">−15</button>
        <button class="btn ${cd.running ? "btn-danger" : "btn-primary"} tool-main" data-tool="cd-toggle" ${!cd.running && left === 0 ? "disabled" : ""}>${cd.running ? "Pause" : left < cd.total && left > 0 ? "Resume" : "Start"}</button>
        <button class="btn" data-tool="cd-plus" aria-label="15 seconds more">+15</button>
      </div>
      <button class="btn btn-ghost tool-reset" data-tool="cd-reset" ${cd.running ? "disabled" : ""}>Reset to ${fmtClock(cd.total / 1000)}</button>`;
  }

  document.getElementById("tool-dialog").innerHTML = `
    <div class="timer-top">
      <div><p class="eyebrow">Timer</p><h2>${isSw ? "Stopwatch" : "Countdown"}</h2></div>
      <button class="icon-btn" data-tool="close" aria-label="Close timer">${ICONS.close}</button>
    </div>
    <div class="segmented tool-modes" role="tablist">
      <button role="tab" data-tool-mode="stopwatch" aria-selected="${isSw}">Stopwatch</button>
      <button role="tab" data-tool-mode="countdown" aria-selected="${!isSw}">Countdown</button>
    </div>
    ${body}
    <p class="hint tool-hint">Keeps running if you close this. Tap the timer button to come back.</p>`;
}

// Runs a few times a second: updates the numbers and the floating button.
function toolTick() {
  const cd = tool.cd;
  if (cd.running && cd.endAt <= Date.now()) {
    cd.running = false;
    cd.remaining = cd.total;   // ready to go again
    saveTool();
    signals.allDone();
    toast("Timer finished");
    refreshToolViews();
  }

  const fab = document.getElementById("timer-fab");
  const label = document.getElementById("timer-fab-label");
  let text = "";
  if (tool.sw.running) text = fmtStopwatch(swElapsed(), false);
  else if (cd.running) text = fmtClock(cdLeft() / 1000);
  else if (tool.sw.elapsed > 0 && tool.mode === "stopwatch") text = fmtStopwatch(tool.sw.elapsed, false);
  label.textContent = text;
  label.hidden = !text;
  fab.classList.toggle("is-running", tool.sw.running || cd.running);
  fab.classList.toggle("is-paused", !tool.sw.running && !cd.running && !!text);
  fab.setAttribute("aria-label", text ? `Timer ${text}` : "Open timer");

  const time = document.getElementById("tool-time");
  if (time && document.getElementById("tool-dialog").open) {
    time.textContent = tool.mode === "stopwatch" ? fmtStopwatch(swElapsed()) : fmtClock(cdLeft() / 1000);
  }
}

function onToolClick(e) {
  unlockAudio();
  const mode = e.target.closest("[data-tool-mode]");
  if (mode) { tool.mode = mode.dataset.toolMode; saveTool(); refreshToolViews(); return; }
  const preset = e.target.closest("[data-tool-preset]");
  if (preset) {
    if (tool.cd.running) return;
    tool.cd.total = tool.cd.remaining = Number(preset.dataset.toolPreset) * 1000;
    saveTool();
    refreshToolViews();
    return;
  }
  const btn = e.target.closest("[data-tool]");
  if (!btn) return;
  const sw = tool.sw;
  const cd = tool.cd;
  const now = Date.now();
  switch (btn.dataset.tool) {
    case "close": document.getElementById("tool-dialog").close(); return;
    case "sw-toggle":
      if (sw.running) { sw.elapsed += now - sw.startedAt; sw.running = false; }
      else { sw.startedAt = now; sw.running = true; }
      break;
    case "sw-lap": if (sw.running && sw.laps.length < 99) sw.laps.push(swElapsed()); break;
    case "sw-reset": if (!sw.running) { sw.elapsed = 0; sw.laps = []; } break;
    case "sw-left":   // Timer tab: one button that's Lap while running, Reset when stopped
      if (sw.running) { if (sw.laps.length < 99) sw.laps.push(swElapsed()); }
      else { sw.elapsed = 0; sw.laps = []; }
      break;
    case "cd-cancel": cd.running = false; cd.remaining = cd.total; break;
    case "cd-toggle":
      if (cd.running) { cd.remaining = cdLeft(); cd.running = false; }
      else if (cd.remaining > 0) { cd.endAt = now + cd.remaining; cd.running = true; }
      break;
    case "cd-plus":
    case "cd-minus": {
      const delta = btn.dataset.tool === "cd-plus" ? 15000 : -15000;
      if (cd.running) cd.endAt = Math.max(now + 1000, cd.endAt + delta);
      else { cd.remaining = Math.max(0, cd.remaining + delta); if (cd.remaining > cd.total) cd.total = cd.remaining; }
      break;
    }
    case "cd-reset": if (!cd.running) cd.remaining = cd.total; break;
  }
  saveTool();
  refreshToolViews();
}

// Redraw whichever timer views are showing (the ⏱ sheet and/or the Timer tab).
function refreshToolViews() {
  if (document.getElementById("tool-dialog").open) renderTool();
  if (currentTab === "timer") renderTimerTab();
  toolTick();
  syncWakeLock();
}

// Keep the screen on while any timer runs (hold timer, stopwatch or countdown).
function syncWakeLock() {
  keepAwake(!!holdTimer || tool.sw.running || tool.cd.running);
}

/* ---------- 15c. Timer tab (iPhone Clock style) ---------- */

const TIMER_TAB_PRESETS = [60, 120, 180, 300, 600];
let clockRaf = null;

// 83456 ms -> "01:23.45" (or "1:01:23.45" past an hour), like the iPhone stopwatch.
function fmtHundredths(ms) {
  const cs = Math.floor(ms / 10);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const pad = (n) => String(n).padStart(2, "0");
  return `${h ? `${h}:` : ""}${pad(m)}:${pad(s)}.${pad(cs % 100)}`;
}

// Countdown display: "4:59", or "1:04:59" past an hour.
function fmtHMS(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function renderTimerTab() {
  const isSw = tool.mode === "stopwatch";
  document.getElementById("timer-content").innerHTML = `
    <div class="segmented clock-modes" role="tablist" aria-label="Timer mode">
      <button role="tab" data-tool-mode="stopwatch" aria-selected="${isSw}">Stopwatch</button>
      <button role="tab" data-tool-mode="countdown" aria-selected="${!isSw}">Timer</button>
    </div>
    ${isSw ? stopwatchPaneHTML() : countdownPaneHTML()}`;
  startClockLoop();
}

function stopwatchPaneHTML() {
  const sw = tool.sw;
  const elapsed = swElapsed();
  const splits = sw.laps.map((t, i) => t - (sw.laps[i - 1] || 0));
  // Mark fastest and slowest once there are at least two finished laps.
  const fastest = splits.length >= 2 ? splits.indexOf(Math.min(...splits)) : -1;
  const slowest = splits.length >= 2 ? splits.indexOf(Math.max(...splits)) : -1;
  const lastLap = sw.laps[sw.laps.length - 1] || 0;

  const rows = [];
  if (elapsed > 0) {
    rows.push(`<li class="lap-current"><span>Lap ${sw.laps.length + 1}</span><span id="tw-curlap">${fmtHundredths(elapsed - lastLap)}</span></li>`);
  }
  for (let i = splits.length - 1; i >= 0; i--) {
    const cls = i === fastest ? "lap-fast" : i === slowest ? "lap-slow" : "";
    rows.push(`<li class="${cls}"><span>Lap ${i + 1}</span><span>${fmtHundredths(splits[i])}</span></li>`);
  }

  return `
    <div class="clock-face"><span class="clock-time" id="tw-time">${fmtHundredths(elapsed)}</span></div>
    <div class="clock-buttons">
      <button class="round-btn grey" data-tool="sw-left" ${!sw.running && !elapsed ? "disabled" : ""}>${sw.running || !elapsed ? "Lap" : "Reset"}</button>
      <button class="round-btn ${sw.running ? "red" : "green"}" data-tool="sw-toggle">${sw.running ? "Stop" : "Start"}</button>
    </div>
    ${rows.length ? `<ul class="clock-laps" aria-label="Laps">${rows.join("")}</ul>` : ""}`;
}

function countdownPaneHTML() {
  const cd = tool.cd;
  const idle = !cd.running && cd.remaining === cd.total;

  if (idle) {
    const totalSec = Math.round(cd.total / 1000);
    const parts = { h: Math.floor(totalSec / 3600), m: Math.floor((totalSec % 3600) / 60), s: totalSec % 60 };
    const picker = (part, max, label) => `
      <label class="picker-col">
        <select data-cd-part="${part}" aria-label="${label}">
          ${Array.from({ length: max + 1 }, (_, n) => `<option value="${n}" ${n === parts[part] ? "selected" : ""}>${n}</option>`).join("")}
        </select>
        <span>${label}</span>
      </label>`;
    return `
      <div class="clock-picker">${picker("h", 23, "hours")}${picker("m", 59, "min")}${picker("s", 59, "sec")}</div>
      <div class="tool-presets" role="group" aria-label="Quick times">
        ${TIMER_TAB_PRESETS.map((s) => `<button class="tag-chip" data-tool-preset="${s}" aria-pressed="${cd.total === s * 1000}">${s / 60} min</button>`).join("")}
      </div>
      <div class="clock-buttons">
        <button class="round-btn grey" disabled>Cancel</button>
        <button class="round-btn green" data-tool="cd-toggle" ${cd.total === 0 ? "disabled" : ""}>Start</button>
      </div>`;
  }

  const left = cdLeft();
  const frac = cd.total ? clamp(left / cd.total, 0, 1) : 0;
  const ends = cd.running ? new Date(cd.endAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
  return `
    <div class="clock-ring-wrap">
      <svg class="timer-ring" viewBox="0 0 220 220" aria-hidden="true">
        <circle class="timer-track" cx="110" cy="110" r="100"/>
        <circle class="timer-fill clock-fill" id="tw-ring" cx="110" cy="110" r="100" transform="rotate(-90 110 110)"
          stroke-dasharray="${TIMER_RING.toFixed(1)}" stroke-dashoffset="${(TIMER_RING * (1 - frac)).toFixed(1)}"/>
      </svg>
      <div class="timer-center">
        <span class="clock-time clock-time-ring" id="tw-time">${fmtHMS(left)}</span>
        <span class="timer-sub">${cd.running ? `${lineIcon("bell", "inline-icon")}${ends}` : "Paused"}</span>
      </div>
    </div>
    <div class="clock-buttons">
      <button class="round-btn grey" data-tool="cd-cancel">Cancel</button>
      <button class="round-btn ${cd.running ? "orange" : "green"}" data-tool="cd-toggle">${cd.running ? "Pause" : "Resume"}</button>
    </div>`;
}

// Smooth updates (hundredths) while the Timer tab is open and something is running.
function startClockLoop() {
  if (!clockRaf) clockRaf = requestAnimationFrame(clockLoop);
}
function clockLoop() {
  clockRaf = null;
  if (currentTab !== "timer") return;
  const time = document.getElementById("tw-time");
  if (tool.mode === "stopwatch") {
    const elapsed = swElapsed();
    if (time) time.textContent = fmtHundredths(elapsed);
    const cur = document.getElementById("tw-curlap");
    if (cur) cur.textContent = fmtHundredths(elapsed - (tool.sw.laps[tool.sw.laps.length - 1] || 0));
  } else {
    const left = cdLeft();
    if (time) time.textContent = fmtHMS(left);
    const ring = document.getElementById("tw-ring");
    if (ring && tool.cd.total) ring.setAttribute("stroke-dashoffset", (TIMER_RING * (1 - clamp(left / tool.cd.total, 0, 1))).toFixed(1));
  }
  if (tool.sw.running || tool.cd.running) clockRaf = requestAnimationFrame(clockLoop);
}

// Hours/minutes/seconds pickers set the countdown length.
function onTimerTabChange(e) {
  if (!e.target.dataset.cdPart) return;
  const val = (part) => Number(document.querySelector(`[data-cd-part="${part}"]`).value);
  tool.cd.total = tool.cd.remaining = (val("h") * 3600 + val("m") * 60 + val("s")) * 1000;
  saveTool();
  refreshToolViews();
}

/* ---------- 16. Lifts tab ---------- */

const liftsUI = { view: "log", editingId: null, progressExId: null };

// Which inputs each kind of exercise logs, in column order.
const KIND_FIELDS = {
  lift: [{ f: "weight", label: "lb", mode: "decimal" }, { f: "reps", label: "Reps", mode: "numeric" }, { f: "rpe", label: "RPE", mode: "decimal" }],
  bodyweight: [{ f: "reps", label: "Reps", mode: "numeric" }, { f: "weight", label: "+lb", mode: "decimal" }, { f: "rpe", label: "RPE", mode: "decimal" }],
  hold: [{ f: "seconds", label: "Sec", mode: "numeric" }, { f: "weight", label: "lb", mode: "decimal" }, null]
};

function exerciseById(id) { return state.exercises.find((e) => e.id === id); }
function exerciseKind(id) { const ex = exerciseById(id); return ex ? ex.kind : "lift"; }
function activeWorkout() { return state.workouts.find((w) => !w.finishedAt); }
function currentWorkout() { return liftsUI.editingId ? state.workouts.find((w) => w.id === liftsUI.editingId) : activeWorkout(); }
function workoutTitle(w) { return w.routineId ? routineName(w.routineId) : "Custom session"; }
function blankSet() { return { weight: null, reps: null, seconds: null, rpe: null, warmup: false, done: false }; }
function setHasData(s) { return s.weight != null || s.reps != null || s.seconds != null; }
function e1rm(s) { return s.weight && s.reps ? s.weight * (1 + s.reps / 30) : null; }   // Epley

// Find an exercise by name, or add it to the catalog.
function ensureExercise(name, kind, custom = false) {
  const found = state.exercises.find((e) => e.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (found) return found;
  let id = `ex-${slug(name)}`;
  if (!slug(name) || exerciseById(id)) id = `ex-${uid()}`;
  const ex = { id, name: name.trim(), kind, custom };
  state.exercises.push(ex);
  return ex;
}

function fmtSet(s, kind) {
  if (kind === "hold") return `${num(s.seconds || 0)}s${s.weight ? ` @ ${num(s.weight)} lb` : ""}`;
  if (kind === "bodyweight") return `${s.reps ?? 0} reps${s.weight ? ` +${num(s.weight)} lb` : ""}`;
  if (s.weight == null) return `${s.reps ?? 0} reps`;
  return `${num(s.weight)}×${s.reps ?? 0}`;
}

// Most recent finished workout (other than `w`) that logged this exercise.
function lastEntryFor(exerciseId, w) {
  const candidates = state.workouts
    .filter((x) => x.finishedAt && x.id !== w.id && x.date <= w.date)
    .sort((a, b) => (a.date === b.date ? (a.startedAt < b.startedAt ? 1 : -1) : a.date < b.date ? 1 : -1));
  for (const x of candidates) {
    const e = x.entries.find((en) => en.exerciseId === exerciseId && en.sets.some(setHasData));
    if (e) return { workout: x, entry: e };
  }
  return null;
}

// Best numbers for an exercise across finished workouts.
function exerciseBests(exerciseId, { excludeId = null, onOrBefore = null } = {}) {
  const best = { e1rm: 0, weight: 0, reps: 0, seconds: 0, any: false };
  for (const w of state.workouts) {
    if (!w.finishedAt || w.id === excludeId || (onOrBefore && w.date > onOrBefore)) continue;
    for (const e of w.entries) {
      if (e.exerciseId !== exerciseId) continue;
      for (const s of e.sets) {
        if (s.warmup || !setHasData(s)) continue;
        best.any = true;
        best.e1rm = Math.max(best.e1rm, e1rm(s) || 0);
        best.weight = Math.max(best.weight, s.weight || 0);
        best.reps = Math.max(best.reps, s.reps || 0);
        best.seconds = Math.max(best.seconds, s.seconds || 0);
      }
    }
  }
  return best;
}

// Index of the set in this entry that beats every earlier session, or -1.
// The first time you log an exercise isn't counted as a PR.
function prSetIndex(entry, w) {
  const kind = exerciseKind(entry.exerciseId);
  const prior = exerciseBests(entry.exerciseId, { excludeId: w.id, onOrBefore: w.date });
  if (!prior.any) return -1;
  let bestIdx = -1;
  let bestVal = 0;
  entry.sets.forEach((s, i) => {
    if (s.warmup || !setHasData(s) || (!s.done && !w.finishedAt)) return;
    let val;
    let priorVal;
    if (kind === "hold") { val = s.seconds || 0; priorVal = prior.seconds; }
    else if (s.weight && s.reps) { val = e1rm(s); priorVal = prior.e1rm; }
    else { val = s.reps || 0; priorVal = prior.reps; }
    if (val > priorVal && val > bestVal) { bestVal = val; bestIdx = i; }
  });
  return bestIdx;
}

function workoutPRCount(w) { return w.entries.filter((e) => prSetIndex(e, w) >= 0).length; }

// --- Starting / finishing ---

async function startOrResumeWorkout(routineId) {
  const active = activeWorkout();
  liftsUI.editingId = null;
  liftsUI.view = "log";
  if (active) {
    if (routineId && active.routineId !== routineId) toast(`Finish your ${workoutTitle(active)} session first`);
    goToTab("lifts");
    return;
  }
  startWorkout(routineId);
}

function startWorkout(routineId) {
  const r = routineId ? getRoutine(routineId) : null;
  const entries = r
    ? sessionItems(r).filter((i) => i.type === "lift")
        .map((i) => ({ exerciseId: ensureExercise(i.name, guessKind(i.name)).id, sets: [blankSet()] }))
    : [];
  const now = new Date().toISOString();
  state.workouts.push({
    id: uid(), date: dateKey(), routineId: r ? r.id : null, startedAt: now, finishedAt: null,
    painScore: null, notes: "", entries, updatedAt: now
  });
  save();
  liftsUI.view = "log";
  liftsUI.editingId = null;
  goToTab("lifts");
  renderLifts();
  renderToday();
}

// Drop empty sets and exercises with nothing logged.
function cleanWorkout(w) {
  w.entries.forEach((e) => { e.sets = e.sets.filter(setHasData); });
  w.entries = w.entries.filter((e) => e.sets.length);
}

async function finishWorkout() {
  const w = currentWorkout();
  if (!w) return;
  flushSave();
  const editing = !!w.finishedAt;
  const logged = w.entries.some((e) => e.sets.some(setHasData));
  if (!logged) {
    const r = await ask({
      title: "Nothing logged",
      body: "There are no sets with numbers in this session.",
      buttons: [{ label: "Keep editing", value: "no" }, { label: "Discard session", value: "discard", kind: "btn-danger" }]
    });
    if (r === "discard") discardWorkout(w, true);
    return;
  }
  cleanWorkout(w);
  if (!editing) w.finishedAt = new Date().toISOString();
  w.updatedAt = new Date().toISOString();
  save();
  stopRest();

  let habit = null;
  if (!editing && w.date === dateKey() && w.routineId) habit = autoCheckHabit(habitKeyForRoutine(w.routineId));
  liftsUI.editingId = null;
  liftsUI.view = "history";
  renderLifts();
  renderToday();
  renderHabits();
  const prs = workoutPRCount(w);
  toast(editing ? "Session updated"
    : `Session saved${prs ? ` · ${plural(prs, "PR")}` : ""}${habit ? ` · “${habit.name}” checked` : ""}`);
}

async function discardWorkout(w, skipConfirm = false) {
  const finished = !!w.finishedAt;
  if (!skipConfirm && !(await confirmBox(
    finished ? "Delete this session?" : "Discard this session?",
    finished ? `${workoutTitle(w)} on ${dayLabel(parseKey(w.date))} will be deleted.` : "Everything logged in it will be lost.",
    finished ? "Delete" : "Discard"))) return;
  state.workouts = state.workouts.filter((x) => x.id !== w.id);
  save();
  stopRest();
  liftsUI.editingId = null;
  liftsUI.view = finished ? "history" : "log";
  renderLifts();
  renderToday();
  toast(finished ? "Session deleted" : "Session discarded");
}

// --- Rendering ---

function renderLifts() {
  const root = document.getElementById("lifts-content");
  const active = activeWorkout();
  const views = [["log", active ? "Log •" : "Log"], ["history", "History"], ["progress", "Progress"]];
  let body;
  if (liftsUI.view === "history") body = historyHTML();
  else if (liftsUI.view === "progress") body = progressHTML();
  else body = currentWorkout() ? loggerHTML(currentWorkout()) : startHTML();

  root.innerHTML = `
    <div class="segmented" role="tablist" aria-label="Lifts views">
      ${views.map(([v, label]) => `<button role="tab" data-lifts-view="${v}" aria-selected="${liftsUI.view === v}">${label}</button>`).join("")}
    </div>
    ${body}`;

  if (liftsUI.view === "progress") drawProgressChart();
  root.querySelectorAll("textarea.autogrow").forEach(autoGrow);
}

function startHTML() {
  const todayId = effectiveRoutineId();
  const choices = state.routines.filter((r) => sessionItems(r).some((i) => i.type === "lift"));
  const last = (id) => {
    const w = state.workouts.filter((x) => x.finishedAt && x.routineId === id).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return w ? `last ${shortDate(w.date)}` : "not logged yet";
  };
  return `
    <section class="card">
      <h2 class="card-title">Start a session</h2>
      <p class="hint">Exercises load from the routine. You can add more as you go.</p>
      <div class="start-grid">
        ${choices.map((r) => `
          <button class="start-btn ${r.id === todayId ? "is-today" : ""}" data-start-workout="${esc(r.id)}">
            <span class="start-name">${esc(r.name)} ${r.id === todayId ? '<span class="pill pill-accent">Today</span>' : ""}</span>
            <span class="start-meta">${plural(sessionItems(r).filter((i) => i.type === "lift").length, "lift")} · ${last(r.id)}</span>
          </button>`).join("")}
        <button class="start-btn" data-start-workout="">
          <span class="start-name">Blank session</span>
          <span class="start-meta">Pick exercises yourself</span>
        </button>
      </div>
    </section>`;
}

// Band work / iso work checklists inside the lift logger (today's session only).
// Groups that come before the lifts in the routine show above, the rest below.
function workCardsFor(w) {
  const r = !w.finishedAt && w.routineId && w.date === dateKey() ? getRoutine(w.routineId) : null;
  if (!r) return { before: "", after: "" };
  const firstLift = r.sections.findIndex((s) => s.items.some((i) => i.type === "lift"));
  let before = "";
  let after = "";
  workSections(r).forEach((s) => {
    const html = workCardHTML(r, s);
    if (r.sections.indexOf(s) < firstLift) before += html; else after += html;
  });
  return { before, after };
}

function workCardHTML(r, s) {
  const c = findCompletion(dateKey(), r.id);
  const ticked = new Set(c ? c.completedItemIds : []);
  const items = s.items.filter((i) => i.type !== "info");
  const n = items.filter((i) => ticked.has(i.id)).length;
  return `<section class="card work-card ${n === items.length ? "is-done" : ""}" id="work-${esc(slug(s.title))}" data-work-routine="${esc(r.id)}">
    <div class="entry-head">
      <h3 class="entry-name">${esc(s.title)}</h3>
      <span class="work-count">${n === items.length ? "Done ✓" : `${n}/${items.length}`}</span>
    </div>
    <ul class="s-list">
      ${items.map((it) => `<li class="s-item ${ticked.has(it.id) ? "done" : ""}">
        <div class="s-row">
          <button class="s-check" data-lw-check="${esc(it.id)}" aria-pressed="${ticked.has(it.id)}">
            <span class="check">${ICONS.check}</span>
            <span class="ex-main"><span class="ex-name">${esc(it.name)}</span>${it.dose ? `<span class="ex-dose">${esc(it.dose)}</span>` : ""}</span>
          </button>
          ${isTimed(it) ? `<button class="icon-btn icon-btn-accent" data-lw-timer="${esc(it.id)}" aria-label="Start timer for ${esc(it.name)}">${ICONS.clock}</button>` : ""}
        </div>
      </li>`).join("")}
    </ul>
  </section>`;
}

function refreshWorkCard(routineId, itemId) {
  const r = getRoutine(routineId);
  const s = r && r.sections.find((sec) => sec.items.some((i) => i.id === itemId));
  const card = s && document.getElementById(`work-${slug(s.title)}`);
  if (card) card.outerHTML = workCardHTML(r, s);
}

function loggerHTML(w) {
  const editing = !!w.finishedAt;
  const work = workCardsFor(w);
  return `
    <section class="card logger-head">
      <p class="mini-label">${editing ? "Editing past session" : "Session in progress"}</p>
      <h2 class="session-name">${esc(workoutTitle(w))}</h2>
      <p class="hint" id="lift-elapsed">${elapsedText(w)}</p>
      <div class="logger-options">
        <label class="field field-inline"><span>Date</span>
          <input type="date" data-lift-field="date" value="${esc(w.date)}" max="${dateKey()}"></label>
        ${editing ? "" : `
          <label class="switch"><input type="checkbox" data-lift-field="restTimerOn" ${state.settings.restTimerOn ? "checked" : ""}>
            <span class="switch-ui"></span>Rest timer ${fmtClock(state.settings.restSeconds)}</label>`}
      </div>
    </section>

    ${work.before}
    ${w.entries.map((e, i) => entryHTML(w, e, i)).join("")}
    <button class="btn add-exercise-btn" data-lift="add-exercise">+ Add exercise</button>
    ${work.after}

    <section class="card">
      <div class="slider-row">
        <div class="slider-head"><label for="w-pain">Session pain</label>
          <output id="w-pain-out" class="pain-val ${w.painScore == null ? "" : painClass(w.painScore)}">${w.painScore == null ? "–" : `${w.painScore}/10`}</output></div>
        <input type="range" id="w-pain" class="pain-range ${w.painScore == null ? "unset" : painClass(w.painScore)}" min="0" max="10" step="1"
          value="${w.painScore ?? 0}" data-lift-field="painScore" style="--pct:${(w.painScore ?? 0) * 10}%">
      </div>
      <label class="field"><span>Notes</span>
        <textarea class="autogrow" rows="2" data-lift-field="notes" placeholder="How did it go?">${esc(w.notes)}</textarea></label>
    </section>

    <div class="btn-row logger-foot">
      <button class="btn btn-primary" data-lift="finish">${editing ? "Done" : "Finish session"}</button>
      <button class="btn btn-danger" data-lift="discard">${editing ? "Delete session" : "Discard"}</button>
    </div>`;
}

function elapsedText(w) {
  if (w.finishedAt) return `${dayLabel(parseKey(w.date))} · ${fmtDuration(new Date(w.finishedAt) - new Date(w.startedAt))}`;
  return `Started ${timeLabel(w.startedAt)} · ${fmtDuration(Date.now() - new Date(w.startedAt))}`;
}

function entryHTML(w, e, i) {
  const ex = exerciseById(e.exerciseId) || { name: "Unknown exercise", kind: "lift" };
  const fields = KIND_FIELDS[ex.kind];
  const last = lastEntryFor(e.exerciseId, w);
  const lastSets = last ? last.entry.sets : [];
  const prIdx = prSetIndex(e, w);
  let working = 0;

  const rows = e.sets.map((s, j) => {
    const label = s.warmup ? "W" : String(++working);
    const ph = lastSets[j] || {};
    return `<div class="set-row ${s.done ? "done" : ""} ${j === prIdx ? "is-pr" : ""}">
      <button class="set-num ${s.warmup ? "warmup" : ""}" data-set-menu="${i}:${j}" aria-label="Set ${label} options">${label}</button>
      ${fields.map((f) => f ? `<input class="set-input" data-e="${i}" data-s="${j}" data-f="${f.f}" inputmode="${f.mode}"
          enterkeyhint="next" autocomplete="off" aria-label="${esc(ex.name)} set ${label} ${f.label}"
          value="${s[f.f] ?? ""}" placeholder="${ph[f.f] ?? ""}">` : '<span></span>').join("")}
      <button class="set-done ${s.done ? "done" : ""}" data-set-done="${i}:${j}" aria-pressed="${s.done}" aria-label="Set ${label} done">${ICONS.check}</button>
      ${j === prIdx ? '<span class="pr-tag">PR</span>' : ""}
    </div>`;
  }).join("");

  return `<section class="card entry" id="entry-${i}">
    <div class="entry-head">
      <h3 class="entry-name">${esc(ex.name)}</h3>
      <button class="icon-btn" data-entry-menu="${i}" aria-label="${esc(ex.name)} options">${ICONS.dots}</button>
    </div>
    <p class="last-time">${last
      ? `Last time (${shortDate(last.workout.date)}): ${last.entry.sets.filter((s) => !s.warmup).map((s) => fmtSet(s, ex.kind)).join(" · ") || "warm-ups only"}`
      : "First time logging this"}</p>
    <div class="set-grid">
      <div class="set-row set-header" aria-hidden="true">
        <span>Set</span>${fields.map((f) => `<span>${f ? f.label : ""}</span>`).join("")}<span>Done</span>
      </div>
      ${rows}
    </div>
    <button class="btn btn-small" data-add-set="${i}">+ Add set</button>
  </section>`;
}

function refreshEntry(i) {
  const w = currentWorkout();
  const card = document.getElementById(`entry-${i}`);
  if (w && card && w.entries[i]) card.outerHTML = entryHTML(w, w.entries[i], i);
  else renderLifts();
}

function historyHTML() {
  const done = state.workouts.filter((w) => w.finishedAt)
    .sort((a, b) => (a.date === b.date ? (a.startedAt < b.startedAt ? 1 : -1) : a.date < b.date ? 1 : -1));
  if (!done.length) {
    return `<section class="card empty"><h2 class="card-title">No sessions yet</h2>
      <p class="hint">Finished sessions show up here. Tap one to view or edit it.</p></section>`;
  }
  let month = "";
  return done.map((w) => {
    const d = parseKey(w.date);
    const m = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const header = m !== month ? `<h2 class="section-label">${m}</h2>` : "";
    month = m;
    const sets = w.entries.reduce((n, e) => n + e.sets.filter((s) => !s.warmup).length, 0);
    const prs = workoutPRCount(w);
    const meta2 = [w.painScore != null ? `Pain ${w.painScore}/10` : "", w.notes ? w.notes.split("\n")[0] : ""].filter(Boolean).join(" · ");
    return `${header}<button class="card history-item" data-open-workout="${esc(w.id)}">
      <span class="hist-date"><span class="hist-dow">${WEEKDAYS_SHORT[d.getDay()]}</span><span class="hist-day">${d.getDate()}</span></span>
      <span class="hist-main">
        <span class="hist-title">${esc(workoutTitle(w))} ${prs ? `<span class="pill pill-gold">${lineIcon("trophy", "inline-icon")}${plural(prs, "PR")}</span>` : ""}</span>
        <span class="hist-meta">${fmtDuration(new Date(w.finishedAt) - new Date(w.startedAt))} · ${plural(w.entries.length, "exercise")} · ${plural(sets, "set")}</span>
        ${meta2 ? `<span class="hist-meta hist-notes">${esc(meta2)}</span>` : ""}
      </span>
      ${ICONS.arrow}
    </button>`;
  }).join("");
}

// Exercises that have at least one logged set, most recently used first.
function exercisesWithData() {
  const lastUsed = {};
  for (const w of state.workouts) {
    if (!w.finishedAt) continue;
    for (const e of w.entries) if (e.sets.some(setHasData)) lastUsed[e.exerciseId] = lastUsed[e.exerciseId] > w.date ? lastUsed[e.exerciseId] : w.date;
  }
  return Object.keys(lastUsed).map(exerciseById).filter(Boolean)
    .sort((a, b) => (lastUsed[a.id] < lastUsed[b.id] ? 1 : -1));
}

// One point per session: top working set and best estimated 1RM.
function progressSeries(exerciseId) {
  const kind = exerciseKind(exerciseId);
  return state.workouts.filter((w) => w.finishedAt)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startedAt < b.startedAt ? -1 : 1))
    .map((w) => {
      const sets = w.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets)
        .filter((s) => !s.warmup && setHasData(s));
      if (!sets.length) return null;
      const top = sets.reduce((a, b) => ((b.weight || 0) > (a.weight || 0) || ((b.weight || 0) === (a.weight || 0) && (b.reps || 0) > (a.reps || 0)) ? b : a));
      return {
        date: w.date,
        top,
        topWeight: Math.max(...sets.map((s) => s.weight || 0)),
        e1rm: Math.max(...sets.map((s) => e1rm(s) || 0)),
        maxReps: Math.max(...sets.map((s) => s.reps || 0)),
        maxSeconds: Math.max(...sets.map((s) => s.seconds || 0)),
        volume: sets.reduce((n, s) => n + (s.weight || 0) * (s.reps || 0), 0),
        kind
      };
    }).filter(Boolean);
}

function progressHTML() {
  const list = exercisesWithData();
  if (!list.length) {
    return `<section class="card empty"><h2 class="card-title">No data yet</h2>
      <p class="hint">Finish a session and your progress charts and PRs will appear here.</p></section>`;
  }
  if (!list.some((e) => e.id === liftsUI.progressExId)) liftsUI.progressExId = list[0].id;
  const ex = exerciseById(liftsUI.progressExId);
  const series = progressSeries(ex.id);

  // Personal records for the tiles.
  const best = (key) => series.reduce((a, b) => (b[key] > a[key] ? b : a), series[0]);
  let tiles;
  if (ex.kind === "hold") {
    const b = best("maxSeconds");
    tiles = [["Longest hold", `${num(b.maxSeconds)}s`, shortDate(b.date)]];
  } else if (ex.kind === "bodyweight" && !series.some((p) => p.topWeight)) {
    const b = best("maxReps");
    tiles = [["Most reps", `${b.maxReps}`, shortDate(b.date)]];
  } else {
    const h = best("topWeight");
    const e = best("e1rm");
    const v = best("volume");
    tiles = [
      ["Heaviest set", fmtSet(h.top, ex.kind), shortDate(h.date)],
      ["Best est. 1RM", `${num(e.e1rm)} lb`, shortDate(e.date)],
      ["Best volume", `${Math.round(v.volume).toLocaleString()} lb`, shortDate(v.date)]
    ];
  }

  const chartTitle = ex.kind === "hold" ? "Longest hold per session" : ex.kind === "bodyweight" && !series.some((p) => p.topWeight)
    ? "Most reps per session" : "Top set weight and estimated 1RM";

  return `
    <section class="card">
      <label class="field"><span>Exercise</span>
        <select data-lift-field="progressEx">
          ${list.map((e) => `<option value="${esc(e.id)}" ${e.id === ex.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}
        </select></label>
    </section>
    <div class="stat-grid">
      ${tiles.map(([label, value, date]) => `<div class="stat-tile"><span class="stat-label">${lineIcon("trophy", "inline-icon")}${label}</span>
        <span class="stat-value">${esc(value)}</span><span class="stat-sub">${date}</span></div>`).join("")}
    </div>
    <section class="card chart-card">
      <h3 class="card-title">${chartTitle}</h3>
      <p class="hint">${plural(series.length, "session")}${ex.kind === "lift" || ex.kind === "bodyweight" ? " · warm-ups excluded · 1RM by Epley: weight × (1 + reps ÷ 30)" : ""}</p>
      <div class="chart-box tall"><canvas id="progress-chart" role="img" aria-label="${esc(chartTitle)} for ${esc(ex.name)}"></canvas></div>
      <div id="progress-fallback"></div>
      <details class="data-table">
        <summary>Show data table</summary>
        <table>
          <thead><tr><th>Date</th>${ex.kind === "hold" ? "<th>Longest</th>" : "<th>Top set</th><th>Est. 1RM</th>"}</tr></thead>
          <tbody>${series.slice().reverse().map((p) => `<tr><td>${shortDate(p.date)}</td>${ex.kind === "hold"
            ? `<td>${num(p.maxSeconds)}s</td>` : `<td>${fmtSet(p.top, ex.kind)}</td><td>${p.e1rm ? `${num(p.e1rm)} lb` : "–"}</td>`}</tr>`).join("")}</tbody>
        </table>
      </details>
    </section>`;
}

function drawProgressChart() {
  const ex = exerciseById(liftsUI.progressExId);
  if (!ex) return;
  const series = progressSeries(ex.id);
  const labels = series.map((p) => shortDate(p.date));
  let datasets;
  let unit = " lb";
  if (ex.kind === "hold") {
    datasets = [{ label: "Longest hold", data: series.map((p) => p.maxSeconds), color: cssVar("--series-1") }];
    unit = "s";
  } else if (ex.kind === "bodyweight" && !series.some((p) => p.topWeight)) {
    datasets = [{ label: "Most reps", data: series.map((p) => p.maxReps), color: cssVar("--series-1") }];
    unit = " reps";
  } else {
    datasets = [
      { label: "Top set weight", data: series.map((p) => p.topWeight || null), color: cssVar("--series-1") },
      { label: "Est. 1RM", data: series.map((p) => (p.e1rm ? num(p.e1rm) : null)), color: cssVar("--series-2") }
    ];
  }
  const ok = drawLineChart("progress-chart", { labels, datasets, unit });
  if (!ok) {
    document.querySelector("#progress-chart").parentElement.hidden = true;
    document.getElementById("progress-fallback").innerHTML = chartFallbackHTML();
  }
}

// --- Rest timer (lifts) ---

let restTimer = null;
function startRest(seconds = state.settings.restSeconds) {
  stopRest();
  const bar = document.getElementById("rest-bar");
  bar.hidden = false;
  bar.classList.remove("is-over");
  document.body.classList.add("has-rest-bar");
  bar.innerHTML = `
    <div class="rest-info"><span class="mini-label">Rest</span><span class="rest-time" id="rest-time">${fmtClock(seconds)}</span></div>
    <div class="rest-actions">
      <button class="btn btn-small" data-rest="-15" aria-label="15 seconds less">−15</button>
      <button class="btn btn-small" data-rest="15" aria-label="15 seconds more">+15</button>
      <button class="btn btn-small" data-rest="skip">Skip</button>
    </div>
    <div class="rest-progress"><span id="rest-fill"></span></div>`;
  const t = { total: seconds, countdown: null };
  restTimer = t;
  t.countdown = createCountdown(seconds, (left) => {
    document.getElementById("rest-time").textContent = fmtClock(left / 1000);
    document.getElementById("rest-fill").style.width = `${clamp(left / (t.total * 1000), 0, 1) * 100}%`;
  }, () => {
    signals.restEnd();
    bar.classList.add("is-over");
    document.getElementById("rest-time").textContent = "Go!";
    setTimeout(() => { if (restTimer === t) stopRest(); }, 3000);
  });
  t.countdown.start();
}

function stopRest() {
  if (restTimer) restTimer.countdown.stop();
  restTimer = null;
  const bar = document.getElementById("rest-bar");
  if (bar) bar.hidden = true;
  document.body.classList.remove("has-rest-bar");
}

function onRestClick(e) {
  const btn = e.target.closest("[data-rest]");
  if (!btn || !restTimer) return;
  if (btn.dataset.rest === "skip") { stopRest(); return; }
  const delta = Number(btn.dataset.rest);
  restTimer.total = Math.max(1, restTimer.total + delta);
  restTimer.countdown.add(delta);
}

// --- Lifts events ---

// Pick an exercise from the catalog, or create a new one.
function exercisePicker() {
  const sorted = state.exercises.slice().sort((a, b) => a.name.localeCompare(b.name));
  const listHTML = (q) => {
    const matches = sorted.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
    return matches.length
      ? matches.map((e) => `<button type="button" class="picker-item" data-pick="${esc(e.id)}">
          <span>${esc(e.name)}</span><span class="picker-kind">${esc(LIFT_KINDS[e.kind].split(" (")[0])}${e.custom ? " · custom" : ""}</span></button>`).join("")
      : '<p class="hint">No match. Create it below.</p>';
  };
  return formDialog({
    title: "Add exercise",
    submitLabel: "Create new",
    html: `
      <label class="field"><span>Search or name a new exercise</span>
        <input name="q" autocomplete="off" placeholder="e.g. Hip thrust"></label>
      <div class="picker-list">${listHTML("")}</div>
      <label class="field"><span>Type (for new exercises)</span>
        <select name="kind">${Object.entries(LIFT_KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>`,
    setup(form, finish) {
      form.elements.q.addEventListener("input", () => {
        form.querySelector(".picker-list").innerHTML = listHTML(form.elements.q.value.trim());
      });
      form.addEventListener("click", (e) => {
        const pick = e.target.closest("[data-pick]");
        if (pick) finish({ exerciseId: pick.dataset.pick });
      });
    },
    read(form) {
      const name = form.elements.q.value.trim();
      if (!name) return "Type a name to create a new exercise, or pick one from the list.";
      const existing = state.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
      if (existing) return { exerciseId: existing.id };
      return { create: { name, kind: form.elements.kind.value } };
    }
  });
}

async function addExerciseToWorkout() {
  const w = currentWorkout();
  if (!w) return;
  const pick = await exercisePicker();
  if (!pick) return;
  const exId = pick.exerciseId || ensureExercise(pick.create.name, pick.create.kind, true).id;
  w.entries.push({ exerciseId: exId, sets: [blankSet()] });
  w.updatedAt = new Date().toISOString();
  save();
  renderLifts();
  const card = document.getElementById(`entry-${w.entries.length - 1}`);
  if (card) scrollToCard(card);
}

async function entryMenu(i) {
  const w = currentWorkout();
  const e = w && w.entries[i];
  if (!e) return;
  const ex = exerciseById(e.exerciseId);
  const choice = await ask({
    title: ex ? ex.name : "Exercise",
    stacked: true,
    buttons: [
      ...(i > 0 ? [{ label: "Move up", value: "up" }] : []),
      ...(i < w.entries.length - 1 ? [{ label: "Move down", value: "down" }] : []),
      { label: "Remove from session", value: "remove", kind: "btn-danger" },
      { label: "Cancel", value: "cancel", kind: "btn-ghost" }
    ]
  });
  if (choice === "up" || choice === "down") {
    const to = choice === "up" ? i - 1 : i + 1;
    [w.entries[i], w.entries[to]] = [w.entries[to], w.entries[i]];
  } else if (choice === "remove") {
    if (e.sets.some(setHasData) && !(await confirmBox("Remove exercise?", "Its logged sets in this session will be deleted.", "Remove"))) return;
    w.entries.splice(i, 1);
  } else return;
  w.updatedAt = new Date().toISOString();
  save();
  renderLifts();
}

async function setMenu(i, j) {
  const w = currentWorkout();
  const s = w && w.entries[i] && w.entries[i].sets[j];
  if (!s) return;
  const choice = await ask({
    title: `Set ${j + 1}`,
    stacked: true,
    buttons: [
      { label: s.warmup ? "Mark as working set" : "Mark as warm-up", value: "warmup" },
      { label: "Delete set", value: "delete", kind: "btn-danger" },
      { label: "Cancel", value: "cancel", kind: "btn-ghost" }
    ]
  });
  if (choice === "warmup") s.warmup = !s.warmup;
  else if (choice === "delete") w.entries[i].sets.splice(j, 1);
  else return;
  w.updatedAt = new Date().toISOString();
  save();
  refreshEntry(i);
}

function onLiftsClick(e) {
  const view = e.target.closest("[data-lifts-view]");
  if (view) {
    flushSave();
    liftsUI.view = view.dataset.liftsView;
    if (liftsUI.view !== "log") liftsUI.editingId = null;
    renderLifts();
    return;
  }
  const start = e.target.closest("[data-start-workout]");
  if (start) { startWorkout(start.dataset.startWorkout || null); return; }

  const open = e.target.closest("[data-open-workout]");
  if (open) { liftsUI.editingId = open.dataset.openWorkout; liftsUI.view = "log"; renderLifts(); window.scrollTo(0, 0); return; }

  // Band work / iso work cards
  const workCheck = e.target.closest("[data-lw-check]");
  if (workCheck) {
    const routineId = workCheck.closest("[data-work-routine]").dataset.workRoutine;
    const id = workCheck.dataset.lwCheck;
    const nowDone = workCheck.getAttribute("aria-pressed") !== "true";
    setRoutineItemDone(routineId, id, nowDone);
    refreshWorkCard(routineId, id);
    if (nowDone) {
      const fresh = document.querySelector(`[data-lw-check="${id}"]`);
      if (fresh) fresh.closest(".s-item").classList.add("pop");
    }
    return;
  }
  const workTimer = e.target.closest("[data-lw-timer]");
  if (workTimer) {
    const routineId = workTimer.closest("[data-work-routine]").dataset.workRoutine;
    const found = findItem(workTimer.dataset.lwTimer);
    if (found) openHoldTimer(found.item, () => { setRoutineItemDone(routineId, found.item.id, true); refreshWorkCard(routineId, found.item.id); });
    return;
  }

  const w = currentWorkout();
  if (!w) return;

  const done = e.target.closest("[data-set-done]");
  if (done) {
    unlockAudio();
    const [i, j] = done.dataset.setDone.split(":").map(Number);
    const s = w.entries[i].sets[j];
    s.done = !s.done;
    w.updatedAt = new Date().toISOString();
    save();
    refreshEntry(i);
    if (s.done) {
      const btn = document.querySelector(`[data-set-done="${i}:${j}"]`);
      if (btn) btn.classList.add("pop");
      if (!w.finishedAt && state.settings.restTimerOn) startRest();
    }
    return;
  }

  const add = e.target.closest("[data-add-set]");
  if (add) {
    const i = Number(add.dataset.addSet);
    const sets = w.entries[i].sets;
    const prev = sets[sets.length - 1];
    sets.push(prev ? { ...prev, warmup: false, done: false } : blankSet());   // copy the previous set
    w.updatedAt = new Date().toISOString();
    save();
    refreshEntry(i);
    const first = document.querySelector(`#entry-${i} .set-row:last-of-type .set-input`);
    if (first) first.focus({ preventScroll: true });
    return;
  }

  const setBtn = e.target.closest("[data-set-menu]");
  if (setBtn) { const [i, j] = setBtn.dataset.setMenu.split(":").map(Number); setMenu(i, j); return; }
  const entryBtn = e.target.closest("[data-entry-menu]");
  if (entryBtn) { entryMenu(Number(entryBtn.dataset.entryMenu)); return; }

  const action = e.target.closest("[data-lift]");
  if (!action) return;
  if (action.dataset.lift === "add-exercise") addExerciseToWorkout();
  if (action.dataset.lift === "finish") finishWorkout();
  if (action.dataset.lift === "discard") discardWorkout(w);
}

function onLiftsInput(e) {
  const t = e.target;
  // Progress view's exercise picker works without a current workout.
  if (t.dataset.liftField === "progressEx") { liftsUI.progressExId = t.value; renderLifts(); return; }
  const w = currentWorkout();
  if (!w) return;

  if (t.classList.contains("set-input")) {
    const value = parseNum(t.value);
    t.toggleAttribute("aria-invalid", value === undefined);
    if (value === undefined) return;   // leave the old value until it's a valid number
    w.entries[Number(t.dataset.e)].sets[Number(t.dataset.s)][t.dataset.f] = value;
    w.updatedAt = new Date().toISOString();
    saveSoon();
    return;
  }

  switch (t.dataset.liftField) {
    case "notes":
      w.notes = t.value;
      autoGrow(t);
      w.updatedAt = new Date().toISOString();
      saveSoon();
      break;
    case "painScore": {
      const v = Number(t.value);
      w.painScore = v;
      t.style.setProperty("--pct", `${v * 10}%`);
      t.className = `pain-range ${painClass(v)}`;
      const out = document.getElementById("w-pain-out");
      out.textContent = `${v}/10`;
      out.className = `pain-val ${painClass(v)}`;
      w.updatedAt = new Date().toISOString();
      saveSoon(() => renderToday());
      break;
    }
    case "date":
      if (t.value && e.type === "change") { w.date = t.value; w.updatedAt = new Date().toISOString(); save(); renderLifts(); }
      break;
    case "restTimerOn":
      state.settings.restTimerOn = t.checked;
      save();
      if (!t.checked) stopRest();
      break;
  }
}

function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`;
}

/* ---------- 17. Rehab tab ---------- */

const rehabUI = { date: null, drafts: {} };   // drafts: unsaved form values, per form

function rehabDraft(formId, date) {
  const existing = rehabUI.drafts[formId];
  if (existing && existing.date === date) return existing;
  const entry = state.rehabLog[date];
  const draft = {
    date,
    areas: Object.fromEntries(state.rehabAreas.map((a) => [a.id, entry && entry.areas && entry.areas[a.id] != null ? entry.areas[a.id] : 0])),
    baseline: entry ? entry.baseline ?? null : null,
    note: entry ? entry.note || "" : ""
  };
  rehabUI.drafts[formId] = draft;
  return draft;
}

// Check-in form, used on Today ("today") and in the Rehab tab ("tab").
function rehabFormHTML(formId, date) {
  const d = rehabDraft(formId, date);
  const exists = !!state.rehabLog[date];
  return `<form class="rehab-form" data-rehab-form="${formId}" data-date="${date}" novalidate>
    ${state.rehabAreas.map((a) => {
      const v = d.areas[a.id] ?? 0;
      const id = `${formId}-area-${a.id}`;
      return `<div class="slider-row">
        <div class="slider-head"><label for="${id}">${esc(a.name)}</label>
          <output class="pain-val ${painClass(v)}" id="${id}-out">${v}</output></div>
        <input type="range" class="pain-range ${painClass(v)}" id="${id}" min="0" max="10" step="1"
          value="${v}" data-area="${esc(a.id)}" style="--pct:${v * 10}%">
      </div>`;
    }).join("")}
    <div class="field">
      <span>Back to baseline this morning?</span>
      <div class="segmented seg-yes-no">
        <button type="button" data-baseline="yes" aria-pressed="${d.baseline === true}">Yes</button>
        <button type="button" data-baseline="no" aria-pressed="${d.baseline === false}">No</button>
      </div>
    </div>
    <label class="field"><span>Note (optional)</span>
      <textarea name="note" rows="2" maxlength="500" placeholder="Anything worth remembering?">${esc(d.note)}</textarea></label>
    <button type="submit" class="btn btn-primary">${exists ? "Update check-in" : "Save check-in"}</button>
  </form>`;
}

function onRehabFormClick(e) {
  const btn = e.target.closest("[data-baseline]");
  if (!btn) return;
  const form = btn.closest("[data-rehab-form]");
  const d = rehabDraft(form.dataset.rehabForm, form.dataset.date);
  const value = btn.dataset.baseline === "yes";
  d.baseline = d.baseline === value ? null : value;   // tap again to clear
  form.querySelectorAll("[data-baseline]").forEach((b) => {
    b.setAttribute("aria-pressed", String(d.baseline === (b.dataset.baseline === "yes")));
  });
}

function onRehabFormInput(e) {
  const form = e.target.closest("[data-rehab-form]");
  if (!form) return false;
  const d = rehabDraft(form.dataset.rehabForm, form.dataset.date);
  if (e.target.dataset.area) {
    const v = Number(e.target.value);
    d.areas[e.target.dataset.area] = v;
    e.target.style.setProperty("--pct", `${v * 10}%`);
    e.target.className = `pain-range ${painClass(v)}`;
    const out = document.getElementById(`${e.target.id}-out`);
    out.textContent = String(v);
    out.className = `pain-val ${painClass(v)}`;
  }
  if (e.target.name === "note") d.note = e.target.value;
  return true;
}

function onRehabFormSubmit(e) {
  const form = e.target.closest("[data-rehab-form]");
  if (!form) return;
  e.preventDefault();
  const formId = form.dataset.rehabForm;
  const date = form.dataset.date;
  const d = rehabDraft(formId, date);
  state.rehabLog[date] = {
    areas: { ...d.areas },
    baseline: d.baseline,
    note: d.note.trim(),
    updatedAt: new Date().toISOString()
  };
  save();
  delete rehabUI.drafts.today;
  delete rehabUI.drafts.tab;
  const habit = date === dateKey() ? autoCheckHabit("rehab") : null;
  renderToday();
  renderHabits();
  if (currentTab === "rehab") renderRehab();
  const high = Math.max(...Object.values(d.areas));
  toast(high > 3 ? "Check-in saved · pain above 3, remember the pain rule"
    : `Check-in saved${habit ? ` · “${habit.name}” checked ✓` : ""}`, high > 3);
}

function renderRehab() {
  const today = dateKey();
  if (!rehabUI.date || rehabUI.date > today) rehabUI.date = today;
  const date = rehabUI.date;
  const exists = !!state.rehabLog[date];
  const isToday = date === today;

  // Last 30 days, oldest first.
  const days = [];
  for (let i = 29; i >= 0; i--) days.push(dateKey(addDays(startOfDay(), -i)));
  const logged = days.filter((k) => state.rehabLog[k]);
  const baselineYes = logged.filter((k) => state.rehabLog[k].baseline === true).length;
  const baselineNo = logged.filter((k) => state.rehabLog[k].baseline === false).length;

  document.getElementById("rehab-content").innerHTML = `
    <section class="card">
      <div class="card-head-row">
        <h2 class="card-title">Check-in</h2>
        <input type="date" class="date-input" id="rehab-date" value="${date}" max="${today}" aria-label="Check-in date">
      </div>
      <p class="hint check-in-hint">${exists
        ? `Logged for ${isToday ? "today" : dayLabel(parseKey(date))}. Change anything and tap Update.`
        : isToday ? "Not logged yet today. 0 = nothing, 10 = worst." : `Nothing logged for ${dayLabel(parseKey(date))}.`}</p>
      ${state.rehabAreas.length ? rehabFormHTML("tab", date) : '<p class="hint">Add an area below to start checking in.</p>'}
      ${exists ? `<button class="btn btn-ghost btn-small delete-entry" data-rehab-action="delete-entry">Delete this check-in</button>` : ""}
    </section>

    <h2 class="section-label">Last 30 days</h2>
    <p class="hint rehab-summary">${plural(logged.length, "check-in")} logged${logged.length
      ? ` · back to baseline on ${baselineYes} ${baselineNo ? `· not on ${baselineNo}` : ""}` : ""}. Dashed line = pain limit (3/10).</p>
    ${state.rehabAreas.map((a) => {
      const values = days.map((k) => (state.rehabLog[k] && state.rehabLog[k].areas ? state.rehabLog[k].areas[a.id] ?? null : null));
      const real = values.filter((v) => v != null);
      const avg = real.length ? num(real.reduce((x, y) => x + y, 0) / real.length) : null;
      const over = real.filter((v) => v > 3).length;
      return `<section class="card chart-card">
        <div class="card-head-row">
          <h3 class="card-title">${esc(a.name)}</h3>
          <span class="hint">${real.length ? `Latest ${real[real.length - 1]} · avg ${avg}${over ? ` · ${over} day${over === 1 ? "" : "s"} above 3` : ""}` : "No data yet"}</span>
        </div>
        ${real.length ? `<div class="chart-box"><canvas id="rehab-chart-${esc(a.id)}" role="img" aria-label="${esc(a.name)} pain, last 30 days"></canvas></div>` : ""}
      </section>`;
    }).join("")}
    ${logged.length ? `<details class="data-table card">
      <summary>Show data table</summary>
      <table>
        <thead><tr><th>Date</th>${state.rehabAreas.map((a) => `<th>${esc(a.name)}</th>`).join("")}<th>Baseline</th></tr></thead>
        <tbody>${logged.slice().reverse().map((k) => {
          const r = state.rehabLog[k];
          return `<tr><td>${shortDate(k)}</td>${state.rehabAreas.map((a) => `<td>${r.areas[a.id] ?? "–"}</td>`).join("")}
            <td>${r.baseline === true ? "Yes" : r.baseline === false ? "No" : "–"}</td></tr>`;
        }).join("")}</tbody>
      </table>
    </details>` : ""}
    <div id="rehab-fallback"></div>

    <h2 class="section-label">Areas</h2>
    <section class="card">
      <ul class="area-list">
        ${state.rehabAreas.map((a) => `<li class="area-row">
          <span class="area-name">${esc(a.name)}</span>
          <button class="btn btn-small" data-rehab-action="rename" data-id="${esc(a.id)}">Rename</button>
          <button class="btn btn-small btn-danger" data-rehab-action="remove" data-id="${esc(a.id)}">Remove</button>
        </li>`).join("")}
      </ul>
      <button class="btn btn-small" data-rehab-action="add-area">+ Add area</button>
    </section>`;

  // Draw the charts now that the canvases exist.
  let chartsOk = true;
  const labels = days.map(shortDate);
  for (const a of state.rehabAreas) {
    if (!document.getElementById(`rehab-chart-${a.id}`)) continue;
    const values = days.map((k) => (state.rehabLog[k] && state.rehabLog[k].areas ? state.rehabLog[k].areas[a.id] ?? null : null));
    chartsOk = drawLineChart(`rehab-chart-${a.id}`, {
      labels,
      yMin: 0,
      yMax: 10,
      unit: "/10",
      datasets: [
        { label: a.name, data: values, color: cssVar("--series-1") },
        { label: "Pain limit", data: labels.map(() => 3), color: cssVar("--chart-ref"), reference: true }
      ]
    }) && chartsOk;
  }
  if (!chartsOk) {
    document.querySelectorAll("#rehab-content .chart-box").forEach((b) => { b.hidden = true; });
    document.getElementById("rehab-fallback").innerHTML = chartFallbackHTML();
  }
}

function areaForm(area) {
  return formDialog({
    title: area ? "Rename area" : "Add area",
    html: `<label class="field"><span>Name</span>
      <input name="name" maxlength="40" autocomplete="off" value="${esc(area ? area.name : "")}" placeholder="e.g. Right ankle"></label>`,
    read(form) {
      const name = form.elements.name.value.trim();
      return name ? { name } : "Give the area a name.";   // a plain string means "show this error"
    }
  }).then((result) => (result ? result.name : null));
}

async function onRehabClick(e) {
  onRehabFormClick(e);
  const btn = e.target.closest("[data-rehab-action]");
  if (!btn) return;
  const action = btn.dataset.rehabAction;
  const area = state.rehabAreas.find((a) => a.id === btn.dataset.id);

  if (action === "add-area") {
    const name = await areaForm(null);
    if (!name) return;
    let id = slug(name) || uid();
    if (state.rehabAreas.some((a) => a.id === id)) id = `${id}-${uid(4)}`;
    state.rehabAreas.push({ id, name, updatedAt: new Date().toISOString() });
  } else if (action === "rename" && area) {
    const name = await areaForm(area);
    if (!name) return;
    area.name = name;
    area.updatedAt = new Date().toISOString();
  } else if (action === "remove" && area) {
    if (!(await confirmBox(`Stop tracking ${area.name}?`, "Past scores are kept in your data, but the area won't appear in check-ins or charts.", "Remove"))) return;
    state.rehabAreas = state.rehabAreas.filter((a) => a.id !== area.id);
  } else if (action === "delete-entry") {
    if (!(await confirmBox("Delete this check-in?", `The check-in for ${dayLabel(parseKey(rehabUI.date))} will be removed.`))) return;
    delete state.rehabLog[rehabUI.date];
  } else return;

  rehabUI.drafts = {};
  save();
  renderRehab();
  renderToday();
}

function onRehabChange(e) {
  if (e.target.id === "rehab-date" && e.target.value) {
    rehabUI.date = e.target.value > dateKey() ? dateKey() : e.target.value;
    renderRehab();
  }
}

/* ---------- 18. Notes tab ---------- */

const notesUI = { query: "", tag: null, editingId: null };

function allTags() {
  const tags = new Set(SEED_TAGS);
  state.notes.forEach((n) => n.tags.forEach((t) => tags.add(t)));
  return [...tags];
}

function noteTitle(n) {
  return n.title.trim() || n.body.trim().split("\n")[0].slice(0, 80) || "Untitled note";
}

function filteredNotes() {
  const q = notesUI.query.trim().toLowerCase();
  return state.notes
    .filter((n) => !notesUI.tag || n.tags.includes(notesUI.tag))
    .filter((n) => !q || `${n.title}\n${n.body}\n${n.tags.join(" ")}`.toLowerCase().includes(q))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function renderNotes() {
  const root = document.getElementById("notes-content");
  const n = notesUI.editingId && state.notes.find((x) => x.id === notesUI.editingId);
  if (n) { root.innerHTML = noteEditorHTML(n); autoGrow(document.getElementById("note-body")); return; }
  notesUI.editingId = null;
  root.innerHTML = `
    <div class="notes-toolbar">
      <label class="search-box">${ICONS.search}
        <input type="search" id="note-search" placeholder="Search notes" value="${esc(notesUI.query)}" aria-label="Search notes"></label>
      <button class="btn btn-primary" data-note="new">+ New</button>
    </div>
    <div class="tag-filter" role="group" aria-label="Filter by tag">
      <button class="tag-chip" data-tag-filter="" aria-pressed="${!notesUI.tag}">All</button>
      ${allTags().map((t) => `<button class="tag-chip" data-tag-filter="${esc(t)}" aria-pressed="${notesUI.tag === t}">#${esc(t)}</button>`).join("")}
    </div>
    <div id="notes-list">${notesListHTML()}</div>`;
}

function notesListHTML() {
  const list = filteredNotes();
  if (!state.notes.length) {
    return `<section class="card empty"><h2 class="card-title">No notes yet</h2>
      <p class="hint">Tap “New” to write one. Notes save as you type.</p></section>`;
  }
  if (!list.length) return '<p class="hint">No notes match.</p>';
  return list.map((n) => {
    const body = n.title.trim() ? n.body.trim() : n.body.trim().split("\n").slice(1).join("\n").trim();
    return `<button class="card note-card" data-open-note="${esc(n.id)}">
      <span class="note-date">${dayLabel(new Date(n.createdAt))}</span>
      <span class="note-title">${esc(noteTitle(n))}</span>
      ${body ? `<span class="note-excerpt">${esc(body.slice(0, 240))}</span>` : ""}
      ${n.tags.length ? `<span class="note-tags">${n.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</span>` : ""}
    </button>`;
  }).join("");
}

function noteEditorHTML(n) {
  return `<div class="note-editor">
    <div class="note-bar">
      <button class="btn btn-ghost" data-note="back">${ICONS.back}Notes</button>
      <span class="save-state" id="note-save-state">Saved</span>
    </div>
    <input class="note-title-input" id="note-title" placeholder="Title (optional)" maxlength="120" value="${esc(n.title)}" aria-label="Note title">
    <p class="hint">${dayLabel(new Date(n.createdAt))}${n.updatedAt && n.updatedAt !== n.createdAt ? ` · edited ${timeLabel(n.updatedAt)}` : ""}</p>
    <textarea class="note-body autogrow" id="note-body" placeholder="Write something…" aria-label="Note text">${esc(n.body)}</textarea>
    <div class="tag-row" role="group" aria-label="Tags">
      ${allTags().map((t) => `<button class="tag-chip" data-note-tag="${esc(t)}" aria-pressed="${n.tags.includes(t)}">#${esc(t)}</button>`).join("")}
      <input class="tag-input" id="note-tag-input" placeholder="+ new tag" maxlength="24" aria-label="Add a tag" enterkeyhint="done">
    </div>
    <button class="btn btn-danger btn-small" data-note="delete">Delete note</button>
  </div>`;
}

function newNote() {
  const now = new Date().toISOString();
  const n = { id: uid(), createdAt: now, updatedAt: now, title: "", body: "", tags: notesUI.tag ? [notesUI.tag] : [] };
  state.notes.push(n);
  save();
  notesUI.editingId = n.id;
  renderNotes();
  document.getElementById("note-body").focus();
}

// Leave the editor. Notes left completely empty are removed.
function closeNoteEditor(rerender = true) {
  flushSave();
  const n = state.notes.find((x) => x.id === notesUI.editingId);
  if (n && !n.title.trim() && !n.body.trim()) {
    state.notes = state.notes.filter((x) => x.id !== n.id);
    save();
  }
  notesUI.editingId = null;
  if (rerender) renderNotes();
}

function markNoteChanged(n) {
  n.updatedAt = new Date().toISOString();
  const label = document.getElementById("note-save-state");
  if (label) label.textContent = "Saving…";
  saveSoon(() => { const l = document.getElementById("note-save-state"); if (l) l.textContent = "Saved"; });
}

async function onNotesClick(e) {
  const open = e.target.closest("[data-open-note]");
  if (open) { notesUI.editingId = open.dataset.openNote; renderNotes(); window.scrollTo(0, 0); return; }
  const filter = e.target.closest("[data-tag-filter]");
  if (filter) { notesUI.tag = filter.dataset.tagFilter || null; renderNotes(); return; }

  const n = state.notes.find((x) => x.id === notesUI.editingId);
  const tagBtn = e.target.closest("[data-note-tag]");
  if (tagBtn && n) {
    const t = tagBtn.dataset.noteTag;
    n.tags = n.tags.includes(t) ? n.tags.filter((x) => x !== t) : [...n.tags, t];
    tagBtn.setAttribute("aria-pressed", String(n.tags.includes(t)));
    markNoteChanged(n);
    return;
  }

  const action = e.target.closest("[data-note]");
  if (!action) return;
  if (action.dataset.note === "new") newNote();
  if (action.dataset.note === "back") closeNoteEditor();
  if (action.dataset.note === "delete" && n) {
    if (!(await confirmBox("Delete this note?", `“${noteTitle(n)}” will be permanently deleted.`))) return;
    state.notes = state.notes.filter((x) => x.id !== n.id);
    notesUI.editingId = null;
    save();
    renderNotes();
    toast("Note deleted");
  }
}

function onNotesInput(e) {
  if (e.target.id === "note-search") {
    notesUI.query = e.target.value;
    document.getElementById("notes-list").innerHTML = notesListHTML();
    return;
  }
  const n = state.notes.find((x) => x.id === notesUI.editingId);
  if (!n) return;
  if (e.target.id === "note-title") { n.title = e.target.value; markNoteChanged(n); }
  if (e.target.id === "note-body") { n.body = e.target.value; autoGrow(e.target); markNoteChanged(n); }
}

function onNotesKeydown(e) {
  if (e.target.id !== "note-tag-input" || (e.key !== "Enter" && e.key !== ",")) return;
  e.preventDefault();
  const n = state.notes.find((x) => x.id === notesUI.editingId);
  const tag = e.target.value.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").slice(0, 24);
  if (!n || !tag) return;
  if (!n.tags.includes(tag)) n.tags.push(tag);
  markNoteChanged(n);
  flushSave();
  renderNotes();
  document.getElementById("note-tag-input").focus();
}

/* ---------- 18b. Calendar (opened from the Today page) ---------- */
// Month grid with each day's progress ring; tap a day for its checklist and logs.

const calUI = { month: null, selected: null };   // month = first day of the shown month
const MINI_RING = 2 * Math.PI * 15;               // r = 15 in the day cell's viewBox

// First day there's anything to show: when the app was set up or the earliest log.
function trackingStart() {
  const keys = [dateKey(new Date(state.createdAt || Date.now()))];
  keys.push(...Object.keys(state.habitLog), ...Object.keys(state.rehabLog));
  state.workouts.forEach((w) => { if (w.finishedAt) keys.push(w.date); });
  state.routineCompletions.forEach((c) => keys.push(c.date));
  return parseKey(keys.sort()[0]);
}

function habitStarts() {
  return new Map(state.habits.map((h) => [h.id, firstTrackedDate(h)]));
}

function openCalendar(key = dateKey()) {
  calUI.selected = key;
  const d = parseKey(key);
  calUI.month = new Date(d.getFullYear(), d.getMonth(), 1);
  goToTab("calendar");
}

function renderCalendar() {
  const today = startOfDay();
  if (!calUI.month) calUI.month = new Date(today.getFullYear(), today.getMonth(), 1);
  if (!calUI.selected) calUI.selected = dateKey(today);
  const start = trackingStart();
  const starts = habitStarts();
  const month = calUI.month;
  const weekStart = state.settings.scheduleStartWeekday;
  const lead = (month.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  let cells = "";
  for (let i = 0; i < lead; i++) cells += '<span class="cal-cell is-blank"></span>';
  const monthFracs = [];
  for (let n = 1; n <= daysInMonth; n++) {
    const d = new Date(month.getFullYear(), month.getMonth(), n);
    const key = dateKey(d);
    const inRange = d >= start && d <= today;
    const classes = ["cal-cell"];
    if (sameDay(d, today)) classes.push("is-today");
    if (key === calUI.selected) classes.push("is-selected");
    if (!inRange) {
      classes.push(d > today ? "is-future" : "is-before");
      cells += `<span class="${classes.join(" ")}"><span class="cal-num">${n}</span></span>`;
      continue;
    }
    const p = dayProgress(d, starts);
    monthFracs.push(p.frac);
    if (p.frac === 1) classes.push("is-complete");
    cells += `<button class="${classes.join(" ")}" data-cal-day="${key}" aria-pressed="${key === calUI.selected}"
        aria-label="${dayLabel(d)}: ${Math.round(p.frac * 100)}%">
      <svg class="cal-ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle class="cal-ring-track" cx="18" cy="18" r="15"/>
        <circle class="cal-ring-fill" cx="18" cy="18" r="15" transform="rotate(-90 18 18)"
          stroke-dasharray="${MINI_RING.toFixed(2)}" stroke-dashoffset="${(MINI_RING * (1 - p.frac)).toFixed(2)}"/>
      </svg>
      <span class="cal-num">${n}</span>
    </button>`;
  }

  const complete = monthFracs.filter((f) => f === 1).length;
  const avg = monthFracs.length ? Math.round((monthFracs.reduce((a, b) => a + b, 0) / monthFracs.length) * 100) : 0;
  const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const canGoBack = new Date(month.getFullYear(), month.getMonth(), 0) >= start;   // last day of previous month

  document.getElementById("calendar-content").innerHTML = `
    <section class="card cal-card">
      <div class="cal-head">
        <button class="icon-btn" data-cal-nav="-1" aria-label="Previous month" ${canGoBack ? "" : "disabled"}>${ICONS.back}</button>
        <h2 class="cal-title">${month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
        <button class="icon-btn" data-cal-nav="1" aria-label="Next month" ${isCurrentMonth ? "disabled" : ""}>${ICONS.arrow}</button>
      </div>
      <div class="cal-grid" role="grid">
        ${ALL_DAYS.map((i) => `<span class="cal-dow">${WEEKDAYS_SHORT[(weekStart + i) % 7].charAt(0)}</span>`).join("")}
        ${cells}
      </div>
      <div class="cal-foot">
        <span class="hint">${monthFracs.length ? `${plural(complete, "day")} at 100% · average ${avg}%` : "Nothing tracked this month"}</span>
        ${isCurrentMonth && calUI.selected === dateKey(today) ? "" : '<button class="btn btn-small" data-cal-nav="today">Today</button>'}
      </div>
    </section>
    ${calendarDayHTML(parseKey(calUI.selected), starts)}`;
}

function calendarDayHTML(day, starts) {
  const key = dateKey(day);
  if (day > startOfDay() || day < trackingStart()) {
    return `<section class="card empty"><p class="hint">Nothing tracked for ${dayLabel(day)}.</p></section>`;
  }
  const p = dayProgress(day, starts);
  const pct = Math.round(p.frac * 100);
  const routineId = p.routineId;
  const overridden = !!state.sessionOverrides[key];

  // Checklist: morning routine, every habit due that day (tappable), training parts.
  const morning = getRoutine("morning");
  const mp = morning ? routineProgress(morning, key) : null;
  const habitRows = p.due.map((h) => `<li>
      <button class="today-habit ${isDone(h, key) ? "done" : ""}" data-cal-habit="${esc(h.id)}" aria-pressed="${isDone(h, key)}">
        <span class="check">${ICONS.check}</span>
        ${habitIconHTML(h)}
        <span class="habit-text"><span class="habit-name">${esc(h.name)}</span></span>
      </button>
    </li>`).join("");
  const statusRow = (label, detail, done) => `<li class="cal-status ${done ? "done" : ""}">
      <span class="check">${ICONS.check}</span>
      <span class="habit-text"><span class="habit-name">${esc(label)}</span><span class="habit-meta">${esc(detail)}</span></span>
    </li>`;
  const trainingRows = p.parts.filter((x) => !["morning", "habits"].includes(x.id))
    .map((x) => statusRow(x.label, x.detail, x.done)).join("");

  // What was logged that day.
  const workouts = state.workouts.filter((w) => w.finishedAt && w.date === key);
  const rehab = state.rehabLog[key];
  const notes = state.notes.filter((n) => dateKey(new Date(n.createdAt)) === key);

  const workoutHTML = workouts.map((w) => {
    const prs = workoutPRCount(w);
    const lines = w.entries.map((e) => {
      const ex = exerciseById(e.exerciseId) || { name: "Exercise", kind: "lift" };
      const sets = e.sets.filter((s) => !s.warmup && setHasData(s)).map((s) => fmtSet(s, ex.kind)).join(" · ");
      return `<li><span>${esc(ex.name)}</span><span class="muted">${esc(sets || "warm-ups only")}</span></li>`;
    }).join("");
    return `<button class="cal-log cal-log-btn" data-cal-workout="${esc(w.id)}">
      <span class="cal-log-title">${lineIcon("dumbbell")}${esc(workoutTitle(w))} · ${fmtDuration(new Date(w.finishedAt) - new Date(w.startedAt))}
        ${prs ? `<span class="pill pill-gold">${lineIcon("trophy", "inline-icon")}${plural(prs, "PR")}</span>` : ""}</span>
      <ul class="cal-sets">${lines}</ul>
      ${w.painScore != null || w.notes ? `<span class="hint">${[w.painScore != null ? `Pain ${w.painScore}/10` : "", esc(w.notes)].filter(Boolean).join(" · ")}</span>` : ""}
    </button>`;
  }).join("");

  const rehabHTML = rehab ? `<button class="cal-log cal-log-btn" data-cal-rehab="${key}">
      <span class="cal-log-title">${lineIcon("pulse")}Rehab check-in</span>
      <span class="cal-scores">${state.rehabAreas.filter((a) => rehab.areas && rehab.areas[a.id] != null).map((a) =>
        `<span>${esc(a.name)} <b class="pain-val ${painClass(rehab.areas[a.id])}">${rehab.areas[a.id]}</b></span>`).join("")}</span>
      <span class="hint">${rehab.baseline === true ? "Back to baseline" : rehab.baseline === false ? "Not back to baseline" : "Baseline not recorded"}${rehab.note ? ` · ${esc(rehab.note)}` : ""}</span>
    </button>` : "";

  const notesHTML = notes.map((n) => `<button class="cal-log cal-log-btn" data-cal-note="${esc(n.id)}">
      <span class="cal-log-title">${lineIcon("note")}${esc(noteTitle(n))}</span>
      ${n.tags.length ? `<span class="note-tags">${n.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</span>` : ""}
    </button>`).join("");

  const logged = workoutHTML + rehabHTML + notesHTML;

  return `<section class="card cal-day">
    <div class="cal-day-head">
      <div class="day-ring-wrap cal-day-ring">
        <svg class="day-ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="day-ring-track" cx="60" cy="60" r="52"/>
          <circle class="day-ring-fill" cx="60" cy="60" r="52" transform="rotate(-90 60 60)"
            stroke-dasharray="${DAY_RING.toFixed(2)}" stroke-dashoffset="${(DAY_RING * (1 - p.frac)).toFixed(2)}"/>
        </svg>
        <span class="day-ring-label"><span class="day-pct">${pct}%</span><span class="day-sub">${p.frac === 1 ? "Day done" : ""}</span></span>
      </div>
      <div>
        <h2 class="card-title">${day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2>
        <p class="hint">${esc(routineName(routineId))} day${overridden ? " (changed)" : ""}</p>
      </div>
    </div>

    <h3 class="mini-label">Checklist</h3>
    <ul class="today-habits cal-checklist">
      ${morning ? statusRow("Morning mobility and stretching", mp.finished ? "Finished" : `${mp.done} of ${mp.total} ticked`, mp.finished) : ""}
      ${habitRows}
      ${trainingRows}
    </ul>
    <p class="hint cal-tip">Tap a habit to tick or untick it for this day.</p>

    <h3 class="mini-label">Logged</h3>
    ${logged || '<p class="hint">No lift session, rehab check-in or notes this day.</p>'}
  </section>`;
}

function onCalendarClick(e) {
  const nav = e.target.closest("[data-cal-nav]");
  if (nav) {
    if (nav.dataset.calNav === "today") { openCalendar(); renderCalendar(); return; }
    const m = calUI.month;
    calUI.month = new Date(m.getFullYear(), m.getMonth() + Number(nav.dataset.calNav), 1);
    renderCalendar();
    return;
  }
  const day = e.target.closest("[data-cal-day]");
  if (day) { calUI.selected = day.dataset.calDay; renderCalendar(); return; }

  const habit = e.target.closest("[data-cal-habit]");
  if (habit) {
    const key = calUI.selected;
    const id = habit.dataset.calHabit;
    const h = findHabit(id);
    if (!h) return;
    setDone(id, key, !isDone(h, key));
    renderCalendar();
    const fresh = document.querySelector(`[data-cal-habit="${id}"]`);
    if (fresh && isDone(h, key)) fresh.classList.add("pop");
    renderHabits();
    renderToday();
    return;
  }

  const workout = e.target.closest("[data-cal-workout]");
  if (workout) { liftsUI.editingId = workout.dataset.calWorkout; liftsUI.view = "log"; goToTab("lifts"); return; }
  const rehab = e.target.closest("[data-cal-rehab]");
  if (rehab) { rehabUI.date = rehab.dataset.calRehab; rehabUI.drafts = {}; goToTab("rehab"); return; }
  const note = e.target.closest("[data-cal-note]");
  if (note) { notesUI.editingId = note.dataset.calNote; renderNotes(); goToTab("notes"); }
}

/* ---------- 19. Settings tab ---------- */

function storageSizeLabel() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || "";
    const kb = new Blob([raw]).size / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
  } catch (_) {
    return "unavailable";
  }
}

function selectHTML(setting, options, fmt) {
  const current = state.settings[setting];
  return `<select data-setting="${setting}">
    ${options.map((v) => `<option value="${v}" ${v === current ? "selected" : ""}>${fmt(v)}</option>`).join("")}
  </select>`;
}

function switchHTML(setting, label) {
  return `<label class="switch switch-row"><input type="checkbox" data-setting="${setting}" ${state.settings[setting] ? "checked" : ""}>
    <span class="switch-ui"></span>${label}</label>`;
}

function renderSettings() {
  document.getElementById("settings-content").innerHTML = `
    <h2 class="section-label">Schedule</h2>
    <section class="card">
      <label class="field">
        <span>Day 1 of the weekly schedule</span>
        ${selectHTML("scheduleStartWeekday", ALL_DAYS, (i) => WEEKDAYS[i])}
      </label>
      <p class="hint">Today is Day ${scheduleDayNumber()}: ${esc(routineName(scheduledRoutineId()))}. Habit heatmaps also start their weeks on this day.</p>
    </section>

    <h2 class="section-label">Timers</h2>
    <section class="card settings-list">
      <label class="field"><span>Lift rest timer length</span>
        ${selectHTML("restSeconds", [60, 90, 120, 150, 180, 240, 300], fmtClock)}</label>
      ${switchHTML("restTimerOn", "Start the rest timer when a set is ticked")}
      <label class="field"><span>Rest between hold-timer sets</span>
        ${selectHTML("holdRestSeconds", [15, 30, 45, 60, 90, 120, 180], (v) => `${v}s`)}</label>
      ${switchHTML("holdRestOn", "Count down rest between hold sets")}
    </section>

    <h2 class="section-label">Sound and vibration</h2>
    <section class="card settings-list">
      ${switchHTML("sound", "Beeps")}
      ${switchHTML("vibrate", "Vibration (Android phones; iPhones don't support it)")}
      <div class="btn-row"><button class="btn btn-small" data-action="test-signal">Test</button></div>
    </section>

    <h2 class="section-label">Routines</h2>
    <section class="card">
      <p class="hint">Edit routines from their cards in the Routines tab. This puts every routine back to the version in data.js.</p>
      <div class="btn-row"><button class="btn btn-small" data-action="reset-routines">Reset all routines to defaults</button></div>
    </section>

    <h2 class="section-label">Backup</h2>
    <section class="card">
      <p class="hint">Your data is stored only in this browser on this device. Export a backup regularly, and use Import to move data between your phone and laptop.</p>
      <div class="btn-row">
        <button class="btn btn-primary" data-action="export">Export data</button>
        <button class="btn" data-action="import">Import data</button>
      </div>
      <input type="file" id="import-file" accept=".json,application/json" hidden>
      <p class="hint">Saved data size: ${storageSizeLabel()}</p>
    </section>

    <section class="card danger-zone">
      <h3 class="card-title">Reset all data</h3>
      <p class="hint">Deletes every habit, workout, note and check-in on this device and restores the defaults.</p>
      <div class="btn-row"><button class="btn btn-danger" data-action="reset">Reset all data</button></div>
    </section>

    <h2 class="section-label">About</h2>
    <section class="card">
      <dl class="kv">
        <dt>App version</dt><dd>${APP_VERSION}</dd>
        <dt>Schema version</dt><dd>${state.schemaVersion}</dd>
        <dt>Charts</dt><dd>${typeof Chart === "undefined" ? "Not loaded (offline)" : "Ready"}</dd>
        <dt>Works offline</dt><dd>${appStatus.offline}</dd>
        <dt>Storage</dt><dd>${appStatus.storage}</dd>
      </dl>
    </section>
  `;
}

async function resetAllData() {
  const first = await ask({
    title: "Reset all data?",
    body: "This deletes everything on this device. Export a backup first if you might want it back.",
    buttons: [{ label: "Cancel", value: "cancel" }, { label: "Continue", value: "yes", kind: "btn-danger" }]
  });
  if (first !== "yes") return;
  const second = await ask({
    title: "Are you sure?",
    body: "Last check. All habits, workouts, notes and check-ins will be erased.",
    buttons: [{ label: "Keep my data", value: "cancel", kind: "btn-primary" }, { label: "Erase everything", value: "yes", kind: "btn-danger" }]
  });
  if (second !== "yes") return;

  flushSave();
  keepSafetyCopy();
  stopRest();
  state = defaultState();
  if (save()) toast("All data reset");
  renderAll();
}

function onSettingsClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === "export") exportData();
  if (action === "import") document.getElementById("import-file").click();
  if (action === "reset") resetAllData();
  if (action === "reset-routines") resetAllRoutines();
  if (action === "test-signal") { unlockAudio(); signals.holdEnd(); if (!state.settings.sound && !state.settings.vibrate) toast("Beeps and vibration are both off"); }
}

function onSettingsChange(e) {
  const key = e.target.dataset.setting;
  if (key) {
    state.settings[key] = e.target.type === "checkbox" ? e.target.checked : Number(e.target.value);
    save();
    if (key === "scheduleStartWeekday") {
      renderAll();
      toast(`Schedule now starts on ${WEEKDAYS[state.settings.scheduleStartWeekday]}`);
    }
    if (key === "restTimerOn" && !state.settings.restTimerOn) stopRest();
    return;
  }
  if (e.target.id === "import-file") {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";            // allow picking the same file again
    if (file) importFromFile(file);
  }
}

/* ---------- 20. Startup ---------- */

// Offline support and storage protection. Both need the app to be served
// over http(s) (e.g. GitHub Pages); opened as a file they're skipped.
const appStatus = { offline: "Only when hosted", storage: "Checking…" };

async function setUpInstallable() {
  const hosted = location.protocol === "https:" || location.hostname === "localhost";
  if (hosted && "serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("sw.js");
      await navigator.serviceWorker.ready;
      appStatus.offline = "Yes";
    } catch (err) {
      console.warn("Service worker failed", err);
      appStatus.offline = "Not available";
    }
  }

  // Ask the browser not to clear this app's data when space runs low.
  if (navigator.storage && navigator.storage.persist) {
    try {
      const persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
      appStatus.storage = persisted ? "Protected from automatic clearing" : "Browser may clear it if space runs low. Export backups";
    } catch (_) {
      appStatus.storage = "Unknown. Export backups";
    }
  } else {
    appStatus.storage = "Unknown. Export backups";
  }
  if (currentTab === "settings") renderSettings();
}

let renderedDay = dateKey();

function renderAll() {
  renderedDay = dateKey();
  renderToday();
  renderHabits();
  renderRoutines();
  renderNotes();
  renderSettings();
  // Lifts and Rehab draw charts, so they render when visible.
  if (currentTab === "lifts") renderLifts();
  if (currentTab === "rehab") renderRehab();
  if (currentTab === "calendar") renderCalendar();
}

// If the app stays open past midnight, roll over to the new day.
function checkDayChange() {
  if (dateKey() !== renderedDay) renderAll();
}

function init() {
  // Event delegation: one listener per container survives re-renders.
  const on = (id, type, fn) => document.getElementById(id).addEventListener(type, fn);
  on("today-content", "click", onTodayClick);
  on("today-content", "input", onRehabFormInput);
  on("today-content", "submit", onRehabFormSubmit);
  on("habits-content", "click", onHabitsClick);
  on("add-habit", "click", () => editHabit(null));
  on("routines-content", "click", onRoutinesClick);
  on("session-view", "click", onSessionClick);
  on("timer-dialog", "click", onTimerClick);
  on("timer-dialog", "change", onTimerChange);
  // Close events arrive a moment later; ignore one if the timer was already reopened.
  on("timer-dialog", "close", (e) => { if (!e.target.open) stopHoldTimer(); });
  on("rest-bar", "click", onRestClick);
  on("timer-fab", "click", openTool);
  on("tool-dialog", "click", onToolClick);
  on("timer-content", "click", onToolClick);
  on("timer-content", "change", onTimerTabChange);
  on("calendar-content", "click", onCalendarClick);
  on("open-calendar", "click", () => openCalendar());
  on("lifts-content", "click", onLiftsClick);
  on("lifts-content", "input", onLiftsInput);
  on("lifts-content", "change", onLiftsInput);
  on("rehab-content", "click", onRehabClick);
  on("rehab-content", "input", onRehabFormInput);
  on("rehab-content", "submit", onRehabFormSubmit);
  on("rehab-content", "change", onRehabChange);
  on("notes-content", "click", onNotesClick);
  on("notes-content", "input", onNotesInput);
  on("notes-content", "keydown", onNotesKeydown);
  on("settings-content", "click", onSettingsClick);
  on("settings-content", "change", onSettingsChange);

  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flushSave();
    else { checkDayChange(); syncWakeLock(); }   // the screen lock is released while hidden
  });
  window.addEventListener("pagehide", flushSave);
  setInterval(toolTick, 250);
  toolTick();
  setInterval(() => {
    checkDayChange();
    const el = document.getElementById("lift-elapsed");
    const w = currentWorkout();
    if (el && w && !w.finishedAt) el.textContent = elapsedText(w);
  }, 15 * 1000);

  // If the app is open in two tabs, pick up changes saved by the other one.
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try { state = migrate(JSON.parse(e.newValue)); renderAll(); }
    catch (err) { console.warn("Ignored unreadable change from another tab", err); }
  });

  currentTab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "today";
  renderAll();
  showTab(currentTab);
  startupNotices.forEach((n) => toast(n.msg, n.error));
  setUpInstallable();
}

init();
