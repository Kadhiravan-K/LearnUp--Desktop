// Production-Ready Calendar System Types (SF-057)

export type CalendarSource = 'local' | 'google' | 'outlook' | 'apple' | 'custom';

export interface Calendar {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  color: string;
  is_visible: boolean;
  is_default: boolean;
  source: CalendarSource;
  provider_calendar_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type RecurrenceFrequency =
  | 'DAILY'
  | 'WEEKDAYS'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'YEARLY'
  | 'CUSTOM';

export interface RecurrenceRule {
  freq: RecurrenceFrequency;
  interval?: number;
  byDay?: string[]; // e.g. ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  until?: string; // ISO date or date-time
  count?: number;
  exceptions?: string[]; // ISO dates to skip
}

export interface CalendarEventReminder {
  type: 'notification' | 'email' | 'audio_cue';
  minutes_before: number;
}

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled' | 'completed';

export interface CalendarEvent {
  id: string;
  user_id: string;
  calendar_id?: string | null;
  category_id?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  notes?: string | null;
  start_at: string; // ISO UTC string
  end_at: string;   // ISO UTC string
  timezone: string; // IANA string e.g. 'America/New_York', 'Asia/Kolkata', 'UTC'
  all_day: boolean;
  color_override?: string | null;
  learning_item_id?: string | null;
  youtube_video_id?: string | null;
  recurrence_rule?: RecurrenceRule | null;
  recurrence_parent_id?: string | null;
  reminders?: CalendarEventReminder[];
  status: EventStatus;
  is_study_session: boolean;
  planned_duration_minutes?: number | null;
  actual_duration_seconds: number;
  sync_id?: string | null;
  etag?: string | null;
  created_at: string;
  updated_at: string;

  // Joined / UI enriched fields
  calendar?: Calendar;
  category?: CalendarCategory;
  learning_item?: {
    id: string;
    title: string;
    thumbnail_url?: string | null;
    type?: 'video' | 'playlist';
  } | null;
  is_recurring_instance?: boolean;
  original_start_at?: string;
}

export type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda' | 'schedule';

export interface CalendarStudySession {
  id: string;
  user_id: string;
  event_id: string;
  learning_item_id?: string | null;
  planned_duration_seconds: number;
  actual_duration_seconds: number;
  started_at: string;
  ended_at?: string | null;
  paused_seconds: number;
  created_at: string;
}

export interface CalendarSyncState {
  id: string;
  user_id: string;
  provider: string;
  sync_token?: string | null;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCalendarInput {
  name: string;
  description?: string | null;
  color?: string;
  is_visible?: boolean;
  is_default?: boolean;
  source?: CalendarSource;
  provider_calendar_id?: string | null;
}

export interface UpdateCalendarInput {
  name?: string;
  description?: string | null;
  color?: string;
  is_visible?: boolean;
  is_default?: boolean;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
  is_default?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  is_default?: boolean;
}

export interface CreateCalendarEventInput {
  calendar_id?: string | null;
  category_id?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  notes?: string | null;
  start_at: string;
  end_at: string;
  timezone?: string;
  all_day?: boolean;
  color_override?: string | null;
  learning_item_id?: string | null;
  youtube_video_id?: string | null;
  recurrence_rule?: RecurrenceRule | null;
  reminders?: CalendarEventReminder[];
  status?: EventStatus;
  is_study_session?: boolean;
  planned_duration_minutes?: number | null;
}

export interface UpdateCalendarEventInput extends Partial<CreateCalendarEventInput> {
  actual_duration_seconds?: number;
  sync_id?: string | null;
  etag?: string | null;
}
