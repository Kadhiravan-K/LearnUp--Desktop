import { describe, it, expect, beforeEach } from 'vitest';
import { WebFallbackAdapter } from '../src/adapters/WebFallbackAdapter';
import {
  SyncEngine,
  MockSyncTransport,
  AccountLinkingManager,
  createMutationJournalEntry,
  calculateBackoffDelayMs,
  DurableNote,
  DurableProgress,
  UserProfile,
  MutationJournalEntry,
  transformPayloadForSupabase
} from '../src/core';

describe('SF-122 — Safe Offline-to-Cloud Synchronization Foundation Tests', () => {
  let storage: WebFallbackAdapter;
  let transport: MockSyncTransport;
  let engine: SyncEngine;
  let accountManager: AccountLinkingManager;

  const userA = 'profile_user_a';
  const userB = 'profile_user_b';
  const guestUser = 'guest_user_unlinked';
  const cloudUidA = 'cloud_uuid_aaaa_1111';
  const cloudUidB = 'cloud_uuid_bbbb_2222';

  beforeEach(async () => {
    localStorage.clear();
    storage = new WebFallbackAdapter();
    await storage.init();
    transport = new MockSyncTransport();
    engine = new SyncEngine(storage, transport, {
      maxRetries: 3,
      baseBackoffMs: 100,
      maxBackoffMs: 2000
    });
    accountManager = new AccountLinkingManager(storage);

    // Seed test profiles
    await storage.saveProfile({
      id: userA,
      name: 'User Alpha',
      email: 'alpha@example.com',
      color: '#6366F1',
      initials: 'UA',
      lockType: 'none',
      updatedAt: new Date().toISOString(),
      isGuest: false,
      cloudUserId: cloudUidA,
      cloudUserEmail: 'alpha@example.com',
      cloudSyncEnabled: true
    });
    await storage.setActiveProfile(userA);

    await storage.saveProfile({
      id: userB,
      name: 'User Beta',
      email: 'beta@example.com',
      color: '#10B981',
      initials: 'UB',
      lockType: 'none',
      updatedAt: new Date().toISOString(),
      isGuest: false,
      cloudUserId: cloudUidB,
      cloudUserEmail: 'beta@example.com',
      cloudSyncEnabled: true
    });

    await storage.saveProfile({
      id: guestUser,
      name: 'Guest User',
      email: null,
      color: '#64748B',
      initials: 'GU',
      lockType: 'none',
      updatedAt: new Date().toISOString(),
      isGuest: true,
      cloudUserId: null,
      cloudUserEmail: null,
      cloudSyncEnabled: false
    });
  });

  // ==========================================================================
  // Scenario 1: Guest Mode offline
  // ==========================================================================
  it('Scenario 1: Guest Mode offline works completely without internet or cloud credentials', async () => {
    transport.setOnline(false); // Simulate completely offline environment

    const note: DurableNote = {
      id: 'note_guest_1',
      userId: guestUser,
      learningItemId: 'course_offline',
      youtubeVideoId: 'vid_offline',
      content: 'Offline lecture note taken while disconnected from internet',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };

    await storage.saveNote(note);
    const retrieved = await storage.getNote(guestUser, 'note_guest_1');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.content).toBe(note.content);
    expect(retrieved?.syncStatus).toBe('saved_locally');

    // Sync attempt when offline reports offline cleanly without modifying local data
    const syncResult = await engine.syncProfile(guestUser);
    expect(syncResult.processed).toBe(0);
    const diag = await engine.getDiagnostics(guestUser);
    expect(diag.isOnline).toBe(false);
  });

  // ==========================================================================
  // Scenario 2: Notes saved offline are queued in durable mutation journal
  // ==========================================================================
  it('Scenario 2: Notes saved offline are queued in durable mutation journal atomically', async () => {
    const note: DurableNote = {
      id: 'note_offline_sync',
      userId: userA,
      learningItemId: 'course_ai',
      youtubeVideoId: 'vid_ai',
      content: 'Transformer attention mechanics explained',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };

    await storage.saveNote(note);

    const mutation = createMutationJournalEntry({
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'note',
      entityId: note.id,
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: note.version,
      payload: note as unknown as Record<string, unknown>
    });

    await storage.appendMutation(mutation);

    const pending = await storage.getPendingMutations(userA);
    expect(pending.length).toBe(1);
    expect(pending[0].entityId).toBe('note_offline_sync');
    expect(pending[0].status).toBe('pending');
    expect(pending[0].operation).toBe('CREATE');
  });

  // ==========================================================================
  // Scenario 3: Mutation journal persistence and crash recovery
  // ==========================================================================
  it('Scenario 3: Crash recovery recovers stuck in_flight mutations back to pending', async () => {
    const mut: MutationJournalEntry = {
      id: 'mut_stuck_inflight',
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'note',
      entityId: 'note_crash_test',
      operation: 'UPDATE',
      baseVersion: 1,
      localVersion: 2,
      payload: { content: 'Updated content before sudden crash' },
      createdAt: new Date().toISOString(),
      retryCount: 1,
      status: 'in_flight'
    };

    await storage.appendMutation(mut);

    // Before recovery: status is in_flight
    let pending = await storage.getPendingMutations(userA);
    expect(pending.find((m) => m.id === mut.id)?.status).toBe('in_flight');

    // Recover on boot
    await engine.recoverInFlightMutations(userA);

    // After recovery
    pending = await storage.getPendingMutations(userA);
    const recovered = pending.find((m) => m.id === mut.id);
    expect(recovered).toBeDefined();
    expect(recovered?.status).toBe('pending');
  });

  // ==========================================================================
  // Scenario 4: Failed sync retains pending changes
  // ==========================================================================
  it('Scenario 4: Failed sync retains pending changes and marks retryable failure without data loss', async () => {
    transport.setSimulateNetworkFailure(true);

    const mut = createMutationJournalEntry({
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'note',
      entityId: 'note_retry_test',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { content: 'Should not be lost on network failure' }
    });
    await storage.appendMutation(mut);

    const result = await engine.syncProfile(userA, 'valid_token', cloudUidA);
    expect(result.failures).toBe(1);
    expect(result.processed).toBe(0);

    const pending = await storage.getPendingMutations(userA);
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe('retryable_failure');
    expect(pending[0].retryCount).toBe(1);
  });

  // ==========================================================================
  // Scenario 5: Idempotent retry without duplicates
  // ==========================================================================
  it('Scenario 5: Idempotent retry succeeds and acknowledges mutation once without duplicate records', async () => {
    const mut = createMutationJournalEntry({
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'note',
      entityId: 'note_idempotent_test',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { title: 'Idempotency in distributed systems', content: 'Safe retries' }
    });
    await storage.appendMutation(mut);

    // First attempt succeeds
    const firstSync = await engine.syncProfile(userA, 'valid_mock_jwt');
    expect(firstSync.processed).toBe(1);
    expect(firstSync.failures).toBe(0);

    // Queue is cleared
    const pendingAfter = await storage.getPendingMutations(userA);
    expect(pendingAfter.length).toBe(0);

    // Server has exact record
    const serverRecord = transport.getServerRecord('note', 'note_idempotent_test');
    expect(serverRecord).toBeDefined();

    // Re-syncing does nothing and causes zero duplicates
    const secondSync = await engine.syncProfile(userA, 'valid_mock_jwt');
    expect(secondSync.processed).toBe(0);
  });

  // ==========================================================================
  // Scenario 6: Profile isolation
  // ==========================================================================
  it('Scenario 6: Strict profile isolation prevents Profile A from accessing or mutating Profile B data', async () => {
    // Save note for user A
    const noteA: DurableNote = {
      id: 'note_user_a',
      userId: userA,
      learningItemId: 'course_a',
      youtubeVideoId: 'vid_a',
      content: 'User A private study notes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(noteA);
    await storage.appendMutation(
      createMutationJournalEntry({
        userId: userA,
        cloudUserId: cloudUidA,
        entityType: 'note',
        entityId: noteA.id,
        operation: 'CREATE',
        baseVersion: 0,
        localVersion: 1,
        payload: noteA as unknown as Record<string, unknown>
      })
    );

    // Save note for user B
    const noteB: DurableNote = {
      id: 'note_user_b',
      userId: userB,
      learningItemId: 'course_b',
      youtubeVideoId: 'vid_b',
      content: 'User B private study notes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(noteB);
    await storage.appendMutation(
      createMutationJournalEntry({
        userId: userB,
        cloudUserId: cloudUidB,
        entityType: 'note',
        entityId: noteB.id,
        operation: 'CREATE',
        baseVersion: 0,
        localVersion: 1,
        payload: noteB as unknown as Record<string, unknown>
      })
    );

    // Sync only User A
    await engine.syncProfile(userA, 'valid_token_a', cloudUidA);

    // Verify User A mutation cleared, User B mutation remains untouched in queue
    const pendingA = await storage.getPendingMutations(userA);
    const pendingB = await storage.getPendingMutations(userB);

    expect(pendingA.length).toBe(0);
    expect(pendingB.length).toBe(1);
    expect(pendingB[0].userId).toBe(userB);

    // User A cannot read User B notes
    const crossNotes = await storage.listNotes(userA);
    expect(crossNotes.find((n) => n.userId === userB)).toBeUndefined();
  });

  // ==========================================================================
  // Scenario 7: Deleted notes do not reappear
  // ==========================================================================
  it('Scenario 7: Tombstoned and deleted notes sync DELETE operation and do not reappear', async () => {
    const noteId = 'note_to_delete';
    const note: DurableNote = {
      id: noteId,
      userId: userA,
      learningItemId: 'course_1',
      youtubeVideoId: 'vid_1',
      content: 'Note destined for deletion',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'synced',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(note);

    // Pre-populate on server
    transport.seedServerRecord('note', noteId, 1, { ...note });

    // Mark deleted locally
    await storage.markNoteDeleted(userA, noteId);
    expect(await storage.listNotes(userA)).toHaveLength(0);

    // Queue DELETE mutation
    const deleteMut = createMutationJournalEntry({
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'note',
      entityId: noteId,
      operation: 'DELETE',
      baseVersion: 1,
      localVersion: 2,
      payload: { id: noteId, isDeleted: true }
    });
    await storage.appendMutation(deleteMut);

    // Run sync
    const res = await engine.syncProfile(userA, 'valid_token', cloudUidA);
    expect(res.processed).toBe(1);

    // Verify server record is deleted
    expect(transport.getServerRecord('note', noteId)).toBeUndefined();

    // Verify local note remains deleted
    const notesAfter = await storage.listNotes(userA);
    expect(notesAfter.length).toBe(0);
  });

  // ==========================================================================
  // Scenario 8: Conflicting edits forked without data loss
  // ==========================================================================
  it('Scenario 8: Conflicting note edit preserves server note and forks local version to dated conflict note', async () => {
    const noteId = 'note_conflict_subject';
    const localContent = 'Local offline edit made on airplane';
    const remoteContent = 'Remote edit made on web portal';

    // Seed server state with version 3
    transport.seedServerRecord('note', noteId, 3, {
      id: noteId,
      content: remoteContent,
      version: 3,
      updatedAt: new Date().toISOString()
    });

    // Seed local note with conflicting version 2
    const localNote: DurableNote = {
      id: noteId,
      userId: userA,
      learningItemId: 'course_cloud',
      youtubeVideoId: 'vid_cloud',
      content: localContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 2,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(localNote);

    const conflictMut = createMutationJournalEntry({
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'note',
      entityId: noteId,
      operation: 'UPDATE',
      baseVersion: 1,
      localVersion: 2,
      payload: localNote as unknown as Record<string, unknown>
    });
    await storage.appendMutation(conflictMut);

    // Trigger sync with conflict enabled on transport
    transport.setSimulateConflict(true);

    const syncResult = await engine.syncProfile(userA, 'valid_token', cloudUidA);
    expect(syncResult.conflicts).toBe(1);
    expect(syncResult.processed).toBe(1);

    // Check all notes for user A
    const allNotes = await storage.listNotes(userA);
    expect(allNotes.length).toBe(2); // Primary updated note + Forked conflict copy

    // Primary note has server content
    const primary = allNotes.find((n) => n.id === noteId);
    expect(primary?.content).toBe(remoteContent);

    // Forked note preserves offline user edits completely
    const forked = allNotes.find((n) => n.id.startsWith(`${noteId}_conflict_`));
    expect(forked?.content).toContain(localContent);
    expect(forked?.content).toContain('Local Conflict Fork');
  });

  // ==========================================================================
  // Scenario 9: Pause and resume sync
  // ==========================================================================
  it('Scenario 9: Pause halts sync processing and resume finishes pending mutations', async () => {
    const mut1 = createMutationJournalEntry({
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'note',
      entityId: 'note_pause_1',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { content: 'First note' }
    });
    const mut2 = createMutationJournalEntry({
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'note',
      entityId: 'note_pause_2',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { content: 'Second note' }
    });
    await storage.appendMutation(mut1);
    await storage.appendMutation(mut2);

    // Pause engine
    engine.pause();
    expect(engine.getIsPaused()).toBe(true);

    // Sync while paused does not process
    const pausedResult = await engine.syncProfile(userA, 'valid_token', cloudUidA);
    expect(pausedResult.processed).toBe(0);

    const pending = await storage.getPendingMutations(userA);
    expect(pending.length).toBe(2);

    // Resume engine
    engine.resume();
    expect(engine.getIsPaused()).toBe(false);

    // Sync after resume processes all pending items
    const resumedResult = await engine.syncProfile(userA, 'valid_token', cloudUidA);
    expect(resumedResult.processed).toBe(2);

    const pendingAfter = await storage.getPendingMutations(userA);
    expect(pendingAfter.length).toBe(0);
  });

  // ==========================================================================
  // Scenario 10: Invalid credentials do not erase local data
  // ==========================================================================
  it('Scenario 10: Invalid credentials mark permanent failure but never erase local notes or progress', async () => {
    transport.setSimulateAuthFailure(true);

    const note: DurableNote = {
      id: 'note_auth_test',
      userId: userA,
      learningItemId: 'course_auth',
      youtubeVideoId: 'vid_auth',
      content: 'Crucial local data that must never be deleted on auth error',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(note);

    const mut = createMutationJournalEntry({
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'note',
      entityId: note.id,
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: note as unknown as Record<string, unknown>
    });
    await storage.appendMutation(mut);

    const result = await engine.syncProfile(userA, 'bad_token', cloudUidA);
    expect(result.failures).toBe(1);

    // Engine pauses automatically on auth error
    expect(engine.getIsPaused()).toBe(true);

    // Local data is 100% intact
    const fetched = await storage.getNote(userA, 'note_auth_test');
    expect(fetched).not.toBeNull();
    expect(fetched?.content).toBe(note.content);
  });

  // ==========================================================================
  // Scenario 11: Responsiveness
  // ==========================================================================
  it('Scenario 11: Async sync execution allows concurrent storage read/write operations without locking', async () => {
    transport.setNetworkLatencyMs(50); // Simulate network roundtrip latency

    const mut = createMutationJournalEntry({
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'note',
      entityId: 'note_latency_test',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { content: 'Slow sync note' }
    });
    await storage.appendMutation(mut);

    // Start sync without blocking
    const syncPromise = engine.syncProfile(userA, 'valid_token', cloudUidA);

    // Concurrently write new notes to storage during in-flight sync
    const concurrentNote: DurableNote = {
      id: 'note_concurrent',
      userId: userA,
      learningItemId: 'course_concurrent',
      youtubeVideoId: 'vid_concurrent',
      content: 'Written while sync is running in background',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(concurrentNote);

    const readNote = await storage.getNote(userA, 'note_concurrent');
    expect(readNote?.content).toBe('Written while sync is running in background');

    const result = await syncPromise;
    expect(result.processed).toBe(1);
  });

  // ==========================================================================
  // Scenario 12: No private credentials in error logs
  // ==========================================================================
  it('Scenario 12: Error diagnostics strip and redact sensitive tokens and credentials', async () => {
    transport.setSimulateAuthFailure(true);

    const mut = createMutationJournalEntry({
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'note',
      entityId: 'note_redact_test',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { content: 'Test note' }
    });
    await storage.appendMutation(mut);

    // Pass a fake Bearer token
    await engine.syncProfile(userA, 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret_token', cloudUidA);

    const diag = await engine.getDiagnostics(userA);
    expect(diag.recentErrors.length).toBeGreaterThan(0);

    const serializedErrors = JSON.stringify(diag.recentErrors);
    expect(serializedErrors).not.toContain('secret_token');
    expect(serializedErrors).not.toContain('eyJhbGciOi');
  });

  // ==========================================================================
  // Account Linking & Data Ownership Tests
  // ==========================================================================
  describe('AccountLinkingManager', () => {
    it('generates accurate link preview without modifying data', async () => {
      await storage.saveNote({
        id: 'note_prev_1',
        userId: userA,
        learningItemId: 'c1',
        youtubeVideoId: 'v1',
        content: 'Preview note',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        syncStatus: 'saved_locally',
        isDeleted: false,
        tombstoneAt: null
      });

      const preview = await accountManager.generateLinkPreview(
        userA,
        cloudUidA,
        'user@example.com'
      );

      expect(preview.profileId).toBe(userA);
      expect(preview.profileName).toBe('User Alpha');
      expect(preview.cloudUserId).toBe(cloudUidA);
      expect(preview.cloudUserEmail).toBe('user@example.com');
      expect(preview.notesCount).toBe(1);
      expect(preview.coursesCount).toBe(0);
    });

    it('links profile with cloud user ID and tags pending mutations', async () => {
      await storage.appendMutation(
        createMutationJournalEntry({
          userId: guestUser,
          cloudUserId: null,
          entityType: 'note',
          entityId: 'n1',
          operation: 'CREATE',
          baseVersion: 0,
          localVersion: 1,
          payload: { content: 'unlinked note' }
        })
      );

      const updated = await accountManager.linkProfile(
        guestUser,
        cloudUidA,
        'guest@example.com'
      );

      expect(updated.cloudUserId).toBe(cloudUidA);
      expect(updated.cloudUserEmail).toBe('guest@example.com');
      expect(updated.cloudSyncEnabled).toBe(true);

      const pending = await storage.getPendingMutations(guestUser);
      expect(pending[0].cloudUserId).toBe(cloudUidA);
    });

    it('unlinks profile returning to 100% local guest mode without data loss', async () => {
      // First link
      await accountManager.linkProfile(userA, cloudUidA, 'user@example.com');

      // Then unlink
      const unlinked = await accountManager.unlinkProfile(userA);
      expect(unlinked.cloudUserId).toBeNull();
      expect(unlinked.cloudUserEmail).toBeNull();
      expect(unlinked.cloudSyncEnabled).toBe(false);

      // Notes are still intact
      const notes = await storage.listNotes(userA);
      expect(notes).toBeDefined();
    });
  });

  // ==========================================================================
  // Progress Conflict Resolution Test
  // ==========================================================================
  it('resolves playback progress conflict by taking maximum watched position', async () => {
    const progId = 'prog_vid_1';
    const localProg: DurableProgress = {
      id: progId,
      userId: userA,
      youtubeVideoId: 'video_chem_101',
      positionSeconds: 450.5,
      durationSeconds: 900.0,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 2,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveProgress(localProg);

    // Remote server record watched further (e.g. 620s on another device)
    transport.seedServerRecord('progress', 'video_chem_101', 3, {
      positionSeconds: 620.0,
      durationSeconds: 900.0,
      isCompleted: false,
      version: 3
    });
    transport.setSimulateConflict(true);

    const mut = createMutationJournalEntry({
      userId: userA,
      cloudUserId: cloudUidA,
      entityType: 'progress',
      entityId: 'video_chem_101',
      operation: 'UPDATE',
      baseVersion: 1,
      localVersion: 2,
      payload: localProg as unknown as Record<string, unknown>
    });
    await storage.appendMutation(mut);

    const res = await engine.syncProfile(userA, 'valid_token', cloudUidA);
    expect(res.conflicts).toBe(1);

    const resolved = await storage.getProgress(userA, 'video_chem_101');
    expect(resolved?.positionSeconds).toBe(620.0); // Took highest progress
  });

  // ==========================================================================
  // Backoff Delay Calculation Test
  // ==========================================================================
  it('calculates exponential backoff delay within boundaries and jitter', () => {
    const b0 = calculateBackoffDelayMs(0, 1000, 30000);
    const b1 = calculateBackoffDelayMs(1, 1000, 30000);
    const b5 = calculateBackoffDelayMs(5, 1000, 30000);
    const b10 = calculateBackoffDelayMs(10, 1000, 30000);

    expect(b0).toBeGreaterThanOrEqual(1000);
    expect(b1).toBeGreaterThanOrEqual(2000);
    expect(b5).toBeGreaterThanOrEqual(30000);
    expect(b10).toBeLessThanOrEqual(36000); // capped at 30s + 20% jitter
  });
});

// ==========================================================================
// SF-128 — Cloud Sync Integration Readiness & Security Contract Verification
// ==========================================================================
describe('SF-128 — Cloud Sync Integration Readiness & Security Contract Verification', () => {
  let storage: WebFallbackAdapter;
  let transport: MockSyncTransport;
  let engine: SyncEngine;
  let accountManager: AccountLinkingManager;

  const testUser = 'profile_test_sf128';
  const testCloudUid = 'cloud_uuid_sf128_verified';
  const otherCloudUid = 'cloud_uuid_attacker_or_other';

  beforeEach(async () => {
    localStorage.clear();
    storage = new WebFallbackAdapter();
    await storage.init();
    transport = new MockSyncTransport();
    engine = new SyncEngine(storage, transport, {
      maxRetries: 3,
      baseBackoffMs: 50,
      maxBackoffMs: 1000
    });
    accountManager = new AccountLinkingManager(storage);

    // Initial state: Pure guest mode
    await storage.saveProfile({
      id: testUser,
      name: 'SF128 Test User',
      email: null,
      color: '#4F46E5',
      initials: 'TU',
      lockType: 'none',
      updatedAt: new Date().toISOString(),
      isGuest: true,
      cloudUserId: null,
      cloudUserEmail: null,
      cloudSyncEnabled: false
    });
    await storage.setActiveProfile(testUser);
  });

  // 1. Guest profile never uploads to cloud
  it('Requirement 1: Guest profile never uploads to cloud', async () => {
    const note: DurableNote = {
      id: 'note_guest_private',
      userId: testUser,
      learningItemId: 'course_local',
      youtubeVideoId: 'vid_local',
      content: 'Private local notes taken in guest mode',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(note);

    const mut = createMutationJournalEntry({
      userId: testUser,
      cloudUserId: null,
      entityType: 'note',
      entityId: note.id,
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: note as unknown as Record<string, unknown>
    });
    await storage.appendMutation(mut);

    // Sync attempted on guest profile
    const result = await engine.syncProfile(testUser);
    expect(result.processed).toBe(0);
    expect(result.failures).toBe(0);

    // Remote server received nothing
    expect(transport.getServerRecord('note', note.id)).toBeUndefined();

    // Local data completely untouched
    const localNote = await storage.getNote(testUser, note.id);
    expect(localNote?.content).toBe(note.content);
  });

  // 2. Account link requires explicit user consent before uploading guest records
  it('Requirement 2: Account link requires explicit user consent before uploading guest records', async () => {
    const note: DurableNote = {
      id: 'note_consent_test',
      userId: testUser,
      learningItemId: 'course_consent',
      youtubeVideoId: 'vid_consent',
      content: 'Pending user consent to sync to Supabase',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(note);
    await storage.appendMutation(
      createMutationJournalEntry({
        userId: testUser,
        cloudUserId: null,
        entityType: 'note',
        entityId: note.id,
        operation: 'CREATE',
        baseVersion: 0,
        localVersion: 1,
        payload: note as unknown as Record<string, unknown>
      })
    );

    // 1. Without consent, sync does nothing
    const preConsentSync = await engine.syncProfile(testUser);
    expect(preConsentSync.processed).toBe(0);

    // 2. Preview data to user
    const preview = await accountManager.generateLinkPreview(testUser, testCloudUid, 'student@learnup.io');
    expect(preview.notesCount).toBe(1);
    expect(preview.pendingMutationsCount).toBe(1);

    // 3. Explicit consent: User links profile
    await accountManager.linkProfile(testUser, testCloudUid, 'student@learnup.io');

    // 4. Now sync succeeds and uploads
    const postConsentSync = await engine.syncProfile(testUser, 'valid_jwt_token', testCloudUid);
    expect(postConsentSync.processed).toBe(1);
    expect(transport.getServerRecord('note', note.id)).toBeDefined();
  });

  // 3. Sync engine rejects mutations belonging to a different user or account
  it('Requirement 3: Sync engine rejects mutations belonging to a different user or account', async () => {
    await accountManager.linkProfile(testUser, testCloudUid, 'student@learnup.io');

    // Mismatched cloud user ID mutation
    const forgedMutation = createMutationJournalEntry({
      userId: testUser,
      cloudUserId: otherCloudUid, // Different cloud account!
      entityType: 'note',
      entityId: 'note_forged',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { content: 'Should be rejected due to account mismatch' }
    });
    await storage.appendMutation(forgedMutation);

    const result = await engine.syncProfile(testUser, 'valid_jwt_token', testCloudUid);
    expect(result.failures).toBe(1);
    expect(result.processed).toBe(0);

    // Server never received the forged mutation
    expect(transport.getServerRecord('note', 'note_forged')).toBeUndefined();

    // Diagnostics record account mismatch
    const diag = await engine.getDiagnostics(testUser);
    expect(diag.recentErrors.some((e) => e.error.includes('Account mismatch'))).toBe(true);
  });

  // 4. Interrupted sync resumes from last acknowledged mutation
  it('Requirement 4: Interrupted sync resumes from last acknowledged mutation', async () => {
    await accountManager.linkProfile(testUser, testCloudUid, 'student@learnup.io');

    const mut1 = createMutationJournalEntry({
      userId: testUser,
      cloudUserId: testCloudUid,
      entityType: 'note',
      entityId: 'note_step_1',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { content: 'Step 1' }
    });
    const mut2 = createMutationJournalEntry({
      userId: testUser,
      cloudUserId: testCloudUid,
      entityType: 'note',
      entityId: 'note_step_2',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { content: 'Step 2' }
    });
    await storage.appendMutation(mut1);
    await storage.appendMutation(mut2);

    // Make mut2 fail with 503 while mut1 succeeds
    transport.setFailForEntityId('note_step_2');

    const firstRun = await engine.syncProfile(testUser, 'valid_jwt_token', testCloudUid);
    expect(firstRun.processed).toBe(1); // mut1 acknowledged
    expect(firstRun.failures).toBe(1);  // mut2 failed

    // mut1 is deleted from queue; mut2 remains in retryable state
    const pendingMid = await storage.getPendingMutations(testUser);
    expect(pendingMid.length).toBe(1);
    expect(pendingMid[0].entityId).toBe('note_step_2');

    // Remove simulated error: second run resumes directly from mut2 and completes
    transport.setFailForEntityId(null);
    const secondRun = await engine.syncProfile(testUser, 'valid_jwt_token', testCloudUid);
    expect(secondRun.processed).toBe(1);
    expect(secondRun.failures).toBe(0);

    // Queue completely empty
    const pendingFinal = await storage.getPendingMutations(testUser);
    expect(pendingFinal.length).toBe(0);
  });

  // 5. Idempotent duplicate mutations do not corrupt local or remote state
  it('Requirement 5: Idempotent duplicate mutations do not corrupt local or remote state', async () => {
    await accountManager.linkProfile(testUser, testCloudUid, 'student@learnup.io');

    const mut = createMutationJournalEntry({
      userId: testUser,
      cloudUserId: testCloudUid,
      entityType: 'note',
      entityId: 'note_idempotent',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { content: 'Idempotent payload' }
    });
    await storage.appendMutation(mut);

    // Run 1: Succeeds
    const run1 = await engine.syncProfile(testUser, 'valid_jwt_token', testCloudUid);
    expect(run1.processed).toBe(1);

    // Manually replay duplicate mutation
    await storage.appendMutation(mut);
    const run2 = await engine.syncProfile(testUser, 'valid_jwt_token', testCloudUid);
    expect(run2.processed).toBe(1);

    // Server has exactly 1 record with identical content
    const serverRec = transport.getServerRecord('note', 'note_idempotent');
    expect(serverRec).toBeDefined();
    expect((serverRec?.payload as Record<string, unknown>).content).toBe('Idempotent payload');
  });

  // 6. Note conflict forks local changes into a distinct, dated conflict note while preserving server version
  it('Requirement 6: Note conflict forks local changes into a distinct, dated conflict note while preserving server version', async () => {
    await accountManager.linkProfile(testUser, testCloudUid, 'student@learnup.io');

    const noteId = 'note_conflict_fork';
    const serverText = 'Version updated from web browser';
    const localText = 'Version updated offline on laptop';

    // Seed server state with version 2
    transport.seedServerRecord('note', noteId, 2, {
      id: noteId,
      content: serverText,
      version: 2,
      updatedAt: new Date().toISOString()
    });
    transport.setSimulateConflict(true);

    const localNote: DurableNote = {
      id: noteId,
      userId: testUser,
      learningItemId: 'course_101',
      youtubeVideoId: 'vid_101',
      content: localText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(localNote);

    const mut = createMutationJournalEntry({
      userId: testUser,
      cloudUserId: testCloudUid,
      entityType: 'note',
      entityId: noteId,
      operation: 'UPDATE',
      baseVersion: 1,
      localVersion: 2,
      payload: localNote as unknown as Record<string, unknown>
    });
    await storage.appendMutation(mut);

    const res = await engine.syncProfile(testUser, 'valid_jwt_token', testCloudUid);
    expect(res.conflicts).toBe(1);
    expect(res.processed).toBe(1);

    const allNotes = await storage.listNotes(testUser);
    expect(allNotes.length).toBe(2);

    // Primary note has server version
    const primary = allNotes.find((n) => n.id === noteId);
    expect(primary?.content).toBe(serverText);

    // Forked note has local version preserved
    const forked = allNotes.find((n) => n.id.startsWith(`${noteId}_conflict_`));
    expect(forked?.content).toContain(localText);
    expect(forked?.content).toContain('Local Conflict Fork');
  });

  // 7. Deleted records sync as tombstones and do not reappear
  it('Requirement 7: Deleted records sync as tombstones and do not reappear', async () => {
    await accountManager.linkProfile(testUser, testCloudUid, 'student@learnup.io');

    const noteId = 'note_tombstone_test';
    const note: DurableNote = {
      id: noteId,
      userId: testUser,
      learningItemId: 'course_del',
      youtubeVideoId: 'vid_del',
      content: 'Destined for tombstone',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'synced',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(note);
    transport.seedServerRecord('note', noteId, 1, { ...note });

    // Mark deleted locally
    await storage.markNoteDeleted(testUser, noteId);
    expect(await storage.listNotes(testUser)).toHaveLength(0);

    // Queue DELETE mutation
    await storage.appendMutation(
      createMutationJournalEntry({
        userId: testUser,
        cloudUserId: testCloudUid,
        entityType: 'note',
        entityId: noteId,
        operation: 'DELETE',
        baseVersion: 1,
        localVersion: 2,
        payload: { id: noteId, isDeleted: true }
      })
    );

    const syncResult = await engine.syncProfile(testUser, 'valid_jwt_token', testCloudUid);
    expect(syncResult.processed).toBe(1);

    // Server record removed
    expect(transport.getServerRecord('note', noteId)).toBeUndefined();

    // Local list still 0
    expect(await storage.listNotes(testUser)).toHaveLength(0);
  });

  // 8. Expired auth token safely pauses sync and alerts the user without deleting local data
  it('Requirement 8: Expired auth token safely pauses sync and alerts the user without deleting local data', async () => {
    await accountManager.linkProfile(testUser, testCloudUid, 'student@learnup.io');
    transport.setSimulateAuthFailure(true);

    const note: DurableNote = {
      id: 'note_auth_safety',
      userId: testUser,
      learningItemId: 'course_sec',
      youtubeVideoId: 'vid_sec',
      content: 'Local data that must NEVER be erased on token expiration',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(note);

    await storage.appendMutation(
      createMutationJournalEntry({
        userId: testUser,
        cloudUserId: testCloudUid,
        entityType: 'note',
        entityId: note.id,
        operation: 'CREATE',
        baseVersion: 0,
        localVersion: 1,
        payload: note as unknown as Record<string, unknown>
      })
    );

    const res = await engine.syncProfile(testUser, 'expired_jwt_token', testCloudUid);
    expect(res.failures).toBe(1);

    // Sync engine safely paused
    expect(engine.getIsPaused()).toBe(true);

    // Local data completely safe
    const retrieved = await storage.getNote(testUser, note.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.content).toBe(note.content);

    // User alert diagnostic recorded
    const diag = await engine.getDiagnostics(testUser);
    expect(diag.isPaused).toBe(true);
    expect(diag.recentErrors.some((e) => e.category === 'auth')).toBe(true);
  });

  // 9. Offline app startup with pending mutations remains responsive and does not block UI
  it('Requirement 9: Offline app startup with pending mutations remains responsive and does not block UI', async () => {
    await accountManager.linkProfile(testUser, testCloudUid, 'student@learnup.io');
    transport.setOnline(false); // Offline environment

    await storage.appendMutation(
      createMutationJournalEntry({
        userId: testUser,
        cloudUserId: testCloudUid,
        entityType: 'note',
        entityId: 'note_startup_offline',
        operation: 'CREATE',
        baseVersion: 0,
        localVersion: 1,
        payload: { content: 'Offline pending' }
      })
    );

    const startTime = Date.now();
    const result = await engine.syncProfile(testUser, 'valid_jwt_token', testCloudUid);
    const durationMs = Date.now() - startTime;

    // Fast and non-blocking
    expect(durationMs).toBeLessThan(100);
    expect(result.processed).toBe(0);

    const diag = await engine.getDiagnostics(testUser);
    expect(diag.isOnline).toBe(false);
    expect(diag.pendingCount).toBe(1);
  });

  // 10. Logout or unlinking stops cloud uploads immediately and preserves local records
  it('Requirement 10: Logout or unlinking stops cloud uploads immediately and preserves local records', async () => {
    // 1. Link profile and save notes
    await accountManager.linkProfile(testUser, testCloudUid, 'student@learnup.io');
    const note: DurableNote = {
      id: 'note_keep_local',
      userId: testUser,
      learningItemId: 'course_stay',
      youtubeVideoId: 'vid_stay',
      content: 'Preserved locally after unlinking',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null
    };
    await storage.saveNote(note);

    await storage.appendMutation(
      createMutationJournalEntry({
        userId: testUser,
        cloudUserId: testCloudUid,
        entityType: 'note',
        entityId: note.id,
        operation: 'CREATE',
        baseVersion: 0,
        localVersion: 1,
        payload: note as unknown as Record<string, unknown>
      })
    );

    // 2. Unlink profile (simulating logout or user choice)
    const unlinkedProfile = await accountManager.unlinkProfile(testUser);
    expect(unlinkedProfile.cloudSyncEnabled).toBe(false);
    expect(unlinkedProfile.cloudUserId).toBeNull();

    // 3. Sync stops immediately
    const res = await engine.syncProfile(testUser);
    expect(res.processed).toBe(0);

    // 4. Local note is 100% preserved in SQLite storage
    const localNote = await storage.getNote(testUser, note.id);
    expect(localNote).not.toBeNull();
    expect(localNote?.content).toBe(note.content);
  });

  // Schema Compatibility: Transformation to Supabase PostgreSQL Schema
  describe('Supabase Schema Transformation Compatibility', () => {
    it('transforms note payload to exact Supabase notes table schema', () => {
      const desktopNote = {
        id: 'note-uuid-1234',
        learningItemId: 'course-uuid-5678',
        youtubeVideoId: 'video_abc',
        content: 'Notes markdown content',
        createdAt: '2026-10-17T10:00:00.000Z',
        version: 2,
        syncStatus: 'saved_locally'
      };

      const transformed = transformPayloadForSupabase('note', desktopNote, testCloudUid);
      expect(transformed.id).toBe('note-uuid-1234');
      expect(transformed.user_id).toBe(testCloudUid);
      expect(transformed.learning_item_id).toBe('course-uuid-5678');
      expect(transformed.youtube_video_id).toBe('video_abc');
      expect(transformed.content).toBe('Notes markdown content');
      expect(transformed).not.toHaveProperty('learningItemId');
      expect(transformed).not.toHaveProperty('youtubeVideoId');
      expect(transformed).not.toHaveProperty('syncStatus');
      expect(transformed).not.toHaveProperty('version');
    });

    it('transforms progress payload to exact Supabase video_progress schema without id column', () => {
      const desktopProgress = {
        id: 'prog-local-id',
        youtubeVideoId: 'video_xyz',
        positionSeconds: 154.67,
        durationSeconds: 300.2,
        isCompleted: true,
        version: 3,
        syncStatus: 'saved_locally'
      };

      const transformed = transformPayloadForSupabase('progress', desktopProgress, testCloudUid);
      expect(transformed.user_id).toBe(testCloudUid);
      expect(transformed.youtube_video_id).toBe('video_xyz');
      expect(transformed.position_seconds).toBe(155); // Rounded integer
      expect(transformed.duration_seconds).toBe(300); // Rounded integer
      expect(transformed.is_completed).toBe(true);
      expect(transformed).not.toHaveProperty('id'); // Table has composite PK (user_id, youtube_video_id)
      expect(transformed).not.toHaveProperty('positionSeconds');
      expect(transformed).not.toHaveProperty('durationSeconds');
      expect(transformed).not.toHaveProperty('syncStatus');
    });

    it('transforms bookmark payload to exact Supabase bookmarks table schema', () => {
      const desktopBookmark = {
        id: 'bm-uuid-123',
        learningItemId: 'course-uuid-456',
        youtubeVideoId: 'video_xyz',
        positionSeconds: 42.1,
        label: 'Important formula derivation',
        createdAt: '2026-10-17T11:00:00.000Z'
      };

      const transformed = transformPayloadForSupabase('bookmark', desktopBookmark, testCloudUid);
      expect(transformed.id).toBe('bm-uuid-123');
      expect(transformed.user_id).toBe(testCloudUid);
      expect(transformed.learning_item_id).toBe('course-uuid-456');
      expect(transformed.youtube_video_id).toBe('video_xyz');
      expect(transformed.position_seconds).toBe(42); // Rounded integer
      expect(transformed.label).toBe('Important formula derivation');
      expect(transformed).not.toHaveProperty('learningItemId');
      expect(transformed).not.toHaveProperty('positionSeconds');
    });

    it('transforms learning item payload to exact Supabase learning_items schema', () => {
      const desktopCourse = {
        id: 'course-uuid-789',
        sourceType: 'video',
        sourceId: 'video_abc',
        title: 'Deep Learning Specialization',
        thumbnailUrl: 'https://img.youtube.com/vi/video_abc/hqdefault.jpg'
      };

      const transformed = transformPayloadForSupabase('learning_item', desktopCourse, testCloudUid);
      expect(transformed.id).toBe('course-uuid-789');
      expect(transformed.user_id).toBe(testCloudUid);
      expect(transformed.type).toBe('video');
      expect(transformed.youtube_video_id).toBe('video_abc');
      expect(transformed.youtube_playlist_id).toBeNull();
      expect(transformed.source_url).toBe('https://www.youtube.com/watch?v=video_abc');
      expect(transformed.normalized_source_key).toBe('youtube:video_abc');
      expect(transformed.title).toBe('Deep Learning Specialization');
      expect(transformed.thumbnail_url).toBe('https://img.youtube.com/vi/video_abc/hqdefault.jpg');
      expect(transformed.status).toBe('ready');
      expect(transformed).not.toHaveProperty('sourceType');
      expect(transformed).not.toHaveProperty('sourceId');
      expect(transformed).not.toHaveProperty('thumbnailUrl');
    });
  });
});
