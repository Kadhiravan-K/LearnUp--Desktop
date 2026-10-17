/**
 * LearnUp Shared Core — Progress & Analytics Calculator
 * Computes learner analytics, completion stats, and study totals from local data.
 */

import {
  DurableBookmark,
  DurableNote,
  DurableProgress,
  FocusSession,
  LearningItem,
  UserAnalyticsSummary,
  DailyStudyMinutes,
  StudyActivityEvent,
} from '../types';
import { calculateStreaks, generateConsistencyHeatmap, toLocalDateString } from './streaks';

export function computeAnalyticsSummary(
  learningItems: LearningItem[],
  progressList: DurableProgress[],
  focusSessions: FocusSession[],
  notes: DurableNote[]
): UserAnalyticsSummary {
  // 1. Total watched seconds from video progress
  const videoSeconds = progressList.reduce((acc, r) => acc + (r.positionSeconds || 0), 0);
  const videoMinutes = Math.round(videoSeconds / 60);

  // 2. Focus session minutes
  const completedFocus = focusSessions.filter((s) => s.completed);
  const focusSeconds = completedFocus.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const focusMinutes = Math.round(focusSeconds / 60);

  const totalMinutes = videoMinutes + focusMinutes;
  const totalHours = Number((totalMinutes / 60).toFixed(1));

  // 3. Activity timestamps collection
  const activityTimestamps: string[] = [];
  progressList.forEach((r) => {
    if (r.updatedAt) activityTimestamps.push(r.updatedAt);
  });
  focusSessions.forEach((s) => {
    if (s.createdAt) activityTimestamps.push(s.createdAt);
  });
  notes.forEach((n) => {
    if (n.createdAt) activityTimestamps.push(n.createdAt);
  });

  const streakStats = calculateStreaks(activityTimestamps);
  const consistencyHeatmap = generateConsistencyHeatmap(activityTimestamps, 365);

  const activeDaysCount = streakStats.allActivityDates.length;
  const dailyAverageMinutes = activeDaysCount > 0 ? Math.round(totalMinutes / activeDaysCount) : 0;

  const totalCoursesCount = learningItems.length;
  const completedCoursesCount = progressList.filter((p) => p.isCompleted).length;
  const inProgressCoursesCount = progressList.filter(
    (p) => (p.positionSeconds || 0) > 0 && !p.isCompleted
  ).length;

  return {
    totalHours,
    totalMinutes,
    dailyAverageMinutes,
    activeStreakDays: streakStats.activeStreakDays,
    longestStreakDays: streakStats.longestStreakDays,
    completedCoursesCount,
    inProgressCoursesCount,
    totalCoursesCount,
    totalLecturesWatched: progressList.length,
    totalFocusSessions: completedFocus.length,
    consistencyHeatmap
  };
}

export function computeWeeklyStudyMinutes(
  progressList: DurableProgress[],
  focusSessions: FocusSession[],
  daysCount: number = 7
): DailyStudyMinutes[] {
  const result: DailyStudyMinutes[] = [];
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = toLocalDateString(d);
    const dayOfWeek = d.getDay();
    const dayLabel = i === 0 ? 'Today' : (dayNames[dayOfWeek] || '');

    // Focus session minutes on this day
    const focusMins = focusSessions
      .filter((s) => s.completed && toLocalDateString(s.createdAt) === dateStr)
      .reduce((acc, s) => acc + Math.round((s.durationSeconds || 0) / 60), 0);

    // Video progress minutes on this day
    const videoMins = progressList
      .filter((p) => toLocalDateString(p.updatedAt) === dateStr)
      .reduce((acc, p) => acc + Math.round((p.positionSeconds || 0) / 60), 0);

    result.push({
      date: dateStr,
      dayLabel,
      videoMinutes: videoMins,
      focusMinutes: focusMins,
      totalMinutes: videoMins + focusMins,
    });
  }

  return result;
}

export interface StudyActivityTimelineInput {
  learningItems: LearningItem[];
  progressList: DurableProgress[];
  focusSessions: FocusSession[];
  notes: DurableNote[];
  bookmarks?: DurableBookmark[];
  roadmapCompleted?: Record<string, string[]>;
}

export function computeStudyActivityTimeline(
  input: StudyActivityTimelineInput,
  limit: number = 50
): StudyActivityEvent[] {
  const events: StudyActivityEvent[] = [];
  const courseMap = new Map<string, string>();
  for (const item of input.learningItems) {
    courseMap.set(item.sourceId, item.title);
  }

  // 1. Focus Sessions
  for (const session of input.focusSessions) {
    if (!session.completed) continue;
    const mins = Math.round((session.durationSeconds || 0) / 60);
    events.push({
      id: `act_${session.id}`,
      type: 'focus_session',
      title: 'Focus Sprint Completed',
      detail: `Completed ${mins} min ${session.mode} sprint in Focus Sanctuary`,
      timestamp: session.createdAt,
      icon: '🧘',
      sourceId: session.id,
    });
  }

  // 2. Video Progress & Completions
  for (const prog of input.progressList) {
    if (prog.isDeleted) continue;
    const title = courseMap.get(prog.youtubeVideoId) || `Video ${prog.youtubeVideoId}`;
    const mins = Math.floor(prog.positionSeconds / 60);
    const secs = Math.round(prog.positionSeconds % 60);

    if (prog.isCompleted) {
      events.push({
        id: `act_comp_${prog.id}`,
        type: 'course_completed',
        title: 'Course Completed',
        detail: `Finished course "${title}" (${mins}m watched)`,
        timestamp: prog.updatedAt || prog.createdAt,
        icon: '🏆',
        sourceId: prog.youtubeVideoId,
      });
    } else if (prog.positionSeconds > 0) {
      events.push({
        id: `act_prog_${prog.id}`,
        type: 'video_progress',
        title: 'Video Lecture Studied',
        detail: `Progressed in "${title}" to ${mins}m ${secs}s`,
        timestamp: prog.updatedAt || prog.createdAt,
        icon: '▶️',
        sourceId: prog.youtubeVideoId,
      });
    }
  }

  // 3. Notes Created / Saved
  for (const note of input.notes) {
    if (note.isDeleted) continue;
    const title = note.title?.trim() || 'Study Note';
    const preview = note.content.trim().slice(0, 80);
    events.push({
      id: `act_${note.id}`,
      type: 'note_created',
      title: `Saved: ${title}`,
      detail: preview.length > 0 ? (preview + (note.content.length > 80 ? '...' : '')) : 'Quick note captured',
      timestamp: note.createdAt,
      icon: '📝',
      sourceId: note.id,
    });
  }

  // 4. Bookmarks Created
  if (input.bookmarks) {
    for (const bm of input.bookmarks) {
      if (bm.isDeleted) continue;
      const mins = Math.floor(bm.positionSeconds / 60);
      const secs = (Math.round(bm.positionSeconds % 60)).toString().padStart(2, '0');
      events.push({
        id: `act_${bm.id}`,
        type: 'bookmark_created',
        title: `Bookmark: ${bm.label}`,
        detail: `Timestamp bookmark saved at ${mins}:${secs}`,
        timestamp: bm.createdAt,
        icon: '🔖',
        sourceId: bm.id,
      });
    }
  }

  // Sort descending by timestamp (newest first)
  events.sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
  });

  return events.slice(0, limit);
}
