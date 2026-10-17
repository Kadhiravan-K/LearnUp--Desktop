/**
 * LearnUp Shared Core — Domain Types and Contracts
 * Reusable across Web, Desktop, and CLI without platform or server dependencies.
 */

// ============================================================================
// 1. Storage & Mutation Contracts
// ============================================================================

export type SyncStatus =
  | 'saved_locally'
  | 'waiting_to_sync'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'failed';

export type MutationOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export type MutationEntity = 'note' | 'bookmark' | 'progress' | 'learning_item';

export type MutationState =
  | 'pending'
  | 'in_flight'
  | 'acknowledged'
  | 'conflict'
  | 'retryable_failure'
  | 'permanent_failure';

export interface DurableRecord {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  syncStatus: SyncStatus;
  isDeleted: boolean;
  tombstoneAt: string | null;
}

export interface DurableNote extends DurableRecord {
  learningItemId: string;
  youtubeVideoId: string;
  content: string;
  title?: string;
}

export interface DurableBookmark extends DurableRecord {
  learningItemId: string;
  youtubeVideoId: string;
  positionSeconds: number;
  label: string;
}

export interface DurableProgress extends DurableRecord {
  youtubeVideoId: string;
  positionSeconds: number;
  durationSeconds: number | null;
  isCompleted: boolean;
  estimatedStudyHours?: number;
  loggedStudyHours?: number;
}

export interface MutationJournalEntry {
  id: string;
  userId: string;
  cloudUserId?: string | null;
  entityType: MutationEntity;
  entityId: string;
  operation: MutationOperation;
  baseVersion: number;
  localVersion: number;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  status: MutationState;
  errorMessage?: string;
  errorCategory?: 'network' | 'conflict' | 'auth' | 'validation' | 'server' | 'unknown';
  lastAttemptAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  color: string;
  initials: string;
  lockType: 'none' | 'pin' | 'password';
  updatedAt: string;
  isGuest: boolean;
  cloudUserId?: string | null;
  cloudUserEmail?: string | null;
  cloudSyncEnabled?: boolean;
}

// ============================================================================
// 2. Learning Library & Video Types
// ============================================================================

export type LearningItemType = 'video' | 'playlist';
export type LearningItemStatus = 'importing' | 'ready' | 'failed';

export interface LearningItem {
  id: string;
  userId: string;
  title: string;
  sourceType: LearningItemType;
  sourceId: string;
  thumbnailUrl: string;
  channelTitle?: string;
  itemCount?: number;
  description?: string | null;
  skillDomain?: string | null;
  tags?: string[];
  totalDurationSeconds?: number;
  status?: LearningItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LearningItemVideo {
  id: string;
  learningItemId: string;
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string | null;
  sourcePosition: number;
  durationSeconds?: number;
  durationFormatted?: string;
  createdAt: string;
}

export interface ParsedYouTubeUrl {
  type: LearningItemType;
  id: string;
  canonicalUrl: string;
  normalizedSourceKey: string;
}

export interface CoursePreviewVideo {
  id: string;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  sourcePosition: number;
  duration: string;
  durationSeconds: number;
  isAccessible: boolean;
  selected?: boolean;
}

export interface CoursePreviewData {
  type: LearningItemType;
  id: string;
  canonicalUrl: string;
  normalizedSourceKey: string;
  title: string;
  description: string;
  author: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  targetTrack: string;
  totalVideos: number;
  totalDurationFormatted: string;
  totalDurationSeconds: number;
  skillDomain: string;
  tags: string[];
  videos: CoursePreviewVideo[];
}

export interface ImportCourseInput {
  url?: string;
  urls?: string[];
  title?: string | null;
  description?: string | null;
  skillDomain?: string | null;
  tags?: string[] | null;
  customThumbnailUrl?: string | null;
  selectedVideoIds?: string[] | null;
}

// ============================================================================
// 3. Notes & Bookmarks Types
// ============================================================================

export interface Note {
  id: string;
  userId: string;
  learningItemId: string;
  youtubeVideoId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  learningItemId: string;
  youtubeVideoId: string;
  positionSeconds: number;
  label: string;
  createdAt: string;
}

// ============================================================================
// 4. Progress, Streaks & Analytics Types
// ============================================================================

export interface VideoProgress {
  userId: string;
  youtubeVideoId: string;
  positionSeconds: number;
  durationSeconds: number | null;
  isCompleted: boolean;
  updatedAt: string;
}

export interface LibraryProgress {
  learningItemId: string;
  isCompleted: boolean;
  progressPercentage: number;
}

export interface StreakStats {
  activeStreakDays: number;
  longestStreakDays: number;
  lastActivityDate: string | null;
  allActivityDates: string[];
}

export interface ConsistencyHeatmapDay {
  date: string;
  day: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface UserAnalyticsSummary {
  totalHours: number;
  totalMinutes: number;
  dailyAverageMinutes: number;
  activeStreakDays: number;
  longestStreakDays: number;
  completedCoursesCount: number;
  inProgressCoursesCount: number;
  totalCoursesCount: number;
  totalLecturesWatched: number;
  totalFocusSessions: number;
  consistencyHeatmap: ConsistencyHeatmapDay[];
}

export type ActivityEventType =
  | 'focus_session'
  | 'video_progress'
  | 'course_completed'
  | 'roadmap_milestone'
  | 'note_created'
  | 'note_edited'
  | 'bookmark_created';

export interface StudyActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  detail: string;
  timestamp: string;
  icon: string;
  sourceId?: string;
}

export interface DailyStudyMinutes {
  date: string;
  dayLabel: string;
  videoMinutes: number;
  focusMinutes: number;
  totalMinutes: number;
}

// ============================================================================
// 5. Focus Session & Pomodoro Types
// ============================================================================

export type FocusMode =
  | 'sprint'
  | 'deep_block'
  | 'flow_state'
  | 'short_break'
  | 'long_break'
  | 'custom';

export type SoundscapeProfile =
  | 'binaural_40hz'
  | 'binaural_10hz_alpha'
  | 'rain'
  | 'pink_noise'
  | 'lofi'
  | 'silent';

export interface PomodoroCycleConfig {
  focusDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  intervalsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartSprints: boolean;
}

export interface FocusSession {
  id: string;
  userId: string;
  learningItemId?: string | null;
  youtubeVideoId?: string | null;
  durationSeconds: number;
  mode: FocusMode;
  intervalNumber: number;
  soundscape: SoundscapeProfile;
  completed: boolean;
  createdAt: string;
}

export interface FocusStats {
  todayFocusMinutes: number;
  todayMinutes?: number;
  dailyGoalMinutes: number;
  currentInterval: number;
  totalIntervals: number;
  nextBreakType: 'short_break' | 'long_break';
  intervalsCompletedList: boolean[];
  monthlySprints: number;
  activeStreakDays: number;
}

// ============================================================================
// 6. Roadmap Models
// ============================================================================

export type NodeStatus = 'completed' | 'active' | 'in_progress' | 'locked' | 'capstone';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface RoadmapNode {
  id: string;
  roadmapId: string;
  nodeNumber: string;
  title: string;
  description: string;
  status: NodeStatus;
  progressPercentage: number;
  hoursLogged: number;
  tags: string[];
  prerequisiteNodeId?: string | null;
  suggestedCourseTitle?: string | null;
}

export interface RoadmapTrack {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  statusBadge: string;
  author: string;
  lastUpdated: string;
  totalNodesCount: number;
  completedNodesCount: number;
  activeNodesCount: number;
  masteryPercentage: number;
  totalHoursLogged: number;
  nodes: RoadmapNode[];
}

// ============================================================================
// 7. Platform & Storage Adapter Contract
// ============================================================================

export interface IStorageAdapter {
  init(): Promise<void>;
  close(): Promise<void>;

  // Profiles
  listProfiles(): Promise<UserProfile[]>;
  saveProfile(profile: UserProfile): Promise<UserProfile>;
  getActiveProfile(): Promise<UserProfile | null>;
  setActiveProfile(profileId: string): Promise<void>;

  // Notes
  getNote(userId: string, noteId: string): Promise<DurableNote | null>;
  listNotes(userId: string, filters?: { learningItemId?: string; youtubeVideoId?: string }): Promise<DurableNote[]>;
  saveNote(note: DurableNote): Promise<DurableNote>;
  markNoteDeleted(userId: string, noteId: string): Promise<void>;

  // Bookmarks
  getBookmark(userId: string, bookmarkId: string): Promise<DurableBookmark | null>;
  listBookmarks(userId: string, filters?: { learningItemId?: string; youtubeVideoId?: string }): Promise<DurableBookmark[]>;
  saveBookmark(bookmark: DurableBookmark): Promise<DurableBookmark>;
  markBookmarkDeleted(userId: string, bookmarkId: string): Promise<void>;

  // Progress
  getProgress(userId: string, youtubeVideoId: string): Promise<DurableProgress | null>;
  listProgress(userId: string): Promise<DurableProgress[]>;
  saveProgress(progress: DurableProgress): Promise<DurableProgress>;

  // Learning Items
  listLearningItems(userId: string): Promise<LearningItem[]>;
  saveLearningItem(item: LearningItem): Promise<LearningItem>;
  deleteLearningItem(userId: string, itemId: string): Promise<void>;

  // Mutation Journal
  appendMutation(mutation: MutationJournalEntry): Promise<MutationJournalEntry>;
  getPendingMutations(userId: string): Promise<MutationJournalEntry[]>;
  updateMutationStatus(mutationId: string, status: MutationState, error?: string): Promise<void>;
  deleteMutation(mutationId: string): Promise<void>;

  // Focus Sessions
  saveFocusSession(session: FocusSession): Promise<FocusSession>;
  listFocusSessions(userId: string): Promise<FocusSession[]>;

  // Roadmap Progress
  toggleRoadmapMilestone(userId: string, roadmapId: string, milestoneId: string, completed: boolean): Promise<void>;
  getRoadmapCompletedMilestones(userId: string, roadmapId: string): Promise<string[]>;

  // Maintenance & Scoping
  purgeAccountData(userId: string): Promise<void>;
  runIntegrityCheck(): Promise<{ ok: boolean; issues: string[] }>;
}
