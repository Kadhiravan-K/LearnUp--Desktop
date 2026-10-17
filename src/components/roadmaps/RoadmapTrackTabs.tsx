'use client';

import React from 'react';
import type { RoadmapTrack } from '@/lib/types';
import styles from './RoadmapTrackTabs.module.css';

export interface RoadmapTrackTabsProps {
  tracks: RoadmapTrack[];
  activeTrackId: string;
  onSelectTrack: (trackId: string) => void;
  onAddCustomTrack: () => void;
}

export function RoadmapTrackTabs({
  tracks,
  activeTrackId,
  onSelectTrack,
  onAddCustomTrack
}: RoadmapTrackTabsProps) {
  const getDotColor = (index: number) => {
    switch (index % 3) {
      case 0:
        return '#10B981'; // Green
      case 1:
        return '#6366F1'; // Indigo
      case 2:
        return '#F59E0B'; // Amber
      default:
        return '#6366F1';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabsRow}>
        {tracks.map((track, idx) => {
          const isActive = track.id === activeTrackId;
          const dotColor = getDotColor(idx);

          return (
            <button
              key={track.id}
              type="button"
              className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
              onClick={() => onSelectTrack(track.id)}
            >
              <span className={styles.statusDot} style={{ backgroundColor: dotColor }} />
              <span className={styles.tabTitle}>{track.title}</span>
              <span className={styles.tabMeta}>
                {track.nodes.length} Steps • {track.mastery_percentage}%
              </span>
              {track.nodes.some((n) => n.status === 'locked') && (
                <span className={styles.lockIcon} title="Contains prerequisite gates">🔒</span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          className={styles.addTrackBtn}
          onClick={onAddCustomTrack}
        >
          <span>➕</span>
          <span>Add Custom Track</span>
        </button>
      </div>
    </div>
  );
}
