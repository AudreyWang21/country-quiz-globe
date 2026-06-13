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
import { checkAnswer, pickFindTarget, pickTypeTarget, pickTroubleTarget } from "./quiz.js";
import { createMapEngine } from "./map.js";
import { createSidePanel, uiText, STAT_CONTINENTS } from "./panel.js";

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
  findRound: null, // { targetId, missIds, resolved, success, firstTry, gaveUp, newlyMastered }
  // reviewRound mixes both tracks: a "locate" round is find-shaped, a "name"
  // round is typing-shaped — `track` says which.
  reviewRound: null, // { track, targetId, ...find-shaped or typing-shaped fields }
};

const elements = {
  map: document.getElementById("world-map"),
  panelContent: document.getElementById("panel-content"),
  modeTabs: Array.from(document.querySelectorAll(".mode-tab")),
  viewButtons: Array.from(document.querySelectorAll("#view-toggle .segment")),
  microstateToggle: document.getElementById("microstate-toggle"),
  continentFilter: document.getElementById("continent-filter"),
  dataPageLink: document.getElementById("data-page-link"),
  settingsPageLink: document.getElementById("settings-page-link"),
  legendLabels: Array.from(document.querySelectorAll("[data-legend]")),
  legendTrackLabel: document.getElementById("legend-track-label"),
  autoPronounceToggle: document.getElementById("auto-pronounce-toggle"),
};

// UI chrome is always English; state.settings.lang only switches the QUIZ
// language (active ledger, accepted answers, find-target display name).
const text = () => uiText.en;

// ---------- derived data ----------

// True when the microstate toggle is off and this region is a microstate —
// such regions leave the quiz pool and behave like browse-only regions.
function isExcludedMicrostate(region) {
  return region.microstate && !state.settings.includeMicrostates;
}

function quizRegionsInScope() {
  const continent = state.settings.continent;
  return state.quizRegions.filter(
    (region) =>
      !isExcludedMicrostate(region) &&
      (continent === "World" || region.continent === continent)
  );
}

// The progress track the current mode exercises — also the one the map colors
// show. Find trains "locate" (language-neutral: clicking the right shape is the
// same skill in any language); Type trains "name" (per quiz language); Review's
// trouble drill mixes both, so it follows the current round's track. Browse —
// and Review before a round is picked — has no track: the map shows a neutral,
// progress-free atlas (null).
function currentTrack() {
  const mode = state.settings.mode;
  if (mode === "find") return "locate";
  if (mode === "type") return "name";
  if (mode === "review") return state.reviewRound ? state.reviewRound.track : null;
  return null; // browse
}

// Only called from the find/type round starters and recordVerdict, where the
// track is always concrete (never the neutral null).
function activeLedger() {
  return ledgerForTrack(state.progress, currentTrack(), state.settings.lang);
}

function computeStatusByRegionId() {
  const track = currentTrack();
  const statusByRegionId = {};
  if (track === null) {
    // neutral atlas: every region flat, no progress overlay and no hatch
    for (const region of state.regions) statusByRegionId[region.id] = "neutral";
    return statusByRegionId;
  }
  const ledger = ledgerForTrack(state.progress, track, state.settings.lang);
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
  const stats = recordAttempt(state.progress, currentTrack(), state.settings.lang, regionId, verdict);
  const newlyMastered = !masteredBefore && isMastered(stats);
  state.mapEngine.refreshRegionStatuses(computeStatusByRegionId());
  if (newlyMastered) state.mapEngine.pulseRegion(regionId);
  return newlyMastered;
}

// ---------- panel rendering for the current state ----------

function renderCurrentPanel() {
  const language = state.settings.lang;
  const mode = state.settings.mode;
  const regionByName = (englishName) => state.regionByEnglishName.get(englishName);
  if (mode === "browse") {
    if (state.selectedRegionId) {
      state.panel.renderBrowseRegion(state.regionById.get(state.selectedRegionId), language, regionByName);
    } else {
      state.panel.renderModeIdle("browse", language);
    }
  } else if (mode === "type") {
    if (state.typeDetourRegionId) {
      // a clicked non-quiz region shows its info card; Escape returns to the round
      state.panel.renderBrowseRegion(state.regionById.get(state.typeDetourRegionId), language, regionByName);
    } else {
      state.panel.renderNamingRound(namingRoundViewModel(state.typeRound), language, {
        promptHint: text().typeClickHint,
        regionByName,
      });
    }
  } else if (mode === "find") {
    state.panel.renderFindRound(findStyleViewModel(state.findRound), language, regionByName);
  } else if (mode === "review") {
    if (state.reviewRound && state.reviewRound.track === "locate") {
      state.panel.renderFindRound(findStyleViewModel(state.reviewRound), language, regionByName);
    } else {
      state.panel.renderNamingRound(namingRoundViewModel(state.reviewRound), language, {
        emptyMessage: text().reviewNoTrouble,
        regionByName,
      });
    }
  }
}

// View model for a find-shaped round (Find mode, or Review's locate rounds).
function findStyleViewModel(round) {
  if (!round) return null;
  return {
    target: state.regionById.get(round.targetId),
    missRegions: round.missIds.map((missId) => state.regionById.get(missId)),
    resolved: round.resolved,
    success: round.success,
    firstTry: round.firstTry,
    gaveUp: round.gaveUp,
    newlyMastered: round.newlyMastered,
  };
}

// View model for a typing-shaped round (Type mode, or Review's naming rounds).
function namingRoundViewModel(round) {
  if (!round) return null;
  return {
    target: state.regionById.get(round.targetId),
    verdict: round.verdict,
    inputText: round.inputText,
    newlyMastered: round.newlyMastered,
    corrected: round.corrected,
  };
}

// ---------- rounds ----------

function startFindRound(previousTargetId) {
  state.mapEngine.setSustainedPulse(null);
  const target = pickFindTarget(quizRegionsInScope(), activeLedger(), previousTargetId);
  state.findRound = target
    ? { targetId: target.id, missIds: [], resolved: false, success: false, firstTry: false, newlyMastered: false }
    : null;
  renderCurrentPanel();
  if (target && state.settings.autoPronounce) state.panel.pronounceCurrentCard();
}

// Type: the game picks via the priority scheduler, or the user picks by
// clicking the map (userPickedRegion). Game picks highlight-and-zoom like a
// quiz prompt; a user pick just gets the selection ring — they know where it is.
function startTypeRound(previousTargetId, userPickedRegion = null) {
  state.typeDetourRegionId = null;
  const target = userPickedRegion || pickTypeTarget(quizRegionsInScope(), activeLedger(), previousTargetId);
  state.typeRound = target
    ? { targetId: target.id, pickedByUser: Boolean(userPickedRegion), verdict: null, inputText: "", newlyMastered: false, corrected: false }
    : null;
  if (userPickedRegion) {
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

// Review: drill a chronic miss from either track. A locate pick replays the
// Find round flow; a name pick replays the typing flow. The map recolors per
// round because the track can change between rounds.
function startReviewRound(previousTargetId) {
  state.mapEngine.setSustainedPulse(null);
  const pick = pickTroubleTarget(quizRegionsInScope(), state.progress, state.settings.lang, previousTargetId);
  if (pick && pick.track === "locate") {
    state.reviewRound = {
      track: "locate",
      targetId: pick.region.id,
      missIds: [], resolved: false, success: false, firstTry: false, gaveUp: false, newlyMastered: false,
    };
    state.mapEngine.setReviewTarget(null);
  } else if (pick) {
    state.reviewRound = {
      track: "name", targetId: pick.region.id, verdict: null, inputText: "", newlyMastered: false, corrected: false,
    };
    state.mapEngine.setReviewTarget(pick.region.id);
    state.mapEngine.centerRegion(pick.region.id);
    state.mapEngine.pulseRegion(pick.region.id);
  } else {
    state.reviewRound = null;
    state.mapEngine.setReviewTarget(null);
  }
  // currentTrack() now reads reviewRound.track (set above), so the map recolors
  // to this round's track and the legend relabels — each round shows its own.
  state.mapEngine.refreshRegionStatuses(computeStatusByRegionId());
  updateLegendTrackLabel();
  renderCurrentPanel();
  // locate rounds show the find card (which has speak buttons); naming cards
  // have none, so this stays leak-proof
  if (state.reviewRound && state.settings.autoPronounce) state.panel.pronounceCurrentCard();
}

// ---------- map callbacks ----------

function handleRegionHovered(regionId) {
  if (state.settings.mode !== "browse" || state.selectedRegionId) return;
  if (regionId) {
    const region = state.regionById.get(regionId);
    if (region) {
      state.panel.renderBrowseRegion(region, state.settings.lang, (englishName) =>
        state.regionByEnglishName.get(englishName)
      );
    }
  } else {
    state.panel.renderModeIdle("browse", state.settings.lang);
  }
}

// Shared click flow for find-shaped rounds (Find mode, Review's locate rounds).
// recordVerdict routes to the right ledger via currentTrack().
function handleFindStyleClick(round, regionId) {
  // once resolved the target keeps pulsing until Next; map clicks do nothing
  if (round.resolved) return;
  if (regionId === round.targetId) {
    round.resolved = true;
    round.success = true;
    round.firstTry = round.missIds.length === 0;
    // only a clean first click earns the exact; a find after misses leaves
    // the ledger untouched (progress neither gained nor lost)
    if (round.firstTry) {
      round.newlyMastered = recordVerdict(round.targetId, "exact");
    }
    state.mapEngine.setSustainedPulse(round.targetId);
    renderCurrentPanel();
  } else {
    // a region already missed costs no extra try — just re-flash it
    if (!round.missIds.includes(regionId)) round.missIds.push(regionId);
    state.mapEngine.flashRegion(regionId);
    if (round.missIds.length >= 3) {
      revealFindTarget(round);
    }
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
    if (region.status === "quiz" && !isExcludedMicrostate(region)) {
      // the click-override: practice the clicked region instead
      startTypeRound(null, region);
    } else {
      // non-quiz region: show its info card as a detour; Escape returns
      state.typeDetourRegionId = regionId;
      state.mapEngine.setSelectedRegion(regionId);
      renderCurrentPanel();
      if (state.settings.autoPronounce) state.panel.pronounceCurrentCard();
    }
  } else if (mode === "find") {
    if (state.findRound) handleFindStyleClick(state.findRound, regionId);
  } else if (mode === "review") {
    if (state.reviewRound && state.reviewRound.track === "locate") {
      handleFindStyleClick(state.reviewRound, regionId);
    }
    // naming rounds: the game picked the region; map clicks change nothing
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
  closeInfoCard();
}

// Escape: close the info card, or empty the answer box of an open naming
// round (the hint's "Escape clears").
function handleEscape() {
  if (state.selectedRegionId || state.typeDetourRegionId) {
    closeInfoCard();
    return;
  }
  const mode = state.settings.mode;
  const namingRound =
    mode === "type" ? state.typeRound
    : mode === "review" && state.reviewRound && state.reviewRound.track === "name" ? state.reviewRound
    : null;
  if (namingRound && namingRound.verdict !== "exact" && namingRound.verdict !== "wrong") {
    namingRound.inputText = "";
    renderCurrentPanel();
  }
}

// ---------- panel actions ----------

// The active typing-shaped round, if any (Type, or Review on a naming round).
function activeNamingRound() {
  if (state.settings.mode === "type") return state.typeRound;
  if (state.settings.mode === "review" && state.reviewRound && state.reviewRound.track === "name") {
    return state.reviewRound;
  }
  return null;
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
  // recorded — so it accepts only an exact match and writes nothing.
  if (round.verdict === "almost" || round.verdict === "wrong") {
    if (round.corrected) return;
    round.inputText = inputText;
    if (checkAnswer(trimmedInput, region, state.settings.lang) === "exact") round.corrected = true;
    renderCurrentPanel();
    return;
  }
  if (round.verdict === "exact") return; // already solved
  // First attempt: grade and record. Exact ends the round; a near-miss or
  // wrong reveals the answer and starts the correction step (clear the box so
  // the correct spelling is typed fresh).
  const verdict = checkAnswer(trimmedInput, region, state.settings.lang);
  round.verdict = verdict;
  round.inputText = verdict === "exact" ? inputText : "";
  round.newlyMastered = recordVerdict(region.id, verdict);
  renderCurrentPanel();
  pronounceResolvedCard();
}

// Resolves a Find round as wrong and reveals the target on the map.
// Sustained, not timed: the reveal must stay visible until the user notices
// it and moves on (cleared when the next round starts).
function revealFindTarget(round) {
  round.resolved = true;
  round.success = false;
  round.newlyMastered = recordVerdict(round.targetId, "wrong");
  // recenter (zoom unchanged) so the revealed target lands in the middle, not
  // stranded at the edge or the globe's limb
  state.mapEngine.centerRegion(round.targetId);
  state.mapEngine.setSustainedPulse(round.targetId);
}

// Give up on the current round: records a wrong (giving up is a wrong, and
// the streak should reset) and reveals the answer — in the verdict block for
// typing rounds, on the map for find-shaped rounds.
function revealAnswer() {
  const findStyleRound =
    state.settings.mode === "find" ? state.findRound
    : state.settings.mode === "review" && state.reviewRound && state.reviewRound.track === "locate"
      ? state.reviewRound
      : null;
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
  if (state.settings.mode === "find") {
    startFindRound(state.findRound ? state.findRound.targetId : null);
  } else if (state.settings.mode === "type") {
    startTypeRound(state.typeRound ? state.typeRound.targetId : null);
  } else if (state.settings.mode === "review") {
    startReviewRound(state.reviewRound ? state.reviewRound.targetId : null);
  }
}

// ---------- mode / language / view / continent switching ----------

function switchMode(mode) {
  if (mode === state.settings.mode) return;
  updateSetting("mode", mode);
  state.selectedRegionId = null;
  state.typeRound = null;
  state.typeDetourRegionId = null;
  state.findRound = null;
  state.reviewRound = null;
  state.mapEngine.setSelectedRegion(null);
  state.mapEngine.setReviewTarget(null);
  state.mapEngine.setSustainedPulse(null);
  // the new mode may read a different track — recolor and relabel
  state.mapEngine.refreshRegionStatuses(computeStatusByRegionId());
  updateLegendTrackLabel();
  updateChromePressedStates();
  if (mode === "find") {
    startFindRound(null);
  } else if (mode === "type") {
    startTypeRound(null);
  } else if (mode === "review") {
    startReviewRound(null);
  } else {
    renderCurrentPanel();
  }
}

function switchLanguage(language) {
  if (language === state.settings.lang) return;
  updateSetting("lang", language);
  state.mapEngine.refreshRegionStatuses(computeStatusByRegionId());
  updateChromeText();
  updateChromePressedStates();
  // Naming rounds were scheduled against the other language's ledger — restart
  // them. A user-picked Type round keeps its chosen region but drops the
  // other-ledger verdict. (Find's locate track is language-neutral and its
  // card has no language toggle, so the find branch is just a safeguard.)
  if (state.settings.mode === "find") {
    startFindRound(null);
  } else if (state.settings.mode === "type") {
    if (state.typeRound && state.typeRound.pickedByUser) {
      state.typeRound.verdict = null;
      state.typeRound.inputText = "";
      state.typeRound.newlyMastered = false;
      state.typeRound.corrected = false;
      renderCurrentPanel();
    } else {
      startTypeRound(null);
    }
  } else if (state.settings.mode === "review") {
    startReviewRound(null);
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
  if (state.settings.mode === "find" && (!state.findRound || !inScope(state.findRound.targetId))) {
    startFindRound(null);
  }
  if (state.settings.mode === "type" && (!state.typeRound || !inScope(state.typeRound.targetId))) {
    startTypeRound(null);
  }
  if (state.settings.mode === "review" && (!state.reviewRound || !inScope(state.reviewRound.targetId))) {
    startReviewRound(null);
  }
}

function switchMicrostatesIncluded(included) {
  if (included === state.settings.includeMicrostates) return;
  updateSetting("includeMicrostates", included);
  state.mapEngine.setMicrostatesIncluded(included);
  updateChromePressedStates();
  const targetExcluded = (regionId) => isExcludedMicrostate(state.regionById.get(regionId));
  if (state.settings.mode === "find" && (!state.findRound || targetExcluded(state.findRound.targetId))) {
    startFindRound(null);
  } else if (
    state.settings.mode === "type" &&
    (!state.typeRound || targetExcluded(state.typeRound.targetId))
  ) {
    startTypeRound(null);
  } else if (
    state.settings.mode === "review" &&
    (!state.reviewRound || targetExcluded(state.reviewRound.targetId))
  ) {
    startReviewRound(null);
  } else if (state.settings.mode === "browse") {
    renderCurrentPanel();
  }
}

// ---------- chrome text and pressed states ----------

// The legend's first entry says which progress track the map colors show:
// "Find" or "Type & Review · EN/中文" (naming is per quiz language). When the
// map is neutral (Browse, or Review before a round), it names the mode instead.
function updateLegendTrackLabel() {
  const localized = text();
  const track = currentTrack();
  elements.legendTrackLabel.textContent =
    track === null
      ? (state.settings.mode === "review" ? localized.modeReview : localized.modeBrowse)
      : track === "locate"
        ? localized.legendTrackLocate
        : `${localized.legendTrackName} · ${state.settings.lang === "zh" ? "中文" : "EN"}`;
}

function updateChromeText() {
  const localized = text();
  const modeLabels = {
    browse: localized.modeBrowse,
    type: localized.modeType,
    find: localized.modeFind,
    review: localized.modeReview,
  };
  for (const tab of elements.modeTabs) tab.textContent = modeLabels[tab.dataset.mode];
  for (const button of elements.viewButtons) {
    button.textContent = button.dataset.view === "flat" ? localized.viewFlat : localized.viewGlobe;
  }
  elements.microstateToggle.textContent = localized.microstatesToggle;
  elements.autoPronounceToggle.textContent = localized.autoPronounceToggle;
  const filterContinents = ["World", ...STAT_CONTINENTS];
  elements.continentFilter.innerHTML = filterContinents
    .map(
      (continent) =>
        `<option value="${continent}"${continent === state.settings.continent ? " selected" : ""}>${
          localized.continents[continent]
        }</option>`
    )
    .join("");
  for (const label of elements.legendLabels) {
    const legendKey = label.dataset.legend;
    const legendText = {
      untouched: localized.legendUntouched,
      wrong: localized.legendWrong,
      almost: localized.legendAlmost,
      mastered: localized.legendMastered,
      microstate: localized.legendMicrostate,
      capital: localized.legendCapital,
    }[legendKey];
    label.textContent = legendText;
  }
  elements.dataPageLink.textContent = localized.dataPageLink;
  elements.settingsPageLink.textContent = localized.settingsPageLink;
  updateLegendTrackLabel();
}

function updateChromePressedStates() {
  for (const tab of elements.modeTabs) {
    tab.setAttribute("aria-pressed", String(tab.dataset.mode === state.settings.mode));
  }
  for (const button of elements.viewButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.view === state.settings.view));
  }
  elements.microstateToggle.setAttribute("aria-pressed", String(state.settings.includeMicrostates));
  elements.autoPronounceToggle.setAttribute("aria-pressed", String(state.settings.autoPronounce));
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
    state.progress = loadProgress();
    state.settings = loadSettings();
    applyAllSettings();
  });
}

// Re-applies every setting to the chrome and map (used after a cross-tab
// import / start-fresh / resume from settings.html).
function applyAllSettings() {
  state.selectedRegionId = null;
  state.typeRound = null;
  state.typeDetourRegionId = null;
  state.findRound = null;
  state.reviewRound = null;
  state.mapEngine.setSelectedRegion(null);
  state.mapEngine.setReviewTarget(null);
  state.mapEngine.setSustainedPulse(null);
  updateChromeText();
  updateChromePressedStates();
  state.mapEngine.setView(state.settings.view);
  state.mapEngine.setContinentScope(state.settings.continent);
  state.mapEngine.setMicrostatesIncluded(state.settings.includeMicrostates);
  state.mapEngine.frameContinent(state.settings.continent);
  state.mapEngine.refreshRegionStatuses(computeStatusByRegionId());
  if (state.settings.mode === "find") startFindRound(null);
  else if (state.settings.mode === "type") startTypeRound(null);
  else if (state.settings.mode === "review") startReviewRound(null);
  else renderCurrentPanel();
}

// ---------- boot ----------

async function boot() {
  updateChromeText();
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
    actions: { submitAnswer, nextRound, switchLanguage, revealAnswer },
  });

  // chrome wiring
  for (const tab of elements.modeTabs) {
    tab.addEventListener("click", () => switchMode(tab.dataset.mode));
  }
  for (const button of elements.viewButtons) {
    button.addEventListener("click", () => switchView(button.dataset.view));
  }
  elements.microstateToggle.addEventListener("click", () => {
    switchMicrostatesIncluded(!state.settings.includeMicrostates);
  });
  elements.autoPronounceToggle.addEventListener("click", () => {
    updateSetting("autoPronounce", !state.settings.autoPronounce);
    updateChromePressedStates();
  });
  elements.continentFilter.addEventListener("change", () => {
    switchContinent(elements.continentFilter.value);
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
    // Type/Review (those cards render no speak buttons). Guarded against
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
    // A reveals the answer in Type/Review (inactive while typing in the
    // answer box — the input guard above already returned)
    if (key === "a") {
      const showAnswerButton = elements.panelContent.querySelector("#show-answer-button");
      if (showAnswerButton && !showAnswerButton.disabled) {
        event.preventDefault();
        showAnswerButton.click();
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
      // box's own Enter listener can't hear it). With text in the box it
      // checks; empty, it gives up (Show answer), mirroring the box's listener.
      // Without this, Enter would hit Next below and silently discard the round.
      if (event.key === "Enter") {
        const checkButton = elements.panelContent.querySelector("#check-answer-button:not(:disabled)");
        const answerInput = elements.panelContent.querySelector("#answer-input");
        if (checkButton && answerInput) {
          event.preventDefault();
          if (answerInput.value.trim()) {
            checkButton.click();
          } else {
            const showAnswerButton = elements.panelContent.querySelector("#show-answer-button:not(:disabled)");
            if (showAnswerButton) showAnswerButton.click();
            else answerInput.focus();
          }
          return;
        }
      }
      const nextButton = elements.panelContent.querySelector("#next-round-button");
      if (nextButton && !nextButton.disabled) {
        event.preventDefault();
        nextButton.click();
      }
    }
  });

  // apply persisted settings
  state.mapEngine.setInitialView(state.settings.view);
  state.mapEngine.setContinentScope(state.settings.continent);
  state.mapEngine.setMicrostatesIncluded(state.settings.includeMicrostates);
  state.mapEngine.refreshRegionStatuses(computeStatusByRegionId());
  if (state.settings.continent !== "World") {
    // instant: an animated boot framing would hide the SVG behind the
    // interaction canvas during the first-load reveal
    state.mapEngine.frameContinent(state.settings.continent, { animate: false });
  }
  if (state.settings.mode === "find") startFindRound(null);
  else if (state.settings.mode === "type") startTypeRound(null);
  else if (state.settings.mode === "review") startReviewRound(null);
  else renderCurrentPanel();

  state.mapEngine.playFirstLoadReveal();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

boot();
