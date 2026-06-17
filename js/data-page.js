// data-page.js — the standalone Data page (data.html): one section per
// progress track (Find / Type / Flag find / Flag spell), each showing
// mastered-by-continent stats.
// Reads the same localStorage as the game; the "storage" listener keeps it live
// while quizzing in the other tab (and re-labels if the interface language flips).

import { loadProgress, loadSettings, ledgerForTrack, isMastered } from "./store.js";
import { renderStatsList, uiText, STAT_CONTINENTS, setInterfaceLanguage } from "./panel.js";

const elements = {
  pageTitle: document.getElementById("page-title"),
  locateTrackTitle: document.getElementById("locate-track-title"),
  locateStatsTitle: document.getElementById("locate-stats-title"),
  locateStatsList: document.getElementById("locate-stats-list"),
  nameTrackTitle: document.getElementById("name-track-title"),
  nameStatsTitle: document.getElementById("name-stats-title"),
  nameStatsList: document.getElementById("name-stats-list"),
  flagLocateTrackTitle: document.getElementById("flag-locate-track-title"),
  flagLocateStatsTitle: document.getElementById("flag-locate-stats-title"),
  flagLocateStatsList: document.getElementById("flag-locate-stats-list"),
  flagNameTrackTitle: document.getElementById("flag-name-track-title"),
  flagNameStatsTitle: document.getElementById("flag-name-stats-title"),
  flagNameStatsList: document.getElementById("flag-name-stats-list"),
};

let quizRegions = [];

function renderTrackSection(ledger, settings, scopedRegions, statsListElement) {
  const rows = STAT_CONTINENTS.map((continent) => {
    const continentRegions = scopedRegions.filter((region) => region.continent === continent);
    return {
      continent,
      total: continentRegions.length,
      mastered: continentRegions.filter((region) => isMastered(ledger[region.id])).length,
    };
  });
  renderStatsList(statsListElement, rows, settings.continent);
}

function render() {
  const settings = loadSettings();
  const progress = loadProgress();
  setInterfaceLanguage(settings.uiLang); // so renderStatsList + titles use the right language
  const text = uiText[settings.uiLang] || uiText.en;
  // mirrors app.js isOutOfMicrostateScope: "exclude" drops microstates, "only"
  // drops the normal countries, "include" keeps everything
  const inMicrostateScope = (region) => {
    if (settings.microstateMode === "exclude") return !region.microstate;
    if (settings.microstateMode === "only") return region.microstate;
    return true;
  };
  const scopedRegions = quizRegions.filter(inMicrostateScope);
  // Flag modes can only quiz regions that have a flag, so their "mastered out of
  // N" counts against the flagged subset, not the whole pool.
  const flagScopedRegions = scopedRegions.filter((region) => region.iso2);

  // labels (re-applied each render so an interface-language flip in the game tab updates here)
  elements.pageTitle.textContent = text.dataPageTitle;
  elements.locateTrackTitle.textContent = text.dataTrackLocateTitle;
  elements.locateStatsTitle.textContent = text.statsTitle;
  elements.nameStatsTitle.textContent = text.statsTitle;
  // all four tracks are language-neutral (§6); the flag tracks are separate
  // ledgers so flag practice never mingles with Find/Type (2026-06-17)
  elements.nameTrackTitle.textContent = text.dataTrackNameTitle;
  elements.flagLocateTrackTitle.textContent = text.dataTrackFlagLocateTitle;
  elements.flagLocateStatsTitle.textContent = text.statsTitle;
  elements.flagNameTrackTitle.textContent = text.dataTrackFlagNameTitle;
  elements.flagNameStatsTitle.textContent = text.statsTitle;

  renderTrackSection(
    ledgerForTrack(progress, "locate"),
    settings,
    scopedRegions,
    elements.locateStatsList
  );
  renderTrackSection(
    ledgerForTrack(progress, "name"),
    settings,
    scopedRegions,
    elements.nameStatsList
  );
  renderTrackSection(
    ledgerForTrack(progress, "flagLocate"),
    settings,
    flagScopedRegions,
    elements.flagLocateStatsList
  );
  renderTrackSection(
    ledgerForTrack(progress, "flagName"),
    settings,
    flagScopedRegions,
    elements.flagNameStatsList
  );
}

async function boot() {
  const response = await fetch("data/regions.json");
  const regions = await response.json();
  quizRegions = regions.filter((region) => region.status === "quiz");
  render();
  // fires whenever the game tab records an attempt or switches settings
  window.addEventListener("storage", render);
}

boot();
