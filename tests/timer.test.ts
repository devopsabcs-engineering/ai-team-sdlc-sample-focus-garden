import { describe, expect, it } from "vitest";

import {
  announcementText,
  completeFocusTimer,
  completionBoundary,
  creditedMs,
  crossedAnnouncementThreshold,
  normalizeTaskLabel,
  pauseTimer,
  reconcileTimer,
  remainingSeconds,
  resumeTimer,
  startFocusTimer,
  startPreparedTimer,
} from "../src/domain/timer";
import type { PersistedTimerV1 } from "../src/domain/types";
import { UUID_2 } from "./fixtures/schema-v1";

const START = Date.parse("2026-10-05T13:00:00.000Z");

function focus(now = START) {
  return startFocusTimer("25-5", "Write tests", now, UUID_2);
}

describe("authoritative wall-clock timer", () => {
  it.each([
    ["25-5", 1500],
    ["50-10", 3000],
    ["15-3", 900],
  ] as const)("starts exact %s focus duration", (preset, seconds) => {
    const timer = startFocusTimer(preset, null, START, UUID_2);

    expect(timer).toMatchObject({
      presetId: preset,
      durationSeconds: seconds,
      phase: "running",
      startedAt: "2026-10-05T13:00:00.000Z",
      runStartedAt: "2026-10-05T13:00:00.000Z",
      creditedBeforeRunMs: 0,
    });
    expect(remainingSeconds(timer, START)).toBe(seconds);
  });

  it("trims labels, stores blanks as absent, and counts Unicode code points", () => {
    expect(normalizeTaskLabel("  Tend seedlings  ")).toBe("Tend seedlings");
    expect(normalizeTaskLabel(" \n ")).toBeNull();
    expect(normalizeTaskLabel("🌱".repeat(80))).toBe("🌱".repeat(80));
    expect(() => normalizeTaskLabel("🌱".repeat(81))).toThrow(RangeError);
  });

  it("derives elapsed time from the wall clock rather than tick count", () => {
    const timer = focus();
    expect(creditedMs(timer, START + 32_250)).toBe(32_250);
    expect(remainingSeconds(timer, START + 32_250)).toBe(1468);
    expect(remainingSeconds(timer, START + 1_499_001)).toBe(1);
    expect(remainingSeconds(timer, START + 1_500_000)).toBe(0);
  });

  it("freezes credited time while paused and resumes from a new segment", () => {
    const paused = pauseTimer(focus(), START + 30_250);
    expect(paused).toMatchObject({
      phase: "paused",
      creditedBeforeRunMs: 30_250,
      runStartedAt: null,
      pausedAt: "2026-10-05T13:00:30.250Z",
    });
    expect(remainingSeconds(paused, START + 900_000)).toBe(1470);

    const resumed = resumeTimer(paused, START + 900_000);
    expect(remainingSeconds(resumed, START + 910_000)).toBe(1460);
    expect(resumed.creditedBeforeRunMs).toBe(30_250);
  });

  it("clamps a backward clock and never loses previously credited time", () => {
    const paused = pauseTimer(focus(), START + 20_000);
    const resumed = resumeTimer(paused, START + 10_000);
    expect(creditedMs(resumed, START)).toBe(20_000);
    expect(remainingSeconds(resumed, START)).toBe(1480);
  });

  it("exposes a focus due boundary without completing or rewarding it", () => {
    const timer = focus();
    const result = reconcileTimer(timer, START + 1_700_000);
    expect(result).toEqual({
      timer,
      focusCompletionDue: true,
      completedNow: false,
      completionBoundary: "2026-10-05T13:25:00.000Z",
    });
    if (!result.focusCompletionDue) throw new Error("Expected due focus.");
    expect(
      completeFocusTimer(result.timer, result.completionBoundary),
    ).toMatchObject({
      phase: "completed",
      completedAt: "2026-10-05T13:25:00.000Z",
      creditedBeforeRunMs: 1_500_000,
    });
  });

  it.each([
    ["25-5", 300],
    ["50-10", 600],
    ["15-3", 180],
  ] as const)(
    "completes a %s break at its exact boundary",
    (presetId, duration) => {
      const startedAt = new Date(START).toISOString();
      const timer: PersistedTimerV1 = {
        id: UUID_2,
        kind: "break",
        presetId,
        durationSeconds: duration,
        taskLabel: null,
        phase: "running",
        startedAt,
        runStartedAt: startedAt,
        creditedBeforeRunMs: 0,
        pausedAt: null,
        completedAt: null,
        rewardAcknowledgedAt: null,
      };
      const result = reconcileTimer(timer, START + duration * 1000 + 60_000);
      expect(result).toMatchObject({
        focusCompletionDue: false,
        completedNow: true,
        timer: {
          phase: "completed",
          completedAt: new Date(START + duration * 1000).toISOString(),
        },
      });
    },
  );

  it("starts a prepared break only on explicit command", () => {
    const prepared: PersistedTimerV1 = {
      id: UUID_2,
      kind: "break",
      presetId: "25-5",
      durationSeconds: 300,
      taskLabel: null,
      phase: "prepared",
      startedAt: null,
      runStartedAt: null,
      creditedBeforeRunMs: 0,
      pausedAt: null,
      completedAt: null,
      rewardAcknowledgedAt: null,
    };
    expect(remainingSeconds(prepared, START + 999_999)).toBe(300);
    expect(startPreparedTimer(prepared, START)).toMatchObject({
      phase: "running",
      startedAt: "2026-10-05T13:00:00.000Z",
    });
  });

  it("rejects invalid transitions, including pausing a due focus", () => {
    const timer = focus();
    expect(() => resumeTimer(timer, START)).toThrow();
    expect(() => startPreparedTimer(timer, START)).toThrow();
    expect(() => pauseTimer(timer, START + 1_500_000)).toThrow();
    expect(() =>
      completeFocusTimer(timer, "2026-10-05T13:24:59.000Z"),
    ).toThrow();
  });

  it("bounds milestone announcements to threshold crossings", () => {
    expect(crossedAnnouncementThreshold(301, 300)).toBe("five-minutes");
    expect(crossedAnnouncementThreshold(300, 299)).toBeNull();
    expect(crossedAnnouncementThreshold(61, 60)).toBe("one-minute");
    expect(crossedAnnouncementThreshold(60, 59)).toBeNull();
    expect(announcementText("started", "focus")).toBe("Focus timer started.");
    expect(announcementText("paused", "break")).toBe("Break timer paused.");
  });

  it("reports exact boundaries and leaves non-running timers unchanged", () => {
    const paused = pauseTimer(focus(), START + 10_000);
    expect(completionBoundary(paused)).toBeNull();
    expect(reconcileTimer(paused, START + 9_000_000)).toEqual({
      timer: paused,
      focusCompletionDue: false,
      completedNow: false,
    });
  });
});
