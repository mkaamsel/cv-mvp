// Behavioural telemetry — pure types and classifier logic.
// No React, no side-effects. Safe to import server-side if needed.

export type BehaviouralState = "flowing" | "hesitating" | "stuck";

export type FieldMetrics = {
  fieldId: string;
  page: string;
  isFocused: boolean;
  // Accumulated across all focus sessions for this field instance
  totalFocusDurationMs: number;
  // Current focus session duration (0 when not focused)
  currentFocusDurationMs: number;
  timeSinceLastKeyMs: number;
  charsTyped: number;
  charsDeleted: number;
  editCount: number;
  focusCount: number;
  currentLength: number;
  navigationDirection: "forward" | "backward" | null;
};

// ─── Classifier thresholds ────────────────────────────────────────────────────

// Flowing: user typed something within this window
const FLOWING_ACTIVE_MS = 3_000;

// Hesitating: focused but quiet for this long
const HESITATING_IDLE_MS = 6_000;

// Stuck: long session with almost nothing produced
const STUCK_DURATION_MS = 30_000;
const STUCK_MIN_CHARS = 30; // chars typed in the session

// Stuck: user keeps refocusing but never gets past the threshold
const STUCK_REFOCUS_COUNT = 3;
const STUCK_REFOCUS_CHARS = 40;

// Stuck: user typed something then stopped for a long time
const STUCK_POST_TYPE_IDLE_MS = 25_000;
const STUCK_POST_TYPE_MIN_DURATION_MS = 35_000;

// ─── Classifier ───────────────────────────────────────────────────────────────

export function classifyFieldState(m: FieldMetrics): BehaviouralState {
  if (!m.isFocused) return "flowing";

  // Active typing → flowing
  if (m.timeSinceLastKeyMs < FLOWING_ACTIVE_MS && m.editCount > 0) {
    return "flowing";
  }

  // Stuck: long focus session, barely typed anything
  const totalDuration = m.totalFocusDurationMs + m.currentFocusDurationMs;
  if (totalDuration > STUCK_DURATION_MS && m.charsTyped < STUCK_MIN_CHARS) {
    return "stuck";
  }

  // Stuck: repeated attempts, nothing sticking
  if (
    m.focusCount >= STUCK_REFOCUS_COUNT &&
    m.charsTyped < STUCK_REFOCUS_CHARS
  ) {
    return "stuck";
  }

  // Stuck: typed a little then went silent for a long time
  if (
    m.timeSinceLastKeyMs > STUCK_POST_TYPE_IDLE_MS &&
    totalDuration > STUCK_POST_TYPE_MIN_DURATION_MS
  ) {
    return "stuck";
  }

  // Hesitating: focused but no recent activity
  if (m.timeSinceLastKeyMs > HESITATING_IDLE_MS) {
    return "hesitating";
  }

  return "flowing";
}
