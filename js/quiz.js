// quiz.js — answer normalization, two-tier checking, and target scheduling.

import { isMastered } from "./store.js";

// ---------- English checking ----------

export function normalizeEnglishName(text) {
  let normalized = String(text).toLowerCase();
  normalized = normalized.normalize("NFD").replace(/[̀-ͯ]/g, ""); // strip diacritics
  normalized = normalized.replace(/[-‐‑‒–—]/g, " "); // hyphens and dashes to spaces
  normalized = normalized.replace(/['‘’.,]/g, ""); // apostrophes, periods, commas
  normalized = normalized.replace(/\s+/g, " ").trim();
  if (normalized.startsWith("the ")) normalized = normalized.slice(4);
  return normalized.replace(/ /g, ""); // whitespace-agnostic: spaces never matter
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
  // whitespace-agnostic: drop all spaces (incl. ideographic) on both sides
  const cleanedInput = toHalfWidth(inputText).replace(/\s+/g, "");
  if (!cleanedInput) return "wrong";
  const targets = [region.nameZh, ...(region.aliasesZh || [])]
    .filter(Boolean)
    .map((target) => toHalfWidth(target).replace(/\s+/g, ""));
  if (targets.includes(cleanedInput)) return "exact";
  for (const target of targets) {
    if (Array.from(target).length >= 3 && levenshteinDistance(cleanedInput, target) <= 1) return "almost";
  }
  return "wrong";
}

// The typing quiz has no language (§6): "France" or "法国" both count. Grade
// against both checkers and keep the better verdict (exact > almost > wrong).
// Cross-language false matches don't happen — Chinese characters never fuzzy-
// match Latin targets and vice versa — so taking the max is safe.
const VERDICT_RANK = { exact: 2, almost: 1, wrong: 0 };

export function checkAnswer(inputText, region) {
  const en = checkEnglishAnswer(inputText, region);
  const zh = checkChineseAnswer(inputText, region);
  return VERDICT_RANK[zh] > VERDICT_RANK[en] ? zh : en;
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

// Find and Type share this scheduler. Priority buckets, random within the
// active bucket, never the immediate repeat: struggling (recent wrong or almost)
// > unseen > least-recently-seen — and within that last (maintenance) bucket,
// not-yet-mastered regions come before mastered ones, so a scope is fully
// learned before maintenance recycles it. The caller passes the right ledger —
// locate for Find, naming for Type.
export function pickPriorityTarget(candidateRegions, ledger, previousRegionId) {
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
  // Tier 3, the maintenance loop. Everyone left has been seen and last answered
  // exact; serve those not yet mastered (stage 1 — one exact, still climbing)
  // before re-testing mastered ones — finish learning the scope first. Each
  // group is ordered by least-recently-seen.
  const byLeastRecentlySeen = (a, b) => (ledger[a.id].lastSeen || 0) - (ledger[b.id].lastSeen || 0);
  const notYetMastered = pool.filter((region) => !isMastered(ledger[region.id]));
  const maintenancePool = notYetMastered.length > 0 ? notYetMastered : pool;
  return maintenancePool.slice().sort(byLeastRecentlySeen)[0];
}
