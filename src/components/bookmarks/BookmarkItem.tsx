'use client';

import React, { useState } from 'react';
import { Bookmark } from '@/lib/types';
import { formatTimestamp } from '@/lib/utils/time';
import styles from './BookmarkItem.module.css';

export interface BookmarkItemProps {
  bookmark: Bookmark;
  onSeek: (positionSeconds: number) => void;
  onDelete: (bookmarkId: string) => Promise<boolean>;
}

export function BookmarkItem({ bookmark, onSeek, onDelete }: BookmarkItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(bookmark.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedTime = formatTimestamp(bookmark.position_seconds);
  const displayLabel = bookmark.label || `Bookmark at ${formattedTime}`;

  return (
    <div className={styles.item} role="listitem">
      <div className={styles.contentGroup}>
        <button
          type="button"
          className={styles.timestampButton}
          onClick={() => onSeek(bookmark.position_seconds)}
          aria-label={`Seek video to ${formattedTime}`}
          title={`Jump to ${formattedTime}`}
        >
          <svg className={styles.playIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>{formattedTime}</span>
        </button>

        <div className={styles.labelWrapper}>
          <span className={styles.label} title={displayLabel}>
            {displayLabel}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.deleteButton}
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Delete bookmark at ${formattedTime}`}
          title="Delete bookmark"
        >
          <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
