// store.js — progress and settings persistence, plus export/import.

// Exported so other tabs (the game vs the settings page) can recognize each
// other's writes via "storage" events.
export const PROGRESS_STORAGE_KEY = "atlas-progress-v3";
// Each older shape is read once for migration, then left in place as a backup —
// never written again. v1: one ledger per language, all modes mixed. v2: split
// into two tracks (locate + name), with name itself split per quiz language
// (name.en / name.zh). v3 drops the quiz language: the typing quiz accepts
// either language, so the two naming ledgers merge into one (2026-06-14, §6).
const LEGACY_PROGRESS_STORAGE_KEY_V2 = "atlas-progress-v2";
const LEGACY_PROGRESS_STORAGE_KEY_V1 = "atlas-progress-v1";
export const SETTINGS_STORAGE_KEY = "atlas-settings-v1";
const STASH_STORAGE_KEY = "atlas-stash-v1";
const EXPORT_FORMAT_VERSION = 3;

export const defaultSettings = Object.freeze({
  uiLang: "en", // interface language (chrome); the typing quiz has no language (accepts either)
  view: "globe",
  continent: "World",
  mode: "browse",
  microstateMode: "include", // "include" | "exclude" | "only" — microstates in the quiz pool
  autoPronounce: false,
  // Live-tuning knobs (Settings page): card text scale + flag banner width (px).
  // Discrete S/M/L presets so the whitelist validation below still applies; the
  // defaults are the user's locked picks, sitting in the M slot of each.
  fontScale: 1.3,
  flagSize: 190,
  cjkFont: "serif-web", // which Chinese face: serif-web (Noto) / serif-system / sans
});

// Settings values index directly into uiText and the mode/view/continent
// switches, so anything outside these sets falls back to the default.
// microstateMode replaced the old boolean includeMicrostates (2026-06-14);
// sanitizeSettings migrates an old save's boolean to the enum.
const allowedSettingValues = Object.freeze({
  uiLang: ["en", "zh"],
  view: ["flat", "globe"],
  continent: ["World", "Africa", "Asia", "Europe", "North America", "South America", "Oceania"],
  mode: ["browse", "type", "find"],
  microstateMode: ["include", "exclude", "only"],
  autoPronounce: [true, false],
  fontScale: [1.15, 1.3, 1.45],
  flagSize: [140, 190, 240],
  cjkFont: ["serif-web", "serif-system", "sans"],
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
    // Migrate the pre-2026-06-14 boolean includeMicrostates → microstateMode enum
    // (only when no valid microstateMode was stored, so it never overrides a new save).
    if (
      !allowedSettingValues.microstateMode.includes(rawSettings.microstateMode) &&
      typeof rawSettings.includeMicrostates === "boolean"
    ) {
      settings.microstateMode = rawSettings.includeMicrostates ? "include" : "exclude";
    }
  }
  return settings;
}

// Rebuilds one region's untrusted stats value; null when unusable.
function sanitizeRegionStats(value) {
  if (!isPlainObject(value)) return null;
  const stats = blankRegionStats();
  for (const key of ["attempts", "exact", "almost", "wrong"]) {
    if (typeof value[key] === "number" && Number.isFinite(value[key])) stats[key] = value[key];
  }
  // `stage` replaced `streak` (2026-06-13); an older save's streak value carries
  // over directly (both count 0 = start … 2 = mastered), clamped into range.
  const stageValue = typeof value.stage === "number" ? value.stage : value.streak;
  if (typeof stageValue === "number" && Number.isFinite(stageValue)) {
    stats.stage = Math.max(0, Math.min(MASTERY_STAGE, stageValue));
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

// Progress holds two skill tracks, both language-neutral: "locate" (Find mode —
// clicking the right shape is the same skill in any language) and "name" (Type
// mode — the typing quiz accepts either English or Chinese, so naming is one
// ledger, not one per language; 2026-06-14, §6).
export function blankProgress() {
  return { locate: {}, name: {} };
}

// v3 shape: both tracks are flat regionId→stats ledgers.
function isProgressShape(value) {
  return isPlainObject(value) && isPlainObject(value.locate) && isPlainObject(value.name);
}

function sanitizeProgress(raw) {
  return { locate: sanitizeLedger(raw.locate), name: sanitizeLedger(raw.name) };
}

// v2 shape: name was split per quiz language. Checked before isProgressShape
// (which a v2 object also satisfies, name being a plain object) so v2 payloads
// migrate instead of being read as a malformed v3.
function isV2ProgressShape(value) {
  return (
    isPlainObject(value) &&
    isPlainObject(value.locate) &&
    isPlainObject(value.name) &&
    isPlainObject(value.name.en) &&
    isPlainObject(value.name.zh)
  );
}

// v1 shape: one ledger per language, all modes mixed.
function isLegacyProgressShape(value) {
  return isPlainObject(value) && isPlainObject(value.en) && isPlainObject(value.zh);
}

// Merge two ledgers into one: counters sum, stage/lastResult come from whichever
// entry was seen more recently, lastSeen is the max. Shared by both migration
// paths (v1's en+zh → locate, v2's name.en+name.zh → name).
function mergeLedgers(rawA, rawB) {
  const merged = sanitizeLedger(rawA);
  for (const [regionId, statsB] of Object.entries(sanitizeLedger(rawB))) {
    const statsA = merged[regionId];
    if (!statsA) {
      merged[regionId] = statsB;
      continue;
    }
    const newer = (statsB.lastSeen || 0) >= (statsA.lastSeen || 0) ? statsB : statsA;
    merged[regionId] = {
      attempts: statsA.attempts + statsB.attempts,
      exact: statsA.exact + statsB.exact,
      almost: statsA.almost + statsB.almost,
      wrong: statsA.wrong + statsB.wrong,
      stage: newer.stage,
      lastResult: newer.lastResult,
      lastSeen: Math.max(statsA.lastSeen || 0, statsB.lastSeen || 0) || null,
    };
  }
  return merged;
}

// v2 → v3: locate carries over; the two naming ledgers merge into one (§6).
function migrateV2Progress(v2) {
  return { locate: sanitizeLedger(v2.locate), name: mergeLedgers(v2.name.en, v2.name.zh) };
}

// v1 → v3: pre-split history becomes the locate track (it was mostly Find
// rounds) with the two language ledgers merged; naming starts fresh — the
// user's migration ruling, 2026-06-12.
function migrateLegacyProgress(legacy) {
  return { locate: mergeLedgers(legacy.en, legacy.zh), name: {} };
}

// Detects any stored progress shape and returns the v3 form, or null. Order
// matters: v2 is checked before v3 because a v2 object also passes isProgressShape.
function coerceStoredProgress(value) {
  if (isV2ProgressShape(value)) return migrateV2Progress(value);
  if (isProgressShape(value)) return sanitizeProgress(value);
  if (isLegacyProgressShape(value)) return migrateLegacyProgress(value);
  return null;
}

export function loadProgress() {
  const stored = readStoredJson(PROGRESS_STORAGE_KEY);
  if (isProgressShape(stored)) return sanitizeProgress(stored);
  // Older keys, newest first; the matched one migrates and the old key stays
  // untouched as a backup.
  for (const legacyKey of [LEGACY_PROGRESS_STORAGE_KEY_V2, LEGACY_PROGRESS_STORAGE_KEY_V1]) {
    const migrated = coerceStoredProgress(readStoredJson(legacyKey));
    if (migrated) {
      saveProgress(migrated);
      return migrated;
    }
  }
  return blankProgress();
}

export function saveProgress(progress) {
  writeStoredJson(PROGRESS_STORAGE_KEY, progress);
}

export function blankRegionStats() {
  return { attempts: 0, exact: 0, almost: 0, wrong: 0, stage: 0, lastResult: null, lastSeen: null };
}

// track is 'locate' (Find) or 'name' (Type). Both are language-neutral ledgers.
export function ledgerForTrack(progress, track) {
  return track === "locate" ? progress.locate : progress.name;
}

// The mastery ladder: 0 (start) → 1 (partial, shows yellow) → MASTERY_STAGE
// (mastered, shows green). A clean first-ever try mints mastery outright; after
// that each exact climbs a stage and each miss — wrong OR near-miss — drops one
// (2026-06-13, the user's "sticky mastery" rule). Clamped to [0, MASTERY_STAGE].
export const MASTERY_STAGE = 2;

function nextStage(stage, verdict, isFirstAttempt) {
  if (isFirstAttempt) {
    if (verdict === "exact") return MASTERY_STAGE; // nailed it cold → green now
    if (verdict === "almost") return 1; // near-miss → partial (yellow)
    return 0; // wrong → start
  }
  if (verdict === "exact") return Math.min(MASTERY_STAGE, stage + 1);
  return Math.max(0, stage - 1); // wrong or repeat near-miss: down a stage
}

// verdict is 'exact' | 'almost' | 'wrong'. Writes through to localStorage.
export function recordAttempt(progress, track, regionId, verdict) {
  const ledger = ledgerForTrack(progress, track);
  const isFirstAttempt = !ledger[regionId] || ledger[regionId].attempts === 0;
  if (!ledger[regionId]) ledger[regionId] = blankRegionStats();
  const stats = ledger[regionId];
  stats.attempts += 1;
  stats[verdict] += 1;
  stats.stage = nextStage(stats.stage, verdict, isFirstAttempt);
  stats.lastResult = verdict;
  stats.lastSeen = Date.now();
  saveProgress(progress);
  return stats;
}

export function isMastered(stats) {
  return Boolean(stats) && stats.stage >= MASTERY_STAGE;
}

// Map fill status — mirrors the mastery stage so the color always matches real
// progress (the palette has four statuses). Coloring by `stage`, not
// `lastResult`, is deliberate: a near-miss is penalized like a wrong (it doesn't
// raise the stage), so a stage-0 region answered "almost" must stay red, not
// flip to yellow as if it had progressed. stage 0 = wrong (red) · 1 = almost
// (yellow, partial) · 2 = mastered (green).
export function statusForStats(stats) {
  if (!stats || stats.attempts === 0) return "untouched";
  if (stats.stage >= MASTERY_STAGE) return "mastered";
  if (stats.stage === 0) return "wrong";
  return "almost";
}

// ---------- stash (one-slot "start fresh / resume" snapshot) ----------
// "Start fresh" sets the current progress aside here and clears the ledgers;
// resuming restores it and empties the slot. Settings are not stashed.

export function loadStash() {
  const stored = readStoredJson(STASH_STORAGE_KEY);
  if (!isPlainObject(stored)) return null;
  // a stash saved under an older shape migrates the same way live progress does
  const progress = coerceStoredProgress(stored.progress);
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
  // older export files (pre track split, or pre language merge) migrate the same way
  const progress = coerceStoredProgress(payload.progress);
  if (!progress) throw new Error("not an Atlas export file");
  return {
    progress,
    settings: sanitizeSettings(payload.settings),
  };
}
