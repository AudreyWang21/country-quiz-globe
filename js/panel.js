// panel.js — side-panel rendering: region details, quiz cards, stats, UI text.

import { regionDisplayName } from "./quiz.js";

// ---------- UI text (English / Chinese) ----------
// Since 2026-06-11 the chrome renders English only (uiText.en everywhere);
// the zh table is kept in case the bilingual chrome ever comes back.

export const uiText = {
  en: {
    modeBrowse: "Browse",
    modeType: "Type",
    modeFind: "Find",
    modeReview: "Review",
    browseIdleTitle: "Browse the atlas",
    browseIdleBody: "Hover over a region to read about it. Click to keep it in the panel.",
    namingPrompt: "Name the highlighted region",
    typeClickHint: "Click any region on the map to practice that one instead",
    reviewNoTrouble: "No trouble spots in this scope — a region joins this drill once it has been answered wrong 3+ times, in Find or in typing.",
    answerPlaceholder: "Type the name…",
    correctionPlaceholder: "Type the correct answer…",
    correctionPrompt: "Type the correct answer to continue",
    checkAnswer: "Check",
    showAnswer: "Show answer",
    enterToCheck: "Enter checks · Escape clears",
    verdictExact: "Correct",
    verdictAlmost: "Close",
    verdictWrong: "Wrong",
    masteredBadge: "Mastered",
    answerLabel: "Answer",
    capitalLabel: "Capital",
    partOfLabel: "Part of",
    browseOnlyNote: "Browse-only region — not in the quiz pool.",
    pronounceButton: "Pronounce",
    findInstruction: "Find on the map",
    findMissPrefix: "That was",
    findFound: "Found it",
    findShownOnMap: "The answer is pulsing on the map",
    findAllMastered: "Every region in this scope is mastered. Pick another continent.",
    noQuizRegions: "No quiz regions in this scope.",
    nextButton: "Next",
    statsTitle: "Mastered by continent",
    troubleTitle: "Trouble spots — wrong 3+ times",
    troubleEmpty: "None — no region missed more than twice.",
    legendTrackLocate: "Find",
    legendTrackName: "Type & Review",
    dataTrackLocateTitle: "Find — locating on the map",
    dataTrackNameTitleEn: "Type & Review — naming in English",
    dataTrackNameTitleZh: "Type & Review — naming in 中文",
    dataPageLink: "Data ↗",
    settingsPageLink: "Settings ↗",
    dataPageTitle: "Atlas — Data",
    settingsPageTitle: "Atlas — Settings",
    settingsBackupHint: "Progress lives in this browser. Export a backup before clearing browser data.",
    worldTotalLabel: "World",
    exportButton: "Export progress",
    importButton: "Import progress",
    importConfirm: "Replace ALL current progress and settings with this file?",
    importInvalid: "That file is not a valid Atlas export",
    importDone: "Progress imported",
    startFreshButton: "Start fresh",
    resumeSavedButton: "Resume saved progress",
    startFreshConfirm: "Set current progress aside and start fresh? Bring it back anytime with “Resume saved progress”.",
    resumeSavedConfirm: "Replace current progress with the progress saved on {date}? Progress made since starting fresh will be lost.",
    clearAllButton: "Clear all progress",
    clearAllConfirm: "Permanently delete ALL progress in both tracks? This cannot be undone. Export a backup first if you want to keep it.",
    clearAllDone: "All progress cleared",
    dataLoadFailed: "Could not load map data. Is the server running?",
    legendUntouched: "Untouched",
    legendWrong: "Wrong",
    legendAlmost: "Almost",
    legendMastered: "Mastered",
    legendMicrostate: "Microstate",
    legendCapital: "Capital (zoom in)",
    viewFlat: "Flat",
    viewGlobe: "Globe",
    microstatesToggle: "Microstates",
    autoPronounceToggle: "Auto-pronounce",
    continents: {
      World: "World",
      Africa: "Africa",
      Asia: "Asia",
      Europe: "Europe",
      "North America": "North America",
      "South America": "South America",
      Oceania: "Oceania",
      Antarctica: "Antarctica",
      Other: "Other",
    },
  },
  zh: {
    modeBrowse: "浏览",
    modeType: "拼写",
    modeFind: "寻找",
    modeReview: "复习",
    browseIdleTitle: "浏览地图",
    browseIdleBody: "悬停查看地区信息，点击可固定在面板中。",
    namingPrompt: "写出高亮地区的名称",
    typeClickHint: "点击地图上的任意地区可改为练习该地区",
    reviewNoTrouble: "该范围内暂无易错地区——在寻找或拼写中答错 3 次以上的地区会进入此练习。",
    answerPlaceholder: "输入名称…",
    correctionPlaceholder: "输入正确答案…",
    correctionPrompt: "输入正确答案以继续",
    checkAnswer: "检查",
    showAnswer: "显示答案",
    enterToCheck: "Enter 检查 · Esc 清除",
    verdictExact: "正确",
    verdictAlmost: "接近",
    verdictWrong: "错误",
    masteredBadge: "已掌握",
    answerLabel: "答案",
    capitalLabel: "首都",
    partOfLabel: "属于",
    browseOnlyNote: "仅供浏览，不在测验范围内。",
    pronounceButton: "朗读",
    findInstruction: "在地图上找到",
    findMissPrefix: "这是",
    findFound: "找到了",
    findShownOnMap: "答案正在地图上闪烁",
    findAllMastered: "该范围内的地区已全部掌握。换个大洲试试。",
    noQuizRegions: "该范围内没有可测验的地区。",
    nextButton: "下一题",
    statsTitle: "各大洲掌握进度",
    troubleTitle: "易错地区——答错 3 次及以上",
    troubleEmpty: "暂无——没有地区答错超过两次。",
    legendTrackLocate: "寻找",
    legendTrackName: "拼写与复习",
    dataTrackLocateTitle: "寻找——在地图上定位",
    dataTrackNameTitleEn: "拼写与复习——英语名称",
    dataTrackNameTitleZh: "拼写与复习——中文名称",
    dataPageLink: "数据 ↗",
    settingsPageLink: "设置 ↗",
    dataPageTitle: "Atlas——数据",
    settingsPageTitle: "Atlas——设置",
    settingsBackupHint: "进度保存在当前浏览器中。清除浏览器数据前请先导出备份。",
    worldTotalLabel: "世界",
    exportButton: "导出进度",
    importButton: "导入进度",
    importConfirm: "用这个文件替换全部当前进度和设置？",
    importInvalid: "这不是有效的 Atlas 导出文件",
    importDone: "进度已导入",
    startFreshButton: "重新开始",
    resumeSavedButton: "恢复存档进度",
    startFreshConfirm: "把当前进度存起来并重新开始？随时可用“恢复存档进度”找回。",
    resumeSavedConfirm: "用 {date} 存档的进度替换当前进度？重新开始后的进度将丢失。",
    clearAllButton: "清除所有进度",
    clearAllConfirm: "永久删除两个练习轨道的所有进度？此操作无法撤销。如需保留，请先导出备份。",
    clearAllDone: "所有进度已清除",
    dataLoadFailed: "地图数据加载失败。服务器在运行吗？",
    legendUntouched: "未练习",
    legendWrong: "错误",
    legendAlmost: "接近",
    legendMastered: "已掌握",
    legendMicrostate: "微型地区",
    legendCapital: "首都（放大显示）",
    viewFlat: "平面",
    viewGlobe: "球面",
    microstatesToggle: "微型地区",
    autoPronounceToggle: "自动朗读",
    continents: {
      World: "世界",
      Africa: "非洲",
      Asia: "亚洲",
      Europe: "欧洲",
      "North America": "北美洲",
      "South America": "南美洲",
      Oceania: "大洋洲",
      Antarctica: "南极洲",
      Other: "其他",
    },
  },
};

// ---------- helpers ----------

// Real flags from the vendored flag-icons SVG set (app/vendor/flags/<cc>.svg,
// 4x3) — identical rendering everywhere, unlike flag emoji, which Windows
// Chrome cannot draw. Every iso2 in regions.json has a matching file
// (verified at vendor time); regions with iso2 null get no badge.
function flagMarkup(iso2) {
  if (!iso2 || iso2.length !== 2) return "";
  return `<img class="flag-image" src="vendor/flags/${iso2.toLowerCase()}.svg" alt="${escapeHtml(iso2.toUpperCase())}">`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Speaker icon + button for pronouncing a name via the Web Speech API — the
// browser's built-in text-to-speech. `lang` ("en-US" / "zh-CN") steers which
// voice the browser picks; local Windows voices work offline. Rendered only
// when the browser supports speechSynthesis, so wiring can assume it exists.
const SPEAKER_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6h2.5l3.5-3v10l-3.5-3H2.5z" fill="currentColor" stroke="none"/><path d="M10.5 6a3 3 0 0 1 0 4"/><path d="M12.3 4.2a5.5 5.5 0 0 1 0 7.6"/></svg>`;

function speakButtonMarkup(name, lang) {
  if (!name || !("speechSynthesis" in window)) return "";
  const shortcutKey = lang === "zh-CN" ? "C" : "E"; // app.js keydown handler
  return `<button class="speak-button" type="button"
    aria-label="${escapeHtml(uiText.en.pronounceButton)}: ${escapeHtml(name)}"
    title="${escapeHtml(uiText.en.pronounceButton)} (${shortcutKey})"
    data-speak-text="${escapeHtml(name)}" data-speak-lang="${lang}">${SPEAKER_ICON}</button>`;
}

// Language-neutral "English · 中文" name, for cards that show both at once
// (browse parent label, find target).
function bilingualName(region) {
  return region.nameZh && region.nameZh !== region.nameEn
    ? `${escapeHtml(region.nameEn)} · ${escapeHtml(region.nameZh)}`
    : escapeHtml(region.nameEn);
}

function bothCapitals(region, language) {
  const first = language === "zh" ? region.capitalZh : region.capitalEn;
  const second = language === "zh" ? region.capitalEn : region.capitalZh;
  if (!first && !second) return "";
  if (first && second && first !== second) return `${escapeHtml(first)} · ${escapeHtml(second)}`;
  return escapeHtml(first || second);
}

// The one region info block, shared by the Browse card and the Find target so
// a region always presents the same way: flag + stacked names (EN/中文 with
// pronounce buttons, endonym third) + capital and parent facts + note.
// Language-neutral since 2026-06-11: English first, 中文 second, regardless
// of the quiz language.
function regionInfoMarkup(region, regionByName) {
  const text = uiText.en;
  const capitals = bothCapitals(region, "en");
  const parentRegion = region.parent ? regionByName(region.parent) : null;
  const parentLabel = parentRegion ? bilingualName(parentRegion) : escapeHtml(region.parent || "");
  const facts = [];
  if (capitals) facts.push(`<dt>${escapeHtml(text.capitalLabel)}</dt><dd>${capitals}</dd>`);
  if (parentLabel) facts.push(`<dt>${escapeHtml(text.partOfLabel)}</dt><dd>${parentLabel}</dd>`);
  return `
    <header class="region-card-header">
      <span class="region-flag">${flagMarkup(region.iso2)}</span>
      <div class="region-card-names">
        <h2 class="region-primary-name">${escapeHtml(region.nameEn)}${speakButtonMarkup(region.nameEn, "en-US")}</h2>
        <p class="region-secondary-name">${escapeHtml(region.nameZh || "")}${speakButtonMarkup(region.nameZh, "zh-CN")}</p>
        ${region.nameLocal && region.nameLocal !== region.nameEn && region.nameLocal !== region.nameZh
          ? `<p class="region-local-name">${escapeHtml(region.nameLocal)}</p>`
          : ""}
      </div>
    </header>
    ${facts.length ? `<dl class="region-facts">${facts.join("")}</dl>` : ""}
    ${region.note ? `<p class="region-note">${escapeHtml(region.note)}</p>` : ""}`;
}

// ---------- panel factory ----------

// elements: { content }   actions: { submitAnswer(text), nextRound(), switchLanguage(lang) }
export function createSidePanel({ contentElement, actions }) {
  function setContent(html) {
    contentElement.innerHTML = html;
  }

  // The quiz language (active ledger + accepted answers) is chosen here, on
  // the Type/Review cards — the header button was removed 2026-06-11; info
  // cards and the Find target show both languages at once instead.
  function kickerRowMarkup(kickerText, language) {
    return `
      <div class="panel-kicker-row">
        <p class="panel-kicker">${escapeHtml(kickerText)}</p>
        <div class="segmented-control card-language-toggle" id="card-language-toggle" role="group" aria-label="Quiz language">
          <button class="segment" type="button" data-lang="en" aria-pressed="${language === "en"}">EN</button>
          <button class="segment" type="button" data-lang="zh" aria-pressed="${language === "zh"}">中文</button>
        </div>
      </div>`;
  }

  function wireLanguageToggle() {
    for (const button of contentElement.querySelectorAll("#card-language-toggle .segment")) {
      button.addEventListener("click", () => actions.switchLanguage(button.dataset.lang));
    }
  }

  // Wires the answer input + Check button. IME-safe: Enter during an active
  // composition (isComposing, or the legacy keyCode 229) never submits.
  function wireAnswerInput() {
    const answerInput = contentElement.querySelector("#answer-input");
    const checkButton = contentElement.querySelector("#check-answer-button");
    if (!answerInput) return;
    answerInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      if (event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      // Enter on a blank box gives up (same as Show answer) — you don't know it;
      // with text it checks the answer.
      if (answerInput.value.trim()) actions.submitAnswer(answerInput.value);
      else actions.revealAnswer();
    });
    if (checkButton) {
      // Check mirrors the Enter key: with text it grades the answer, on a blank
      // box it gives up (reveals the answer) — it absorbs what the removed
      // "Show answer" button used to do.
      checkButton.addEventListener("click", () => {
        if (answerInput.value.trim()) actions.submitAnswer(answerInput.value);
        else actions.revealAnswer();
      });
    }
  }

  function wireNextButton() {
    const nextButton = contentElement.querySelector("#next-round-button");
    if (nextButton && !nextButton.disabled) {
      nextButton.addEventListener("click", () => actions.nextRound());
    }
    return nextButton;
  }

  function wireShowAnswerButton() {
    const showAnswerButton = contentElement.querySelector("#show-answer-button");
    if (showAnswerButton && !showAnswerButton.disabled) {
      showAnswerButton.addEventListener("click", () => actions.revealAnswer());
    }
  }

  // The give-up button on quiz cards. Disabled (not removed — stable layout)
  // once the round is decided, since the answer is visible from then on.
  function showAnswerButtonMarkup(disabled) {
    return `<button id="show-answer-button" class="action-button" type="button"
      title="${escapeHtml(uiText.en.showAnswer)} (A)"${disabled ? " disabled" : ""}>${escapeHtml(uiText.en.showAnswer)}</button>`;
  }

  // ----- pronunciation -----

  // Bumping the sequence id invalidates any pending EN→中文 auto-chain, so a
  // manual click during an auto sequence can't trigger the chained utterance.
  let pronounceSequenceId = 0;

  function cancelSpeech() {
    pronounceSequenceId += 1;
    speechSynthesis.cancel();
    for (const speaking of contentElement.querySelectorAll(".speak-button.speaking")) {
      speaking.classList.remove("speaking");
    }
  }

  function startSpeaking(button) {
    const utterance = new SpeechSynthesisUtterance(button.dataset.speakText);
    utterance.lang = button.dataset.speakLang;
    utterance.addEventListener("end", () => button.classList.remove("speaking"));
    utterance.addEventListener("error", () => button.classList.remove("speaking"));
    button.classList.add("speaking");
    speechSynthesis.speak(utterance);
    return utterance;
  }

  // Speaks the clicked button's name. cancel first so rapid clicks replace
  // the current pronunciation instead of queueing a backlog; the `speaking`
  // class (pulse animation) clears when the utterance ends or is cancelled.
  function wireSpeakButtons() {
    for (const button of contentElement.querySelectorAll(".speak-button")) {
      button.addEventListener("click", () => {
        cancelSpeech();
        startSpeaking(button);
      });
    }
  }

  // Auto-pronounce: speak the current card's English name, then its 中文 name.
  // No-op when the current card has no speak buttons (Type/Review quiz cards),
  // so callers can invoke it blindly without leaking an answer.
  function pronounceCurrentCard() {
    if (!("speechSynthesis" in window)) return;
    const enButton = contentElement.querySelector('.speak-button[data-speak-lang="en-US"]');
    const zhButton = contentElement.querySelector('.speak-button[data-speak-lang="zh-CN"]');
    if (!enButton && !zhButton) return;
    cancelSpeech();
    if (enButton && zhButton) {
      const sequenceId = pronounceSequenceId;
      startSpeaking(enButton).addEventListener("end", () => {
        if (pronounceSequenceId === sequenceId) startSpeaking(zhButton);
      });
    } else {
      startSpeaking(enButton || zhButton);
    }
  }

  function focusAnswerInput({ selectExisting = false } = {}) {
    const answerInput = contentElement.querySelector("#answer-input");
    if (!answerInput) return;
    answerInput.focus();
    if (selectExisting) answerInput.select();
  }

  // ----- idle screens -----

  function renderModeIdle(mode, language) {
    const text = uiText.en;
    setContent(`
      <div class="panel-idle">
        <h2 class="panel-idle-title">${escapeHtml(text.browseIdleTitle)}</h2>
        <p class="panel-idle-body">${escapeHtml(text.browseIdleBody)}</p>
      </div>
    `);
  }

  function renderMessage(messageText) {
    setContent(`
      <div class="panel-idle">
        <p class="panel-idle-body">${escapeHtml(messageText)}</p>
      </div>
    `);
  }

  // ----- browse -----

  function renderBrowseRegion(region, language, regionByName) {
    const text = uiText.en;
    setContent(`
      <article class="region-card">
        ${regionInfoMarkup(region, regionByName)}
        ${region.status === "browse" ? `<p class="region-browse-only">${escapeHtml(text.browseOnlyNote)}</p>` : ""}
      </article>
    `);
    wireSpeakButtons();
  }

  // ----- verdict label -----

  // Just the ✓/≈/✗ line; the full region card (regionInfoMarkup) is rendered
  // beneath it on a resolved naming round, so the answer reveal needs no
  // separate simplified block.
  function verdictLabelMarkup(verdict, newlyMastered) {
    const text = uiText.en;
    const verdictLabel =
      verdict === "exact" ? `✓ ${text.verdictExact}` :
      verdict === "almost" ? `≈ ${text.verdictAlmost}` :
      `✗ ${text.verdictWrong}`;
    return `<p class="verdict verdict-${verdict}">${escapeHtml(verdictLabel)}${
      newlyMastered ? ` <span class="mastered-badge">${escapeHtml(text.masteredBadge)}</span>` : ""
    }</p>`;
  }

  // ----- find -----

  // round: { target, wrongClick, resolved, success, gaveUp, newlyMastered }
  // or null when no candidates remain in scope.
  function renderFindRound(round, language, regionByName) {
    const text = uiText.en;
    if (!round || !round.target) {
      setContent(`
        <article class="find-card">
          <p class="panel-kicker">${escapeHtml(text.findInstruction)}</p>
          <p class="panel-idle-body">${escapeHtml(text.findAllMastered)}</p>
          <div class="round-actions">
            <button id="next-round-button" class="action-button" type="button" disabled>${escapeHtml(text.nextButton)}</button>
          </div>
        </article>
      `);
      wireNextButton();
      return;
    }
    let outcomeHtml = "";
    if (round.resolved) {
      if (round.success) {
        outcomeHtml = `<p class="verdict verdict-exact">✓ ${escapeHtml(text.findFound)}${
          round.newlyMastered ? ` <span class="mastered-badge">${escapeHtml(text.masteredBadge)}</span>` : ""
        }</p>`;
      } else {
        // single chance: a wrong click (or give-up) reveals the target on the map
        const missPrefix = round.wrongClick
          ? `${escapeHtml(text.findMissPrefix)} ${bilingualName(round.wrongClick)} — `
          : "";
        outcomeHtml = `<p class="verdict verdict-wrong">✗ ${missPrefix}${escapeHtml(text.findShownOnMap)}</p>`;
      }
    }
    setContent(`
      <article class="find-card">
        <p class="panel-kicker">${escapeHtml(text.findInstruction)}</p>
        ${regionInfoMarkup(round.target, regionByName)}
        <div class="find-outcome">${outcomeHtml}</div>
        <div class="round-actions">
          ${round.resolved
            ? `<button id="next-round-button" class="action-button" type="button">${escapeHtml(text.nextButton)}</button>`
            : showAnswerButtonMarkup(false)}
        </div>
      </article>
    `);
    const nextButton = wireNextButton();
    wireShowAnswerButton();
    wireSpeakButtons();
    if (round.resolved && nextButton) nextButton.focus();
  }

  // ----- naming rounds (Type, and Review's naming-track rounds) -----

  // round: { target, verdict, inputText, newlyMastered, corrected } or null
  // when the mode has nothing to quiz (emptyMessage says why). promptHint: extra
  // hint under "Enter checks…" (Type's click-override). regionByName: parent
  // lookup for the resolved card's "Part of" fact.
  function renderNamingRound(round, language, { emptyMessage, promptHint, regionByName } = {}) {
    const text = uiText.en;
    if (!round || !round.target) {
      setContent(`
        <article class="quiz-card">
          ${kickerRowMarkup(text.namingPrompt, language)}
          <p class="panel-idle-body">${escapeHtml(emptyMessage || text.noQuizRegions)}</p>
          <div class="round-actions">
            <button id="next-round-button" class="action-button" type="button" disabled>${escapeHtml(text.nextButton)}</button>
          </div>
        </article>
      `);
      wireNextButton();
      wireLanguageToggle();
      return;
    }
    // Single attempt: exact solves the round; any non-exact answer (or giving
    // up) reveals the full region card and starts a correction step — you must
    // type the correct spelling to continue (ungraded; the first attempt was
    // already recorded). Only an exact first try or a completed correction lets
    // you advance, and only then are the input and Check disabled.
    const hasVerdict = Boolean(round.verdict);
    const needsCorrection = (round.verdict === "almost" || round.verdict === "wrong") && !round.corrected;
    const canAdvance = round.verdict === "exact" || round.corrected;
    // once the correction is typed right, the label flips to ✓ Correct — purely
    // visual; the ledger keeps the original wrong/almost (graded on attempt 1).
    const displayVerdict = round.corrected ? "exact" : round.verdict;
    setContent(`
      <article class="quiz-card">
        ${kickerRowMarkup(text.namingPrompt, language)}
        <div class="answer-row" id="answer-row">
          <input id="answer-input" class="answer-input" type="text"
                 autocomplete="off" autocapitalize="off" spellcheck="false"
                 placeholder="${escapeHtml(needsCorrection ? text.correctionPlaceholder : text.answerPlaceholder)}"
                 value="${escapeHtml(round.inputText || "")}"${canAdvance ? " disabled" : ""}>
          <button id="check-answer-button" class="action-button" type="button"${canAdvance ? " disabled" : ""}>${escapeHtml(text.checkAnswer)}</button>
        </div>
        <div class="verdict-area">
          ${hasVerdict
            ? `${verdictLabelMarkup(displayVerdict, round.newlyMastered)}
               ${regionInfoMarkup(round.target, regionByName || (() => null))}
               ${needsCorrection ? `<p class="correction-prompt">${escapeHtml(text.correctionPrompt)}</p>` : ""}`
            : `<p class="verdict-hint">${escapeHtml(text.enterToCheck)}${
                promptHint ? ` · ${escapeHtml(promptHint)}` : ""
              }</p>`}
        </div>
        <div class="round-actions">
          <button id="next-round-button" class="action-button" type="button"${needsCorrection ? " disabled" : ""}>${escapeHtml(text.nextButton)}</button>
        </div>
      </article>
    `);
    wireAnswerInput();
    wireNextButton();
    wireLanguageToggle();
    if (hasVerdict) wireSpeakButtons(); // the resolved card carries pronounce buttons
    if (canAdvance) {
      const nextButton = contentElement.querySelector("#next-round-button");
      if (nextButton) nextButton.focus();
    } else {
      focusAnswerInput();
    }
  }

  return {
    renderModeIdle,
    renderMessage,
    renderBrowseRegion,
    renderFindRound,
    renderNamingRound,
    pronounceCurrentCard,
  };
}

// ---------- stats ----------

export const STAT_CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];

// rows: computed by the caller. Renders the compact per-continent list.
export function renderStatsList(statsListElement, rows, language, activeContinent) {
  const text = uiText.en;
  const rowsHtml = rows
    .map((row) => {
      const isActive = row.continent === activeContinent;
      const label = text.continents[row.continent] || row.continent;
      return `<li class="stats-row${isActive ? " stats-row-active" : ""}">
        <span class="stats-continent">${escapeHtml(label)}</span>
        <span class="stats-count">${row.mastered}&hairsp;/&hairsp;${row.total}</span>
      </li>`;
    })
    .join("");
  const worldMastered = rows.reduce((sum, row) => sum + row.mastered, 0);
  const worldTotal = rows.reduce((sum, row) => sum + row.total, 0);
  statsListElement.innerHTML =
    rowsHtml +
    `<li class="stats-row stats-row-world${activeContinent === "World" ? " stats-row-active" : ""}">
      <span class="stats-continent">${escapeHtml(text.worldTotalLabel)}</span>
      <span class="stats-count">${worldMastered}&hairsp;/&hairsp;${worldTotal}</span>
    </li>`;
}
