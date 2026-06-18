// panel.js — side-panel rendering: region details, quiz cards, stats, UI text.

// ---------- UI text (English / Chinese) ----------
// Chrome strings live in both languages. The active one follows the interface
// language (settings.uiLang), applied via setInterfaceLanguage() — separate
// from the quiz language. Defaults to English.

export const uiText = {
  en: {
    modeBrowse: "Browse",
    modeType: "Type",
    modeFind: "Find",
    modeFlagFind: "Flag find",
    modeFlagType: "Flag spell",
    flagFindInstruction: "Whose flag is this? Click its country on the map",
    flagTypePrompt: "Whose flag is this? Type the name",
    browseIdleTitle: "Browse the atlas",
    browseIdleBody: "Hover over a region to read about it. Click to keep it in the panel.",
    namingPrompt: "Name the highlighted region",
    typeClickHint: "Click any region on the map to practice that one instead",
    answerPlaceholder: "Type the name (T)",
    correctionPlaceholder: "Type the correct answer…",
    checkAnswer: "Check",
    showAnswer: "Show answer",
    enterToCheck: "Enter checks · Escape clears",
    verdictExact: "Correct",
    verdictAlmost: "Close",
    verdictWrong: "Wrong",
    youTyped: "You typed:",
    masteredBadge: "Mastered",
    answerLabel: "Answer",
    capitalLabel: "Capital",
    partOfLabel: "Part of",
    browseOnlyNote: "Browse-only region — not in the quiz pool.",
    pronounceButton: "Pronounce",
    findInstruction: "Find on the map",
    findMissPrefix: "That was",
    findFound: "Found it",
    findWrongRegion: "Wrong region",
    findAllMastered: "Every region in this scope is mastered. Pick another continent.",
    noQuizRegions: "No quiz regions in this scope.",
    nextButton: "Next",
    statsTitle: "Mastered by continent",
    dataTrackLocateTitle: "Find — locating on the map",
    dataTrackNameTitle: "Type — naming the region",
    dataTrackFlagLocateTitle: "Flag find — locating from the flag",
    dataTrackFlagNameTitle: "Flag spell — naming from the flag",
    dataPageLink: "Data ↗",
    settingsPageLink: "Settings ↗",
    dataPageTitle: "Atlas — Data",
    settingsPageTitle: "Atlas — Settings",
    displaySectionTitle: "Display (temporary tuning)",
    fontSizeLabel: "Card text size",
    flagSizeLabel: "Flag size",
    cjkFontLabel: "Chinese font",
    uiLangLabel: "Interface language",
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
    clearAllConfirm: "Permanently delete ALL progress across all four modes? This cannot be undone.",
    clearAllDone: "All progress cleared",
    clearTrackHint: "Or clear just one mode:",
    clearTrackButton: "Clear {mode}",
    clearTrackConfirm: "Permanently delete all {mode} progress? This cannot be undone.",
    clearTrackDone: "{mode} progress cleared",
    dataLoadFailed: "Could not load map data. Is the server running?",
    viewFlat: "Flat",
    viewGlobe: "Globe",
    microstateModes: { include: "Include microstates", exclude: "Exclude microstates", only: "Only microstates" },
    autoPronounceToggle: "Auto-pronounce",
    browseSearchPlaceholder: "Search regions…",
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
    modeFlagFind: "国旗寻找",
    modeFlagType: "国旗拼写",
    flagFindInstruction: "这是哪国国旗？在地图上点击它所属的国家",
    flagTypePrompt: "这是哪国国旗？写出它的名称",
    browseIdleTitle: "浏览地图",
    browseIdleBody: "悬停查看地区信息，点击可固定在面板中。",
    namingPrompt: "写出高亮地区的名称",
    typeClickHint: "点击地图上的任意地区可改为练习该地区",
    answerPlaceholder: "输入名称 (T)",
    correctionPlaceholder: "输入正确答案…",
    checkAnswer: "检查",
    showAnswer: "显示答案",
    enterToCheck: "Enter 检查 · Esc 清除",
    verdictExact: "正确",
    verdictAlmost: "接近",
    verdictWrong: "错误",
    youTyped: "你输入了：",
    masteredBadge: "已掌握",
    answerLabel: "答案",
    capitalLabel: "首都",
    partOfLabel: "属于",
    browseOnlyNote: "仅供浏览，不在测验范围内。",
    pronounceButton: "朗读",
    findInstruction: "在地图上找到",
    findMissPrefix: "这是",
    findFound: "找到了",
    findWrongRegion: "错误地区",
    findAllMastered: "该范围内的地区已全部掌握。换个大洲试试。",
    noQuizRegions: "该范围内没有可测验的地区。",
    nextButton: "下一题",
    statsTitle: "各大洲掌握进度",
    dataTrackLocateTitle: "寻找——在地图上定位",
    dataTrackNameTitle: "拼写——写出地区名称",
    dataTrackFlagLocateTitle: "国旗寻找——看旗在地图上定位",
    dataTrackFlagNameTitle: "国旗拼写——看旗写出名称",
    dataPageLink: "数据 ↗",
    settingsPageLink: "设置 ↗",
    dataPageTitle: "Atlas——数据",
    settingsPageTitle: "Atlas——设置",
    displaySectionTitle: "显示（临时调整）",
    fontSizeLabel: "卡片文字大小",
    flagSizeLabel: "国旗大小",
    cjkFontLabel: "中文字体",
    uiLangLabel: "界面语言",
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
    clearAllConfirm: "永久删除全部四个模式的所有进度？此操作无法撤销。",
    clearAllDone: "所有进度已清除",
    clearTrackHint: "或仅清除单个模式：",
    clearTrackButton: "清除{mode}",
    clearTrackConfirm: "永久删除「{mode}」的所有进度？此操作无法撤销。",
    clearTrackDone: "已清除「{mode}」进度",
    dataLoadFailed: "地图数据加载失败。服务器在运行吗？",
    viewFlat: "平面",
    viewGlobe: "球面",
    microstateModes: { include: "全部地区", exclude: "无微型地区", only: "仅微型地区" },
    autoPronounceToggle: "自动朗读",
    browseSearchPlaceholder: "搜索地区…",
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

// Active interface language for all chrome strings below. app.js sets this from
// settings.uiLang before (re)rendering; every `uiText[uiLang]` read picks it up.
let uiLang = "en";
export function setInterfaceLanguage(language) {
  uiLang = uiText[language] ? language : "en";
}

// ---------- helpers ----------

// Real flags from the vendored flag-icons SVG set (app/vendor/flags/<cc>.svg,
// 4x3) — identical rendering everywhere, unlike flag emoji, which Windows
// Chrome cannot draw. Every iso2 in regions.json has a matching file
// (verified at vendor time); regions with iso2 null get no badge.
// Flags whose artwork isn't a filled rectangle — drop the panel background +
// border so the parchment shows through the empty area instead of a white box.
// Nepal is the world's only non-rectangular national flag; the rest of the 4x3
// set fills its box, so this set has just the one entry.
const BARE_FLAGS = new Set(["np"]);

// Canonical "does this region have a flag we can show?" — a valid 2-letter iso2
// with a vendored SVG. The single source of truth for flag eligibility: the
// flag-quiz pool (app.js) and the Data page's flag stats (data-page.js) both
// scope to this, and flagMarkup honors the same guard, so they never disagree.
export function regionHasFlag(region) {
  return Boolean(region.iso2) && region.iso2.length === 2;
}

export function flagMarkup(iso2) {
  if (!iso2 || iso2.length !== 2) return "";
  const cc = iso2.toLowerCase();
  const bare = BARE_FLAGS.has(cc) ? " flag-image-bare" : "";
  return `<img class="flag-image${bare}" src="vendor/flags/${cc}.svg" alt="${escapeHtml(iso2.toUpperCase())}">`;
}

// Flag-mode prompt: just the flag, no name — the whole point is to recognize
// the country from its flag alone. Reuses the region card's banner styling
// (centered, sized by --flag-banner-width) with a bump for the focal role.
// Flag-mode targets are pre-filtered to regions that have a flag, so the
// no-flag fallback should never show in practice.
function flagPromptMarkup(region) {
  const flag = flagMarkup(region.iso2);
  return flag
    ? `<div class="region-flag-banner flag-prompt-banner">${flag}</div>`
    : "";
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Visible hotkey hint appended to a button label, e.g. "Show answer (A)" — so
// shortcuts are discoverable without hovering for the title tooltip. Plain
// parenthetical for now; the `.key-hint` span lets CSS dim it and is the seam
// for a future Anki-style keycap look.
function keyHint(key) {
  return ` <span class="key-hint">(${escapeHtml(key)})</span>`;
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
    aria-label="${escapeHtml(uiText[uiLang].pronounceButton)}: ${escapeHtml(name)}"
    title="${escapeHtml(uiText[uiLang].pronounceButton)} (${shortcutKey})"
    data-speak-text="${escapeHtml(name)}" data-speak-lang="${lang}">${SPEAKER_ICON}</button>`;
}

// Language-neutral "English · 中文" name, for cards that show both at once
// (browse parent label, find target).
function bilingualName(region) {
  return region.nameZh && region.nameZh !== region.nameEn
    ? `${escapeHtml(region.nameEn)} · ${escapeHtml(region.nameZh)}`
    : escapeHtml(region.nameEn);
}

// Capital(s) for the card, as HTML. Multi-capital countries store a
// slash-separated list (e.g. "Pretoria (executive) / Cape Town (legislative)");
// when English and 中文 list the same count, each capital gets its own line
// pairing the two languages, so a three-capital country stays readable instead
// of one long run-on. Single capital (or mismatched counts) → one "EN · 中文" line.
function bothCapitals(region) {
  const en = (region.capitalEn || "").trim();
  const zh = (region.capitalZh || "").trim();
  if (!en && !zh) return "";
  const enParts = en.split("/").map((part) => part.trim()).filter(Boolean);
  const zhParts = zh.split("/").map((part) => part.trim()).filter(Boolean);
  if (enParts.length > 1 && enParts.length === zhParts.length) {
    return enParts
      .map((enPart, i) => `<span class="capital-line">${escapeHtml(enPart)} · ${escapeHtml(zhParts[i])}</span>`)
      .join("");
  }
  if (en && zh && en !== zh) return `${escapeHtml(en)} · ${escapeHtml(zh)}`;
  return escapeHtml(en || zh);
}

// The one region info block, shared by the Browse card and the Find target so
// a region always presents the same way: flag + stacked names (EN/中文 with
// pronounce buttons, endonym third) + capital and parent facts + note.
// Language-neutral since 2026-06-11: English first, 中文 second, regardless
// of the quiz language.
function regionInfoMarkup(region, regionByName) {
  const text = uiText[uiLang];
  const flag = flagMarkup(region.iso2);
  const capitals = bothCapitals(region);
  const parentRegion = region.parent ? regionByName(region.parent) : null;
  const parentLabel = parentRegion ? bilingualName(parentRegion) : escapeHtml(region.parent || "");
  const facts = [];
  if (capitals) facts.push(`<dt>${escapeHtml(text.capitalLabel)}</dt><dd>${capitals}</dd>`);
  if (parentLabel) facts.push(`<dt>${escapeHtml(text.partOfLabel)}</dt><dd>${parentLabel}</dd>`);
  // Name above, full-width flag banner below it, then the facts — the
  // geopuzzle-style layout the user asked for.
  return `
    <div class="region-card-names">
      <h2 class="region-primary-name">${escapeHtml(region.nameEn)}${speakButtonMarkup(region.nameEn, "en-US")}</h2>
      <p class="region-secondary-name">${escapeHtml(region.nameZh || "")}${speakButtonMarkup(region.nameZh, "zh-CN")}</p>
      ${region.nameLocal && region.nameLocal !== region.nameEn && region.nameLocal !== region.nameZh
        ? `<p class="region-local-name">${escapeHtml(region.nameLocal)}</p>`
        : ""}
    </div>
    ${flag ? `<div class="region-flag-banner">${flag}</div>` : ""}
    ${facts.length ? `<dl class="region-facts">${facts.join("")}</dl>` : ""}
    ${region.note ? `<p class="region-note">${escapeHtml(region.note)}</p>` : ""}`;
}

// ---------- panel factory ----------

// elements: { content }   actions: { submitAnswer(text), nextRound() }
export function createSidePanel({ contentElement, actions }) {
  function setContent(html) {
    contentElement.innerHTML = html;
  }

  // The typing quiz has no language (§6) — both English and Chinese answers
  // count — so there's no per-card language toggle, just the prompt kicker.
  function kickerRowMarkup(kickerText) {
    return `
      <div class="panel-kicker-row">
        <p class="panel-kicker">${escapeHtml(kickerText)}</p>
      </div>`;
  }

  // Wires the answer input + Check button. IME-safe: Enter during an active
  // composition (isComposing, or the legacy keyCode 229) never submits.
  function wireAnswerInput() {
    const answerInput = contentElement.querySelector("#answer-input");
    const checkButton = contentElement.querySelector("#check-answer-button");
    if (!answerInput) return;
    // The name placeholder carries the "(T)" cue — useful only while unfocused
    // (once you're in the box, T types a letter) — so it hides on focus. The
    // correction placeholder ("Type the correct answer…") is itself the
    // instruction, so it stays visible the whole time.
    const restPlaceholder = answerInput.placeholder;
    if (restPlaceholder === uiText[uiLang].answerPlaceholder) {
      answerInput.addEventListener("focus", () => { answerInput.placeholder = ""; });
      answerInput.addEventListener("blur", () => { answerInput.placeholder = restPlaceholder; });
    }
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
      title="${escapeHtml(uiText[uiLang].showAnswer)} (Enter / Space)"${disabled ? " disabled" : ""}>${escapeHtml(uiText[uiLang].showAnswer)}${keyHint("Enter / Space")}</button>`;
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
  // No-op when the current card has no speak buttons (the Type quiz card),
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

  // Centralized auto-pronounce for the quiz cards (Find / Type / Flag find /
  // Flag spell). The one rule, in one place: a region's name is spoken the
  // moment its *named* card first becomes visible — and never before. Each quiz
  // render calls this at its end; it self-gates so no mode can fall through a
  // gap (the bug Flag find originally had):
  //   - off unless auto-pronounce is enabled;
  //   - silent unless the just-rendered card actually carries speak buttons, so
  //     an unanswered prompt (a flag, or a highlighted-but-unnamed region) never
  //     leaks the answer;
  //   - `fresh` marks a new prompt (an unresolved round): it clears the dedup so
  //     the coming reveal always speaks, even if it's the same region twice;
  //   - otherwise the same region won't repeat, so a card re-rendered in place
  //     (Find adding its verdict line, a correction retype, a cross-tab resync)
  //     stays quiet.
  // Why this unifies the four modes: Find's name *is* its prompt, so its fresh
  // card already has buttons and it speaks at the start; the other three hide
  // the name until the answer, so their fresh card has no buttons and they speak
  // on reveal. Same rule, the timing just follows where the name appears.
  // (Browse stays separate — its hover preview shows the full card without a
  // commitment, so it pronounces on click from app.js, not on every render.)
  let lastAnnouncedRegionId = null;
  function announceCardName(regionId, { fresh = false } = {}) {
    if (!(actions.isAutoPronounce && actions.isAutoPronounce())) return;
    if (fresh) lastAnnouncedRegionId = null;
    const hasSpeak = Boolean(contentElement.querySelector(".speak-button"));
    if (!hasSpeak) {
      lastAnnouncedRegionId = null; // a fresh prompt with nothing to say yet
      return;
    }
    if (regionId != null && regionId === lastAnnouncedRegionId) return;
    lastAnnouncedRegionId = regionId;
    pronounceCurrentCard();
  }

  function focusAnswerInput({ selectExisting = false } = {}) {
    const answerInput = contentElement.querySelector("#answer-input");
    if (!answerInput) return;
    answerInput.focus();
    if (selectExisting) answerInput.select();
  }

  // ----- idle screens -----

  function renderModeIdle(mode) {
    const text = uiText[uiLang];
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

  function renderBrowseRegion(region, regionByName) {
    const text = uiText[uiLang];
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
    const text = uiText[uiLang];
    const verdictLabel =
      verdict === "exact" ? `✓ ${text.verdictExact}` :
      verdict === "almost" ? `≈ ${text.verdictAlmost}` :
      `✗ ${text.verdictWrong}`;
    return `<p class="result-line verdict-${verdict}">${escapeHtml(verdictLabel)}${
      newlyMastered ? ` <span class="mastered-badge">${escapeHtml(text.masteredBadge)}</span>` : ""
    }</p>`;
  }

  // ----- find -----

  // round: { target, wrongClick, resolved, success, gaveUp, newlyMastered }
  // or null when no candidates remain in scope.
  function renderFindRound(round, regionByName, { flagPrompt = false } = {}) {
    const text = uiText[uiLang];
    const kicker = flagPrompt ? text.flagFindInstruction : text.findInstruction;
    if (!round || !round.target) {
      setContent(`
        <article class="find-card">
          <p class="panel-kicker">${escapeHtml(kicker)}</p>
          <p class="panel-idle-body">${escapeHtml(text.findAllMastered)}</p>
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
        // single chance: a wrong click names what you picked; a give-up just
        // reports the miss. Either way the target pulses on the map.
        outcomeHtml = round.wrongClick
          ? `<p class="verdict verdict-wrong">✗ ${escapeHtml(text.findMissPrefix)} ${bilingualName(round.wrongClick)}</p>`
          : `<p class="verdict verdict-wrong">✗ ${escapeHtml(text.findWrongRegion)}</p>`;
      }
    }
    // Flag find shows only the flag until the round resolves; revealing the
    // target then swaps in the full region card (the answer), same as Find.
    const promptBlock = flagPrompt && !round.resolved
      ? flagPromptMarkup(round.target)
      : regionInfoMarkup(round.target, regionByName);
    setContent(`
      <article class="find-card">
        <p class="panel-kicker">${escapeHtml(kicker)}</p>
        ${promptBlock}
        <div class="find-outcome">${outcomeHtml}</div>
        <div class="round-actions">
          ${round.resolved
            ? `<button id="next-round-button" class="action-button" type="button">${escapeHtml(text.nextButton)}${keyHint("Enter")}</button>`
            : showAnswerButtonMarkup(false)}
        </div>
      </article>
    `);
    const nextButton = wireNextButton();
    wireShowAnswerButton();
    wireSpeakButtons();
    if (round.resolved && nextButton) nextButton.focus();
    // Find: the prompt is the named card, so this speaks at the start; Flag find:
    // the unresolved card is flag-only (no buttons), so it stays silent until the
    // answer is revealed here. One call, both behaviors.
    announceCardName(round.target.id, { fresh: !round.resolved });
  }

  // ----- naming rounds (Type) -----

  // round: { target, verdict, inputText, newlyMastered, corrected } or null
  // when the mode has nothing to quiz (emptyMessage says why). promptHint: extra
  // hint under "Enter checks…" (Type's click-override). regionByName: parent
  // lookup for the resolved card's "Part of" fact.
  function renderNamingRound(round, { emptyMessage, promptHint, regionByName, flagPrompt = false } = {}) {
    const text = uiText[uiLang];
    const kickerText = flagPrompt ? text.flagTypePrompt : text.namingPrompt;
    if (!round || !round.target) {
      setContent(`
        <article class="quiz-card">
          ${kickerRowMarkup(kickerText)}
          <p class="panel-idle-body">${escapeHtml(emptyMessage || text.noQuizRegions)}</p>
        </article>
      `);
      wireNextButton();
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
    const card = regionInfoMarkup(round.target, regionByName || (() => null));
    // The correction screen (almost/wrong, not yet corrected): show what the
    // user typed — colored yellow/red — so they can compare it to the correct
    // name, then the "type the correct answer" prompt, then the region card. A
    // give-up (no typed answer) keeps the plain verdict label instead.
    let verdictAreaHtml;
    if (!hasVerdict) {
      verdictAreaHtml = `<p class="verdict-hint">${escapeHtml(text.enterToCheck)}${
        promptHint ? ` · ${escapeHtml(promptHint)}` : ""
      }</p>`;
    } else if (needsCorrection) {
      const typedLine = round.firstAnswer
        ? `<p class="result-line verdict-${round.verdict}">${escapeHtml(text.youTyped)} <span class="typed-answer">${escapeHtml(round.firstAnswer)}</span></p>`
        : verdictLabelMarkup(displayVerdict, round.newlyMastered);
      verdictAreaHtml = `${typedLine}
               ${card}`;
    } else {
      verdictAreaHtml = `${verdictLabelMarkup(displayVerdict, round.newlyMastered)}
               ${card}`;
    }
    // One contextual action button, always in the answer-row slot — Check while
    // answering, Next once solved — so the button never jumps positions and a
    // dead/disabled button never shows.
    const actionButton = canAdvance
      ? `<button id="next-round-button" class="action-button" type="button">${escapeHtml(text.nextButton)}${keyHint("Enter")}</button>`
      : `<button id="check-answer-button" class="action-button" type="button">${escapeHtml(text.checkAnswer)}${keyHint("Enter")}</button>`;
    // Flag spell shows the flag above the answer box until the round resolves;
    // the resolved card (regionInfoMarkup, in verdictAreaHtml) carries its own
    // flag, so the prompt flag only shows while still unanswered.
    const flagPromptBlock = flagPrompt && !hasVerdict ? flagPromptMarkup(round.target) : "";
    setContent(`
      <article class="quiz-card">
        ${kickerRowMarkup(kickerText)}
        ${flagPromptBlock}
        <div class="answer-row" id="answer-row">
          <input id="answer-input" class="answer-input${hasVerdict ? ` input-${displayVerdict}` : ""}" type="text"
                 autocomplete="off" autocapitalize="off" spellcheck="false"
                 placeholder="${escapeHtml(needsCorrection ? text.correctionPlaceholder : text.answerPlaceholder)}"
                 value="${escapeHtml(round.inputText || "")}"${canAdvance ? " disabled" : ""}>
          ${actionButton}
        </div>
        <div class="verdict-area">
          ${verdictAreaHtml}
        </div>
      </article>
    `);
    wireAnswerInput();
    wireNextButton();
    if (hasVerdict) wireSpeakButtons(); // the resolved card carries pronounce buttons
    if (canAdvance) {
      const nextButton = contentElement.querySelector("#next-round-button");
      if (nextButton) nextButton.focus();
    } else {
      focusAnswerInput();
    }
    // The unanswered card has no speak buttons (fresh prompt), so this stays
    // silent; once resolved, the revealed card carries them and it speaks.
    announceCardName(round.target.id, { fresh: !hasVerdict });
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
export function renderStatsList(statsListElement, rows, activeContinent) {
  const text = uiText[uiLang];
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
