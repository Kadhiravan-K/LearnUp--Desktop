/**
 * LearnUp Shared Core — Streak and Consistency Algorithms
 * Independent calculation of active streaks, longest streaks, and activity heatmaps.
 */

import { StreakStats, ConsistencyHeatmapDay } from '../types';

/**
 * Returns a stable local calendar date string (YYYY-MM-DD) based on local calendar date
 * to prevent UTC timezone offset discrepancies.
 */
export function toLocalDateString(d: Date | string | number): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calculateStreaks(activityDateStrings: string[]): StreakStats {
  const uniqueDates = new Set<string>();
  for (const raw of activityDateStrings) {
    const formatted = toLocalDateString(raw);
    if (formatted) uniqueDates.add(formatted);
  }

  const sortedDates = Array.from(uniqueDates).sort().reverse();

  let activeStreakDays = 0;
  if (sortedDates.length > 0) {
    const now = new Date();
    const todayStr = toLocalDateString(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = toLocalDateString(yesterday);

    let checkDate =
      sortedDates[0] === todayStr
        ? new Date(now)
        : sortedDates[0] === yesterdayStr
        ? new Date(yesterday)
        : null;

    if (checkDate) {
      for (const dateStr of sortedDates) {
        const expectedStr = toLocalDateString(checkDate);
        if (dateStr === expectedStr) {
          activeStreakDays++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
  }

  // Longest streak
  let longestStreakDays = activeStreakDays;
  let currentStreak = 0;
  let lastDate: Date | null = null;
  const ascendingDates = Array.from(uniqueDates).sort();

  for (const dStr of ascendingDates) {
    const curDate = new Date(dStr);
    if (!lastDate) {
      currentStreak = 1;
    } else {
      const diffDays = Math.round((curDate.getTime() - lastDate.getTime()) / 86400000);
      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }
    if (currentStreak > longestStreakDays) {
      longestStreakDays = currentStreak;
    }
    lastDate = curDate;
  }

  return {
    activeStreakDays,
    longestStreakDays,
    lastActivityDate: sortedDates[0] || null,
    allActivityDates: sortedDates
  };
}

export function generateConsistencyHeatmap(
  activityTimestamps: string[],
  daysCount: number = 365
): ConsistencyHeatmapDay[] {
  const countsByDate: Record<string, number> = {};
  for (const ts of activityTimestamps) {
    const dStr = toLocalDateString(ts);
    if (dStr) {
      countsByDate[dStr] = (countsByDate[dStr] || 0) + 1;
    }
  }

  const heatmap: ConsistencyHeatmapDay[] = [];
  const now = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dStr = toLocalDateString(d);
    const count = countsByDate[dStr] || 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count >= 4) level = 4;
    else if (count >= 3) level = 3;
    else if (count >= 2) level = 2;
    else if (count >= 1) level = 1;

    heatmap.push({
      date: dStr,
      day: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      count,
      level
    });
  }

  return heatmap;
}
