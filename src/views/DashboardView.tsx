import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MetricSummaryCard } from '@/components/dashboard/MetricSummaryCard';
import { ContinueLearningCard } from '@/components/dashboard/ContinueLearningCard';
import { FocusEngineWidget } from '@/components/dashboard/FocusEngineWidget';
import { StreakWidget } from '@/components/dashboard/StreakWidget';
import { AIAssistantWidget } from '@/components/dashboard/AIAssistantWidget';
import { LearningActivityCard } from '@/components/dashboard/LearningActivityCard';
import { formatPercentage } from '@/lib/utils/formatPercentage';
import {
  UserProfile,
  LearningItem,
  DurableProgress,
  FocusSession,
  DurableNote,
  DurableBookmark,
  computeWeeklyStudyMinutes,
  computeStudyActivityTimeline,
} from '@/core';
import styles from './DashboardPage.module.css';

interface DashboardViewProps {
  activeProfile: UserProfile | null;
  learningItems: LearningItem[];
  progressList: DurableProgress[];
  focusSessions: FocusSession[];
  notes: DurableNote[];
  bookmarks: DurableBookmark[];
  roadmapCompleted: Record<string, string[]>;
  onOpenImport: () => void;
  onOpenNotes: () => void;
  onResumeLecture: () => void;
  onSelectVideo: (videoId: string) => void;
}

export function DashboardView({
  activeProfile,
  learningItems,
  progressList,
  focusSessions,
  notes,
  bookmarks,
  roadmapCompleted,
  onOpenImport,
  onOpenNotes,
  onResumeLecture,
  onSelectVideo,
}: DashboardViewProps) {
  const router = useRouter();

  // Dynamic greeting based on hour
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const userName = activeProfile?.name || 'Learner';

  // Progress metrics calculation
  const totalItems = learningItems.length;
  const completedItems = progressList.filter((p) => p.isCompleted).length;
  const inProgressItems = progressList.filter((p) => !p.isCompleted && (p.positionSeconds || 0) > 0).length;

  const totalFocusMinutes = Math.round(
    focusSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60
  );
  const totalWatchMinutes = Math.round(
    progressList.reduce((acc, p) => acc + (p.positionSeconds || 0), 0) / 60
  );
  const totalStudyMinutes = totalFocusMinutes + totalWatchMinutes;
  const totalHours = (totalStudyMinutes / 60).toFixed(1);

  // Today study minutes
  const todayStr = new Date().toISOString().split('T')[0];
  const todayFocus = Math.round(
    focusSessions
      .filter((s) => (s.createdAt || '').startsWith(todayStr))
      .reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60
  );
  const todayWatch = Math.round(
    progressList
      .filter((p) => (p.updatedAt || '').startsWith(todayStr))
      .reduce((acc, p) => acc + (p.positionSeconds || 0), 0) / 60
  );
  const todayMinutes = todayFocus + todayWatch;
  const timeTodayStr = todayMinutes >= 60
    ? `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`
    : `${todayMinutes}m`;

  // Streak
  const activeStreak = useMemo(() => {
    if (focusSessions.length === 0 && progressList.length === 0) return 0;
    const dates = new Set<string>();
    focusSessions.forEach((s) => s.createdAt && dates.add(s.createdAt.split('T')[0]));
    progressList.forEach((p) => p.updatedAt && dates.add(p.updatedAt.split('T')[0]));
    return Math.min(dates.size, 7);
  }, [focusSessions, progressList]);

  // Derived weekly study minutes (7-day timeline)
  const weeklyStudyMinutes = useMemo(() => {
    return computeWeeklyStudyMinutes(progressList, focusSessions, 7);
  }, [progressList, focusSessions]);

  // Derived offline study activity timeline
  const studyActivityTimeline = useMemo(() => {
    return computeStudyActivityTimeline(
      {
        learningItems,
        progressList,
        focusSessions,
        notes,
        bookmarks,
        roadmapCompleted,
      },
      25
    );
  }, [learningItems, progressList, focusSessions, notes, bookmarks, roadmapCompleted]);

  // Sort items for continue learning
  const sortedItems = useMemo(() => {
    return [...learningItems].sort((a, b) => {
      const pA = progressList.find((p) => p.youtubeVideoId === a.sourceId);
      const pB = progressList.find((p) => p.youtubeVideoId === b.sourceId);
      const posA = pA?.positionSeconds || 0;
      const posB = pB?.positionSeconds || 0;
      return posB - posA;
    });
  }, [learningItems, progressList]);

  const topItems = sortedItems.slice(0, 2);
  const secondaryItems = sortedItems.slice(2, 6);

  return (
    <div className={styles.container}>
      {/* Welcome & Quick Action Header */}
      <header className={styles.welcomeSection}>
        <div className={styles.welcomeLeft}>
          <div className={styles.headingRow}>
            <h1 className={styles.heading}>{greeting}, {userName}</h1>
            <span className={styles.modePill}>
              <span className={styles.modeDot} />
              LearnUp &bull; DEEP WORK MODE
            </span>
          </div>
          <p className={styles.subheading}>
            {totalItems > 0
              ? `Continue building your skills. ${Math.max(1, Math.min(6, Math.floor(todayMinutes / 25)))} focus blocks planned for today.`
              : 'Welcome to your focused study sanctuary. Import your first YouTube course or video to start tracking.'}
          </p>
        </div>

        <div className={styles.welcomeActions}>
          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={onOpenImport}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Import from YouTube</span>
          </button>

          <button
            type="button"
            className={styles.quickNotesBtn}
            onClick={onOpenNotes}
          >
            <span>📑</span>
            <span>Quick Notes</span>
          </button>

          {sortedItems.length > 0 && (
            <button
              type="button"
              className={styles.resumeSessionBtn}
              onClick={onResumeLecture}
            >
              <span>⚡</span>
              <span>Resume Session</span>
            </button>
          )}
        </div>
      </header>

      {/* Top 4 Stat Metric Summary Cards */}
      <section className={styles.metricsGrid} aria-label="Learning Overview Metrics">
        <MetricSummaryCard
          label="LEARNING TIME TODAY"
          value={timeTodayStr}
          delta={Number(totalHours) > 0 ? `${totalHours}h all-time` : 'Start first session'}
          variant="primary"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />

        <MetricSummaryCard
          label="CURRENT STREAK"
          value={`${activeStreak} Days`}
          subtext={`Personal best: ${Math.max(activeStreak, 7)}d • ${activeStreak > 0 ? 'Active' : 'Get started'}`}
          variant="streak"
          showDayPills={true}
          icon={
            <span role="img" aria-label="fire" style={{ fontSize: '16px' }}>🔥</span>
          }
        />

        <MetricSummaryCard
          label="COURSES IN PROGRESS"
          value={`${inProgressItems} Active`}
          subtext={
            <span>
              <strong>{totalItems} enrolled</strong> &bull; {completedItems} completed
            </span>
          }
          variant="warning"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          }
        />

        <MetricSummaryCard
          label="COURSES COMPLETED"
          value={`${completedItems} Courses`}
          subtext={<span style={{ color: '#16A34A', fontWeight: 600 }}>{completedItems > 0 ? '✓ Completed mastery' : 'Ready to start'}</span>}
          variant="success"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </section>

      {/* Main 2-Column Dashboard Layout */}
      <div className={styles.mainLayout}>
        {/* Left 2/3: Continue Learning & Analytics */}
        <div className={styles.leftColumn}>
          {/* Continue Learning Section */}
          <section className={styles.section} aria-labelledby="continue-learning-heading">
            <div className={styles.sectionHeader}>
              <h2 id="continue-learning-heading" className={styles.sectionTitle}>
                <span className={styles.titleBullet} />
                Continue Learning
              </h2>
              {totalItems > 0 && (
                <button
                  type="button"
                  onClick={() => router.push('/library')}
                  className={styles.viewAllLink}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                >
                  View all {totalItems} courses &rarr;
                </button>
              )}
            </div>

            {totalItems > 0 ? (
              <div className={styles.cardsGrid}>
                {/* Top 2 Primary Cards */}
                {topItems.map((item) => {
                  const p = progressList.find((prog) => prog.youtubeVideoId === item.sourceId);
                  const pct = p && p.durationSeconds && p.durationSeconds > 0
                    ? Math.min(100, Math.round((p.positionSeconds / p.durationSeconds) * 100))
                    : p?.isCompleted ? 100 : 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectVideo(item.sourceId)}
                      style={{ cursor: 'pointer' }}
                    >
                      <ContinueLearningCard
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
                      />
                    </div>
                  );
                })}

                {/* Secondary Courses Compact Rows */}
                {secondaryItems.map((item) => {
                  const p = progressList.find((prog) => prog.youtubeVideoId === item.sourceId);
                  const pct = p && p.durationSeconds && p.durationSeconds > 0
                    ? Math.min(100, Math.round((p.positionSeconds / p.durationSeconds) * 100))
                    : p?.isCompleted ? 100 : 0;
                  const formattedPct = formatPercentage(pct);

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectVideo(item.sourceId)}
                      className={styles.compactCourseRow}
                      role="button"
                      tabIndex={0}
                      aria-label={`Continue ${item.title}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.compactLeft}>
                        <div className={styles.compactIconBox}>&lt;&gt;</div>
                        <div className={styles.compactInfo}>
                          <div className={styles.compactTitleRow}>
                            <span className={styles.compactTitle}>{item.title}</span>
                            <span className={styles.compactPctBadge}>{formattedPct}%</span>
                          </div>
                          <span className={styles.compactMeta}>
                            {item.sourceType === 'playlist' ? 'Course Playlist' : 'Video Lecture'} &bull; {pct > 0 ? `${formattedPct}% complete` : 'Not started'}
                          </span>
                        </div>
                      </div>

                      <div className={styles.compactRight}>
                        <div className={styles.compactProgressTrack}>
                          <div className={styles.compactProgressFill} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className={styles.compactChevron}>&rarr;</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Zero-State Interactive Card inside Continue Learning */
              <div className={styles.zeroStateCard}>
                <div className={styles.zeroStateIconBox}>📺</div>
                <h3 className={styles.zeroStateTitle}>Start Your First Learning Stream</h3>
                <p className={styles.zeroStateDesc}>
                  Import any YouTube course playlist or educational video to start tracking study sessions, chapter checkpoints, and interactive notes.
                </p>
                <div className={styles.zeroStateActions}>
                  <button
                    type="button"
                    className={styles.primaryActionBtn}
                    onClick={onOpenImport}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Import from YouTube</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/library')}
                    className={styles.quickNotesBtn}
                  >
                    Explore Library
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Bottom Analytics Row: Weekly Study Activity & Offline Activity Timeline */}
          <div className={styles.bottomAnalyticsRow}>
            {/* Weekly Study Activity Chart */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: 'var(--sf-color-card-bg)', border: '1px solid var(--sf-color-card-border)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--sf-color-text-primary)' }}>Weekly Study Activity</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--sf-color-text-secondary)', background: 'var(--sf-color-surface-hover)', padding: '2px 8px', borderRadius: '4px' }}>Last 7 Days</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', alignItems: 'flex-end', height: '110px', paddingTop: '10px' }}>
                  {weeklyStudyMinutes.map((day) => {
                    const maxMins = Math.max(...weeklyStudyMinutes.map((d) => d.totalMinutes), 60);
                    const heightPct = Math.min(100, Math.max(12, Math.round((day.totalMinutes / maxMins) * 100)));
                    return (
                      <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <div
                          style={{
                            width: '100%',
                            height: `${heightPct}%`,
                            background: day.totalMinutes > 0 ? 'var(--sf-color-primary)' : 'var(--sf-color-surface-hover)',
                            borderRadius: '4px',
                            transition: 'height 0.3s ease',
                          }}
                          title={`${day.date}: ${day.totalMinutes} min`}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--sf-color-text-secondary)', marginTop: '6px' }}>{day.dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Offline Study Activity Timeline */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: 'var(--sf-color-card-bg)', border: '1px solid var(--sf-color-card-border)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--sf-color-text-primary)' }}>Offline Study Activity Timeline</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--sf-color-text-secondary)', background: 'var(--sf-color-surface-hover)', padding: '2px 8px', borderRadius: '4px' }}>
                    {studyActivityTimeline.length} events
                  </span>
                </div>
                <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {studyActivityTimeline.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--sf-color-text-secondary)', padding: '1rem', textAlign: 'center' }}>
                      No study sessions logged yet today.
                    </div>
                  ) : (
                    studyActivityTimeline.slice(0, 5).map((evt) => (
                      <div key={evt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '4px 0', borderBottom: '1px solid var(--sf-color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span>{evt.type === 'video_progress' ? '📺' : evt.type === 'focus_session' ? '⏱️' : evt.type === 'note_created' ? '📝' : '🎯'}</span>
                          <span style={{ color: 'var(--sf-color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.title}</span>
                        </div>
                        <span style={{ color: 'var(--sf-color-text-secondary)', fontSize: '0.75rem', flexShrink: 0, marginLeft: '8px' }}>
                          {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1/3: Focus Engine, Study Streak, and AI Assistant */}
        <aside className={styles.rightColumn} aria-label="Dashboard Side Panels">
          <FocusEngineWidget />
          <StreakWidget
            currentStreak={activeStreak}
            allTimeBest={Math.max(activeStreak, 7)}
            totalStudyDays={activeStreak}
          />
          <AIAssistantWidget />
        </aside>
      </div>
    </div>
  );
}
