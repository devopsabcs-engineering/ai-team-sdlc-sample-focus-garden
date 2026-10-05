import type { CompletedSessionV1 } from "./types";

export interface GardenDay {
  readonly date: Date;
  readonly key: string;
  readonly isToday: boolean;
  readonly isFuture: boolean;
  readonly sessions: readonly CompletedSessionV1[];
}

export interface GardenSummary {
  readonly weekStart: Date;
  readonly nextWeekStart: Date;
  readonly days: readonly GardenDay[];
  readonly weekCount: number;
  readonly totalMinutes: number;
  readonly streakDays: number;
}

export function startOfLocalDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addLocalDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfLocalWeek(value: Date): Date {
  const result = startOfLocalDay(value);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

export function localDateKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
}

export function sortSessions(
  sessions: readonly CompletedSessionV1[],
): readonly CompletedSessionV1[] {
  return [...sessions].sort(
    (left, right) =>
      Date.parse(left.completedAt) - Date.parse(right.completedAt) ||
      left.id.localeCompare(right.id),
  );
}

export function currentStreak(
  sessions: readonly CompletedSessionV1[],
  now: Date,
): number {
  const completedDays = new Set(
    sessions.map((session) => localDateKey(new Date(session.completedAt))),
  );
  const today = startOfLocalDay(now);
  const yesterday = addLocalDays(today, -1);
  let cursor = completedDays.has(localDateKey(today))
    ? today
    : completedDays.has(localDateKey(yesterday))
      ? yesterday
      : null;
  let streak = 0;

  while (cursor !== null && completedDays.has(localDateKey(cursor))) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}

export function buildGardenSummary(
  sessions: readonly CompletedSessionV1[],
  now: Date,
): GardenSummary {
  const sorted = sortSessions(sessions);
  const today = startOfLocalDay(now);
  const weekStart = startOfLocalWeek(today);
  const nextWeekStart = addLocalDays(weekStart, 7);
  const weekly = sorted.filter((session) => {
    const completed = new Date(session.completedAt);
    return completed >= weekStart && completed < nextWeekStart;
  });
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addLocalDays(weekStart, index);
    const key = localDateKey(date);
    return {
      date,
      key,
      isToday: key === localDateKey(today),
      isFuture: date > today,
      sessions: weekly.filter(
        (session) => localDateKey(new Date(session.completedAt)) === key,
      ),
    };
  });

  return {
    weekStart,
    nextWeekStart,
    days,
    weekCount: weekly.length,
    totalMinutes: sorted.reduce(
      (total, session) => total + session.durationSeconds / 60,
      0,
    ),
    streakDays: currentStreak(sorted, now),
  };
}
