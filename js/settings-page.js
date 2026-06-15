// settings-page.js — the standalone Settings page (settings.html). Holds the
// permanent "Clear all progress" wipe and live display-tuning toggles
// (interface language + card text size + flag size + Chinese font). Every write
// fires a "storage" event the game tab uses to re-sync itself live.

import { saveProgress, blankProgress, loadSettings, saveSettings } from "./store.js";
import { uiText } from "./panel.js";

// The page's own chrome follows the interface-language setting too, read fresh
// each time so toggling it re-labels this page live.
const t = () => uiText[loadSettings().uiLang] || uiText.en;

const elements = {
  pageTitle: document.getElementById("page-title"),
  backupHint: document.getElementById("backup-hint"),
  clearAllButton: document.getElementById("clear-all-button"),
  displaySectionTitle: document.getElementById("display-section-title"),
  uiLangLabel: document.getElementById("ui-lang-label"),
  fontSizeLabel: document.getElementById("font-size-label"),
  flagSizeLabel: document.getElementById("flag-size-label"),
  cjkFontLabel: document.getElementById("cjk-font-label"),
  uiLangToggle: document.getElementById("ui-lang-toggle"),
  fontSizeToggle: document.getElementById("font-size-toggle"),
  flagSizeToggle: document.getElementById("flag-size-toggle"),
  cjkFontToggle: document.getElementById("cjk-font-toggle"),
};

// Reflect the saved value as the pressed segment. dataAttr is the camelCased
// data-* key on each segment (e.g. "fontScale" for data-font-scale); parse maps
// the string data-* value to the stored type (Number for sizes, identity for
// strings).
function syncToggle(toggle, dataAttr, value, parse = Number) {
  for (const segment of toggle.querySelectorAll(".segment")) {
    segment.setAttribute("aria-pressed", String(parse(segment.dataset[dataAttr]) === value));
  }
}

// Each segment writes its value into one setting; saveSettings fires the storage
// event the game tab applies live (no reload). Reads settings fresh at click
// time so it never clobbers a change the game tab made meanwhile. onChange runs
// after the write (the interface-language toggle relabels this page with it).
function wireToggle(toggle, dataAttr, settingKey, parse = Number, onChange = null) {
  toggle.addEventListener("click", (event) => {
    const segment = event.target.closest(".segment");
    if (!segment) return;
    const value = parse(segment.dataset[dataAttr]);
    const settings = loadSettings();
    settings[settingKey] = value;
    saveSettings(settings);
    syncToggle(toggle, dataAttr, value, parse);
    if (onChange) onChange();
  });
}

// (Re)label the whole page in the current interface language.
function applyLabels() {
  const text = t();
  elements.pageTitle.textContent = text.settingsPageTitle;
  elements.backupHint.textContent = text.settingsBackupHint;
  elements.clearAllButton.textContent = text.clearAllButton;
  elements.displaySectionTitle.textContent = text.displaySectionTitle;
  elements.uiLangLabel.textContent = text.uiLangLabel;
  elements.fontSizeLabel.textContent = text.fontSizeLabel;
  elements.flagSizeLabel.textContent = text.flagSizeLabel;
  elements.cjkFontLabel.textContent = text.cjkFontLabel;
}

// Permanent wipe of both progress tracks — the only recovery is starting over.
// Settings (incl. the toggles) are left alone.
elements.clearAllButton.addEventListener("click", () => {
  const text = t();
  if (!confirm(text.clearAllConfirm)) return;
  saveProgress(blankProgress());
  alert(text.clearAllDone);
});

const asString = (value) => value;
wireToggle(elements.uiLangToggle, "uiLang", "uiLang", asString, applyLabels);
wireToggle(elements.fontSizeToggle, "fontScale", "fontScale");
wireToggle(elements.flagSizeToggle, "flagSize", "flagSize");
wireToggle(elements.cjkFontToggle, "cjkFont", "cjkFont", asString);

const settings = loadSettings();
syncToggle(elements.uiLangToggle, "uiLang", settings.uiLang, asString);
syncToggle(elements.fontSizeToggle, "fontScale", settings.fontScale);
syncToggle(elements.flagSizeToggle, "flagSize", settings.flagSize);
syncToggle(elements.cjkFontToggle, "cjkFont", settings.cjkFont, asString);

applyLabels();
