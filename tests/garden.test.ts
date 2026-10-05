import { describe, expect, it } from "vitest";

import {
  addLocalDays,
  buildGardenSummary,
  currentStreak,
  localDateKey,
  sortSessions,
  startOfLocalWeek,
} from "../src/domain/garden";
import type { CompletedSessionV1, Species } from "../src/domain/types";

function session(
  id: string,
  completed: Date,
  durationSeconds: 900 | 1500 | 3000 = 1500,
  species: Species = "emberleaf",
): CompletedSessionV1 {
  return {
    id,
    presetId:
      durationSeconds === 900
        ? "15-3"
        : durationSeconds === 3000
          ? "50-10"
          : "25-5",
    durationSeconds,
    taskLabel: null,
    species,
    startedAt: new Date(
      completed.getTime() - durationSeconds * 1000,
    ).toISOString(),
    completedAt: completed.toISOString(),
  };
}

describe("local-calendar garden projection", () => {
  it("groups Monday through Sunday with an exclusive next-Monday boundary", () => {
    const now = new Date(2026, 9, 7, 12);
    const sunday = session("sunday", new Date(2026, 9, 11, 23, 59, 59));
    const previousSunday = session(
      "previous",
      new Date(2026, 9, 4, 23, 59, 59),
    );
    const nextMonday = session("next", new Date(2026, 9, 12, 0, 0));

    const summary = buildGardenSummary(
      [nextMonday, sunday, previousSunday],
      now,
    );

    expect(localDateKey(summary.weekStart)).toBe("2026-10-5");
    expect(localDateKey(summary.nextWeekStart)).toBe("2026-10-12");
    expect(summary.days.map((day) => day.sessions.map(({ id }) => id))).toEqual(
      [[], [], [], [], [], [], ["sunday"]],
    );
    expect(summary.weekCount).toBe(1);
  });

  it("crosses month and year boundaries with calendar operations", () => {
    const start = startOfLocalWeek(new Date(2027, 0, 1, 18));
    expect(localDateKey(start)).toBe("2026-12-28");
    expect(
      Array.from({ length: 7 }, (_, index) =>
        localDateKey(addLocalDays(start, index)),
      ),
    ).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-1-1",
      "2027-1-2",
      "2027-1-3",
    ]);
  });

  it("keeps local midnights across spring-forward and fall-back weeks", () => {
    const spring = startOfLocalWeek(new Date(2026, 2, 8, 12));
    const springNext = addLocalDays(spring, 7);
    const fall = startOfLocalWeek(new Date(2026, 10, 1, 12));
    const fallNext = addLocalDays(fall, 7);

    expect(spring.getHours()).toBe(0);
    expect(springNext.getHours()).toBe(0);
    expect((springNext.getTime() - spring.getTime()) / 3_600_000).toBe(167);
    expect(fall.getHours()).toBe(0);
    expect(fallNext.getHours()).toBe(0);
    expect((fallNext.getTime() - fall.getTime()) / 3_600_000).toBe(169);
  });

  it("anchors the streak on today, or yesterday while today is empty", () => {
    const now = new Date(2026, 9, 8, 8);
    const completed = [
      session("monday", new Date(2026, 9, 5, 9)),
      session("tuesday", new Date(2026, 9, 6, 9)),
      session("wednesday-a", new Date(2026, 9, 7, 9)),
      session("wednesday-b", new Date(2026, 9, 7, 15)),
    ];

    expect(currentStreak(completed, now)).toBe(3);
    expect(
      currentStreak(
        [...completed, session("today", new Date(2026, 9, 8, 7))],
        now,
      ),
    ).toBe(4);
    expect(currentStreak([session("old", new Date(2026, 9, 6, 9))], now)).toBe(
      0,
    );
  });

  it("calculates all-time minutes separately from this-week count", () => {
    const summary = buildGardenSummary(
      [
        session("prior", new Date(2026, 8, 1, 9), 3000),
        session("week-a", new Date(2026, 9, 5, 9), 900),
        session("week-b", new Date(2026, 9, 5, 10), 1500),
      ],
      new Date(2026, 9, 5, 12),
    );

    expect(summary.totalMinutes).toBe(90);
    expect(summary.weekCount).toBe(2);
  });

  it("sorts by completion instant and then ID without changing species", () => {
    const completed = new Date(2026, 9, 5, 9);
    const later = session("later", new Date(2026, 9, 5, 10), 1500, "dewstar");
    const tieB = session("b", completed, 1500, "moonbell");
    const tieA = session("a", completed, 1500, "quietbloom");

    expect(
      sortSessions([later, tieB, tieA]).map(({ id, species }) => [id, species]),
    ).toEqual([
      ["a", "quietbloom"],
      ["b", "moonbell"],
      ["later", "dewstar"],
    ]);
  });
});
