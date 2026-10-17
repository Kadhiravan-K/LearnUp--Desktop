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
  MutationJournalEntry
} from '../src/core';

describe('SF-122 — Safe Offline-to-Cloud Synchronization Foundation Tests', () => {
  let storage: WebFallbackAdapter;
  let transport: MockSyncTransport;
  let engine: SyncEngine;
  let accountManager: AccountLinkingManager;

  const userA = 'guest_user_a';
  const userB = 'guest_user_b';
  const cloudUidA = 'cloud_uuid_aaaa_1111';

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
      email: null,
      color: '#6366F1',
      initials: 'UA',
      lockType: 'none',
      updatedAt: new Date().toISOString(),
      isGuest: true,
      cloudUserId: null,
      cloudUserEmail: null,
      cloudSyncEnabled: false
    });

    await storage.saveProfile({
      id: userB,
      name: 'User Beta',
      email: null,
      color: '#10B981',
      initials: 'UB',
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
      userId: userA,
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
    const retrieved = await storage.getNote(userA, 'note_guest_1');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.content).toBe(note.content);
    expect(retrieved?.syncStatus).toBe('saved_locally');

    // Sync attempt when offline reports offline cleanly without modifying local data
    const syncResult = await engine.syncProfile(userA);
    expect(syncResult.processed).toBe(0);
    const diag = await engine.getDiagnostics(userA);
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
      cloudUserId: null,
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

    const result = await engine.syncProfile(userA);
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
        entityType: 'note',
        entityId: noteB.id,
        operation: 'CREATE',
        baseVersion: 0,
        localVersion: 1,
        payload: noteB as unknown as Record<string, unknown>
      })
    );

    // Sync only User A
    await engine.syncProfile(userA);

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
    const res = await engine.syncProfile(userA, 'valid_token');
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
    const originalContent = 'Base note content';
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

    const syncResult = await engine.syncProfile(userA, 'valid_token');
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
      entityType: 'note',
      entityId: 'note_pause_1',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { content: 'First note' }
    });
    const mut2 = createMutationJournalEntry({
      userId: userA,
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
    const pausedResult = await engine.syncProfile(userA);
    expect(pausedResult.processed).toBe(0);

    const pending = await storage.getPendingMutations(userA);
    expect(pending.length).toBe(2);

    // Resume engine
    engine.resume();
    expect(engine.getIsPaused()).toBe(false);

    // Sync after resume processes all pending items
    const resumedResult = await engine.syncProfile(userA);
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
      cloudUserId: 'bad_token_user',
      entityType: 'note',
      entityId: note.id,
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: note as unknown as Record<string, unknown>
    });
    await storage.appendMutation(mut);

    const result = await engine.syncProfile(userA);
    expect(result.failures).toBe(1);

    // Mutation is marked permanent_failure
    const pending = await storage.getPendingMutations(userA);
    expect(pending.length).toBe(0); // permanent_failure is removed from active pending retry queue

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
      entityType: 'note',
      entityId: 'note_latency_test',
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: { content: 'Slow sync note' }
    });
    await storage.appendMutation(mut);

    // Start sync without blocking
    const syncPromise = engine.syncProfile(userA);

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
    await engine.syncProfile(userA, 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret_token');

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
          userId: userA,
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
        userA,
        cloudUidA,
        'user@example.com'
      );

      expect(updated.cloudUserId).toBe(cloudUidA);
      expect(updated.cloudUserEmail).toBe('user@example.com');
      expect(updated.cloudSyncEnabled).toBe(true);

      const pending = await storage.getPendingMutations(userA);
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

    const res = await engine.syncProfile(userA, 'valid_token');
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
