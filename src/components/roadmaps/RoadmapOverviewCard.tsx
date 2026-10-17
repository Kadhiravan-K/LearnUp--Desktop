'use client';

import React from 'react';
import type { RoadmapTrack } from '@/lib/types';
import styles from './RoadmapOverviewCard.module.css';

export interface RoadmapOverviewCardProps {
  track: RoadmapTrack;
  onAddStepClick: () => void;
  onLinkCourseClick: () => void;
  onReorderClick?: () => void;
  onShareClick?: () => void;
}

export function RoadmapOverviewCard({
  track,
  onAddStepClick,
  onLinkCourseClick,
  onReorderClick,
  onShareClick
}: RoadmapOverviewCardProps) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (track.mastery_percentage / 100) * circumference;

  return (
    <div className={styles.card}>
      <div className={styles.leftSection}>
        <div className={styles.metaRow}>
          <span className={styles.productionBadge}>{track.status_badge}</span>
          <span className={styles.authorText}>👤 {track.author}</span>
          <span className={styles.bulletDot}>•</span>
          <span className={styles.timeText}>{track.last_updated}</span>
        </div>

        <h2 className={styles.title}>{track.title}</h2>
        <p className={styles.description}>{track.description}</p>

        <div className={styles.statsRow}>
          <div className={styles.statChip}>
            <span className={styles.statIcon}>🗺️</span>
            <span><strong>{track.total_nodes_count}</strong> Curriculum Nodes</span>
          </div>

          <div className={styles.statChip}>
            <span className={styles.statIcon}>📚</span>
            <span><strong>{track.linked_courses_count}</strong> Linked Courses</span>
          </div>

          <div className={styles.statChip}>
            <span className={styles.statIcon}>⏱️</span>
            <span><strong>{track.total_hours_logged}</strong> Total Hours Logged</span>
          </div>
        </div>
      </div>

      <div className={styles.middleSection}>
        <div className={styles.masteryRingContainer}>
          <svg width="84" height="84" className={styles.ringSvg}>
            <circle
              cx="42"
              cy="42"
              r={radius}
              className={styles.ringBackground}
              strokeWidth="7"
            />
            <circle
              cx="42"
              cy="42"
              r={radius}
              className={styles.ringProgress}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className={styles.ringText}>
            <span className={styles.ringPercent}>{track.mastery_percentage}%</span>
            <span className={styles.ringLabel}>MASTERED</span>
          </div>
        </div>

        <div className={styles.pipelineInfo}>
          <span className={styles.pipelineState}>Pipeline State <strong>{track.pipeline_state}</strong></span>
          <span className={styles.pipelineUpcoming}>
            {track.total_nodes_count - track.completed_nodes_count} milestones upcoming
          </span>
        </div>
      </div>

      <div className={styles.rightActions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onAddStepClick}
        >
          <span>➕</span>
          <span>Add Step</span>
        </button>

        <button
          type="button"
          className={styles.actionBtn}
          onClick={onLinkCourseClick}
        >
          <span>🔗</span>
          <span>Link Course</span>
        </button>

        <button
          type="button"
          className={styles.actionBtn}
          onClick={onReorderClick}
        >
          <span>🔀</span>
          <span>Reorder</span>
        </button>

        <button
          type="button"
          className={styles.actionBtn}
          onClick={onShareClick}
        >
          <span>📤</span>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
