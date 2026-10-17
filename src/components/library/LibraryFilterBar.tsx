'use client';

import React from 'react';
import type { LibraryItemWithProgress } from '@/lib/hooks/useLibrary';
import styles from './LibraryFilterBar.module.css';

export type LibraryStatusFilter = 'all' | 'in_progress' | 'completed' | 'not_started';

export interface LibraryFilterCounts {
  all: number;
  in_progress: number;
  completed: number;
  not_started: number;
}

export interface LibraryFilterBarProps {
  activeFilter: LibraryStatusFilter;
  onFilterChange: (filter: LibraryStatusFilter) => void;
  counts: LibraryFilterCounts;
}

export function isItemCompleted(item: LibraryItemWithProgress): boolean {
  return item.progress?.is_completed === true || (item.progress?.progress_percentage ?? 0) >= 100;
}

export function isItemInProgress(item: LibraryItemWithProgress): boolean {
  const pct = item.progress?.progress_percentage ?? 0;
  return pct > 0 && !isItemCompleted(item);
}

export function isItemNotStarted(item: LibraryItemWithProgress): boolean {
  return (item.progress?.progress_percentage ?? 0) === 0 && !isItemCompleted(item);
}

export function filterLibraryItems(
  items: LibraryItemWithProgress[],
  filter: LibraryStatusFilter
): LibraryItemWithProgress[] {
  if (filter === 'completed') {
    return items.filter(isItemCompleted);
  }
  if (filter === 'in_progress') {
    return items.filter(isItemInProgress);
  }
  if (filter === 'not_started') {
    return items.filter(isItemNotStarted);
  }
  return items;
}

export function getLibraryFilterCounts(items: LibraryItemWithProgress[]): LibraryFilterCounts {
  let inProgressCount = 0;
  let completedCount = 0;
  let notStartedCount = 0;

  for (const item of items) {
    if (isItemCompleted(item)) {
      completedCount++;
    } else if (isItemInProgress(item)) {
      inProgressCount++;
    } else {
      notStartedCount++;
    }
  }

  return {
    all: items.length,
    in_progress: inProgressCount,
    completed: completedCount,
    not_started: notStartedCount,
  };
}

export function LibraryFilterBar({
  activeFilter,
  onFilterChange,
  counts,
}: LibraryFilterBarProps) {
  const filters: { id: LibraryStatusFilter; label: string; count: number }[] = [
    { id: 'all', label: `All (${counts.all})`, count: counts.all },
    { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { id: 'completed', label: 'Completed', count: counts.completed },
    { id: 'not_started', label: 'Not Started', count: counts.not_started },
  ];

  return (
    <div className={styles.filterBarContainer} role="toolbar" aria-label="Library Status Filters">
      <div className={styles.segmentedControl} role="tablist" aria-label="Filter courses by learning status">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              id={`filter-tab-${filter.id}`}
              aria-selected={isActive}
              aria-controls="library-grid-region"
              tabIndex={isActive ? 0 : -1}
              className={`${styles.filterButton} ${isActive ? styles.active : ''}`}
              onClick={() => onFilterChange(filter.id)}
            >
              <span className={styles.filterLabel}>{filter.label}</span>
              <span className={`${styles.badge} ${isActive ? styles.badgeActive : ''}`}>
                {filter.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
