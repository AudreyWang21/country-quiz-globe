// modes.js — the quiz-mode catalog: the "skill" axis of the game.
//
// A quiz mode is one cell of the prompt × answer matrix (Ideas Backlog §2e):
// what you're shown (prompt) and what you do (answer). Each cell scores onto its
// OWN progress track (the user's "4 distinct progresses" call, 2026-06-17). This
// table is the single source of truth — the settings whitelist, the progress
// track set, mode→track routing, the find-like / type-like / flag predicates,
// and the on-screen labels all DERIVE from it. Adding a mode is one row here
// (plus its prompt-rendering), not edits scattered across six files.
//
// Levels / formats (timed, sampled, leaderboard — §2) are a SEPARATE, orthogonal
// axis that WRAPS a mode: Session = Mode × Format × Scope. They're deliberately
// kept OUT of this table so a format composes with every mode instead of
// multiplying it (a "timed Africa flag-find" is flagfind × timed × Africa, not
// its own mode). See Ideas Backlog §2e for the decision.
//
//   prompt:       "name" | "flag"   — what the player is shown
//   answer:       "click" | "spell" — how they respond (click the map / type it)
//   track:        the progress ledger this mode writes to (its own, never shared)
//   labelKey:     uiText key for the short tab label
//   dataTitleKey: uiText key for the Data page's long section title
//
// "browse" is not a quiz mode (no prompt/answer/track — it's the reference
// atlas), so it isn't here; it's added to the settings whitelist separately.

export const MODES = {
  find:     { prompt: "name", answer: "click", track: "locate",     labelKey: "modeFind",     dataTitleKey: "dataTrackLocateTitle" },
  type:     { prompt: "name", answer: "spell", track: "name",       labelKey: "modeType",     dataTitleKey: "dataTrackNameTitle" },
  flagfind: { prompt: "flag", answer: "click", track: "flagLocate", labelKey: "modeFlagFind", dataTitleKey: "dataTrackFlagLocateTitle" },
  flagtype: { prompt: "flag", answer: "spell", track: "flagName",   labelKey: "modeFlagType", dataTitleKey: "dataTrackFlagNameTitle" },
};

// Quiz modes in tab order; browse appended where the full mode list is needed.
export const QUIZ_MODE_IDS = Object.keys(MODES);
export const ALL_MODE_IDS = [...QUIZ_MODE_IDS, "browse"];

// The progress tracks, in mode order — store.js builds the ledger shape from
// this, so a new mode's track joins the saved progress automatically.
export const PROGRESS_TRACKS = QUIZ_MODE_IDS.map((id) => MODES[id].track);

// track → short-label uiText key (the per-mode clear buttons on Settings map a
// data-track attribute back to its mode label through this).
export const MODE_LABEL_KEY_BY_TRACK = Object.fromEntries(
  QUIZ_MODE_IDS.map((id) => [MODES[id].track, MODES[id].labelKey])
);

// mode → its track, or null for a non-quiz mode (browse → a neutral map).
export function trackForMode(modeId) {
  return MODES[modeId] ? MODES[modeId].track : null;
}

// The two answer families — which round machinery and map behavior a mode uses.
// (Find and Flag find both click the map; Type and Flag spell both spell it.)
export function modeUsesClick(modeId) {
  return Boolean(MODES[modeId]) && MODES[modeId].answer === "click";
}
export function modeUsesSpell(modeId) {
  return Boolean(MODES[modeId]) && MODES[modeId].answer === "spell";
}
// Flag-prompted modes can only quiz regions that have a flag.
export function modeUsesFlag(modeId) {
  return Boolean(MODES[modeId]) && MODES[modeId].prompt === "flag";
}
