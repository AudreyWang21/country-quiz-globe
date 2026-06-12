// quiz.js — answer normalization, two-tier checking, and target scheduling.

import { isMastered, TROUBLE_WRONG_THRESHOLD } from "./store.js";

// ---------- English checking ----------

export function normalizeEnglishName(text) {
  let normalized = String(text).toLowerCase();
  normalized = normalized.normalize("NFD").replace(/[̀-ͯ]/g, ""); // strip diacritics
  normalized = normalized.replace(/[-‐‑‒–—]/g, " "); // hyphens and dashes to spaces
  normalized = normalized.replace(/['‘’.,]/g, ""); // apostrophes, periods, commas
  normalized = normalized.replace(/\s+/g, " ").trim();
  if (normalized.startsWith("the ")) normalized = normalized.slice(4);
  return normalized;
}

// Damerau-Levenshtein (optimal string alignment): edits + adjacent transpositions.
export function damerauLevenshteinDistance(firstText, secondText) {
  const first = Array.from(firstText);
  const second = Array.from(secondText);
  const rows = first.length + 1;
  const columns = second.length + 1;
  const distance = Array.from({ length: rows }, () => new Array(columns).fill(0));
  for (let i = 0; i < rows; i++) distance[i][0] = i;
  for (let j = 0; j < columns; j++) distance[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < columns; j++) {
      const substitutionCost = first[i - 1] === second[j - 1] ? 0 : 1;
      distance[i][j] = Math.min(
        distance[i - 1][j] + 1,
        distance[i][j - 1] + 1,
        distance[i - 1][j - 1] + substitutionCost
      );
      if (i > 1 && j > 1 && first[i - 1] === second[j - 2] && first[i - 2] === second[j - 1]) {
        distance[i][j] = Math.min(distance[i][j], distance[i - 2][j - 2] + 1);
      }
    }
  }
  return distance[first.length][second.length];
}

export function levenshteinDistance(firstText, secondText) {
  const first = Array.from(firstText);
  const second = Array.from(secondText);
  const rows = first.length + 1;
  const columns = second.length + 1;
  const distance = Array.from({ length: rows }, () => new Array(columns).fill(0));
  for (let i = 0; i < rows; i++) distance[i][0] = i;
  for (let j = 0; j < columns; j++) distance[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < columns; j++) {
      const substitutionCost = first[i - 1] === second[j - 1] ? 0 : 1;
      distance[i][j] = Math.min(
        distance[i - 1][j] + 1,
        distance[i][j - 1] + 1,
        distance[i - 1][j - 1] + substitutionCost
      );
    }
  }
  return distance[first.length][second.length];
}

export function checkEnglishAnswer(inputText, region) {
  const normalizedInput = normalizeEnglishName(inputText);
  if (!normalizedInput) return "wrong";
  const exactTargets = [region.nameEn, ...(region.exactAliasesEn || [])]
    .filter(Boolean)
    .map(normalizeEnglishName);
  if (exactTargets.includes(normalizedInput)) return "exact";
  for (const target of exactTargets) {
    const allowedDistance = Array.from(target).length <= 7 ? 1 : 2;
    if (damerauLevenshteinDistance(normalizedInput, target) <= allowedDistance) return "almost";
  }
  const almostTargets = (region.almostAliasesEn || []).filter(Boolean).map(normalizeEnglishName);
  if (almostTargets.includes(normalizedInput)) return "almost";
  return "wrong";
}

// ---------- Chinese checking ----------

// Converts full-width ASCII forms to half-width and ideographic space to space.
export function toHalfWidth(text) {
  return String(text)
    .replace(/[！-～]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}

export function checkChineseAnswer(inputText, region) {
  const cleanedInput = toHalfWidth(inputText).trim();
  if (!cleanedInput) return "wrong";
  const targets = [region.nameZh, ...(region.aliasesZh || [])]
    .filter(Boolean)
    .map((target) => toHalfWidth(target).trim());
  if (targets.includes(cleanedInput)) return "exact";
  for (const target of targets) {
    if (Array.from(target).length >= 3 && levenshteinDistance(cleanedInput, target) <= 1) return "almost";
  }
  return "wrong";
}

export function checkAnswer(inputText, region, language) {
  return language === "zh" ? checkChineseAnswer(inputText, region) : checkEnglishAnswer(inputText, region);
}

// ---------- Target scheduling ----------

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function withoutPrevious(pool, previousRegionId) {
  if (!previousRegionId || pool.length <= 1) return pool;
  const filtered = pool.filter((region) => region.id !== previousRegionId);
  return filtered.length > 0 ? filtered : pool;
}

// Find mode: a random not-yet-mastered region. Returns null when all mastered.
export function pickFindTarget(candidateRegions, ledger, previousRegionId) {
  const unmastered = candidateRegions.filter((region) => !isMastered(ledger[region.id]));
  if (unmastered.length === 0) return null;
  return randomItem(withoutPrevious(unmastered, previousRegionId));
}

// Type mode priority: struggling (recent wrong or almost) > unseen > least-recently-seen.
export function pickTypeTarget(candidateRegions, ledger, previousRegionId) {
  if (candidateRegions.length === 0) return null;
  const pool = withoutPrevious(candidateRegions, previousRegionId);
  const struggling = pool.filter((region) => {
    const stats = ledger[region.id];
    return stats && stats.attempts > 0 && (stats.lastResult === "wrong" || stats.lastResult === "almost");
  });
  if (struggling.length > 0) return randomItem(struggling);
  const unseen = pool.filter((region) => {
    const stats = ledger[region.id];
    return !stats || stats.attempts === 0;
  });
  if (unseen.length > 0) return randomItem(unseen);
  return pool
    .slice()
    .sort((a, b) => (ledger[a.id].lastSeen || 0) - (ledger[b.id].lastSeen || 0))[0];
}

// Review mode: drill chronic misses from both tracks, mixed. A region
// qualifies once its lifetime wrong count passes TROUBLE_WRONG_THRESHOLD in a
// track's ledger; it can qualify in both tracks at once (two separate
// entries). Random among qualifiers, never the same region twice in a row.
// Returns { region, track: 'locate'|'name' } or null when nothing qualifies.
export function pickTroubleTarget(candidateRegions, progress, language, previousRegionId) {
  const entries = [];
  for (const region of candidateRegions) {
    const locateStats = progress.locate[region.id];
    if (locateStats && locateStats.wrong > TROUBLE_WRONG_THRESHOLD) entries.push({ region, track: "locate" });
    const nameStats = progress.name[language][region.id];
    if (nameStats && nameStats.wrong > TROUBLE_WRONG_THRESHOLD) entries.push({ region, track: "name" });
  }
  if (entries.length === 0) return null;
  const pool = entries.filter((entry) => entry.region.id !== previousRegionId);
  return randomItem(pool.length > 0 ? pool : entries);
}

export function regionDisplayName(region, language) {
  return language === "zh" ? region.nameZh || region.nameEn : region.nameEn;
}
