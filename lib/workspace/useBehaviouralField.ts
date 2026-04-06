"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  classifyFieldState,
  type BehaviouralState,
  type FieldMetrics,
} from "./behaviouralTelemetry";

// How often the classifier re-evaluates (ms)
const CLASSIFIER_TICK_MS = 1_500;

// Minimum gap between consecutive stuck triggers for the same field (ms)
const STUCK_DEBOUNCE_MS = 45_000;

export type BehaviouralFieldProps = {
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onChange: (value: string) => void;
};

export type UseBehaviouralFieldResult = {
  behaviouralState: BehaviouralState;
  fieldProps: BehaviouralFieldProps;
  resetField: () => void;
};

export function useBehaviouralField(
  fieldId: string,
  page: string,
  currentLength: number,
  onStuck?: (metrics: FieldMetrics) => void,
): UseBehaviouralFieldResult {
  // Mutable session state — not part of React state to avoid re-renders
  const session = useRef({
    isFocused: false,
    focusCount: 0,
    // Accumulated duration from closed focus sessions
    previousFocusDurationMs: 0,
    // When the current focus session started (null = not focused)
    focusStartMs: null as number | null,
    lastKeyMs: null as number | null,
    charsTyped: 0,
    charsDeleted: 0,
    editCount: 0,
    navigationDirection: null as "forward" | "backward" | null,
    lastStuckTriggerMs: 0,
  });

  const currentLengthRef = useRef(currentLength);
  useEffect(() => {
    currentLengthRef.current = currentLength;
  }, [currentLength]);

  const onStuckRef = useRef(onStuck);
  useEffect(() => {
    onStuckRef.current = onStuck;
  }, [onStuck]);

  const [behaviouralState, setBehaviouralState] =
    useState<BehaviouralState>("flowing");

  const onFocus = useCallback(() => {
    const s = session.current;
    s.isFocused = true;
    s.focusCount += 1;
    s.focusStartMs = Date.now();
  }, []);

  const onBlur = useCallback(() => {
    const s = session.current;
    if (s.focusStartMs !== null) {
      s.previousFocusDurationMs += Date.now() - s.focusStartMs;
      s.focusStartMs = null;
    }
    s.isFocused = false;
    setBehaviouralState("flowing");
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const s = session.current;
    s.lastKeyMs = Date.now();
    s.editCount += 1;

    if (e.key === "Backspace" || e.key === "Delete") {
      s.charsDeleted += 1;
    } else if (e.key.length === 1) {
      s.charsTyped += 1;
    }

    if (e.key === "Tab") {
      s.navigationDirection = e.shiftKey ? "backward" : "forward";
    }
  }, []);

  // onChange receives the new string value — used as an additional signal
  const onChange = useCallback((_value: string) => {
    session.current.lastKeyMs = Date.now();
  }, []);

  const resetField = useCallback(() => {
    const s = session.current;
    s.isFocused = false;
    s.focusCount = 0;
    s.previousFocusDurationMs = 0;
    s.focusStartMs = null;
    s.lastKeyMs = null;
    s.charsTyped = 0;
    s.charsDeleted = 0;
    s.editCount = 0;
    s.navigationDirection = null;
    s.lastStuckTriggerMs = 0;
    setBehaviouralState("flowing");
  }, []);

  // Classifier interval — runs only when the field is focused
  useEffect(() => {
    const interval = setInterval(() => {
      const s = session.current;
      if (!s.isFocused) return;

      const now = Date.now();
      const currentFocusDurationMs =
        s.focusStartMs !== null ? now - s.focusStartMs : 0;

      const metrics: FieldMetrics = {
        fieldId,
        page,
        isFocused: true,
        totalFocusDurationMs: s.previousFocusDurationMs,
        currentFocusDurationMs,
        timeSinceLastKeyMs:
          s.lastKeyMs !== null ? now - s.lastKeyMs : Infinity,
        charsTyped: s.charsTyped,
        charsDeleted: s.charsDeleted,
        editCount: s.editCount,
        focusCount: s.focusCount,
        currentLength: currentLengthRef.current,
        navigationDirection: s.navigationDirection,
      };

      const state = classifyFieldState(metrics);
      setBehaviouralState(state);

      if (
        state === "stuck" &&
        onStuckRef.current &&
        now - s.lastStuckTriggerMs > STUCK_DEBOUNCE_MS
      ) {
        s.lastStuckTriggerMs = now;
        onStuckRef.current({ ...metrics });
      }
    }, CLASSIFIER_TICK_MS);

    return () => clearInterval(interval);
  }, [fieldId, page]); // stable — fieldId and page don't change

  return {
    behaviouralState,
    fieldProps: { onFocus, onBlur, onKeyDown, onChange },
    resetField,
  };
}
