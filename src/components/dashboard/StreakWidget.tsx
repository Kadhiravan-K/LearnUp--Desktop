'use client';

import React from 'react';
import styles from './StreakWidget.module.css';

export interface StreakWidgetProps {
  currentStreak?: number;
  allTimeBest?: number;
  totalStudyDays?: number;
  referenceDate?: Date | string;
  weekStartsOn?: 'monday' | 'sunday';
  activeDates?: string[];
}

export interface DayStreakItem {
  label: string;
  dateStr: string;
  isToday: boolean;
  isFuture: boolean;
  completed: boolean;
  fullDayName: string;
}

/**
 * Calculates deterministic weekly streak days based on local calendar dates.
 * Exported for deterministic unit testing across timezones.
 */
export function getWeeklyStreakDays(
  currentStreak: number,
  referenceDateInput: Date | string = new Date(),
  weekStartsOn: 'monday' | 'sunday' = 'monday',
  activeDatesInput?: string[]
): DayStreakItem[] {
  const refDate = typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : referenceDateInput;
  const activeSet = activeDatesInput ? new Set(activeDatesInput) : null;

  const dayNames = weekStartsOn === 'monday'
    ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const jsDay = refDate.getDay();
  const todayIdx = weekStartsOn === 'monday'
    ? (jsDay + 6) % 7
    : jsDay;

  const startOfWeek = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - todayIdx);

  return dayNames.map((label, idx) => {
    const isToday = idx === todayIdx;
    const isFuture = idx > todayIdx;

    const cellDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + idx);
    const y = cellDate.getFullYear();
    const m = String(cellDate.getMonth() + 1).padStart(2, '0');
    const d = String(cellDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    let completed = false;
    if (activeSet && activeSet.size > 0) {
      completed = activeSet.has(dateStr);
    } else if (!isFuture && currentStreak > 0) {
      const daysFromToday = todayIdx - idx;
      completed = currentStreak > daysFromToday;
    }

    const dayNameFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
    const fullDayName = dayNameFormatter.format(cellDate);

    return {
      label,
      dateStr,
      isToday,
      isFuture,
      completed,
      fullDayName
    };
  });
}

export function StreakWidget({
  currentStreak = 0,
  allTimeBest = 0,
  totalStudyDays = 0,
  referenceDate,
  weekStartsOn = 'monday',
  activeDates
}: StreakWidgetProps) {
  const days = getWeeklyStreakDays(currentStreak, referenceDate || new Date(), weekStartsOn, activeDates);

  return (
    <section className={styles.widget} aria-label="Study Streak Progress">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span role="img" aria-label="flame">🔥</span>
          <h3 className={styles.title}>{currentStreak}-Day Study Streak</h3>
        </div>
        <span className={styles.topBadge}>{currentStreak > 0 ? 'Active' : 'Get Started'}</span>
      </div>

      <div className={styles.daysRow} role="group" aria-label="Weekly streak days">
        {days.map((day, idx) => {
          const title = day.isToday
            ? `Today (${day.fullDayName}) - ${day.completed ? 'Active streak' : 'No study logged yet'}`
            : day.isFuture
            ? `${day.fullDayName} - Upcoming`
            : day.completed
            ? `${day.fullDayName} - Completed`
            : `${day.fullDayName} - Incomplete`;

          return (
            <div key={`${day.dateStr}-${idx}`} className={styles.dayItem}>
              <div
                className={`${styles.dayCircle} ${
                  day.isToday && day.completed
                    ? styles.dayActive
                    : day.completed
                    ? styles.dayCompleted
                    : styles.dayIncomplete
                }`}
                title={title}
                aria-label={title}
              >
                {day.isToday && day.completed ? (
                  <span>🔥</span>
                ) : day.completed ? (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  day.label
                )}
              </div>
              <span className={styles.dayLabel}>
                {day.isToday ? 'Today' : day.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.statsRow}>
        <span>Total study days: <strong className={styles.statHighlight}>{totalStudyDays} days</strong></span>
        <span>All-time best: <strong className={styles.statHighlight}>{allTimeBest}d</strong></span>
      </div>

      <div className={styles.levelCard}>
        <div className={styles.levelHeader}>
          <span>🏆 Study Cadence Mastery</span>
          <span>{currentStreak} / 10 days</span>
        </div>
        <div className={styles.levelProgress} role="progressbar" aria-valuenow={Math.min(100, currentStreak * 10)} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.levelProgressFill} style={{ width: `${Math.min(100, currentStreak * 10)}%` }} />
        </div>
      </div>
    </section>
  );
}
