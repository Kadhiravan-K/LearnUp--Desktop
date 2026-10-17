'use client';

import React from 'react';
import type { RoadmapTrack } from '@/lib/types';
import styles from './TrackOrchestrationCard.module.css';

export interface TrackOrchestrationCardProps {
  track: RoadmapTrack;
  onArchiveClick?: () => void;
  onChangelogClick?: () => void;
}

export function TrackOrchestrationCard({
  track,
  onArchiveClick,
  onChangelogClick
}: TrackOrchestrationCardProps) {
  const completedNodes = track.nodes.filter((n) => n.status === 'completed').length;
  const activeNodes = track.nodes.filter((n) => n.status === 'active' || n.status === 'in_progress').length;
  const upcomingNodes = track.nodes.filter((n) => n.status === 'locked' || n.status === 'capstone').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>TRACK ORCHESTRATION</h4>
        <span className={styles.editableBadge}>Editable Track</span>
      </div>

      <div className={styles.metricsList}>
        <div className={styles.metricRow}>
          <span className={styles.metricIconDone}>✓</span>
          <span className={styles.metricLabel}>Completed Milestones</span>
          <span className={styles.metricValue}><strong>{completedNodes}</strong> Nodes</span>
        </div>

        <div className={styles.metricRow}>
          <span className={styles.metricIconActive}>⚡</span>
          <span className={styles.metricLabel}>Active Working Nodes</span>
          <span className={styles.metricValue}><strong>{activeNodes}</strong> Nodes</span>
        </div>

        <div className={styles.metricRow}>
          <span className={styles.metricIconUpcoming}>🔒</span>
          <span className={styles.metricLabel}>Sequenced / Upcoming</span>
          <span className={styles.metricValue}><strong>{upcomingNodes}</strong> Nodes</span>
        </div>
      </div>

      {/* Completion Forecast Box */}
      <div className={styles.forecastBox}>
        <div className={styles.forecastHeader}>
          <span className={styles.forecastLabel}>Estimated Track Completion</span>
          <span className={styles.forecastDate}>{track.estimated_completion_date}</span>
        </div>

        <p className={styles.forecastDesc}>
          Based on your steady cadence of 8.5 study hours per week across active courses.
        </p>

        <div className={styles.pacingRow}>
          <span className={styles.pacingIcon}>📈</span>
          <span className={styles.pacingText}>{track.pacing_status}</span>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.footerBtn}
          onClick={onChangelogClick}
        >
          <span>🔄</span>
          <span>Changelog &amp; Versions</span>
        </button>

        <button
          type="button"
          className={styles.footerBtn}
          onClick={onArchiveClick}
        >
          <span>🗄️</span>
          <span>Archive Track</span>
        </button>
      </div>
    </div>
  );
}
