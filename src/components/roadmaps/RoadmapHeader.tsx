'use client';

import React from 'react';
import Link from 'next/link';
import styles from './RoadmapHeader.module.css';

export interface RoadmapHeaderProps {
  onCreateClick: () => void;
  onCreateAiClick?: () => void;
  onImportClick?: () => void;
  onSettingsClick?: () => void;
}

export function RoadmapHeader({ onCreateClick, onCreateAiClick, onImportClick, onSettingsClick }: RoadmapHeaderProps) {
  return (
    <div className={styles.container}>
      <div className={styles.breadcrumbBar}>
        <span className={styles.crumbMuted}>Workspace</span>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.crumbMuted}>My Learning</span>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.crumbActive}>Learning Roadmaps</span>
      </div>

      <div className={styles.titleRow}>
        <div className={styles.titleArea}>
          <div className={styles.titleWithBadge}>
            <h1 className={styles.title}>Learning Roadmaps &amp; Progression</h1>
            <span className={styles.activeBadge}>ACTIVE SEQUENCE</span>
          </div>
          <p className={styles.subtitle}>
            Custom, self-directed engineering roadmaps with step-by-step milestone sequencing, deep node mastery, and attached course curricula.
          </p>
        </div>

        <div className={styles.actions}>
          {onCreateAiClick && (
            <button
              type="button"
              className={styles.secondaryBtn}
              style={{
                borderColor: 'var(--accent-brand, #38bdf8)',
                color: 'var(--accent-brand, #38bdf8)',
                background: 'rgba(56, 189, 248, 0.08)',
                fontWeight: 600
              }}
              onClick={onCreateAiClick}
            >
              <span>✨</span>
              <span>Create with AI</span>
            </button>
          )}

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onImportClick}
          >
            <span>📥</span>
            <span>Import Template</span>
          </button>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onSettingsClick}
          >
            <span>⚙️</span>
            <span>Roadmap Settings</span>
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onCreateClick}
          >
            <span>➕</span>
            <span>Create New Roadmap</span>
          </button>
        </div>
      </div>
    </div>
  );
}
