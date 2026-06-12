// store.js — progress and settings persistence, plus export/import.

// Exported so other tabs (the game vs the settings page) can recognize each
// other's writes via "storage" events.
export const PROGRESS_STORAGE_KEY = "atlas-progress-v2";
// v1 held one ledger per language with all modes mixed together; v2 splits
// progress into two skill tracks. The v1 key is read once for migration and
// then left in place as a backup — never written again.
const LEGACY_PROGRESS_STORAGE_KEY = "atlas-progress-v1";
export const SETTINGS_STORAGE_KEY = "atlas-settings-v1";
const STASH_STORAGE_KEY = "atlas-stash-v1";
const EXPORT_FORMAT_VERSION = 2;

export const defaultSettings = Object.freeze({
  lang: "en",
  view: "flat",
  continent: "World",
  mode: "browse",
  includeMicrostates: true,
  autoPronounce: false,
  lastQuizTrack: "locate",
});

// Settings values index directly into uiText and the mode/view/continent
// switches, so anything outside these sets falls back to the default.
// includeMicrostates must be a real boolean; saved settings from before the
// toggle existed lack the key and fall back to the default (true).
const allowedSettingValues = Object.freeze({
  lang: ["en", "zh"],
  view: ["flat", "globe"],
  continent: ["World", "Africa", "Asia", "Europe", "North America", "South America", "Oceania"],
  mode: ["browse", "type", "find", "review"],
  includeMicrostates: [true, false],
  autoPronounce: [true, false],
  lastQuizTrack: ["locate", "name"],
});

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function readStoredJson(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// A storage write failure (quota, storage denied) must never kill the answer
// flow — keep the in-memory session working and warn once.
let storageWriteFailureNotified = false;

function writeStoredJson(storageKey, value) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    if (!storageWriteFailureNotified) {
      storageWriteFailureNotified = true;
      alert("Atlas cannot save to browser storage — this session keeps working, but progress will not persist.");
    }
  }
}

function sanitizeSettings(rawSettings) {
  const settings = { ...defaultSettings };
  if (isPlainObject(rawSettings)) {
    for (const key of Object.keys(defaultSettings)) {
      if (allowedSettingValues[key].includes(rawSettings[key])) settings[key] = rawSettings[key];
    }
  }
  return settings;
}

// Rebuilds one region's untrusted stats value; null when unusable.
function sanitizeRegionStats(value) {
  if (!isPlainObject(value)) return null;
  const stats = blankRegionStats();
  for (const key of ["attempts", "exact", "almost", "wrong", "streak"]) {
    if (typeof value[key] === "number" && Number.isFinite(value[key])) stats[key] = value[key];
  }
  if (["exact", "almost", "wrong"].includes(value.lastResult)) stats.lastResult = value.lastResult;
  if (typeof value.lastSeen === "number" && Number.isFinite(value.lastSeen)) stats.lastSeen = value.lastSeen;
  return stats;
}

function sanitizeLedger(rawLedger) {
  const ledger = {};
  for (const [regionId, value] of Object.entries(rawLedger)) {
    const stats = sanitizeRegionStats(value);
    if (stats) ledger[regionId] = stats;
  }
  return ledger;
}

export function loadSettings() {
  return sanitizeSettings(readStoredJson(SETTINGS_STORAGE_KEY));
}

export function saveSettings(settings) {
  writeStoredJson(SETTINGS_STORAGE_KEY, settings);
}

// Progress holds two skill tracks: "locate" (Find mode — one language-neutral
// ledger; clicking the right shape is the same skill in any language) and
// "name" (Type and Review — one ledger per quiz language, since the accepted
// answers differ).
export function blankProgress() {
  return { locate: {}, name: { en: {}, zh: {} } };
}

function isProgressShape(value) {
  return (
    isPlainObject(value) &&
    isPlainObject(value.locate) &&
    isPlainObject(value.name) &&
    isPlainObject(value.name.en) &&
    isPlainObject(value.name.zh)
  );
}

function sanitizeProgress(raw) {
  return {
    locate: sanitizeLedger(raw.locate),
    name: { en: sanitizeLedger(raw.name.en), zh: sanitizeLedger(raw.name.zh) },
  };
}

// The pre-split shape: one ledger per language, all modes mixed.
function isLegacyProgressShape(value) {
  return isPlainObject(value) && isPlainObject(value.en) && isPlainObject(value.zh);
}

// Pre-split history becomes the locate track (it was mostly Find rounds) and
// naming starts fresh — the user's migration ruling, 2026-06-12. The two old
// language ledgers merge: counters sum, streak/lastResult come from whichever
// entry was seen more recently.
function migrateLegacyProgress(legacy) {
  const locate = sanitizeLedger(legacy.en);
  for (const [regionId, zhStats] of Object.entries(sanitizeLedger(legacy.zh))) {
    const enStats = locate[regionId];
    if (!enStats) {
      locate[regionId] = zhStats;
      continue;
    }
    const newer = (zhStats.lastSeen || 0) >= (enStats.lastSeen || 0) ? zhStats : enStats;
    locate[regionId] = {
      attempts: enStats.attempts + zhStats.attempts,
      exact: enStats.exact + zhStats.exact,
      almost: enStats.almost + zhStats.almost,
      wrong: enStats.wrong + zhStats.wrong,
      streak: newer.streak,
      lastResult: newer.lastResult,
      lastSeen: Math.max(enStats.lastSeen || 0, zhStats.lastSeen || 0) || null,
    };
  }
  return { locate, name: { en: {}, zh: {} } };
}

export function loadProgress() {
  const stored = readStoredJson(PROGRESS_STORAGE_KEY);
  if (isProgressShape(stored)) return sanitizeProgress(stored);
  const legacy = readStoredJson(LEGACY_PROGRESS_STORAGE_KEY);
  if (isLegacyProgressShape(legacy)) {
    const migrated = migrateLegacyProgress(legacy);
    saveProgress(migrated); // the legacy key stays untouched as a backup
    return migrated;
  }
  return blankProgress();
}

export function saveProgress(progress) {
  writeStoredJson(PROGRESS_STORAGE_KEY, progress);
}

export function blankRegionStats() {
  return { attempts: 0, exact: 0, almost: 0, wrong: 0, streak: 0, lastResult: null, lastSeen: null };
}

// track is 'locate' (Find) or 'name' (Type/Review). language picks the naming
// ledger and is ignored for locate, which is language-neutral.
export function ledgerForTrack(progress, track, language) {
  return track === "locate" ? progress.locate : progress.name[language];
}

// verdict is 'exact' | 'almost' | 'wrong'. Writes through to localStorage.
export function recordAttempt(progress, track, language, regionId, verdict) {
  const ledger = ledgerForTrack(progress, track, language);
  if (!ledger[regionId]) ledger[regionId] = blankRegionStats();
  const stats = ledger[regionId];
  stats.attempts += 1;
  stats[verdict] += 1;
  stats.streak = verdict === "exact" ? stats.streak + 1 : 0;
  stats.lastResult = verdict;
  stats.lastSeen = Date.now();
  saveProgress(progress);
  return stats;
}

export function isMastered(stats) {
  return Boolean(stats) && stats.lastResult === "exact" && stats.streak >= 2;
}

// A region is a trouble spot once its lifetime wrong count in a ledger passes
// this — even if currently mastered (the user may revisit that rule). Shared
// by Review mode's drill and the Data page's trouble lists.
export const TROUBLE_WRONG_THRESHOLD = 2;

// Map fill status. A region answered 'exact' once but not yet mastered shows as
// 'almost' (partial progress) — the map palette has exactly four statuses.
export function statusForStats(stats) {
  if (!stats || stats.attempts === 0) return "untouched";
  if (isMastered(stats)) return "mastered";
  if (stats.lastResult === "wrong") return "wrong";
  return "almost";
}

// ---------- stash (one-slot "start fresh / resume" snapshot) ----------
// "Start fresh" sets the current progress aside here and clears the ledgers;
// resuming restores it and empties the slot. Settings are not stashed.

export function loadStash() {
  const stored = readStoredJson(STASH_STORAGE_KEY);
  if (!isPlainObject(stored)) return null;
  // a stash saved before the track split migrates the same way live progress does
  const progress = isProgressShape(stored.progress)
    ? sanitizeProgress(stored.progress)
    : isLegacyProgressShape(stored.progress)
      ? migrateLegacyProgress(stored.progress)
      : null;
  if (!progress) return null;
  return {
    progress,
    stashedAt: typeof stored.stashedAt === "string" ? stored.stashedAt : null,
  };
}

export function saveStash(progress) {
  writeStoredJson(STASH_STORAGE_KEY, { stashedAt: new Date().toISOString(), progress });
}

export function clearStash() {
  try {
    localStorage.removeItem(STASH_STORAGE_KEY);
  } catch {}
}

export function downloadExportFile(progress, settings) {
  const payload = {
    version: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    progress,
    settings,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `atlas-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

// Parses and validates an export file's text. Throws Error on bad input.
export function parseImportPayload(fileText) {
  let payload;
  try {
    payload = JSON.parse(fileText);
  } catch {
    throw new Error("not valid JSON");
  }
  if (
    !isPlainObject(payload) ||
    typeof payload.version !== "number" ||
    !isPlainObject(payload.settings)
  ) {
    throw new Error("not an Atlas export file");
  }
  // version-1 export files (pre track split) migrate the same way live progress does
  const progress = isProgressShape(payload.progress)
    ? sanitizeProgress(payload.progress)
    : isLegacyProgressShape(payload.progress)
      ? migrateLegacyProgress(payload.progress)
      : null;
  if (!progress) throw new Error("not an Atlas export file");
  return {
    progress,
    settings: sanitizeSettings(payload.settings),
  };
}
