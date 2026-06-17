// app.js — entry point: state, mode routing, chrome wiring.

import {
  loadSettings,
  saveSettings,
  loadProgress,
  recordAttempt,
  ledgerForTrack,
  isMastered,
  statusForStats,
  PROGRESS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
} from "./store.js";
import { checkAnswer, pickPriorityTarget } from "./quiz.js";
import { createMapEngine } from "./map.js";
import { createSidePanel, uiText, STAT_CONTINENTS, setInterfaceLanguage } from "./panel.js";

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const isReducedMotion = () => reducedMotionQuery.matches;

const state = {
  settings: loadSettings(),
  progress: loadProgress(),
  regions: [],
  regionById: new Map(),
  regionByEnglishName: new Map(),
  quizRegions: [],
  mapEngine: null,
  panel: null,
  selectedRegionId: null, // pinned region in browse
  typeRound: null, // { targetId, pickedByUser, verdict, inputText, newlyMastered, corrected }
  typeDetourRegionId: null, // non-quiz region whose info card temporarily covers the type round
  findRound: null, // { targetId, resolved, success, gaveUp, newlyMastered, wrongClickId }
};

const elements = {
  map: document.getElementById("world-map"),
  panelContent: document.getElementById("panel-content"),
  modeTabs: Array.from(document.querySelectorAll(".mode-tab")),
  viewButtons: Array.from(document.querySelectorAll("#view-toggle .segment")),
  microstateMode: document.getElementById("microstate-mode"),
  continentFilter: document.getElementById("continent-filter"),
  dataPageLink: document.getElementById("data-page-link"),
  settingsPageLink: document.getElementById("settings-page-link"),
  autoPronounceToggle: document.getElementById("auto-pronounce-toggle"),
  browseSearch: document.getElementById("browse-search"),
  browseSearchInput: document.getElementById("browse-search-input"),
  browseSearchResults: document.getElementById("browse-search-results"),
};

// Chrome language follows settings.uiLang (the interface toggle). The typing
// quiz itself has no language — it accepts English or Chinese (§6).
const text = () => uiText[state.settings.uiLang];

// ---------- derived data ----------

// True when this region is out of play under the current microstate mode:
// "exclude" drops microstates, "only" drops the normal countries. Such regions
// leave the quiz pool and ghost on the map; "include" keeps everything.
function isOutOfMicrostateScope(region) {
  const mode = state.settings.microstateMode;
  if (mode === "exclude") return region.microstate;
  if (mode === "only") return !region.microstate;
  return false;
}

function quizRegionsInScope() {
  const continent = state.settings.continent;
  return state.quizRegions.filter(
    (region) =>
      !isOutOfMicrostateScope(region) &&
      (continent === "World" || region.continent === continent)
  );
}

// The progress track the current mode exercises — also the one the map colors
// show. Find trains "locate" (language-neutral: clicking the right shape is the
// same skill in any language); Type trains "name" (per quiz language). Browse
// has no track: the map shows a neutral, progress-free atlas (null).
// Flag find/type are new prompt rows (§2d): same answer skills as Find/Type
// (click the map / spell the name), just prompted by a flag instead of a name.
// So they reuse the find-round and naming-round machinery and the same tracks.
function isFindLikeMode(mode = state.settings.mode) {
  return mode === "find" || mode === "flagfind";
}
function isTypeLikeMode(mode = state.settings.mode) {
  return mode === "type" || mode === "flagtype";
}
function isFlagMode(mode = state.settings.mode) {
  return mode === "flagfind" || mode === "flagtype";
}

// Each mode scores onto its own ledger — the flag modes do NOT mingle with
// Find/Type (the user's 2026-06-17 call). The find/type *machinery* is still
// shared (same round objects + flow, via isFindLikeMode/isTypeLikeMode); only
// the track each writes to differs.
function currentTrack() {
  const mode = state.settings.mode;
  if (mode === "find") return "locate";
  if (mode === "type") return "name";
  if (mode === "flagfind") return "flagLocate";
  if (mode === "flagtype") return "flagName";
  return null; // browse
}

// The pool a round draws from. Flag modes can only quiz regions that have a
// flag, so they prompt from a flagged subset; Find/Type keep the full pool.
function quizPoolForMode() {
  const pool = quizRegionsInScope();
  return isFlagMode() ? pool.filter((region) => region.iso2) : pool;
}

// Only called from the find/type round starters and recordVerdict, where the
// track is always concrete (never the neutral null).
function activeLedger() {
  return ledgerForTrack(state.progress, currentTrack());
}

function computeStatusByRegionId() {
  const track = currentTrack();
  const statusByRegionId = {};
  if (track === null) {
    // neutral atlas: every region flat, no progress overlay and no hatch
    for (const region of state.regions) statusByRegionId[region.id] = "neutral";
    return statusByRegionId;
  }
  const ledger = ledgerForTrack(state.progress, track);
  for (const region of state.quizRegions) {
    statusByRegionId[region.id] = statusForStats(ledger[region.id]);
  }
  return statusByRegionId;
}

// ---------- persistence helpers ----------

function updateSetting(key, value) {
  state.settings[key] = value;
  saveSettings(state.settings);
}

// Records an attempt and recolors the map; pulses on new mastery. The stats
// now live on data.html, which hears the write through its "storage" listener.
function recordVerdict(regionId, verdict) {
  const masteredBefore = isMastered(activeLedger()[regionId]);
  const stats = recordAttempt(state.progress, currentTrack(), regionId, verdict);
  const newlyMastered = !masteredBefore && isMastered(stats);
  state.mapEngine.refreshRegionStatuses(computeStatusByRegionId());
  if (newlyMastered) state.mapEngine.pulseRegion(regionId);
  return newlyMastered;
}

// ---------- panel rendering for the current state ----------

function renderCurrentPanel() {
  const mode = state.settings.mode;
  const regionByName = (englishName) => state.regionByEnglishName.get(englishName);
  if (mode === "browse") {
    if (state.selectedRegionId) {
      state.panel.renderBrowseRegion(state.regionById.get(state.selectedRegionId), regionByName);
    } else {
      state.panel.renderModeIdle("browse");
    }
  } else if (mode === "type") {
    if (state.typeDetourRegionId) {
      // a clicked non-quiz region shows its info card; Escape returns to the round
      state.panel.renderBrowseRegion(state.regionById.get(state.typeDetourRegionId), regionByName);
    } else {
      state.panel.renderNamingRound(namingRoundViewModel(state.typeRound), {
        promptHint: text().typeClickHint,
        regionByName,
      });
    }
  } else if (mode === "flagtype") {
    state.panel.renderNamingRound(namingRoundViewModel(state.typeRound), {
      regionByName,
      flagPrompt: true,
    });
  } else if (mode === "find") {
    state.panel.renderFindRound(findStyleViewModel(state.findRound), regionByName);
  } else if (mode === "flagfind") {
    state.panel.renderFindRound(findStyleViewModel(state.findRound), regionByName, { flagPrompt: true });
  }
}

// View model for a find-shaped round (Find mode).
function findStyleViewModel(round) {
  if (!round) return null;
  return {
    target: state.regionById.get(round.targetId),
    wrongClick: round.wrongClickId ? state.regionById.get(round.wrongClickId) : null,
    resolved: round.resolved,
    success: round.success,
    gaveUp: round.gaveUp,
    newlyMastered: round.newlyMastered,
  };
}

// View model for a typing-shaped round (Type mode).
function namingRoundViewModel(round) {
  if (!round) return null;
  return {
    target: state.regionById.get(round.targetId),
    verdict: round.verdict,
    inputText: round.inputText,
    firstAnswer: round.firstAnswer,
    newlyMastered: round.newlyMastered,
    corrected: round.corrected,
  };
}

// ---------- rounds ----------

// Find shares Type's priority scheduler (struggling > unseen > least-recently-seen),
// so it re-tests mastered regions in a maintenance loop rather than stopping when
// everything in scope is mastered.
function startFindRound(previousTargetId) {
  const target = pickPriorityTarget(quizPoolForMode(), activeLedger(), previousTargetId);
  state.findRound = target
    ? { targetId: target.id, resolved: false, success: false, gaveUp: false, newlyMastered: false, wrongClickId: null }
    : null;
  renderCurrentPanel();
  if (target && state.settings.autoPronounce) state.panel.pronounceCurrentCard();
}

// Type: the game picks via the priority scheduler, or the user picks by
// clicking the map (userPickedRegion). Game picks highlight-and-zoom like a
// quiz prompt; a user pick just gets the selection ring — they know where it is.
function startTypeRound(previousTargetId, userPickedRegion = null) {
  state.typeDetourRegionId = null;
  const target = userPickedRegion || pickPriorityTarget(quizPoolForMode(), activeLedger(), previousTargetId);
  state.typeRound = target
    ? { targetId: target.id, pickedByUser: Boolean(userPickedRegion), verdict: null, inputText: "", newlyMastered: false, corrected: false }
    : null;
  if (state.settings.mode === "flagtype") {
    // Flag spell: the prompt is the flag in the card, so the map stays neutral —
    // highlighting the target would give the answer away by its location.
    state.mapEngine.setReviewTarget(null);
    state.mapEngine.setSelectedRegion(null);
  } else if (userPickedRegion) {
    state.mapEngine.setReviewTarget(null);
    state.mapEngine.setSelectedRegion(target.id);
  } else {
    state.mapEngine.setSelectedRegion(null);
    state.mapEngine.setReviewTarget(target ? target.id : null);
    if (target) {
      // center the highlighted target (zoom unchanged) so a new round's region
      // is never stranded off-screen or at the edge
      state.mapEngine.centerRegion(target.id);
      state.mapEngine.pulseRegion(target.id);
    }
  }
  renderCurrentPanel();
}

// ---------- map callbacks ----------

function handleRegionHovered(regionId) {
  if (state.settings.mode !== "browse" || state.selectedRegionId) return;
  if (regionId) {
    const region = state.regionById.get(regionId);
    if (region) {
      state.panel.renderBrowseRegion(region, (englishName) =>
        state.regionByEnglishName.get(englishName)
      );
    }
  } else {
    state.panel.renderModeIdle("browse");
  }
}

// Click flow for find-shaped rounds (Find mode).
// recordVerdict routes to the right ledger via currentTrack().
function handleFindStyleClick(round, regionId) {
  // once resolved, a map click just re-pulses the revealed target (a few
  // seconds) so you can re-find it if you missed the first pulse.
  if (round.resolved) {
    state.mapEngine.pulseRegion(round.targetId);
    return;
  }
  if (regionId === round.targetId) {
    round.resolved = true;
    round.success = true;
    round.newlyMastered = recordVerdict(round.targetId, "exact");
    state.mapEngine.pulseRegion(round.targetId);
    renderCurrentPanel();
  } else {
    // single chance (2026-06-13): the first wrong click ends the round as a miss
    // and reveals the target — no second/third tries.
    round.wrongClickId = regionId;
    state.mapEngine.flashRegion(regionId);
    revealFindTarget(round);
    renderCurrentPanel();
  }
}

function handleRegionClicked(regionId) {
  const region = state.regionById.get(regionId);
  if (!region) return;
  const mode = state.settings.mode;

  if (mode === "browse") {
    state.selectedRegionId = regionId;
    state.mapEngine.setSelectedRegion(regionId);
    renderCurrentPanel();
    // pronounceCurrentCard no-ops unless the rendered card has speak buttons,
    // so this can't leak a quiz answer
    if (state.settings.autoPronounce) state.panel.pronounceCurrentCard();
  } else if (mode === "type") {
    // Locked into the correction gate: you must type the correct name — clicking
    // another region (override or detour) can't pull you away.
    if (typeRoundNeedsCorrection()) return;
    if (region.status === "quiz" && !isOutOfMicrostateScope(region)) {
      // the click-override: practice the clicked region instead
      startTypeRound(null, region);
    } else {
      // non-quiz region: show its info card as a detour; Escape returns
      state.typeDetourRegionId = regionId;
      state.mapEngine.setSelectedRegion(regionId);
      renderCurrentPanel();
      if (state.settings.autoPronounce) state.panel.pronounceCurrentCard();
    }
  } else if (isFindLikeMode(mode)) {
    // Find and Flag find both grade a map click against the round target;
    // Flag type ignores map clicks (you answer by typing), so it falls through.
    if (state.findRound) handleFindStyleClick(state.findRound, regionId);
  }
}

// Browse: unpin the card. Type: close a detour info card, restoring the
// round's own highlight.
function closeInfoCard() {
  if (state.settings.mode === "browse") {
    state.selectedRegionId = null;
    state.mapEngine.setSelectedRegion(null);
    renderCurrentPanel();
  } else if (state.settings.mode === "type" && state.typeDetourRegionId) {
    state.typeDetourRegionId = null;
    state.mapEngine.setSelectedRegion(
      state.typeRound && state.typeRound.pickedByUser ? state.typeRound.targetId : null
    );
    renderCurrentPanel();
  }
}

function handleBackgroundClicked() {
  // clicking empty map (ocean/graticule, not a region) re-pulses a resolved
  // Find target too — anywhere in the map area re-finds it.
  if (isFindLikeMode() && state.findRound && state.findRound.resolved) {
    state.mapEngine.pulseRegion(state.findRound.targetId);
    return;
  }
  closeInfoCard();
}

// Escape: close the info card, or empty the answer box of an open naming
// round (the hint's "Escape clears").
function handleEscape() {
  if (state.selectedRegionId || state.typeDetourRegionId) {
    closeInfoCard();
    return;
  }
  const namingRound = isTypeLikeMode() ? state.typeRound : null;
  if (namingRound && namingRound.verdict !== "exact" && namingRound.verdict !== "wrong") {
    namingRound.inputText = "";
    renderCurrentPanel();
  }
}

// ---------- browse search ----------

// Fold case + accents so "cote" finds "Côte d'Ivoire"; harmless for 中文.
function searchNormalize(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Match a query against every region's names + aliases in both languages.
// Prefix hits rank above mid-string hits; fold regions (no own geometry to
// center on) are skipped. Capped so the dropdown stays short.
function searchRegions(rawQuery) {
  const query = searchNormalize(rawQuery);
  if (!query) return [];
  const prefixHits = [];
  const substringHits = [];
  for (const region of state.regions) {
    if (region.status === "fold") continue;
    const candidates = [
      region.nameEn,
      region.nameZh,
      region.nameLocal,
      ...(region.exactAliasesEn || []),
      ...(region.almostAliasesEn || []),
      ...(region.aliasesZh || []),
    ];
    let rank = null;
    for (const candidate of candidates) {
      if (!candidate) continue;
      const normalized = searchNormalize(candidate);
      if (normalized.startsWith(query)) { rank = "prefix"; break; }
      if (normalized.includes(query)) rank = rank || "substring";
    }
    if (rank === "prefix") prefixHits.push(region);
    else if (rank === "substring") substringHits.push(region);
  }
  return [...prefixHits, ...substringHits].slice(0, 8);
}

function renderSearchResults(matches) {
  const list = elements.browseSearchResults;
  list.innerHTML = "";
  if (!matches.length) {
    list.hidden = true;
    return;
  }
  for (const region of matches) {
    const item = document.createElement("li");
    item.className = "browse-search-result";
    item.dataset.regionId = region.id;
    if (region.iso2 && region.iso2.length === 2) {
      const flag = document.createElement("img");
      flag.className = "flag-image";
      flag.src = `vendor/flags/${region.iso2.toLowerCase()}.svg`;
      flag.alt = "";
      item.appendChild(flag);
    }
    const label = document.createElement("span");
    label.textContent =
      region.nameZh && region.nameZh !== region.nameEn
        ? `${region.nameEn} · ${region.nameZh}`
        : region.nameEn;
    item.appendChild(label);
    item.addEventListener("click", () => selectSearchResult(region.id));
    list.appendChild(item);
  }
  list.hidden = false;
}

// Pin the chosen region in the browse card and bring it to map-center (pans
// flat / rotates the globe), the same as clicking it — then clear the box.
function selectSearchResult(regionId) {
  const region = state.regionById.get(regionId);
  if (!region) return;
  state.selectedRegionId = regionId;
  state.mapEngine.setSelectedRegion(regionId);
  state.mapEngine.centerRegion(regionId);
  renderCurrentPanel();
  clearBrowseSearch();
  if (state.settings.autoPronounce) state.panel.pronounceCurrentCard();
}

function clearBrowseSearch() {
  elements.browseSearchInput.value = "";
  elements.browseSearchResults.innerHTML = "";
  elements.browseSearchResults.hidden = true;
}

// The box lives in Browse only; show/hide it as the mode changes.
function updateBrowseSearchVisibility() {
  const inBrowse = state.settings.mode === "browse";
  elements.browseSearch.hidden = !inBrowse;
  if (!inBrowse) clearBrowseSearch();
}

// ---------- panel actions ----------

// The active typing-shaped round, if any (Type mode).
function activeNamingRound() {
  return isTypeLikeMode() ? state.typeRound : null;
}

// True while a Type round is in the correction gate — graded non-exact and not
// yet corrected. The round locks here: map clicks can't switch regions.
function typeRoundNeedsCorrection() {
  const round = state.typeRound;
  return Boolean(round) && (round.verdict === "almost" || round.verdict === "wrong") && !round.corrected;
}

// A resolved naming card shows the full region info (with speak buttons), so
// auto-pronounce can play the name — call once per resolution.
function pronounceResolvedCard() {
  if (state.settings.autoPronounce) state.panel.pronounceCurrentCard();
}

function submitAnswer(inputText) {
  const trimmedInput = inputText.trim();
  if (!trimmedInput) return;
  const round = activeNamingRound();
  if (!round) return;
  const region = state.regionById.get(round.targetId);
  // Correction step: after a non-exact answer you must type the correct
  // spelling to continue. Ungraded gate — the first attempt is already
  // recorded — so it writes nothing to the ledger. An exact match clears the
  // gate; a *repeated* wrong attempt is handled just like the first miss —
  // update "You typed: X" to the new attempt and clear the box to retype.
  if (round.verdict === "almost" || round.verdict === "wrong") {
    if (round.corrected) return;
    const correctionVerdict = checkAnswer(trimmedInput, region);
    if (correctionVerdict === "exact") {
      round.corrected = true;
      round.inputText = inputText;
    } else {
      round.verdict = correctionVerdict; // display only — color the "You typed" line by this attempt
      round.firstAnswer = trimmedInput;
      round.inputText = "";
    }
    renderCurrentPanel();
    return;
  }
  if (round.verdict === "exact") return; // already solved
  // First attempt: grade and record. Exact ends the round; a near-miss or
  // wrong reveals the answer and starts the correction step (clear the box so
  // the correct spelling is typed fresh).
  const verdict = checkAnswer(trimmedInput, region);
  round.verdict = verdict;
  round.firstAnswer = trimmedInput; // shown on the correction screen for comparison
  round.inputText = verdict === "exact" ? inputText : "";
  round.newlyMastered = recordVerdict(region.id, verdict);
  renderCurrentPanel();
  pronounceResolvedCard();
}

// Resolves a Find round as wrong and reveals the target on the map with a
// timed pulse (clicking the map while resolved re-pulses it — handleFindStyleClick
// / handleBackgroundClicked).
function revealFindTarget(round) {
  round.resolved = true;
  round.success = false;
  round.newlyMastered = recordVerdict(round.targetId, "wrong");
  // recenter (zoom unchanged) so the revealed target lands in the middle, not
  // stranded at the edge or the globe's limb
  state.mapEngine.centerRegion(round.targetId);
  state.mapEngine.pulseRegion(round.targetId);
}

// Give up on the current round: records a wrong (giving up is a wrong — it
// drops a mastery stage) and reveals the answer — in the verdict block for
// typing rounds, on the map for find-shaped rounds.
function revealAnswer() {
  const findStyleRound = isFindLikeMode() ? state.findRound : null;
  if (findStyleRound) {
    if (findStyleRound.resolved) return;
    findStyleRound.gaveUp = true; // "answer is pulsing" message instead of "out of tries"
    revealFindTarget(findStyleRound);
    renderCurrentPanel();
    return;
  }
  const round = activeNamingRound();
  // give up only from a fresh round; once there's a verdict the answer is
  // already shown (you're correcting it or done)
  if (!round || round.verdict) return;
  round.verdict = "wrong";
  round.inputText = ""; // clear for the correction typing
  round.newlyMastered = recordVerdict(round.targetId, "wrong");
  renderCurrentPanel();
  pronounceResolvedCard();
}

function nextRound() {
  // clear the resolved round's pulse so it can't bleed into the new round
  state.mapEngine.clearPulse();
  if (isFindLikeMode()) {
    startFindRound(state.findRound ? state.findRound.targetId : null);
  } else if (isTypeLikeMode()) {
    startTypeRound(state.typeRound ? state.typeRound.targetId : null);
  }
}

// ---------- mode / view / continent switching ----------

function switchMode(mode) {
  if (mode === state.settings.mode) return;
  updateSetting("mode", mode);
  state.selectedRegionId = null;
  state.typeRound = null;
  state.typeDetourRegionId = null;
  state.findRound = null;
  state.mapEngine.setSelectedRegion(null);
  state.mapEngine.setReviewTarget(null);
  // the new mode may read a different track — recolor
  state.mapEngine.refreshRegionStatuses(computeStatusByRegionId());
  updateChromePressedStates();
  updateBrowseSearchVisibility();
  if (isFindLikeMode(mode)) {
    startFindRound(null);
  } else if (isTypeLikeMode(mode)) {
    startTypeRound(null);
  } else {
    renderCurrentPanel();
  }
}

function switchView(view) {
  if (view === state.settings.view) return;
  updateSetting("view", view);
  state.mapEngine.setView(view);
  updateChromePressedStates();
}

function switchContinent(continent) {
  if (continent === state.settings.continent) return;
  updateSetting("continent", continent);
  state.mapEngine.setContinentScope(continent);
  state.mapEngine.frameContinent(continent);
  const inScope = (regionId) =>
    continent === "World" || state.regionById.get(regionId).continent === continent;
  if (isFindLikeMode() && (!state.findRound || !inScope(state.findRound.targetId))) {
    startFindRound(null);
  }
  if (isTypeLikeMode() && (!state.typeRound || !inScope(state.typeRound.targetId))) {
    startTypeRound(null);
  }
}

function switchMicrostateMode(mode) {
  if (mode === state.settings.microstateMode) return;
  updateSetting("microstateMode", mode);
  state.mapEngine.setMicrostateMode(mode);
  updateChromePressedStates();
  const targetOutOfScope = (regionId) => isOutOfMicrostateScope(state.regionById.get(regionId));
  if (isFindLikeMode() && (!state.findRound || targetOutOfScope(state.findRound.targetId))) {
    startFindRound(null);
  } else if (isTypeLikeMode() && (!state.typeRound || targetOutOfScope(state.typeRound.targetId))) {
    startTypeRound(null);
  } else if (state.settings.mode === "browse") {
    renderCurrentPanel();
  }
}

// ---------- chrome text and pressed states ----------

function updateChromeText() {
  // keep the panel module's chrome language in sync before any re-render
  setInterfaceLanguage(state.settings.uiLang);
  const localized = text();
  const modeLabels = {
    browse: localized.modeBrowse,
    type: localized.modeType,
    find: localized.modeFind,
    flagfind: localized.modeFlagFind,
    flagtype: localized.modeFlagType,
  };
  for (const tab of elements.modeTabs) tab.textContent = modeLabels[tab.dataset.mode];
  for (const button of elements.viewButtons) {
    button.textContent = button.dataset.view === "flat" ? localized.viewFlat : localized.viewGlobe;
  }
  elements.microstateMode.innerHTML = ["include", "exclude", "only"]
    .map(
      (mode) =>
        `<option value="${mode}"${mode === state.settings.microstateMode ? " selected" : ""}>${
          localized.microstateModes[mode]
        }</option>`
    )
    .join("");
  elements.autoPronounceToggle.textContent = localized.autoPronounceToggle;
  elements.browseSearchInput.placeholder = localized.browseSearchPlaceholder;
  const filterContinents = ["World", ...STAT_CONTINENTS];
  elements.continentFilter.innerHTML = filterContinents
    .map(
      (continent) =>
        `<option value="${continent}"${continent === state.settings.continent ? " selected" : ""}>${
          localized.continents[continent]
        }</option>`
    )
    .join("");
  elements.dataPageLink.textContent = localized.dataPageLink;
  elements.settingsPageLink.textContent = localized.settingsPageLink;
}

function updateChromePressedStates() {
  for (const tab of elements.modeTabs) {
    tab.setAttribute("aria-pressed", String(tab.dataset.mode === state.settings.mode));
  }
  for (const button of elements.viewButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.view === state.settings.view));
  }
  elements.autoPronounceToggle.setAttribute("aria-pressed", String(state.settings.autoPronounce));
  elements.microstateMode.value = state.settings.microstateMode;
  elements.continentFilter.value = state.settings.continent;
}

// ---------- cross-tab sync ----------

// Export/import/start-fresh live on settings.html, a separate tab sharing
// this localStorage. "storage" events fire only in OTHER tabs (never the
// writer), so this reacts exactly to the settings page replacing progress
// or settings — and never to this tab's own recordAttempt writes.
function wireCrossTabSync() {
  window.addEventListener("storage", (event) => {
    if (event.key !== PROGRESS_STORAGE_KEY && event.key !== SETTINGS_STORAGE_KEY) return;
    const previous = state.settings;
    state.progress = loadProgress();
    state.settings = loadSettings();
    // A progress change (clear-all / import) or a structural setting change
    // (mode / continent / view / microstate scope) gets the full re-apply, which
    // restarts the round. Display-only changes — interface language, the size /
    // font knobs — must NOT disturb the current round, so apply them cheaply.
    const structural =
      event.key === PROGRESS_STORAGE_KEY ||
      previous.mode !== state.settings.mode ||
      previous.continent !== state.settings.continent ||
      previous.view !== state.settings.view ||
      previous.microstateMode !== state.settings.microstateMode;
    if (structural) {
      applyAllSettings();
      return;
    }
    applyDisplaySettings();
    updateChromeText();
    updateChromePressedStates();
    state.mapEngine.refreshRegionStatuses(computeStatusByRegionId());
    renderCurrentPanel();
  });
}

// Re-applies every setting to the chrome and map (used after a cross-tab
// import / start-fresh / resume from settings.html).
// The Chinese face for each cjkFont option. Each ends with its own generic so
// the composed --font-display / --font-body stacks stay valid. "serif-web" uses
// the vendored Noto Serif SC, then falls back to system serif if absent.
const CJK_FONT_STACKS = {
  "serif-web": '"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif',
  "serif-system": '"Songti SC", "STSong", "SimSun", serif',
  sans: '"Microsoft YaHei", "PingFang SC", sans-serif',
};

// Font scale, flag size, and Chinese face are live-tunable from the Settings
// page (temporary). They ride on CSS variables, so a change saved in the
// Settings tab applies here on the next cross-tab sync without a reload.
function applyDisplaySettings() {
  const root = document.documentElement;
  root.style.setProperty("--font-scale", String(state.settings.fontScale));
  root.style.setProperty("--flag-banner-width", state.settings.flagSize + "px");
  root.style.setProperty("--cjk-font", CJK_FONT_STACKS[state.settings.cjkFont] || CJK_FONT_STACKS.sans);
}

function applyAllSettings() {
  state.selectedRegionId = null;
  state.typeRound = null;
  state.typeDetourRegionId = null;
  state.findRound = null;
  state.mapEngine.setSelectedRegion(null);
  state.mapEngine.setReviewTarget(null);
  updateChromeText();
  updateChromePressedStates();
  updateBrowseSearchVisibility();
  applyDisplaySettings();
  state.mapEngine.setView(state.settings.view);
  state.mapEngine.setContinentScope(state.settings.continent);
  state.mapEngine.setMicrostateMode(state.settings.microstateMode);
  state.mapEngine.frameContinent(state.settings.continent);
  state.mapEngine.refreshRegionStatuses(computeStatusByRegionId());
  if (isFindLikeMode()) startFindRound(null);
  else if (isTypeLikeMode()) startTypeRound(null);
  else renderCurrentPanel();
}

// ---------- boot ----------

async function boot() {
  updateChromeText();
  applyDisplaySettings();
  updateChromePressedStates();

  let geojson;
  let regions;
  let capitalsByRegionId;
  try {
    const [geojsonResponse, regionsResponse, capitalsResponse] = await Promise.all([
      fetch("data/world.geojson"),
      fetch("data/regions.json"),
      fetch("data/capitals.json"),
    ]);
    if (!geojsonResponse.ok || !regionsResponse.ok || !capitalsResponse.ok) throw new Error("fetch failed");
    geojson = await geojsonResponse.json();
    regions = await regionsResponse.json();
    capitalsByRegionId = await capitalsResponse.json();
  } catch {
    elements.panelContent.innerHTML = `<div class="panel-idle"><p class="panel-idle-body">${text().dataLoadFailed}</p></div>`;
    return;
  }

  state.regions = regions;
  state.regionById = new Map(regions.map((region) => [region.id, region]));
  state.regionByEnglishName = new Map(regions.map((region) => [region.nameEn, region]));
  state.quizRegions = regions.filter((region) => region.status === "quiz");

  state.mapEngine = createMapEngine({
    svgElement: elements.map,
    geojson,
    regions,
    capitalsByRegionId,
    isReducedMotion,
    callbacks: {
      onRegionHovered: handleRegionHovered,
      onRegionClicked: handleRegionClicked,
      onBackgroundClicked: handleBackgroundClicked,
    },
  });

  state.panel = createSidePanel({
    contentElement: elements.panelContent,
    actions: { submitAnswer, nextRound, revealAnswer },
  });

  // chrome wiring
  for (const tab of elements.modeTabs) {
    tab.addEventListener("click", () => switchMode(tab.dataset.mode));
  }
  for (const button of elements.viewButtons) {
    button.addEventListener("click", () => switchView(button.dataset.view));
  }
  elements.microstateMode.addEventListener("change", () => {
    switchMicrostateMode(elements.microstateMode.value);
  });
  elements.autoPronounceToggle.addEventListener("click", () => {
    updateSetting("autoPronounce", !state.settings.autoPronounce);
    updateChromePressedStates();
  });
  elements.continentFilter.addEventListener("change", () => {
    switchContinent(elements.continentFilter.value);
  });
  elements.browseSearchInput.addEventListener("input", () => {
    renderSearchResults(searchRegions(elements.browseSearchInput.value));
  });
  elements.browseSearchInput.addEventListener("keydown", (event) => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") {
      const firstResult = elements.browseSearchResults.querySelector(".browse-search-result");
      if (firstResult) {
        event.preventDefault();
        selectSearchResult(firstResult.dataset.regionId);
      }
    } else if (event.key === "Escape") {
      // clear the search here, don't let the document handler close the card
      event.stopPropagation();
      clearBrowseSearch();
    }
  });
  wireCrossTabSync();

  document.addEventListener("keydown", (event) => {
    // IME-safe: Escape during an active composition only cancels the
    // composition (isComposing, or the legacy keyCode 229) — never the round.
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Escape") handleEscape();
    // E / C pronounce the current card's English / Chinese name by clicking
    // its speak button — so the shortcut exists exactly where a button is
    // visible (Browse card, Find target) and never leaks the answer in
    // Type (those cards render no speak buttons). Guarded against
    // typing into a field and against browser shortcuts like Ctrl+C.
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target instanceof Element && event.target.matches("input, textarea, select")) return;
    const key = event.key.toLowerCase();
    if (key === "e" || key === "c") {
      const lang = key === "e" ? "en-US" : "zh-CN";
      const speakButton = elements.panelContent.querySelector(`.speak-button[data-speak-lang="${lang}"]`);
      if (speakButton) {
        // claim the key from the browser (quick-find, caret browsing,
        // extension bindings) — but only when the shortcut actually acts
        event.preventDefault();
        speakButton.click();
      }
    }
    // A reveals the answer on a find-shaped round (Find — the only card that
    // still renders a Show-answer button; naming rounds fold give-up into
    // Check). Inactive while typing — the input guard above already returned.
    if (key === "a") {
      const showAnswerButton = elements.panelContent.querySelector("#show-answer-button");
      if (showAnswerButton && !showAnswerButton.disabled) {
        event.preventDefault();
        showAnswerButton.click();
      }
    }
    // T jumps focus into the answer box of an open naming round, so you can
    // start typing without reaching for the mouse (focus strays after a map
    // click). The input guard above already returned when a field is focused,
    // so T types normally once you're in the box; it acts only when the box is
    // present and live (a resolved round disables it).
    if (key === "t") {
      const answerInput = elements.panelContent.querySelector("#answer-input:not(:disabled)");
      if (answerInput) {
        event.preventDefault();
        answerInput.focus();
      }
    }
    // Enter / Space / → advance the round wherever an enabled Next button is
    // showing. Enter and Space on a focused button or link keep their native
    // activation — including the Next button itself, which the app focuses on
    // resolve; handling it here too would advance twice per press.
    if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
      if (event.key !== "ArrowRight" && event.target instanceof Element && event.target.matches("button, a")) return;
      // While a naming round is open, Enter means "check or give up", never
      // "skip" — even when focus has wandered out of the answer box (where the
      // box's own Enter listener can't hear it). The Check button now handles
      // both cases itself (text → check, blank → give up), so routing Enter
      // through it covers both. Without this, Enter would hit Next below and
      // silently discard the round.
      if (event.key === "Enter") {
        // Enter activates whichever single action button this card shows —
        // Check (answering), Show answer (Find give-up), or Next (resolved).
        const actionButton = elements.panelContent.querySelector(
          "#check-answer-button:not(:disabled), #show-answer-button:not(:disabled), #next-round-button:not(:disabled)"
        );
        if (actionButton) {
          event.preventDefault();
          actionButton.click();
          return;
        }
      }
      // Space / → advance to the next round (Next). Space *also* gives up on a
      // Find-style card — it clicks Show answer too, mirroring Enter (the user's
      // 2026-06-17 ask) so you can reveal without reaching for Enter. It never
      // triggers Check, so Space can't grade a typed answer; → stays advance-only.
      // (While the answer box is focused, the input guard above already returned,
      // so Space types a normal space there.)
      const nextButton = elements.panelContent.querySelector("#next-round-button:not(:disabled)");
      if (nextButton) {
        event.preventDefault();
        nextButton.click();
        return;
      }
      if (event.key === " ") {
        const showAnswerButton = elements.panelContent.querySelector("#show-answer-button:not(:disabled)");
        if (showAnswerButton) {
          event.preventDefault();
          showAnswerButton.click();
        }
      }
    }
  });

  // apply persisted settings
  state.mapEngine.setInitialView(state.settings.view);
  state.mapEngine.setContinentScope(state.settings.continent);
  state.mapEngine.setMicrostateMode(state.settings.microstateMode);
  state.mapEngine.refreshRegionStatuses(computeStatusByRegionId());
  if (state.settings.continent !== "World") {
    // instant: an animated boot framing would hide the SVG behind the
    // interaction canvas during the first-load reveal
    state.mapEngine.frameContinent(state.settings.continent, { animate: false });
  }
  if (isFindLikeMode()) startFindRound(null);
  else if (isTypeLikeMode()) startTypeRound(null);
  else renderCurrentPanel();
  updateBrowseSearchVisibility();

  state.mapEngine.playFirstLoadReveal();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

boot();
