import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { LibraryCard } from '@/components/library/LibraryCard';
import {
  LibraryFilterBar,
  LibraryStatusFilter,
} from '@/components/library/LibraryFilterBar';
import { LearningItem, DurableProgress } from '@/core';
import styles from './LibraryPage.module.css';

interface LibraryViewProps {
  items: LearningItem[];
  progressList: DurableProgress[];
  warningMessage?: string | null;
  onOpenImport: () => void;
  onSelectVideo: (videoId: string) => void;
  onEditCourse: (item: LearningItem) => void;
  onDeleteCourse: (item: LearningItem) => void;
}

export function LibraryView({
  items,
  progressList,
  warningMessage,
  onOpenImport,
  onSelectVideo,
  onEditCourse,
  onDeleteCourse,
}: LibraryViewProps) {
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    let inProgress = 0;
    let completed = 0;
    let notStarted = 0;

    items.forEach((item) => {
      const p = progressList.find((prog) => prog.youtubeVideoId === item.sourceId);
      if (p?.isCompleted) {
        completed++;
      } else if (p && p.positionSeconds > 0) {
        inProgress++;
      } else {
        notStarted++;
      }
    });

    return {
      all: items.length,
      in_progress: inProgress,
      completed,
      not_started: notStarted,
    };
  }, [items, progressList]);

  // Filter items based on active status filter and search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      const p = progressList.find((prog) => prog.youtubeVideoId === item.sourceId);
      if (statusFilter === 'completed' && !p?.isCompleted) return false;
      if (statusFilter === 'in_progress' && (p?.isCompleted || !p || p.positionSeconds === 0)) return false;
      if (statusFilter === 'not_started' && p && (p.isCompleted || p.positionSeconds > 0)) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchAuthor = (item.channelTitle || '').toLowerCase().includes(q);
        const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchAuthor && !matchTags) return false;
      }

      return true;
    });
  }, [items, progressList, statusFilter, searchQuery]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>My Courses</h1>
          <p className={styles.subtitle}>
            Organize, track, and resume your imported YouTube courses, playlists, and videos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={onOpenImport}>
            + Add Course
          </Button>
        </div>
      </header>

      {warningMessage && (
        <div style={{ background: 'var(--sf-color-warning-bg)', border: '1px solid var(--sf-color-warning-border)', color: 'var(--sf-color-warning-text)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
          ⚠️ {warningMessage}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Your course library is empty"
          description="Start building your private curriculum by importing a YouTube video or playlist."
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
          action={
            <Button onClick={onOpenImport}>
              + Add Your First Course
            </Button>
          }
        />
      ) : (
        <div className={styles.contentSection}>
          <div className={styles.toolbar}>
            <LibraryFilterBar
              activeFilter={statusFilter}
              onFilterChange={setStatusFilter}
              counts={filterCounts}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                placeholder="Search courses or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--sf-color-border)',
                  background: 'var(--sf-color-surface)',
                  color: 'var(--sf-color-text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          <div id="library-grid-region" role="region" aria-label="Learning Items Grid">
            {filteredItems.length === 0 ? (
              <EmptyState
                title={
                  statusFilter === 'completed'
                    ? 'No completed items yet'
                    : statusFilter === 'not_started'
                    ? 'No unstarted items'
                    : statusFilter === 'in_progress'
                    ? 'No items in progress'
                    : 'No matching courses found'
                }
                description="Try clearing your search query or choosing another status tab."
                action={
                  <Button variant="secondary" onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}>
                    Show All Items ({items.length})
                  </Button>
                }
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {filteredItems.map((item) => {
                  const p = progressList.find((prog) => prog.youtubeVideoId === item.sourceId);
                  const pct = p && p.durationSeconds && p.durationSeconds > 0
                    ? Math.min(100, Math.round((p.positionSeconds / p.durationSeconds) * 100))
                    : p?.isCompleted ? 100 : 0;

                  return (
                    <div key={item.id} style={{ position: 'relative' }}>
                      <LibraryCard
                        item={{
                          id: item.id,
                          user_id: item.userId,
                          type: item.sourceType === 'playlist' ? 'playlist' : 'video',
                          youtube_video_id: item.sourceId,
                          youtube_playlist_id: null,
                          source_url: `https://www.youtube.com/watch?v=${item.sourceId}`,
                          normalized_source_key: item.sourceId,
                          title: item.title,
                          description: item.description || null,
                          author: item.channelTitle || 'YouTube Creator',
                          thumbnail_url: item.thumbnailUrl,
                          status: 'ready',
                          created_at: item.createdAt,
                          updated_at: item.updatedAt,
                          progress: {
                            is_completed: p?.isCompleted || false,
                            progress_percentage: pct,
                            last_position_seconds: p?.positionSeconds || 0,
                          } as any,
                        }}
                        onEdit={() => onEditCourse(item)}
                        onDelete={() => onDeleteCourse(item)}
                      />
                      {/* Play Video CTA Button for real user workflow & tests */}
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-play-video"
                          onClick={() => onSelectVideo(item.sourceId)}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            background: 'var(--sf-color-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                          }}
                        >
                          Play Video
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
