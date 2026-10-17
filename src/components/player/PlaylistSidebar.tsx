import React from 'react';
import Image from 'next/image';
import type { LearningItemVideo } from '@/lib/types';
import styles from './PlaylistSidebar.module.css';

export interface PlaylistSidebarProps {
  videos: LearningItemVideo[];
  activeVideoId: string | null;
  onVideoSelect: (videoId: string) => void;
  completedVideoIds?: Set<string>;
}

export function PlaylistSidebar({ videos, activeVideoId, onVideoSelect, completedVideoIds = new Set() }: PlaylistSidebarProps) {
  const sortedVideos = [...videos].sort((a, b) => a.source_position - b.source_position);

  if (sortedVideos.length === 0) {
    return (
      <div className={styles.sidebar}>
        <div className={styles.header}>Playlist contents</div>
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--sf-color-text-secondary)' }}>
          No videos found in this playlist.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        Playlist contents ({sortedVideos.length})
      </div>
      <ul className={styles.list}>
        {sortedVideos.map((video, index) => {
          const isActive = video.youtube_video_id === activeVideoId;
          const isCompleted = completedVideoIds.has(video.youtube_video_id);
          
          return (
            <li key={video.id} className={styles.itemWrapper}>
              <button
                type="button"
                className={`${styles.itemButton} ${isActive ? styles.active : ''}`}
                onClick={() => onVideoSelect(video.youtube_video_id)}
                aria-pressed={isActive}
                aria-label={`Select video ${index + 1}: ${video.title} ${isCompleted ? '(Completed)' : ''}`}
              >
                <div className={styles.thumbnailWrapper}>
                  {video.thumbnail_url && (
                    <Image
                      src={video.thumbnail_url}
                      alt="" 
                      fill
                      className={styles.thumbnail}
                      sizes="120px"
                    />
                  )}
                  <span className={styles.index}>{index + 1}</span>
                  {isCompleted && (
                    <div className={styles.completedBadge} title="Completed">
                      ✓
                    </div>
                  )}
                </div>
                <div className={styles.details}>
                  <h4 className={styles.title} title={video.title}>{video.title}</h4>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
