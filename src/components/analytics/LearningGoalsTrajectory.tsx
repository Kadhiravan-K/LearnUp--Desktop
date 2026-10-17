'use client';

import React from 'react';
import { Button } from '@/components/ui/Button/Button';
import styles from './LearningGoalsTrajectory.module.css';

export interface LearningGoalsTrajectoryProps {
  totalHours?: number;
  totalCourses?: number;
  completedCourses?: number;
  totalSprints?: number;
  totalLectures?: number;
}

export function LearningGoalsTrajectory({
  totalHours = 0,
  totalCourses = 0,
  completedCourses = 0,
  totalSprints = 0,
  totalLectures = 0
}: LearningGoalsTrajectoryProps) {
  const goals = [
    {
      category: 'COURSE COMPLETION',
      tagClass: styles.categoryTag,
      icon: (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Active Curriculum Mastery',
      desc: 'Complete all enrolled library courses',
      current: `${completedCourses} / ${Math.max(1, totalCourses)} Courses`,
      percent: `${totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0}%`,
      percentValue: totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0,
      footerLeft: 'Self-Paced',
      footerRight: completedCourses >= totalCourses && totalCourses > 0 ? 'Goal Completed' : 'In Progress'
    },
    {
      category: 'FOCUS SPRINT TARGET',
      tagClass: styles.categoryTagFocus,
      icon: (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      title: '100 Focus Sessions Milestone',
      desc: 'Complete 100 high-focus study sprints',
      current: `${totalSprints} / 100 Sprints`,
      percent: `${Math.min(100, Math.round((totalSprints / 100) * 100))}%`,
      percentValue: Math.min(100, Math.round((totalSprints / 100) * 100)),
      footerLeft: 'Milestone 1',
      footerRight: `${Math.max(0, 100 - totalSprints)} sprints remaining`
    },
    {
      category: 'STUDY TIME BENCHMARK',
      tagClass: styles.categoryTagTime,
      icon: (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Accumulate 100 Study Hours',
      desc: 'Dedicated deep intellectual work',
      current: `${totalHours} / 100.0 hrs`,
      percent: `${Math.min(100, Math.round((totalHours / 100) * 100))}%`,
      percentValue: Math.min(100, Math.round((totalHours / 100) * 100)),
      footerLeft: 'Pacing Benchmark',
      footerRight: `${Math.max(0, Number((100 - totalHours).toFixed(1)))}h to target`
    },
    {
      category: 'LECTURE PROGRESS',
      tagClass: styles.categoryTagVideo,
      icon: (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
      title: 'Watch 50 Core Lessons',
      desc: 'Core syllabus learning progress',
      current: `${totalLectures} / 50 Lessons`,
      percent: `${Math.min(100, Math.round((totalLectures / 50) * 100))}%`,
      percentValue: Math.min(100, Math.round((totalLectures / 50) * 100)),
      footerLeft: 'Syllabus Journey',
      footerRight: totalLectures >= 50 ? 'Target Reached' : `${Math.max(0, 50 - totalLectures)} lessons left`
    }
  ];

  return (
    <section className={styles.section} aria-labelledby="goals-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 id="goals-heading" className={styles.title}>
            <span>🏁</span>
            <span>Active Learning Goals &amp; Pacing Trajectory</span>
          </h3>
          <p className={styles.subtitle}>Sprint milestones calibrated against personal performance velocity</p>
        </div>
      </div>

      <div className={styles.goalsGrid}>
        {goals.map((g, idx) => (
          <article key={idx} className={styles.goalCard}>
            <div className={styles.cardTop}>
              <span className={g.tagClass}>{g.category}</span>
              <div className={styles.goalIcon}>{g.icon}</div>
            </div>

            <div className={styles.cardBody}>
              <h4 className={styles.goalTitle}>{g.title}</h4>
              <p className={styles.goalDesc}>{g.desc}</p>
            </div>

            <div className={styles.progressNumbers}>
              <span>{g.current}</span>
              <span className={styles.percentSpan}>{g.percent}</span>
            </div>

            <div className={styles.progressBarContainer} role="progressbar" aria-valuenow={g.percentValue} aria-valuemin={0} aria-valuemax={100}>
              <div className={`${styles.progressFill} ${g.percentValue > 80 ? styles.progressFillGreen : ''}`} style={{ width: `${g.percentValue}%` }} />
            </div>

            <div className={styles.cardFooter}>
              <span>{g.footerLeft}</span>
              <span className={styles.footerHighlight}>{g.footerRight}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

