'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { LearningItem, LibraryProgress } from '@/lib/types';
import { Card } from '@/components/ui/Card/Card';
import { formatPercentage } from '@/lib/utils/formatPercentage';
import styles from './LibraryCard.module.css';

export interface LibraryCardProps {
  item: LearningItem & { progress?: LibraryProgress };
  onEdit?: (item: LearningItem) => void;
  onDelete?: (item: LearningItem) => void;
}

export function LibraryCard({ item, onEdit, onDelete }: LibraryCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const href = `/library/${item.id}`;
  const pct = item.progress?.progress_percentage || 0;
  const formattedPct = formatPercentage(pct);
  const isCompleted = item.progress?.is_completed || false;
  const isInProgress = pct > 0 && !isCompleted;

  const statusLabel = isCompleted
    ? 'Completed'
    : isInProgress
    ? `${formattedPct}% Completed`
    : 'Not started';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onEdit) {
      onEdit(item);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onDelete) {
      onDelete(item);
    }
  };

  // Format total duration
  const totalHrs = item.total_duration_seconds ? Math.floor(item.total_duration_seconds / 3600) : 0;
  const totalMins = item.total_duration_seconds ? Math.floor((item.total_duration_seconds % 3600) / 60) : 0;
  const durationStr = totalHrs > 0 ? `${totalHrs}h ${totalMins}m` : totalMins > 0 ? `${totalMins}m` : null;

  return (
    <div className={styles.cardOuterWrapper}>
      <Link href={href} className={styles.linkWrapper} aria-label={`${item.title} (${item.type})`}>
        <Card hoverable className={styles.card}>
          <div className={styles.thumbnailContainer}>
            {item.thumbnail_url ? (
              <Image
                src={item.thumbnail_url}
                alt=""
                fill
                className={styles.thumbnail}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className={styles.fallbackThumbnail}>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} opacity={0.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <span className={styles.badge}>
              {item.type === 'playlist' ? 'Playlist' : 'Video'}
            </span>

            {isCompleted && (
              <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>
                <span className={styles.completedText}>✓ Completed 100%</span>
              </span>
            )}

            {isInProgress && !isCompleted && (
              <span className={`${styles.statusBadge} ${styles.statusInProgress}`}>
                ● In Progress · {formattedPct}%
              </span>
            )}

            {!isCompleted && pct === 0 && (
              <span className={`${styles.statusBadge} ${styles.statusNotStarted}`}>
                Not Started
              </span>
            )}

            {pct > 0 && (
              <div
                className={styles.progressBarContainer}
                role="progressbar"
                aria-valuenow={isCompleted ? 100 : pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.title} learning progress: ${statusLabel}`}
              >
                <div
                  className={`${styles.progressBarFill} ${isCompleted ? styles.progressBarFillCompleted : ''}`}
                  style={{ width: `${isCompleted ? 100 : Math.min(pct, 100)}%` }}
                />
              </div>
            )}
          </div>

          <div className={styles.content}>
            {/* Skill domain category tag */}
            {item.skill_domain && (
              <div className={styles.categoryTag}>{item.skill_domain.toUpperCase()}</div>
            )}

            <div className={styles.titleRow}>
              <h3 className={styles.title} title={item.title}>
                {item.title}
              </h3>
            </div>

            {/* Description snippet */}
            {item.description && (
              <p className={styles.description}>{item.description}</p>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className={styles.tagRow}>
                {item.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className={styles.tagPill}>#{tag}</span>
                ))}
              </div>
            )}

            {/* Progress stats row */}
            <div className={styles.statsRow}>
              <span className={styles.statsText}>{formattedPct}% completed</span>
              {durationStr && (
                <span className={styles.statsText}>{durationStr} total</span>
              )}
            </div>

            {/* CTA row */}
            <div className={styles.ctaRow}>
              <span className={`${styles.ctaBtn} ${isCompleted ? styles.ctaBtnCompleted : isInProgress ? '' : styles.ctaBtnStart}`}>
                {isCompleted ? '↺ Review Course' : isInProgress ? '▶ Continue Course' : '▶ Start Course'}
              </span>
              <span className={styles.metaDate}>{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </Card>
      </Link>

      {/* 3-Dot Options Action Button & Dropdown */}
      <div className={styles.moreOptionsContainer} ref={menuRef}>
        <button
          type="button"
          className={`${styles.moreOptionsBtn} ${isMenuOpen ? styles.moreOptionsBtnActive : ''}`}
          onClick={handleMenuClick}
          aria-label={`Options for ${item.title}`}
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
          title="More options"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {isMenuOpen && (
          <div className={styles.optionsDropdown} role="menu">
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={handleEditClick}
            >
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit {item.type === 'playlist' ? 'Playlist' : 'Course'}</span>
            </button>

            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              role="menuitem"
              onClick={handleDeleteClick}
            >
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete from Library</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
