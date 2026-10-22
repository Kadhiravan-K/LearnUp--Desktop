export type LearningItemType = 'video' | 'playlist';
export type LearningItemStatus = 'importing' | 'ready' | 'failed';

export interface LearningItem {
  id: string;
  user_id: string;
  type: LearningItemType;
  youtube_video_id: string | null;
  youtube_playlist_id: string | null;
  source_url: string;
  normalized_source_key: string;
  title: string;
  description?: string | null;
  skill_domain?: string | null;
  tags?: string[];
  author?: string | null;
  total_duration_seconds?: number;
  thumbnail_url: string | null;
  status: LearningItemStatus;
  created_at: string;
  updated_at: string;
  itemCount?: number;
  videosJson?: string;
}

export interface LearningItemVideo {
  id: string;
  learning_item_id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  source_position: number;
  duration_seconds?: number;
  duration_formatted?: string;
  created_at: string;
}

export interface LearningItemWithVideos extends LearningItem {
  videos?: LearningItemVideo[];
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
  isTruncatedRss?: boolean;
  warningNotice?: string;
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

export interface ParsedYouTubeUrl {
  type: LearningItemType;
  id: string;
  canonicalUrl: string;
  normalizedSourceKey: string;
}

export interface YouTubeVideoMetadata {
  id: string;
  title: string;
  thumbnailUrl: string | null;
}

export interface YouTubePlaylistItem {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  sourcePosition: number;
  isAccessible: boolean;
}

export interface YouTubePlaylistMetadata {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  items: YouTubePlaylistItem[];
  isTruncatedRss?: boolean;
  warningNotice?: string;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export interface VideoProgress {
  user_id: string;
  youtube_video_id: string;
  position_seconds: number;
  duration_seconds: number | null;
  is_completed: boolean;
  updated_at: string;
}
export interface LibraryProgress {
  learning_item_id: string;
  is_completed: boolean;
  progress_percentage: number;
}

export interface Note {
  id: string;
  user_id: string;
  learning_item_id: string;
  youtube_video_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  learning_item_id: string;
  youtube_video_id: string;
  position_seconds: number;
  label: string;
  created_at: string;
}

export type ThemeMode = 'light' | 'dark';


export type AccentColor = 'indigo' | 'violet' | 'cobalt' | 'orange' | 'cyan' | 'emerald' | 'rose' | 'amber';
export type PlayerLayout = 'technical_workstation' | 'cinema_mode';

// Bin & Recycle Retention Architecture
export type BinItemType = 'course' | 'note' | 'bookmark' | 'roadmap';
export type BinRetentionUnit = 'days' | 'weeks' | 'months' | 'years';

export interface BinItem {
  id: string;
  itemType: BinItemType;
  title: string;
  details?: string;
  data: any;
  deletedAt: string;
  expiresAt: string;
}

export interface BinSettings {
  retentionValue: number;
  retentionUnit: BinRetentionUnit;
}

// Pomodoro Cycle Configuration
export interface PomodoroCycleConfig {
  focusDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  intervalsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartSprints: boolean;
}

// Community & LearnUp Templates
export type TemplateCategory = 'roadmap' | 'playlist' | 'focus' | 'workflow';
export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface RoadmapTemplateNode {
  node_number: string;
  title: string;
  description: string;
  tags?: string[];
}

export interface RoadmapTemplatePayload {
  type: 'roadmap';
  title: string;
  description: string;
  category?: string;
  nodes: RoadmapTemplateNode[];
}

export interface PlaylistTemplatePayload {
  type: 'playlist';
  title: string;
  description: string;
  sampleVideoUrl?: string;
  url?: string;
}

export interface FocusTemplatePayload {
  type: 'focus';
  title: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  soundscape?: string;
}

export interface CommunityTemplate {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  author: string;
  tags: string[];
  downloadsCount: number;
  rating: number;
  previewItemsCount: number;
  estimatedDuration: string;
  difficulty?: TemplateDifficulty;
  isCurated?: boolean;
  verifiedSource?: string;
  prerequisites?: string[];
  learningOutcomes?: string[];
  version?: string;
  data: RoadmapTemplatePayload | PlaylistTemplatePayload | FocusTemplatePayload | any;
}

export interface UserSettings {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  student_id: string;
  theme_mode: ThemeMode;
  accent_color: AccentColor;
  default_sprint_duration: number;
  short_break_duration: number;
  long_break_duration: number;
  acoustic_cue_profile: string;
  auto_start_breaks: boolean;
  auto_start_next_sprint: boolean;
  ambient_soundscape: boolean;
  compact_hud_timer: boolean;
  auto_mark_video_completed: boolean;
  default_player_layout: PlayerLayout;
  streak_threshold_minutes: number;
  spaced_repetition_algorithm: string;
  ai_provider: string;
  ai_model: string;
  encrypted_api_key: string | null;
  context_window: number;
  temperature: number;
  notify_focus_completion: boolean;
  notify_milestone_celebration: boolean;
  notify_streak_reminder: boolean;
  notify_quiz_prompts: boolean;
  notify_weekly_digest: boolean;
  created_at: string;
  updated_at: string;
}

export type UpdateUserSettingsInput = Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>;

export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'> = {
  username: '',
  display_name: 'Learner',
  avatar_url: null,
  student_id: 'SF-9021',
  theme_mode: 'light',
  accent_color: 'indigo',
  default_sprint_duration: 25,
  short_break_duration: 5,
  long_break_duration: 15,
  acoustic_cue_profile: 'binaural_chime',
  auto_start_breaks: true,
  auto_start_next_sprint: false,
  ambient_soundscape: true,
  compact_hud_timer: true,
  auto_mark_video_completed: true,
  default_player_layout: 'technical_workstation',
  streak_threshold_minutes: 30,
  spaced_repetition_algorithm: 'leitner',
  ai_provider: 'anthropic',
  ai_model: 'claude-3-5-sonnet-20241022',
  encrypted_api_key: null,
  context_window: 200000,
  temperature: 0.20,
  notify_focus_completion: true,
  notify_milestone_celebration: true,
  notify_streak_reminder: true,
  notify_quiz_prompts: true,
  notify_weekly_digest: false
};

// Connectors Architecture
export type ConnectorType = 'obsidian' | 'github' | 'google_calendar' | 'notion' | 'local_fs';
export type ConnectorStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

export interface UserConnector {
  id: string;
  user_id: string;
  connector_type: ConnectorType;
  is_enabled: boolean;
  config: Record<string, any>;
  status: ConnectorStatus;
  error_message?: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectorSyncResult {
  connectorType: ConnectorType;
  success: boolean;
  syncedCount: number;
  message: string;
  syncedAt: string;
  details?: Record<string, any>;
}

// Plugins & AI Skills Architecture
export type PluginCategory =
  | 'engineering'
  | 'coding_vibe'
  | 'api_data'
  | 'design_creative'
  | 'learning_science'
  | 'productivity'
  | 'ai_skills'
  | 'integrations';

export type PluginKind = 'plugin' | 'skill';

export interface LearnUpPlugin {
  id: string;
  name: string;
  description: string;
  category: PluginCategory;
  kind?: PluginKind;
  version: string;
  author: string;
  isCore: boolean;
  isDefaultEnabled: boolean;
  icon: string;
  capabilities: string[];
}

export interface UserPlugin {
  id: string;
  user_id: string;
  plugin_id: string;
  is_enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Token Usage & Monetization / Ledger
export interface TokenUsageRecord {
  id: string;
  user_id: string;
  provider: 'anthropic' | 'openai' | 'google' | 'ollama' | 'local';
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  feature_context?: string;
  operation?: string;
  created_at: string;
}

export interface TokenUsageSummary {
  totalTokens: number;
  totalCostUsd: number;
  totalRequests: number;
  providerBreakdown: Array<{
    provider: string;
    tokens: number;
    costUsd: number;
    percentage: number;
  }>;
  monthlyBudgetUsd: number;
  budgetUsedPercentage: number;
}

// Model Context Protocol (MCP) Types
export interface McpToolParameter {
  type: string;
  description?: string;
  properties?: Record<string, { type: string; description?: string }>;
  required?: string[];
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: McpToolParameter;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// Focus Sanctuary & Precision Timer Types
export type FocusMode = 'sprint' | 'deep_block' | 'flow_state' | 'short_break' | 'long_break' | 'custom';
export type SoundscapeProfile =
  | 'binaural_40hz'
  | 'binaural_10hz_alpha'
  | 'rain'
  | 'pink_noise'
  | 'lofi'
  | 'custom_audio'
  | 'silent';

export interface FocusSession {
  id: string;
  user_id: string;
  learning_item_id?: string | null;
  youtube_video_id?: string | null;
  duration_seconds: number;
  mode: FocusMode;
  interval_number: number;
  soundscape: SoundscapeProfile;
  completed: boolean;
  created_at: string;
}

export interface FocusStats {
  todayFocusMinutes: number;
  todayMinutes?: number;
  dailyGoalMinutes: number;
  morningMinutes: number;
  currentMinutes: number;
  targetMinutes: number;
  goalPercentage: number;
  currentInterval: number;
  totalIntervals: number;
  nextBreakType: 'short_break' | 'long_break';
  intervalsCompletedList: boolean[];
  monthlySprints: number;
  activeStreakDays: number;
  heatmapWeek: Array<{ day: string; active: boolean; intensity: number }>;
  peakSprintsPerDay: number;
  flowRetentionRate: number;
}

// Learning Roadmaps & Progression Types
export type NodeStatus = 'completed' | 'active' | 'in_progress' | 'locked' | 'capstone';

export interface AttachedCourseData {
  id: string;
  title: string;
  provider?: string;
  total_lectures?: number;
  completed_lectures?: number;
  progress_percentage: number;
  next_chapter?: string;
  runtime_formatted?: string;
}

export interface RoadmapNode {
  id: string;
  roadmap_id: string;
  node_number: string;
  title: string;
  description: string;
  status: NodeStatus;
  progress_percentage: number;
  hours_logged: number;
  tags: string[];
  prerequisite_node_id?: string | null;
  prerequisite_label?: string | null;
  suggested_course_title?: string | null;
  attached_course?: AttachedCourseData | null;
}

export interface RoadmapTrack {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status_badge: string;
  author: string;
  last_updated: string;
  total_nodes_count: number;
  completed_nodes_count: number;
  active_nodes_count: number;
  mastery_percentage: number;
  pipeline_state: string;
  linked_courses_count: number;
  total_hours_logged: number;
  estimated_completion_date: string;
  pacing_status: string;
  nodes: RoadmapNode[];
}

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceInput {
  name: string;
  icon?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  icon?: string;
}

export * from './calendar';





