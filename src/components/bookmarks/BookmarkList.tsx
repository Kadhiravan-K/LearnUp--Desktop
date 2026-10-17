'use client';

import React from 'react';
import { Bookmark } from '@/lib/types';
import { BookmarkItem } from './BookmarkItem';
import styles from './BookmarkList.module.css';

export interface BookmarkListProps {
  bookmarks: Bookmark[];
  onSeek: (positionSeconds: number) => void;
  onDelete: (bookmarkId: string) => Promise<boolean>;
}

export function BookmarkList({ bookmarks, onSeek, onDelete }: BookmarkListProps) {
  if (bookmarks.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>No bookmarks yet for this video. Use the button above to mark timestamps.</p>
      </div>
    );
  }

  return (
    <div className={styles.list} role="list" aria-label="Saved video bookmarks">
      {bookmarks.map((bm) => (
        <BookmarkItem
          key={bm.id}
          bookmark={bm}
          onSeek={onSeek}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
