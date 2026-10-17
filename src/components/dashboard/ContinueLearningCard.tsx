import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { LearningItem, LibraryProgress } from '@/lib/types';
import { formatPercentage } from '@/lib/utils/formatPercentage';
import styles from './ContinueLearningCard.module.css';

export interface ContinueLearningCardProps {
  item: LearningItem & { progress?: LibraryProgress };
}

export function ContinueLearningCard({ item }: ContinueLearningCardProps) {
  const href = `/library/${item.id}`;
  const pct = item.progress?.progress_percentage || 0;
  const formattedPct = formatPercentage(pct);
  const isCompleted = item.progress?.is_completed || false;
  const isInProgress = pct > 0 && !isCompleted;

  // Derive tags from item title
  const tags = item.type === 'playlist'
    ? ['#FullCourse', '#Playlist', '#LearnUp']
    : ['#VideoLecture', '#LearnUp'];

  return (
    <article className={styles.card} aria-labelledby={`card-title-${item.id}`}>
      <div className={styles.thumbnailContainer}>
        {item.thumbnail_url ? (
          <Image
            src={item.thumbnail_url}
            alt=""
            fill
            className={styles.thumbnail}
            sizes="(max-width: 768px) 100vw, 220px"
          />
        ) : (
          <div className={styles.fallbackThumbnail}>No Thumbnail</div>
        )}

        {isCompleted ? (
          <span className={styles.completedBadge}>✓ Completed</span>
        ) : isInProgress ? (
          <span className={styles.dueBadge}>! In Progress</span>
        ) : null}
      </div>

      <div className={styles.content}>
        <div className={styles.metaRow}>
          <span>{item.type === 'playlist' ? 'COURSE PLAYLIST' : 'STUDY VIDEO'}</span>
          <span className={styles.timeAgo}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Active
          </span>
        </div>

        <Link href={href} className={styles.titleLink}>
          <h3 id={`card-title-${item.id}`} className={styles.title} title={item.title}>
            {item.title}
          </h3>
        </Link>

        <div className={styles.tagsRow} aria-label="Tags">
          {tags.map((t, idx) => (
            <span key={idx} className={styles.tag}>{t}</span>
          ))}
        </div>

        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span>{isCompleted ? 'All items finished' : `Progress: ${formattedPct}%`}</span>
            <span className={styles.progressPercent}>{isCompleted ? '100%' : `${formattedPct}% Complete`}</span>
          </div>

          <div
            className={styles.progressBarContainer}
            role="progressbar"
            aria-valuenow={isCompleted ? 100 : pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${item.title} progress: ${formattedPct}%`}
          >
            <div
              className={`${styles.progressBarFill} ${
                isCompleted ? styles.progressBarFillCompleted : ''
              }`}
              style={{ width: `${isCompleted ? 100 : Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        <div className={styles.actionsRow}>
          <Link href={href} className={styles.resumeButton}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>{isCompleted ? 'Review' : 'Resume Lecture'}</span>
          </Link>

          <Link href={href} className={styles.bookmarkPill}>
            <span>🔖</span>
            <span>Study Notes & Bookmarks</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
