'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bookmark } from '@/lib/types';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Alert } from '@/components/ui/Alert/Alert';
import { Button } from '@/components/ui/Button/Button';
import { BookmarkList } from './BookmarkList';
import styles from './BookmarksSection.module.css';

export interface BookmarksSectionProps {
  learningItemId: string;
  youtubeVideoId: string;
  getCurrentTime: () => number;
  onSeek: (positionSeconds: number) => void;
}

export function BookmarksSection({
  learningItemId,
  youtubeVideoId,
  getCurrentTime,
  onSeek
}: BookmarksSectionProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [label, setLabel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    if (!learningItemId || !youtubeVideoId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/bookmarks?learningItemId=${encodeURIComponent(learningItemId)}&youtubeVideoId=${encodeURIComponent(youtubeVideoId)}`
      );
      if (!res.ok) {
        throw new Error('Failed to load bookmarks');
      }
      const json = await res.json();
      setBookmarks(json.data || []);
    } catch {
      setError('Unable to load bookmarks for this video.');
    } finally {
      setIsLoading(false);
    }
  }, [learningItemId, youtubeVideoId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleCreateBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const currentPosition = getCurrentTime();
    const positionSeconds = Math.max(0, Math.floor(currentPosition));

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningItemId,
          youtubeVideoId,
          positionSeconds,
          label: label.trim() || undefined
        })
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || 'Failed to create bookmark');
      }

      const json = await res.json();
      if (json.data) {
        setBookmarks((prev) => {
          const updated = [...prev, json.data];
          return updated.sort((a, b) => a.position_seconds - b.position_seconds || a.created_at.localeCompare(b.created_at));
        });
        setLabel('');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save bookmark.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        return false;
      }

      setBookmarks((prev) => prev.filter((bm) => bm.id !== bookmarkId));
      return true;
    } catch {
      return false;
    }
  };

  return (
    <section className={styles.section} aria-labelledby="bookmarks-heading">
      <div className={styles.header}>
        <h3 id="bookmarks-heading" className={styles.title}>
          Video Bookmarks
          {bookmarks.length > 0 && <span className={styles.countBadge}>{bookmarks.length}</span>}
        </h3>
      </div>

      <form onSubmit={handleCreateBookmark} className={styles.addForm}>
        <input
          type="text"
          className={styles.labelInput}
          placeholder="Bookmark label (optional)..."
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={200}
          aria-label="Bookmark label"
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={isSubmitting}
          aria-label="Bookmark Current Time"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: '6px' }}
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          Bookmark Current Time
        </Button>
      </form>

      {error && (
        <div className={styles.alertWrapper}>
          <Alert variant="error" title="Bookmarks Notice">{error}</Alert>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loadingWrapper} aria-busy="true" aria-label="Loading bookmarks">
          <Spinner size="sm" />
        </div>
      ) : (
        <BookmarkList
          bookmarks={bookmarks}
          onSeek={onSeek}
          onDelete={handleDeleteBookmark}
        />
      )}
    </section>
  );
}
