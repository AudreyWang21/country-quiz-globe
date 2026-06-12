// data-page.js — the standalone Data page (data.html): one section per
// progress track (Find / Type & Review), each with mastered-by-continent
// stats and a trouble-spots list. Reads the same localStorage as the game;
// the "storage" listener keeps it live while quizzing in the other tab.

import { loadProgress, loadSettings, ledgerForTrack, isMastered, TROUBLE_WRONG_THRESHOLD } from "./store.js";
import { renderStatsList, uiText, STAT_CONTINENTS } from "./panel.js";
import { regionDisplayName } from "./quiz.js";

const text = uiText.en;
const elements = {
  pageTitle: document.getElementById("page-title"),
  locateTrackTitle: document.getElementById("locate-track-title"),
  locateStatsTitle: document.getElementById("locate-stats-title"),
  locateStatsList: document.getElementById("locate-stats-list"),
  locateTroubleTitle: document.getElementById("locate-trouble-title"),
  locateTroubleList: document.getElementById("locate-trouble-list"),
  nameTrackTitle: document.getElementById("name-track-title"),
  nameStatsTitle: document.getElementById("name-stats-title"),
  nameStatsList: document.getElementById("name-stats-list"),
  nameTroubleTitle: document.getElementById("name-trouble-title"),
  nameTroubleList: document.getElementById("name-trouble-list"),
};

let quizRegions = [];

function renderTrackSection(ledger, settings, scopedRegions, statsListElement, troubleListElement) {
  const rows = STAT_CONTINENTS.map((continent) => {
    const continentRegions = scopedRegions.filter((region) => region.continent === continent);
    return {
      continent,
      total: continentRegions.length,
      mastered: continentRegions.filter((region) => isMastered(ledger[region.id])).length,
    };
  });
  renderStatsList(statsListElement, rows, settings.lang, settings.continent);

  const troubleRegions = scopedRegions
    .filter((region) => ledger[region.id] && ledger[region.id].wrong > TROUBLE_WRONG_THRESHOLD)
    .sort((a, b) => ledger[b.id].wrong - ledger[a.id].wrong);
  troubleListElement.replaceChildren(
    ...(troubleRegions.length
      ? troubleRegions.map((region) => {
          const row = document.createElement("li");
          row.className = "stats-row";
          const name = document.createElement("span");
          name.className = "stats-continent";
          name.textContent = regionDisplayName(region, settings.lang);
          const count = document.createElement("span");
          count.className = "stats-count";
          count.textContent = `×${ledger[region.id].wrong}`;
          row.append(name, count);
          return row;
        })
      : [emptyTroubleRow()])
  );
}

function render() {
  const settings = loadSettings();
  const progress = loadProgress();
  const scopedRegions = quizRegions.filter(
    (region) => !(region.microstate && !settings.includeMicrostates)
  );

  // the naming track is per quiz language; locating is language-neutral
  elements.nameTrackTitle.textContent =
    settings.lang === "zh" ? text.dataTrackNameTitleZh : text.dataTrackNameTitleEn;
  renderTrackSection(
    ledgerForTrack(progress, "locate", settings.lang),
    settings,
    scopedRegions,
    elements.locateStatsList,
    elements.locateTroubleList
  );
  renderTrackSection(
    ledgerForTrack(progress, "name", settings.lang),
    settings,
    scopedRegions,
    elements.nameStatsList,
    elements.nameTroubleList
  );
}

function emptyTroubleRow() {
  const row = document.createElement("li");
  row.className = "stats-row";
  row.textContent = text.troubleEmpty;
  return row;
}

async function boot() {
  elements.pageTitle.textContent = text.dataPageTitle;
  elements.locateTrackTitle.textContent = text.dataTrackLocateTitle;
  for (const title of [elements.locateStatsTitle, elements.nameStatsTitle]) {
    title.textContent = text.statsTitle;
  }
  for (const title of [elements.locateTroubleTitle, elements.nameTroubleTitle]) {
    title.textContent = text.troubleTitle;
  }
  const response = await fetch("data/regions.json");
  const regions = await response.json();
  quizRegions = regions.filter((region) => region.status === "quiz");
  render();
  // fires whenever the game tab records an attempt or switches settings
  window.addEventListener("storage", render);
}

boot();
