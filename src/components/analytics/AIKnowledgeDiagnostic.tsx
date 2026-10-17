'use client';

import React from 'react';
import styles from './AIKnowledgeDiagnostic.module.css';

export interface AIKnowledgeDiagnosticProps {
  totalCourses?: number;
  totalHours?: number;
}

export function AIKnowledgeDiagnostic({ totalCourses = 0, totalHours = 0 }: AIKnowledgeDiagnosticProps) {
  const hasData = totalCourses > 0 || totalHours > 0;

  return (
    <section className={styles.section} aria-labelledby="diagnostic-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 id="diagnostic-heading" className={styles.title}>
            <span>⚡</span>
            <span>AI Knowledge Diagnostic &amp; Retention Vulnerabilities</span>
          </h3>
          <p className={styles.subtitle}>
            Synthesized from video comprehension timestamps, focus notes, and active recall sessions.
          </p>
        </div>

        {hasData && (
          <button type="button" className={styles.reviseButton}>
            <span>⚡</span>
            <span>Revise Weak Topics (Adaptive Drill Deck)</span>
          </button>
        )}
      </div>

      {!hasData ? (
        <div style={{ padding: 'var(--sf-space-8) var(--sf-space-4)', textAlign: 'center', backgroundColor: 'var(--sf-color-surface)', borderRadius: 'var(--sf-radius-xl)', border: '1px solid var(--sf-color-border)' }}>
          <p style={{ margin: 0, color: 'var(--sf-color-text-tertiary)', fontSize: 'var(--sf-text-sm)' }}>
            No knowledge diagnostic telemetry yet. As you watch lessons and complete focus sprints, AI diagnostics will pinpoint topics needing retention reinforcement.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.cardsGrid}>
            {/* Card 1: Stable */}
            <article className={styles.diagnosticCard}>
              <div className={styles.cardTop}>
                <span className={styles.badgeStable}>STABLE RETENTION</span>
                <span className={styles.trendGreen}>+8% (7d)</span>
              </div>

              <h4 className={styles.cardTitle}>Core Foundations &amp; Conceptual Models</h4>

              <div className={styles.scoreRow}>
                <span className={styles.scoreVal}>85%</span>
                <span className={styles.scoreStatus}>Proficient</span>
              </div>

              <p className={styles.desc}>
                Foundational principles and introductory terminology retention is solid.
              </p>

              <div className={styles.progressContainer}>
                <div className={styles.progGreen} style={{ width: '85%' }} />
              </div>
            </article>

            {/* Card 2: Attention Needed */}
            <article className={styles.diagnosticCard}>
              <div className={styles.cardTop}>
                <span className={styles.badgeAttention}>ATTENTION NEEDED</span>
                <span role="img" aria-label="warning">⚠️</span>
              </div>

              <h4 className={styles.cardTitle}>Applied Synthesis &amp; Case Studies</h4>

              <div className={styles.scoreRow}>
                <span className={styles.scoreVal}>64%</span>
                <span className={styles.scoreStatus}>Moderate Risk</span>
              </div>

              <p className={styles.desc}>
                Practical applications and cross-concept synthesis require active recall drills.
              </p>

              <div className={styles.progressContainer}>
                <div className={styles.progOrange} style={{ width: '64%' }} />
              </div>
            </article>

            {/* Card 3: Minor Gaps */}
            <article className={styles.diagnosticCard}>
              <div className={styles.cardTop}>
                <span className={styles.badgeMinor}>MINOR GAPS</span>
                <span role="img" aria-label="info">ℹ️</span>
              </div>

              <h4 className={styles.cardTitle}>Structured Definitions &amp; Taxonomy</h4>

              <div className={styles.scoreRow}>
                <span className={styles.scoreVal}>76%</span>
                <span className={styles.scoreStatus}>Competent</span>
              </div>

              <p className={styles.desc}>
                Standard domain terminology and categorized definitions recall is stable.
              </p>

              <div className={styles.progressContainer}>
                <div className={styles.progPurple} style={{ width: '76%' }} />
              </div>
            </article>

            {/* Card 4: Urgent */}
            <article className={`${styles.diagnosticCard} ${styles.diagnosticCardUrgent}`}>
              <div className={styles.cardTop}>
                <span className={styles.badgeUrgent}>REVIEW SUGGESTED ⚠️</span>
                <span style={{ fontSize: '10px', color: '#DC2626', fontWeight: 600 }}>Decay Risk</span>
              </div>

              <h4 className={styles.cardTitle}>Advanced Methods &amp; Problem Solving</h4>

              <div className={styles.scoreRow}>
                <span className={`${styles.scoreVal} ${styles.scoreValRed}`}>48%</span>
                <span className={styles.scoreStatus}>Review Needed</span>
              </div>

              <p className={styles.desc}>
                Spaced repetition model indicates potential memory decay for recent complex lessons.
              </p>

              <div className={styles.progressContainer}>
                <div className={styles.progRed} style={{ width: '48%' }} />
              </div>

              <div className={styles.actionButtonsRow}>
                <button type="button" className={styles.microDrillBtn}>
                  Micro Drill Deck
                </button>
              </div>
            </article>
          </div>

          {/* Recommendation Bottom Bar */}
          <div className={styles.recommendationCard}>
            <div className={styles.recLeft}>
              <div className={styles.recIcon}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className={styles.recContent}>
                <span className={styles.recTitle}>Strategic Remediation Recommendation</span>
                <span className={styles.recText}>
                  Dedicate a 25-minute focus session to your latest notes to reinforce long-term memory retention.
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

