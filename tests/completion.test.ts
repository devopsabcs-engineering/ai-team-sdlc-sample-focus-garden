import { describe, expect, it, vi } from "vitest";

import { completeDueFocus, acknowledgeReward } from "../src/domain/completion";
import {
  createLocalStateRepository,
  type StateRepository,
} from "../src/data/local-repository";
import type { FocusGardenStateV1 } from "../src/domain/types";
import { UUID_2 } from "./fixtures/schema-v1";

const BOUNDARY = Date.parse("2026-10-05T13:25:00.000Z");

function dueState(): FocusGardenStateV1 {
  return {
    schemaVersion: 1,
    savedAt: "2026-10-05T13:00:00.000Z",
    preferences: {
      selectedPreset: "25-5",
      explicitTheme: null,
      soundEnabled: true,
    },
    activeTimer: {
      id: UUID_2,
      kind: "focus",
      presetId: "25-5",
      durationSeconds: 1500,
      taskLabel: "Tend release",
      phase: "running",
      startedAt: "2026-10-05T13:00:00.000Z",
      runStartedAt: "2026-10-05T13:00:00.000Z",
      creditedBeforeRunMs: 0,
      pausedAt: null,
      completedAt: null,
      rewardAcknowledgedAt: null,
    },
    sessions: [],
  };
}

function repository(initial = dueState()): StateRepository {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  const repo = createLocalStateRepository(
    () => storage,
    () => "2026-10-05T13:25:01.000Z",
  );
  expect(repo.replace(initial).ok).toBe(true);
  return repo;
}

describe("durable focus completion", () => {
  it("reloads canonical state and commits session plus timer in one replace", () => {
    const repo = repository();
    const replace = vi.spyOn(repo, "replace");
    const random = { next: vi.fn(() => 2 / 6) };

    const result = completeDueFocus({
      repository: repo,
      timerId: UUID_2,
      clock: { now: () => BOUNDARY + 90_000 },
      now: () => "2026-10-05T13:26:30.000Z",
      random,
    });

    expect(result.status).toBe("committed");
    expect(replace).toHaveBeenCalledOnce();
    expect(random.next).toHaveBeenCalledOnce();
    expect(repo.load()).toMatchObject({
      ok: true,
      value: {
        activeTimer: {
          id: UUID_2,
          phase: "completed",
          completedAt: "2026-10-05T13:25:00.000Z",
          rewardAcknowledgedAt: null,
        },
        sessions: [
          {
            id: UUID_2,
            species: "cloudfern",
            durationSeconds: 1500,
            completedAt: "2026-10-05T13:25:00.000Z",
          },
        ],
      },
    });
  });

  it("is unchanged across repeated completion attempts", () => {
    const repo = repository();
    const firstRandom = { next: vi.fn(() => 0) };
    completeDueFocus({
      repository: repo,
      timerId: UUID_2,
      clock: { now: () => BOUNDARY },
      now: () => "2026-10-05T13:25:00.000Z",
      random: firstRandom,
    });
    const secondRandom = { next: vi.fn(() => 0.9) };

    const result = completeDueFocus({
      repository: repo,
      timerId: UUID_2,
      clock: { now: () => BOUNDARY + 1000 },
      now: () => "2026-10-05T13:25:01.000Z",
      random: secondRandom,
    });

    expect(result.status).toBe("unchanged");
    expect(secondRandom.next).not.toHaveBeenCalled();
    const loaded = repo.load();
    expect(loaded.ok && loaded.value.sessions).toHaveLength(1);
  });

  it("claims no completion when the atomic write fails", () => {
    const state = dueState();
    const failing: StateRepository = {
      load: () => ({ ok: true, value: state }),
      replace: () => ({ ok: false, code: "quota" }),
      clear: () => ({ ok: true, value: undefined }),
    };

    expect(
      completeDueFocus({
        repository: failing,
        timerId: UUID_2,
        clock: { now: () => BOUNDARY },
        now: () => "2026-10-05T13:25:00.000Z",
        random: { next: () => 0 },
      }),
    ).toEqual({ status: "failed", code: "quota" });
    expect(state.sessions).toHaveLength(0);
    expect(state.activeTimer?.phase).toBe("running");
  });

  it("durably acknowledges a committed reward", () => {
    const repo = repository();
    completeDueFocus({
      repository: repo,
      timerId: UUID_2,
      clock: { now: () => BOUNDARY },
      now: () => "2026-10-05T13:25:00.000Z",
      random: { next: () => 0 },
    });

    const result = acknowledgeReward({
      repository: repo,
      sessionId: UUID_2,
      now: () => "2026-10-05T13:25:02.000Z",
    });

    expect(result.ok && result.state.activeTimer?.rewardAcknowledgedAt).toBe(
      "2026-10-05T13:25:02.000Z",
    );
  });
});
