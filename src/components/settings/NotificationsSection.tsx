'use client';

import React from 'react';
import styles from './NotificationsSection.module.css';

export interface NotificationsSectionProps {
  notifyFocusCompletion: boolean;
  notifyMilestoneCelebration: boolean;
  notifyStreakReminder: boolean;
  notifyQuizPrompts: boolean;
  notifyWeeklyDigest: boolean;
  onToggle: (field: string, value: boolean) => void;
}

export function NotificationsSection({
  notifyFocusCompletion,
  notifyMilestoneCelebration,
  notifyStreakReminder,
  notifyQuizPrompts,
  notifyWeeklyDigest,
  onToggle
}: NotificationsSectionProps) {
  return (
    <section id="notifications" className={styles.section} aria-labelledby="notifications-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>🔔</span>
          <h2 id="notifications-heading" className={styles.title}>Notification Signals</h2>
        </div>
        <span className={styles.grantedBadge}>DESKTOP API: GRANTED</span>
      </div>

      <div className={styles.toggleList}>
        {/* Toggle 1 */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Focus session completion chime &amp; desktop banner</span>
            <p className={styles.toggleDesc}>Plays gentle chime when Pomodoro interval concludes.</p>
          </div>
          <button
            type="button"
            className={`${styles.toggleSwitch} ${notifyFocusCompletion ? styles.toggleOn : ''}`}
            onClick={() => onToggle('notify_focus_completion', !notifyFocusCompletion)}
            aria-pressed={notifyFocusCompletion}
          >
            <span className={styles.toggleHandle} />
          </button>
        </div>

        {/* Toggle 2 */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Course &amp; module milestone celebration</span>
            <p className={styles.toggleDesc}>Confetti micro-animation and telemetry logging upon roadmap 100%.</p>
          </div>
          <button
            type="button"
            className={`${styles.toggleSwitch} ${notifyMilestoneCelebration ? styles.toggleOn : ''}`}
            onClick={() => onToggle('notify_milestone_celebration', !notifyMilestoneCelebration)}
            aria-pressed={notifyMilestoneCelebration}
          >
            <span className={styles.toggleHandle} />
          </button>
        </div>

        {/* Toggle 3 */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Daily streak preservation reminders</span>
            <p className={styles.toggleDesc}>Alert dispatched at 20:00 local time if daily threshold is pending.</p>
          </div>
          <button
            type="button"
            className={`${styles.toggleSwitch} ${notifyStreakReminder ? styles.toggleOn : ''}`}
            onClick={() => onToggle('notify_streak_reminder', !notifyStreakReminder)}
            aria-pressed={notifyStreakReminder}
          >
            <span className={styles.toggleHandle} />
          </button>
        </div>

        {/* Toggle 4 */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Quiz performance &amp; weak topic review prompts</span>
            <p className={styles.toggleDesc}>Algorithmic suggestions targeted at flashcards below 60% retention.</p>
          </div>
          <button
            type="button"
            className={`${styles.toggleSwitch} ${notifyQuizPrompts ? styles.toggleOn : ''}`}
            onClick={() => onToggle('notify_quiz_prompts', !notifyQuizPrompts)}
            aria-pressed={notifyQuizPrompts}
          >
            <span className={styles.toggleHandle} />
          </button>
        </div>

        {/* Toggle 5 */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Weekly marketing &amp; product release digest</span>
            <p className={styles.toggleDesc}>Occasional emails regarding new LearnUp runtime features.</p>
          </div>
          <button
            type="button"
            className={`${styles.toggleSwitch} ${notifyWeeklyDigest ? styles.toggleOn : ''}`}
            onClick={() => onToggle('notify_weekly_digest', !notifyWeeklyDigest)}
            aria-pressed={notifyWeeklyDigest}
          >
            <span className={styles.toggleHandle} />
          </button>
        </div>
      </div>
    </section>
  );
}
