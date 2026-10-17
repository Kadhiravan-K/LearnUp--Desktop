import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseYouTubeUrl,
  extractMultipleYouTubeUrls,
  MODULE_REGISTRY,
  validateModuleAction,
  ModuleManager,
  calculateStreaks,
  computeAnalyticsSummary,
  computeWeeklyStudyMinutes,
  computeStudyActivityTimeline,
  toLocalDateString,
  parseTimestampsFromText,
  createDurableNoteRecord,
  NotesService,
  curatedRoadmapSchema,
  CURATED_OFFLINE_ROADMAPS,
  validateInput,
  importRequestSchema,
  previewCourseSchema,
  recordFocusSessionSchema,
  DEFAULT_POMODORO_CONFIG,
  getNextModeAfterInterval,
  getDurationForMode,
  AppError
} from '../src/core';
import { WebFallbackAdapter } from '../src/adapters/WebFallbackAdapter';

describe('LearnUp Shared Core Integration Tests (SF-120)', () => {
  // =========================================================================
  // 1. YouTube URL Parser & Extraction
  // =========================================================================
  describe('YouTube URL Parser & Import Logic', () => {
    it('parses standard watch URL correctly', () => {
      const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.type).toBe('video');
      expect(result.id).toBe('dQw4w9WgXcQ');
      expect(result.canonicalUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.normalizedSourceKey).toBe('video:dQw4w9WgXcQ');
    });

    it('parses short youtu.be URL correctly', () => {
      const result = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(result.type).toBe('video');
      expect(result.id).toBe('dQw4w9WgXcQ');
    });

    it('parses embed URL correctly', () => {
      const result = parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(result.type).toBe('video');
      expect(result.id).toBe('dQw4w9WgXcQ');
    });

    it('parses shorts URL correctly', () => {
      const result = parseYouTubeUrl('https://youtube.com/shorts/dQw4w9WgXcQ');
      expect(result.type).toBe('video');
      expect(result.id).toBe('dQw4w9WgXcQ');
    });

    it('parses dedicated playlist URL correctly', () => {
      const result = parseYouTubeUrl('https://www.youtube.com/playlist?list=PLlaN88a76bCoG2w1p5_l0ZkZkZkZkZkZk');
      expect(result.type).toBe('playlist');
      expect(result.id).toBe('PLlaN88a76bCoG2w1p5_l0ZkZkZkZkZkZk');
      expect(result.normalizedSourceKey).toBe('playlist:PLlaN88a76bCoG2w1p5_l0ZkZkZkZkZkZk');
    });

    it('rejects unsupported domains with AppError', () => {
      expect(() => parseYouTubeUrl('https://vimeo.com/12345678')).toThrow(AppError);
      expect(() => parseYouTubeUrl('https://example.com/video')).toThrow(AppError);
    });

    it('extracts and deduplicates multiple URLs from text', () => {
      const input = `
        Check out these lectures:
        https://www.youtube.com/watch?v=dQw4w9WgXcQ
        and again: https://youtu.be/dQw4w9WgXcQ
        and playlist: https://www.youtube.com/playlist?list=PL1234567890
      `;
      const extracted = extractMultipleYouTubeUrls(input);
      expect(extracted.length).toBe(2);
      expect(extracted).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(extracted).toContain('https://www.youtube.com/playlist?list=PL1234567890');
    });
  });

  // =========================================================================
  // 2. Module Registry & ModuleManager
  // =========================================================================
  describe('Module Registry & Lifecycle Enforcement', () => {
    it('contains all mandatory core modules and locks them', () => {
      expect(MODULE_REGISTRY['core-dashboard'].isLocked).toBe(true);
      expect(MODULE_REGISTRY['core-library'].isLocked).toBe(true);
      expect(MODULE_REGISTRY['core-player'].isLocked).toBe(true);
      expect(MODULE_REGISTRY['core-notes'].isLocked).toBe(true);
    });

    it('prevents disabling locked core modules', () => {
      const result = validateModuleAction('disable', 'core-dashboard', ['core-dashboard', 'core-library']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('cannot be disabled');
    });

    it('enforces dependency integrity when enabling optional modules', () => {
      // feature-rewards depends on feature-analytics
      const withoutDep = validateModuleAction('enable', 'feature-rewards', ['core-dashboard']);
      expect(withoutDep.valid).toBe(false);

      const withDep = validateModuleAction('enable', 'feature-rewards', ['core-dashboard', 'feature-analytics']);
      expect(withDep.valid).toBe(true);
    });

    it('isolates module states between user scopes in ModuleManager', () => {
      localStorage.clear();
      const manager = ModuleManager.getInstance('user_alpha');
      manager.setUserScope('user_alpha');
      manager.setAllOptionalModules(false);

      // User Beta starts with defaults
      manager.setUserScope('user_beta');
      expect(manager.isEnabled('feature-focus')).toBe(true);

      // Back to User Alpha: remains disabled
      manager.setUserScope('user_alpha');
      expect(manager.isEnabled('feature-focus')).toBe(false);
    });
  });

  // =========================================================================
  // 3. Learning Progress & Streak Calculations
  // =========================================================================
  describe('Streak & Progress Calculations', () => {
    it('calculates active streak correctly for consecutive days ending today', () => {
      const now = new Date();
      const todayStr = toLocalDateString(now);
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = toLocalDateString(yesterday);
      const dayBefore = new Date(now);
      dayBefore.setDate(now.getDate() - 2);
      const dayBeforeStr = toLocalDateString(dayBefore);

      const stats = calculateStreaks([todayStr, yesterdayStr, dayBeforeStr]);
      expect(stats.activeStreakDays).toBe(3);
      expect(stats.longestStreakDays).toBe(3);
    });

    it('calculates active streak if last activity was yesterday', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = toLocalDateString(yesterday);

      const stats = calculateStreaks([yesterdayStr]);
      expect(stats.activeStreakDays).toBe(1);
    });

    it('resets active streak to 0 if gap exceeds 1 day', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(now.getDate() - 3);

      const stats = calculateStreaks([toLocalDateString(threeDaysAgo)]);
      expect(stats.activeStreakDays).toBe(0);
      expect(stats.longestStreakDays).toBe(1);
    });

    it('computes aggregated analytics summary from durable records', () => {
      const summary = computeAnalyticsSummary(
        [
          {
            id: 'item_1',
            userId: 'user_1',
            title: 'Test Course',
            sourceType: 'video',
            sourceId: 'vid_1',
            thumbnailUrl: '',
            createdAt: '2026-10-10T10:00:00Z',
            updatedAt: '2026-10-10T10:00:00Z'
          }
        ],
        [
          {
            id: 'prog_1',
            userId: 'user_1',
            youtubeVideoId: 'vid_1',
            positionSeconds: 1800,
            durationSeconds: 1800,
            isCompleted: true,
            version: 1,
            syncStatus: 'saved_locally',
            isDeleted: false,
            tombstoneAt: null,
            createdAt: '2026-10-16T10:00:00Z',
            updatedAt: '2026-10-16T10:00:00Z'
          }
        ],
        [
          {
            id: 'focus_1',
            userId: 'user_1',
            durationSeconds: 1500,
            mode: 'sprint',
            intervalNumber: 1,
            soundscape: 'binaural_40hz',
            completed: true,
            createdAt: '2026-10-16T11:00:00Z'
          }
        ],
        []
      );

      expect(summary.completedCoursesCount).toBe(1);
      expect(summary.totalFocusSessions).toBe(1);
      expect(summary.totalMinutes).toBe(55); // 30 min video + 25 min focus
      expect(summary.totalHours).toBe(0.9);
    });
  });

  // =========================================================================
  // 4. Notes Service & Timestamp Parsing
  // =========================================================================
  describe('Notes Services & Timestamps', () => {
    it('parses timestamps in mm:ss and hh:mm:ss format', () => {
      const content = 'See theorem at [05:30] and second proof at [01:15:20] in the video.';
      const timestamps = parseTimestampsFromText(content);
      expect(timestamps.length).toBe(2);
      expect(timestamps[0].seconds).toBe(330); // 5*60 + 30
      expect(timestamps[1].seconds).toBe(4520); // 1*3600 + 15*60 + 20
    });

    it('creates durable note record with defaults', () => {
      const note = createDurableNoteRecord('user_guest', 'course_1', 'vid_1', 'Key concept notes');
      expect(note.userId).toBe('user_guest');
      expect(note.syncStatus).toBe('saved_locally');
      expect(note.isDeleted).toBe(false);
      expect(note.version).toBe(1);
    });

    it('saves and deletes notes via NotesService and storage adapter', async () => {
      const adapter = new WebFallbackAdapter();
      await adapter.init();
      const service = new NotesService(adapter);

      const saved = await service.saveNote('user_guest', 'item_1', 'vid_1', 'Saved Note Content');
      expect(saved.id).toBeDefined();

      const list = await service.getNotes('user_guest');
      expect(list.length).toBe(1);

      await service.deleteNote('user_guest', saved.id);
      const remaining = await service.getNotes('user_guest');
      expect(remaining.length).toBe(0);
    });
  });

  // =========================================================================
  // 5. Roadmaps & Curated Offline Templates
  // =========================================================================
  describe('Roadmap Models & Offline Templates', () => {
    it('validates curated offline roadmaps against schema', () => {
      expect(CURATED_OFFLINE_ROADMAPS.length).toBeGreaterThanOrEqual(2);
      for (const roadmap of CURATED_OFFLINE_ROADMAPS) {
        const validated = curatedRoadmapSchema.parse(roadmap);
        expect(validated.id).toBe(roadmap.id);
        expect(validated.phases.length).toBeGreaterThan(0);
        expect(validated.phases[0].milestones.length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // 6. Focus Session & Pomodoro Logic
  // =========================================================================
  describe('Focus Session Logic', () => {
    it('provides standard 25/5 pomodoro intervals', () => {
      expect(getDurationForMode('sprint', DEFAULT_POMODORO_CONFIG)).toBe(1500);
      expect(getDurationForMode('short_break', DEFAULT_POMODORO_CONFIG)).toBe(300);
      expect(getDurationForMode('long_break', DEFAULT_POMODORO_CONFIG)).toBe(900);
    });

    it('transitions to short break for intervals 1-3 and long break for interval 4', () => {
      const afterSprint1 = getNextModeAfterInterval('sprint', 1, DEFAULT_POMODORO_CONFIG);
      expect(afterSprint1.nextMode).toBe('short_break');

      const afterSprint4 = getNextModeAfterInterval('sprint', 4, DEFAULT_POMODORO_CONFIG);
      expect(afterSprint4.nextMode).toBe('long_break');

      const afterBreak = getNextModeAfterInterval('short_break', 1, DEFAULT_POMODORO_CONFIG);
      expect(afterBreak.nextMode).toBe('sprint');
      expect(afterBreak.nextInterval).toBe(2);
    });
  });

  // =========================================================================
  // 7. Input Validation Schemas
  // =========================================================================
  describe('Validation Schemas', () => {
    it('validates import course input', () => {
      const valid = validateInput(importRequestSchema, {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      });
      expect(valid.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('throws AppError on missing URL', () => {
      expect(() => validateInput(previewCourseSchema, {})).toThrow(AppError);
    });

    it('validates focus session record schema', () => {
      const valid = validateInput(recordFocusSessionSchema, {
        durationSeconds: 1500,
        mode: 'sprint'
      });
      expect(valid.durationSeconds).toBe(1500);
      expect(valid.completed).toBe(true);
      expect(valid.soundscape).toBe('binaural_40hz');
    });
  });

  // =========================================================================
  // 8. Offline Progress & Study Activity Timeline (SF-127)
  // =========================================================================
  describe('Offline Progress & Study Activity Timeline (SF-127)', () => {
    it('computes 7-day weekly study minutes breakdown with today included', () => {
      const now = new Date();
      const todayIso = now.toISOString();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayIso = yesterday.toISOString();

      const progressList = [
        {
          id: 'prog_1',
          userId: 'user_1',
          youtubeVideoId: 'vid_1',
          positionSeconds: 1200, // 20 mins
          durationSeconds: 1800,
          isCompleted: false,
          version: 1,
          syncStatus: 'saved_locally' as const,
          isDeleted: false,
          tombstoneAt: null,
          createdAt: yesterdayIso,
          updatedAt: yesterdayIso,
        },
      ];

      const focusSessions = [
        {
          id: 'focus_1',
          userId: 'user_1',
          durationSeconds: 1500, // 25 mins
          mode: 'sprint' as const,
          intervalNumber: 1,
          soundscape: 'silent' as const,
          completed: true,
          createdAt: todayIso,
        },
      ];

      const weekly = computeWeeklyStudyMinutes(progressList, focusSessions, 7);
      expect(weekly.length).toBe(7);
      const todayEntry = weekly[weekly.length - 1];
      expect(todayEntry.dayLabel).toBe('Today');
      expect(todayEntry.focusMinutes).toBe(25);
      expect(todayEntry.videoMinutes).toBe(0);
      expect(todayEntry.totalMinutes).toBe(25);

      const yesterdayEntry = weekly[weekly.length - 2];
      expect(yesterdayEntry.videoMinutes).toBe(20);
      expect(yesterdayEntry.focusMinutes).toBe(0);
      expect(yesterdayEntry.totalMinutes).toBe(20);
    });

    it('aggregates and chronologically orders offline study activity timeline', () => {
      const now = new Date();
      const t1 = new Date(now.getTime() - 3600000).toISOString(); // 1h ago
      const t2 = new Date(now.getTime() - 1800000).toISOString(); // 30m ago
      const t3 = now.toISOString(); // now

      const items = [
        {
          id: 'item_1',
          userId: 'user_1',
          title: 'Rust Concurrency',
          sourceType: 'video' as const,
          sourceId: 'vid_rust',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          createdAt: t1,
          updatedAt: t1,
        },
      ];

      const progressList = [
        {
          id: 'prog_rust',
          userId: 'user_1',
          youtubeVideoId: 'vid_rust',
          positionSeconds: 900,
          durationSeconds: 1800,
          isCompleted: false,
          version: 1,
          syncStatus: 'saved_locally' as const,
          isDeleted: false,
          tombstoneAt: null,
          createdAt: t1,
          updatedAt: t1,
        },
      ];

      const notes = [
        {
          id: 'note_1',
          userId: 'user_1',
          learningItemId: 'item_1',
          youtubeVideoId: 'vid_rust',
          title: 'Arc and Mutex',
          content: 'Arc is Atomic Reference Counted pointer.',
          createdAt: t2,
          updatedAt: t2,
          version: 1,
          syncStatus: 'saved_locally' as const,
          isDeleted: false,
          tombstoneAt: null,
        },
      ];

      const focusSessions = [
        {
          id: 'focus_now',
          userId: 'user_1',
          durationSeconds: 1500,
          mode: 'sprint' as const,
          intervalNumber: 1,
          soundscape: 'silent' as const,
          completed: true,
          createdAt: t3,
        },
      ];

      const bookmarks = [
        {
          id: 'bm_1',
          userId: 'user_1',
          learningItemId: 'item_1',
          youtubeVideoId: 'vid_rust',
          positionSeconds: 300,
          label: 'MPSC Channels',
          createdAt: t2,
          updatedAt: t2,
          version: 1,
          syncStatus: 'saved_locally' as const,
          isDeleted: false,
          tombstoneAt: null,
        },
      ];

      const timeline = computeStudyActivityTimeline({
        learningItems: items,
        progressList,
        notes,
        focusSessions,
        bookmarks,
      });

      expect(timeline.length).toBe(4);
      // Newest first: focus_now (t3)
      expect(timeline[0].type).toBe('focus_session');
      expect(timeline[0].title).toBe('Focus Sprint Completed');
      expect(timeline[0].icon).toBe('🧘');

      // Video progress item correctly matches learning item title
      const videoEvent = timeline.find((e) => e.type === 'video_progress');
      expect(videoEvent).toBeDefined();
      expect(videoEvent?.detail).toContain('Rust Concurrency');
      expect(videoEvent?.detail).toContain('15m 0s');

      // Bookmark event
      const bmEvent = timeline.find((e) => e.type === 'bookmark_created');
      expect(bmEvent).toBeDefined();
      expect(bmEvent?.title).toBe('Bookmark: MPSC Channels');
    });

    it('returns empty timeline when no study records exist', () => {
      const timeline = computeStudyActivityTimeline({
        learningItems: [],
        progressList: [],
        notes: [],
        focusSessions: [],
      });
      expect(timeline).toEqual([]);
    });
  });
});
