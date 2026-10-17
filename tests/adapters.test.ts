import { describe, it, expect, beforeEach } from 'vitest';
import { WebFallbackAdapter } from '../src/adapters/WebFallbackAdapter';
import { DurableNote, DurableBookmark, LearningItem, UserProfile } from '../src/core';

describe('LearnUp-Desktop — Storage Adapter & Offline Core Tests', () => {
  let adapter: WebFallbackAdapter;

  beforeEach(async () => {
    localStorage.clear();
    adapter = new WebFallbackAdapter();
    await adapter.init();
  });

  it('initializes default guest profile when storage is empty', async () => {
    const profiles = await adapter.listProfiles();
    expect(profiles.length).toBe(1);
    expect(profiles[0].isGuest).toBe(true);
    expect(profiles[0].name).toBe('Guest Learner');

    const active = await adapter.getActiveProfile();
    expect(active?.id).toBe(profiles[0].id);
  });

  it('creates and switches local guest profiles', async () => {
    const newProfile: UserProfile = {
      id: 'profile_secondary_test',
      name: 'Secondary Study Profile',
      email: null,
      color: '#3B82F6',
      initials: 'SP',
      lockType: 'none',
      updatedAt: new Date().toISOString(),
      isGuest: true,
    };

    await adapter.saveProfile(newProfile);
    const profiles = await adapter.listProfiles();
    expect(profiles.length).toBe(2);

    await adapter.setActiveProfile(newProfile.id);
    const active = await adapter.getActiveProfile();
    expect(active?.id).toBe('profile_secondary_test');
    expect(active?.name).toBe('Secondary Study Profile');
  });

  it('persists, queries, and tombstones durable offline notes', async () => {
    const note: DurableNote = {
      id: 'note_123',
      userId: 'guest_local_default',
      learningItemId: 'course_rust_101',
      youtubeVideoId: 'rust_vid_01',
      content: 'Key concept: ownership and borrowing rules in Rust memory safety.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null,
    };

    await adapter.saveNote(note);

    const fetched = await adapter.getNote('guest_local_default', 'note_123');
    expect(fetched).not.toBeNull();
    expect(fetched?.content).toContain('ownership and borrowing');

    const list = await adapter.listNotes('guest_local_default');
    expect(list.length).toBe(1);

    await adapter.markNoteDeleted('guest_local_default', 'note_123');
    const remaining = await adapter.listNotes('guest_local_default');
    expect(remaining.length).toBe(0);
  });

  it('persists and isolates learning items per user account scope', async () => {
    const itemA: LearningItem = {
      id: 'item_a',
      userId: 'user_alpha',
      title: 'Distributed Systems Lecture 1',
      sourceType: 'video',
      sourceId: 'dist_sys_01',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const itemB: LearningItem = {
      id: 'item_b',
      userId: 'user_beta',
      title: 'Advanced Machine Learning',
      sourceType: 'video',
      sourceId: 'ml_01',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adapter.saveLearningItem(itemA);
    await adapter.saveLearningItem(itemB);

    const alphaItems = await adapter.listLearningItems('user_alpha');
    const betaItems = await adapter.listLearningItems('user_beta');

    expect(alphaItems.length).toBe(1);
    expect(alphaItems[0].title).toBe('Distributed Systems Lecture 1');

    expect(betaItems.length).toBe(1);
    expect(betaItems[0].title).toBe('Advanced Machine Learning');
  });

  it('validates external URLs and rejects unsafe protocols', async () => {
    const { getPlatform } = await import('../src/adapters/platform');
    const plat = getPlatform();

    // Valid URLs must not throw protocol validation errors
    let opened = false;
    // Mock window.open for web platform test
    const originalOpen = window.open;
    window.open = () => {
      opened = true;
      return null;
    };

    await plat.openExternalUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(opened).toBe(true);

    // Unsafe protocols must be rejected
    await expect(plat.openExternalUrl('javascript:alert(1)')).rejects.toThrow(/Disallowed URL protocol/);
    await expect(plat.openExternalUrl('file:///C:/Windows/System32/cmd.exe')).rejects.toThrow(/Disallowed URL protocol/);
    await expect(plat.openExternalUrl('data:text/html,<h1>evil</h1>')).rejects.toThrow(/Disallowed URL protocol/);
    await expect(plat.openExternalUrl('not-a-valid-url')).rejects.toThrow();

    window.open = originalOpen;
  });

  it('reports online status correctly from platform', async () => {
    const { getPlatform } = await import('../src/adapters/platform');
    const plat = getPlatform();
    const online = await plat.isOnline();
    expect(typeof online).toBe('boolean');
  });

  it('persists note titles and supports structured formatting metadata', async () => {
    const noteWithTitle: DurableNote = {
      id: 'note_titled_1',
      userId: 'guest_local_default',
      learningItemId: 'general',
      youtubeVideoId: 'general',
      title: 'Memory Management in Rust',
      content: 'Ownership and borrowing prevent data races.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null,
    };

    await adapter.saveNote(noteWithTitle);
    const fetched = await adapter.getNote('guest_local_default', 'note_titled_1');
    expect(fetched?.title).toBe('Memory Management in Rust');

    // Inline edit update
    const updated = {
      ...noteWithTitle,
      title: 'Advanced Memory Management in Rust & RAII',
      version: 2,
    };
    await adapter.saveNote(updated);
    const refetched = await adapter.getNote('guest_local_default', 'note_titled_1');
    expect(refetched?.title).toBe('Advanced Memory Management in Rust & RAII');
    expect(refetched?.version).toBe(2);
  });

  it('saves and lists focus sessions with mode and duration', async () => {
    const session = {
      id: 'focus_sess_1',
      userId: 'guest_local_default',
      durationSeconds: 1500,
      mode: 'sprint' as const,
      intervalNumber: 1,
      soundscape: 'silent' as const,
      completed: true,
      createdAt: new Date().toISOString(),
    };

    await adapter.saveFocusSession(session);
    const sessions = await adapter.listFocusSessions('guest_local_default');
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe('focus_sess_1');
    expect(sessions[0].durationSeconds).toBe(1500);
    expect(sessions[0].completed).toBe(true);
  });

  it('toggles roadmap milestones and computes progress correctly', async () => {
    const roadmapId = 'roadmap-fullstack-ts';
    const milestoneId = 'm1-ts-types';

    // Initially 0 milestones completed
    let completed = await adapter.getRoadmapCompletedMilestones('guest_local_default', roadmapId);
    expect(completed).toEqual([]);

    // Toggle milestone to completed
    await adapter.toggleRoadmapMilestone('guest_local_default', roadmapId, milestoneId, true);
    completed = await adapter.getRoadmapCompletedMilestones('guest_local_default', roadmapId);
    expect(completed).toContain(milestoneId);

    // Toggle back to incomplete
    await adapter.toggleRoadmapMilestone('guest_local_default', roadmapId, milestoneId, false);
    completed = await adapter.getRoadmapCompletedMilestones('guest_local_default', roadmapId);
    expect(completed).not.toContain(milestoneId);
  });

  it('computes accurate user analytics summary from local data', async () => {
    const { computeAnalyticsSummary } = await import('../src/core');

    const items: LearningItem[] = [
      {
        id: 'item_1',
        userId: 'guest_local_default',
        title: 'Learn TypeScript',
        sourceType: 'video',
        sourceId: 'ts_01',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const progress = [
      {
        id: 'prog_1',
        userId: 'guest_local_default',
        youtubeVideoId: 'ts_01',
        positionSeconds: 1200,
        durationSeconds: 1800,
        isCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        syncStatus: 'saved_locally' as const,
        isDeleted: false,
        tombstoneAt: null,
      },
    ];

    const focus = [
      {
        id: 'f_1',
        userId: 'guest_local_default',
        durationSeconds: 1500,
        mode: 'sprint' as const,
        intervalNumber: 1,
        soundscape: 'silent' as const,
        completed: true,
        createdAt: new Date().toISOString(),
      },
    ];

    const notesList: DurableNote[] = [];

    const summary = computeAnalyticsSummary(items, progress, focus, notesList);
    expect(summary.totalCoursesCount).toBe(1);
    expect(summary.completedCoursesCount).toBe(1);
    expect(summary.totalFocusSessions).toBe(1);
    expect(summary.totalMinutes).toBe(45); // 20 min video + 25 min focus
    expect(summary.totalHours).toBe(0.8);
    expect(summary.activeStreakDays).toBeGreaterThanOrEqual(1);
  });

  it('persists, queries, and tombstones durable video bookmarks', async () => {
    const bookmark: DurableBookmark = {
      id: 'bm_01',
      userId: 'guest_local_default',
      learningItemId: 'course_rust_101',
      youtubeVideoId: 'rust_vid_01',
      positionSeconds: 330,
      label: 'Intro to Borrowing & Ownership Rules',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null,
    };

    await adapter.saveBookmark(bookmark);

    // Fetch by id
    const fetched = await adapter.getBookmark('guest_local_default', 'bm_01');
    expect(fetched).not.toBeNull();
    expect(fetched?.label).toBe('Intro to Borrowing & Ownership Rules');
    expect(fetched?.positionSeconds).toBe(330);

    // List with video filter
    const matching = await adapter.listBookmarks('guest_local_default', { youtubeVideoId: 'rust_vid_01' });
    expect(matching.length).toBe(1);
    expect(matching[0].id).toBe('bm_01');

    // List with non-matching filter
    const nonMatching = await adapter.listBookmarks('guest_local_default', { youtubeVideoId: 'other_vid' });
    expect(nonMatching.length).toBe(0);

    // Tombstone deletion
    await adapter.markBookmarkDeleted('guest_local_default', 'bm_01');
    const remaining = await adapter.listBookmarks('guest_local_default', { youtubeVideoId: 'rust_vid_01' });
    expect(remaining.length).toBe(0);
  });

  it('filters library courses and notes by search query and status', () => {
    const items: LearningItem[] = [
      {
        id: '1',
        userId: 'u1',
        title: 'Building Rust Desktop Apps',
        sourceType: 'video',
        sourceId: 'vid1',
        thumbnailUrl: '',
        channelTitle: 'Systems Mastery',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        userId: 'u1',
        title: 'TypeScript Advanced Types',
        sourceType: 'video',
        sourceId: 'vid2',
        thumbnailUrl: '',
        channelTitle: 'Frontend Pro',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // Search by title
    const searchRust = items.filter((i) => i.title.toLowerCase().includes('rust'));
    expect(searchRust.length).toBe(1);
    expect(searchRust[0].id).toBe('1');

    // Search by channel
    const searchChannel = items.filter((i) => (i.channelTitle || '').toLowerCase().includes('frontend'));
    expect(searchChannel.length).toBe(1);
    expect(searchChannel[0].id).toBe('2');

    // Notes search
    const testNotes: DurableNote[] = [
      {
        id: 'n1',
        userId: 'u1',
        learningItemId: 'general',
        youtubeVideoId: 'general',
        title: 'Borrow Checker Notes',
        content: 'Lifetimes and mutable references.',
        createdAt: '',
        updatedAt: '',
        version: 1,
        syncStatus: 'saved_locally',
        isDeleted: false,
        tombstoneAt: null,
      },
      {
        id: 'n2',
        userId: 'u1',
        learningItemId: 'general',
        youtubeVideoId: 'general',
        title: 'React State Management',
        content: 'Using useReducer for complex states.',
        createdAt: '',
        updatedAt: '',
        version: 1,
        syncStatus: 'saved_locally',
        isDeleted: false,
        tombstoneAt: null,
      },
    ];

    const searchLifetimes = testNotes.filter(
      (n) => (n.title || '').toLowerCase().includes('lifetimes') || n.content.toLowerCase().includes('lifetimes')
    );
    expect(searchLifetimes.length).toBe(1);
    expect(searchLifetimes[0].id).toBe('n1');
  });
});
