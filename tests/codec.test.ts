import { describe, expect, it } from "vitest";

import { decodeStateV1 } from "../src/data/codec";
import { VALID_STATE_V1, VALID_TIMER_V1, UUID_2 } from "./fixtures/schema-v1";

describe("schema v1 codec", () => {
  it("constructs an independent canonical document from unknown input", () => {
    const input = structuredClone(VALID_STATE_V1);
    const decoded = decodeStateV1(input);

    expect(decoded).toEqual({ ok: true, value: VALID_STATE_V1 });
    expect(decoded.ok && decoded.value).not.toBe(input);
    expect(decoded.ok && decoded.value.preferences).not.toBe(input.preferences);
    expect(decoded.ok && decoded.value.sessions).not.toBe(input.sessions);
  });

  it.each([
    ["null", null],
    ["array", []],
    ["unknown root key", { ...VALID_STATE_V1, surprise: true }],
    ["missing root key", { schemaVersion: 1 }],
    ["wrong version", { ...VALID_STATE_V1, schemaVersion: 2 }],
    ["noncanonical instant", { ...VALID_STATE_V1, savedAt: "2026-10-05" }],
    [
      "unknown preference",
      {
        ...VALID_STATE_V1,
        preferences: { ...VALID_STATE_V1.preferences, extra: true },
      },
    ],
    [
      "invalid closed set",
      {
        ...VALID_STATE_V1,
        preferences: {
          ...VALID_STATE_V1.preferences,
          selectedPreset: "30-5",
        },
      },
    ],
    [
      "nonboolean preference",
      {
        ...VALID_STATE_V1,
        preferences: { ...VALID_STATE_V1.preferences, soundEnabled: 1 },
      },
    ],
  ])("rejects %s", (_name, input) => {
    expect(decodeStateV1(input)).toEqual({ ok: false });
  });

  it("accepts 10,000 unique sessions and rejects duplicates or 10,001", () => {
    const session = VALID_STATE_V1.sessions[0];
    expect(session).toBeDefined();
    expect(
      decodeStateV1({
        ...VALID_STATE_V1,
        sessions: [session, session],
      }),
    ).toEqual({ ok: false });
    if (session === undefined) throw new Error("Missing session fixture.");
    const sessions = Array.from({ length: 10_001 }, (_, index) => ({
      ...session,
      id: `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
    }));
    expect(
      decodeStateV1({ ...VALID_STATE_V1, sessions: sessions.slice(0, 10_000) })
        .ok,
    ).toBe(true);
    expect(decodeStateV1({ ...VALID_STATE_V1, sessions })).toEqual({
      ok: false,
    });
  });

  it.each([
    ["non-UUID id", { id: "timer" }],
    ["unknown key", { extra: true }],
    ["mismatched duration", { durationSeconds: 3000 }],
    ["untrimmed label", { taskLabel: " label " }],
    ["overlong Unicode label", { taskLabel: "🌱".repeat(81) }],
    ["unsafe credited time", { creditedBeforeRunMs: Number.MAX_VALUE }],
    ["invalid nullable instant", { startedAt: "not-an-instant" }],
    ["running without run instant", { phase: "running" }],
    ["paused without pause instant", { pausedAt: null }],
    [
      "paused with completion instant",
      { completedAt: "2026-10-05T13:25:00.000Z" },
    ],
    [
      "paused with acknowledged reward",
      { rewardAcknowledgedAt: "2026-10-05T13:26:00.000Z" },
    ],
    [
      "completed before start",
      {
        phase: "completed",
        creditedBeforeRunMs: 1_500_000,
        pausedAt: null,
        completedAt: "2026-10-05T12:00:00.000Z",
      },
    ],
  ])("rejects timer invariant: %s", (_name, changes) => {
    expect(
      decodeStateV1({
        ...VALID_STATE_V1,
        activeTimer: { ...VALID_TIMER_V1, ...changes },
      }),
    ).toEqual({ ok: false });
  });

  it("accepts each valid timer phase and rejects break-only violations", () => {
    const prepared = {
      ...VALID_TIMER_V1,
      phase: "prepared",
      startedAt: null,
      creditedBeforeRunMs: 0,
      pausedAt: null,
    };
    const running = {
      ...VALID_TIMER_V1,
      phase: "running",
      runStartedAt: "2026-10-05T13:10:00.000Z",
      pausedAt: null,
    };
    const completed = {
      ...VALID_TIMER_V1,
      phase: "completed",
      creditedBeforeRunMs: 1_500_000,
      pausedAt: null,
      completedAt: "2026-10-05T13:25:00.000Z",
      rewardAcknowledgedAt: "2026-10-05T13:26:00.000Z",
    };
    for (const activeTimer of [prepared, running, completed]) {
      expect(decodeStateV1({ ...VALID_STATE_V1, activeTimer }).ok).toBe(true);
    }

    const preparedBreak = {
      ...prepared,
      id: UUID_2,
      kind: "break",
      durationSeconds: 300,
      taskLabel: null,
    };
    expect(
      decodeStateV1({ ...VALID_STATE_V1, activeTimer: preparedBreak }).ok,
    ).toBe(true);
    expect(
      decodeStateV1({
        ...VALID_STATE_V1,
        activeTimer: {
          ...preparedBreak,
          taskLabel: "not allowed",
        },
      }),
    ).toEqual({ ok: false });
    expect(
      decodeStateV1({
        ...VALID_STATE_V1,
        activeTimer: {
          ...preparedBreak,
          rewardAcknowledgedAt: "2026-10-05T13:26:00.000Z",
        },
      }),
    ).toEqual({ ok: false });
  });

  it.each([
    ["unknown key", { extra: true }],
    ["non-UUID id", { id: "session" }],
    ["wrong preset duration", { durationSeconds: 900 }],
    ["unknown species", { species: "rose" }],
    ["invalid task label", { taskLabel: "" }],
    ["noncanonical start", { startedAt: "2026-10-05T12:00:00Z" }],
    ["completion before start", { completedAt: "2026-10-05T11:00:00.000Z" }],
  ])("rejects session invariant: %s", (_name, changes) => {
    const session = VALID_STATE_V1.sessions[0];
    expect(session).toBeDefined();
    expect(
      decodeStateV1({
        ...VALID_STATE_V1,
        sessions: [{ ...session, ...changes }],
      }),
    ).toEqual({ ok: false });
  });
});
