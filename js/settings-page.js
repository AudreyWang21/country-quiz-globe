// settings-page.js — the standalone Settings page (settings.html): export,
// import, and the start-fresh / resume stash. Every action reads the latest
// progress straight from localStorage (the game tab may have recorded more
// attempts since this page loaded); every write fires a "storage" event the
// game tab uses to re-sync itself live.

import {
  loadProgress,
  saveProgress,
  blankProgress,
  loadSettings,
  saveSettings,
  downloadExportFile,
  parseImportPayload,
  loadStash,
  saveStash,
  clearStash,
} from "./store.js";
import { uiText } from "./panel.js";

const text = uiText.en;
const elements = {
  pageTitle: document.getElementById("page-title"),
  backupHint: document.getElementById("backup-hint"),
  exportButton: document.getElementById("export-button"),
  importButton: document.getElementById("import-button"),
  stashButton: document.getElementById("stash-button"),
  importFileInput: document.getElementById("import-file-input"),
};

// The stash button is "Start fresh" while the slot is empty and
// "Resume saved progress" while a stashed snapshot is waiting.
function refreshStashButton() {
  elements.stashButton.textContent = loadStash() ? text.resumeSavedButton : text.startFreshButton;
}

elements.exportButton.addEventListener("click", () => {
  downloadExportFile(loadProgress(), loadSettings());
});

elements.importButton.addEventListener("click", () => {
  elements.importFileInput.click();
});

elements.importFileInput.addEventListener("change", async () => {
  const file = elements.importFileInput.files[0];
  elements.importFileInput.value = "";
  if (!file) return;
  let imported;
  try {
    imported = parseImportPayload(await file.text());
  } catch {
    alert(text.importInvalid);
    return;
  }
  if (!confirm(text.importConfirm)) return;
  saveProgress(imported.progress);
  saveSettings(imported.settings);
  refreshStashButton();
  alert(text.importDone);
});

elements.stashButton.addEventListener("click", () => {
  const stash = loadStash();
  if (!stash) {
    if (!confirm(text.startFreshConfirm)) return;
    saveStash(loadProgress());
    saveProgress(blankProgress());
  } else {
    const stashedDate = stash.stashedAt ? stash.stashedAt.slice(0, 10) : "?";
    if (!confirm(text.resumeSavedConfirm.replace("{date}", stashedDate))) return;
    saveProgress(stash.progress);
    clearStash();
  }
  refreshStashButton();
});

elements.pageTitle.textContent = text.settingsPageTitle;
elements.backupHint.textContent = text.settingsBackupHint;
elements.exportButton.textContent = text.exportButton;
elements.importButton.textContent = text.importButton;
refreshStashButton();
