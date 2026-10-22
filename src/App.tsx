import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getPlatform } from './adapters/platform';
import {
  UserProfile,
  LearningItem,
  DurableNote,
  DurableBookmark,
  DurableProgress,
  FocusSession,
  parseYouTubeUrl,
  CURATED_OFFLINE_ROADMAPS,
  SyncEngine,
  MockSyncTransport,
  AccountLinkingManager,
  SyncDiagnostics,
  createMutationJournalEntry,
} from './core';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './views/DashboardView';
import { LibraryView } from './views/LibraryView';
import { PlayerView } from './views/PlayerView';
import { NotesView } from './views/NotesView';
import { FocusView } from './views/FocusView';
import { RoadmapsView } from './views/RoadmapsView';
import { SettingsView } from './views/SettingsView';
import { AddCourseModal } from './components/course/AddCourseModal';
import { AuthLoginClient } from './components/auth/AuthLoginClient';
import { clearGuestSession } from './lib/auth/guest-session';
import { createClient } from './lib/supabase/browser';

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export function App() {
  const platform = getPlatform();
  const router = useRouter();
  const pathname = usePathname() || '/dashboard';

  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  // Module preferences with localStorage persistence
  const [modules, setModules] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('learnup_desktop_modules');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return {
      focus: true,
      notes: true,
      roadmaps: true,
      analytics: true,
      rewards: true,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('learnup_desktop_modules', JSON.stringify(modules));
    } catch (e) {
      console.error('Failed to save module preferences', e);
    }
  }, [modules]);

  // Data states
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [notes, setNotes] = useState<DurableNote[]>([]);
  const [progressList, setProgressList] = useState<DurableProgress[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [roadmapCompleted, setRoadmapCompleted] = useState<Record<string, string[]>>({});
  const [bookmarks, setBookmarks] = useState<DurableBookmark[]>([]);
  const [libraryWarning, setLibraryWarning] = useState<string | null>(null);

  // Modals & Navigation
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const showToast = useCallback(
    (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Offline-to-Cloud Sync State
  const [syncTransport] = useState(() => new MockSyncTransport());
  const [syncEngine, setSyncEngine] = useState<SyncEngine | null>(null);
  const [syncDiagnostics, setSyncDiagnostics] = useState<SyncDiagnostics | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Init platform and default profile
  useEffect(() => {
    async function init() {
      await platform.init();
      const online = await platform.isOnline();
      setIsOnline(online);

      // Load or create default profile
      let profs = await platform.storage.listProfiles();
      let active = await platform.storage.getActiveProfile();

      if (!active) {
        const defaultGuest: UserProfile = {
          id: 'guest_local_default',
          name: 'Desktop Guest',
          email: null,
          color: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
          initials: 'DG',
          lockType: 'none',
          updatedAt: new Date().toISOString(),
          isGuest: true,
        };
        await platform.storage.saveProfile(defaultGuest);
        await platform.storage.setActiveProfile(defaultGuest.id);
        profs = [defaultGuest];
        active = defaultGuest;
      }

      setProfiles(profs);
      setActiveProfile(active);
      setIsInitialized(true);
    }

    init();
  }, []);

  // React to active profile change: load all user data from SQLite
  useEffect(() => {
    if (!isInitialized || !activeProfile) {
      setLearningItems([]);
      setNotes([]);
      setProgressList([]);
      setFocusSessions([]);
      setRoadmapCompleted({});
      setBookmarks([]);
      return;
    }

    async function loadUserData() {
      if (activeProfile) {
        const items = await platform.storage.listLearningItems(activeProfile.id);
        const userNotes = await platform.storage.listNotes(activeProfile.id);
        const progress = await platform.storage.listProgress(activeProfile.id);
        const sessions = await platform.storage.listFocusSessions(activeProfile.id);

        const roadmapProgress: Record<string, string[]> = {};
        for (const rm of CURATED_OFFLINE_ROADMAPS) {
          roadmapProgress[rm.id] = await platform.storage.getRoadmapCompletedMilestones(
            activeProfile.id,
            rm.id
          );
        }

        setLearningItems(items);
        setNotes(userNotes);
        setProgressList(progress);
        setFocusSessions(sessions);
        setRoadmapCompleted(roadmapProgress);
      }
    }

    loadUserData();
  }, [activeProfile?.id, isInitialized]);

  // Setup sync engine when activeProfile changes
  useEffect(() => {
    if (!activeProfile || !isInitialized) {
      setSyncEngine(null);
      setSyncDiagnostics(null);
      return;
    }

    const engine = new SyncEngine(platform.storage, syncTransport);
    setSyncEngine(engine);

    const refreshDiag = async () => {
      try {
        const diag = await engine.getDiagnostics(activeProfile.id);
        setSyncDiagnostics(diag);
      } catch (e) {
        console.error('Failed to get sync diagnostics', e);
      }
    };

    refreshDiag();
  }, [activeProfile?.id, activeProfile?.cloudUserId, isInitialized, syncTransport]);

  const refreshPendingCount = async () => {
    if (!syncEngine || !activeProfile) return;
    try {
      const diag = await syncEngine.getDiagnostics(activeProfile.id);
      setSyncDiagnostics(diag);
    } catch (e) {
      console.error('Failed to update pending mutation diagnostics', e);
    }
  };

  const handleSyncNow = async () => {
    if (!syncEngine || !activeProfile) return;
    setIsSyncing(true);
    try {
      const token = activeProfile.cloudSyncEnabled ? 'mock_auth_token' : undefined;
      await syncEngine.syncProfile(activeProfile.id, token, activeProfile.cloudUserId || undefined);
      await refreshPendingCount();
      showToast('Offline sync cycle completed successfully.', 'success');
    } catch (err) {
      console.error('Sync failed', err);
      showToast('Sync error occurred', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTogglePauseSync = async () => {
    if (!syncEngine || !activeProfile) return;
    if (syncEngine.getIsPaused()) {
      syncEngine.resume();
      showToast('Sync engine resumed', 'info');
    } else {
      syncEngine.pause();
      showToast('Sync engine paused', 'info');
    }
    const diag = await syncEngine.getDiagnostics(activeProfile.id);
    setSyncDiagnostics(diag);
  };

  const handleLinkAccount = async (email: string) => {
    if (!activeProfile) return;
    const mockCloudUid = `user_cloud_${Math.random().toString(36).substring(2, 10)}`;
    const accountManager = new AccountLinkingManager(platform.storage);
    const updated = await accountManager.linkProfile(
      activeProfile.id,
      mockCloudUid,
      email
    );
    setActiveProfile(updated);
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await refreshPendingCount();
  };

  const handleUnlinkAccount = async () => {
    if (!activeProfile) return;
    const accountManager = new AccountLinkingManager(platform.storage);
    const updated = await accountManager.unlinkProfile(activeProfile.id);
    setActiveProfile(updated);
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await refreshPendingCount();
  };

  // Keyboard navigation & global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'F1' || (e.key === '?' && !e.shiftKey)) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          e.preventDefault();
          return;
        }
        if (isAddModalOpen) {
          setIsAddModalOpen(false);
          e.preventDefault();
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setIsAddModalOpen(true);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          router.push('/dashboard');
        } else if (e.key === '2') {
          e.preventDefault();
          router.push('/library');
        } else if (e.key === '3') {
          e.preventDefault();
          router.push('/notes');
        } else if (e.key === '4') {
          e.preventDefault();
          router.push('/focus');
        } else if (e.key === '5') {
          e.preventDefault();
          router.push('/roadmaps');
        } else if (e.key === '6' || e.key === ',') {
          e.preventDefault();
          router.push('/settings');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsModalOpen, isAddModalOpen, router]);

  // Video progress updater
  const handleSaveProgress = async (
    videoId: string,
    positionSeconds: number,
    isCompleted: boolean,
    recordJournal: boolean = true
  ) => {
    if (!activeProfile) return;
    const existing = progressList.find((p) => p.youtubeVideoId === videoId);
    const updatedProgress: DurableProgress = {
      id: existing ? existing.id : `prog_${activeProfile.id}_${videoId}`,
      userId: activeProfile.id,
      youtubeVideoId: videoId,
      positionSeconds: Math.round(positionSeconds),
      durationSeconds: existing?.durationSeconds || 1800,
      isCompleted,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: existing ? existing.version + 1 : 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null,
    };
    await platform.storage.saveProgress(updatedProgress);

    if (recordJournal) {
      const mut = createMutationJournalEntry({
        userId: activeProfile.id,
        cloudUserId: activeProfile.cloudUserId,
        entityType: 'progress',
        entityId: updatedProgress.id,
        operation: existing ? 'UPDATE' : 'CREATE',
        baseVersion: existing ? existing.version : 0,
        localVersion: updatedProgress.version,
        payload: updatedProgress as unknown as Record<string, unknown>,
      });
      await platform.storage.appendMutation(mut);
      await refreshPendingCount();
    }

    setProgressList((prev) => {
      const idx = prev.findIndex((p) => p.youtubeVideoId === videoId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedProgress;
        return copy;
      }
      return [updatedProgress, ...prev];
    });
  };

  // Add video handler
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !videoUrlInput.trim()) return;

    try {
      let parsed;
      try {
        parsed = parseYouTubeUrl(videoUrlInput);
      } catch {
        showToast('Invalid YouTube URL or Video ID', 'error');
        return;
      }

      if (!parsed || !parsed.id) {
        showToast('Invalid YouTube URL or Video ID', 'error');
        return;
      }
      const videoId = parsed.id;

      // Check duplicates
      const existing = learningItems.find((item) => item.sourceId === videoId);
      if (existing) {
        setVideoUrlInput('');
        setIsAddModalOpen(false);
        router.push(`/library/${existing.id}`);
        setLibraryWarning(`"${existing.title}" is already in your Learning Library.`);
        setTimeout(() => setLibraryWarning(null), 5000);
        return;
      }

      const meta = await platform.fetchYouTubeMetadata(parsed.canonicalUrl || `https://www.youtube.com/watch?v=${videoId}`);
      const newItem: LearningItem = {
        id: `item_${Date.now()}`,
        userId: activeProfile.id,
        title: meta.title,
        sourceType: parsed.type,
        sourceId: videoId,
        thumbnailUrl: meta.thumbnailUrl,
        channelTitle: meta.author,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await platform.storage.saveLearningItem(newItem);
      const mut = createMutationJournalEntry({
        userId: activeProfile.id,
        cloudUserId: activeProfile.cloudUserId,
        entityType: 'learning_item',
        entityId: newItem.id,
        operation: 'CREATE',
        baseVersion: 0,
        localVersion: 1,
        payload: newItem as unknown as Record<string, unknown>,
      });
      await platform.storage.appendMutation(mut);
      await refreshPendingCount();

      setLearningItems((prev) => [newItem, ...prev]);
      setVideoUrlInput('');
      setIsAddModalOpen(false);
      router.push(`/library/${newItem.id}`);
      showToast(`Added "${newItem.title}" to library`, 'success');
    } catch (err) {
      showToast(`Failed to add video: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // Delete course
  const handleDeleteCourse = async (item: LearningItem) => {
    if (!activeProfile) return;
    if (!window.confirm(`Delete "${item.title}" from your library and local SQLite?`)) return;
    try {
      await platform.storage.deleteLearningItem(activeProfile.id, item.id);
      const mut = createMutationJournalEntry({
        userId: activeProfile.id,
        cloudUserId: activeProfile.cloudUserId,
        entityType: 'learning_item',
        entityId: item.id,
        operation: 'DELETE',
        baseVersion: 1,
        localVersion: 2,
        payload: { id: item.id, isDeleted: true },
      });
      await platform.storage.appendMutation(mut);
      await refreshPendingCount();
      setLearningItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast('Course removed from library', 'info');
      router.push('/library');
    } catch (err) {
      showToast('Failed to delete course', 'error');
    }
  };

  // Save study note
  const handleSaveNote = async (
    learningItemId: string,
    videoId: string,
    content: string,
    title?: string
  ) => {
    if (!activeProfile) return;
    const newNote: DurableNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: activeProfile.id,
      learningItemId,
      youtubeVideoId: videoId,
      title: title || 'Quick Note',
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null,
    };
    await platform.storage.saveNote(newNote);
    const mut = createMutationJournalEntry({
      userId: activeProfile.id,
      cloudUserId: activeProfile.cloudUserId,
      entityType: 'note',
      entityId: newNote.id,
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: newNote as unknown as Record<string, unknown>,
    });
    await platform.storage.appendMutation(mut);
    await refreshPendingCount();
    setNotes((prev) => [newNote, ...prev]);
  };

  // Delete study note
  const handleDeleteNote = async (noteId: string) => {
    if (!activeProfile) return;
    await platform.storage.markNoteDeleted(activeProfile.id, noteId);
    const targetNote = notes.find((n) => n.id === noteId);
    const mut = createMutationJournalEntry({
      userId: activeProfile.id,
      cloudUserId: activeProfile.cloudUserId,
      entityType: 'note',
      entityId: noteId,
      operation: 'DELETE',
      baseVersion: targetNote ? targetNote.version : 1,
      localVersion: targetNote ? targetNote.version + 1 : 2,
      payload: { id: noteId, isDeleted: true },
    });
    await platform.storage.appendMutation(mut);
    await refreshPendingCount();
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  // Save video bookmark
  const handleSaveBookmark = async (
    videoId: string,
    positionSeconds: number,
    label: string
  ) => {
    if (!activeProfile) return;
    const selectedItem = learningItems.find((i) => i.sourceId === videoId);
    const newBookmark: DurableBookmark = {
      id: `bm_${Date.now()}`,
      userId: activeProfile.id,
      learningItemId: selectedItem?.id || 'general',
      youtubeVideoId: videoId,
      positionSeconds,
      label,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: 'saved_locally',
      isDeleted: false,
      tombstoneAt: null,
    };
    await platform.storage.saveBookmark(newBookmark);
    const mut = createMutationJournalEntry({
      userId: activeProfile.id,
      cloudUserId: activeProfile.cloudUserId,
      entityType: 'bookmark',
      entityId: newBookmark.id,
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: newBookmark as unknown as Record<string, unknown>,
    });
    await platform.storage.appendMutation(mut);
    await refreshPendingCount();
    setBookmarks((prev) => [newBookmark, ...prev]);
    showToast(`Bookmark "${label}" saved!`, 'success');
  };

  // Delete video bookmark
  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!activeProfile) return;
    await platform.storage.markBookmarkDeleted(activeProfile.id, bookmarkId);
    const targetBm = bookmarks.find((b) => b.id === bookmarkId);
    const mut = createMutationJournalEntry({
      userId: activeProfile.id,
      cloudUserId: activeProfile.cloudUserId,
      entityType: 'bookmark',
      entityId: bookmarkId,
      operation: 'DELETE',
      baseVersion: targetBm ? targetBm.version : 1,
      localVersion: targetBm ? targetBm.version + 1 : 2,
      payload: { id: bookmarkId, isDeleted: true },
    });
    await platform.storage.appendMutation(mut);
    await refreshPendingCount();
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
  };

  // Save focus session
  const handleSaveFocusSession = async (session: FocusSession) => {
    const saved = await platform.storage.saveFocusSession(session);
    setFocusSessions((prev) => [saved, ...prev]);
  };

  // Toggle roadmap milestone
  const handleToggleRoadmapMilestone = async (
    roadmapId: string,
    milestoneId: string,
    checked: boolean
  ) => {
    if (!activeProfile) return;
    await platform.storage.toggleRoadmapMilestone(
      activeProfile.id,
      roadmapId,
      milestoneId,
      checked
    );
    setRoadmapCompleted((prev) => {
      const current = prev[roadmapId] || [];
      const next = checked
        ? [...current, milestoneId]
        : current.filter((id) => id !== milestoneId);
      return { ...prev, [roadmapId]: next };
    });
  };

  // Switch / Create Profile
  const handleSelectProfile = async (p: UserProfile) => {
    await platform.storage.setActiveProfile(p.id);
    setActiveProfile(p);
  };

  const handleCreateProfile = async (name: string) => {
    const newGuest: UserProfile = {
      id: `guest_${Date.now()}`,
      name,
      email: null,
      color: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
      initials: name.substring(0, 2).toUpperCase(),
      lockType: 'none',
      updatedAt: new Date().toISOString(),
      isGuest: true,
    };
    await platform.storage.saveProfile(newGuest);
    await platform.storage.setActiveProfile(newGuest.id);
    setProfiles((prev) => [...prev, newGuest]);
    setActiveProfile(newGuest);
  };

  // Sign out / Exit profile
  const handleSignOut = useCallback(async () => {
    try {
      clearGuestSession();
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});
    } catch (e) {
      console.warn('Sign out cleanup caught:', e);
    }
    await platform.storage.setActiveProfile('');
    setActiveProfile(null);
    setLearningItems([]);
    setNotes([]);
    setProgressList([]);
    setFocusSessions([]);
    setRoadmapCompleted({});
    router.push('/login');
    showToast('Signed out successfully', 'info');
  }, [platform.storage, router, showToast]);

  // Module manager helpers
  const handleToggleModule = (id: string) => {
    setModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAllModules = () => {
    const all: Record<string, boolean> = {};
    Object.keys(modules).forEach((k) => (all[k] = true));
    setModules(all);
    showToast('All desktop modules enabled', 'info');
  };

  const handleDeselectAllModules = () => {
    const none: Record<string, boolean> = {};
    Object.keys(modules).forEach((k) => (none[k] = false));
    setModules(none);
    showToast('All optional desktop modules disabled', 'info');
  };

  // Determine active view from pathname
  const renderView = () => {
    // Player view: /library/:id
    if (pathname.startsWith('/library/') && pathname !== '/library') {
      const videoOrItemId = pathname.replace('/library/', '');
      const item = learningItems.find(
        (i) => i.id === videoOrItemId || i.sourceId === videoOrItemId
      );
      if (item) {
        return (
          <PlayerView
            item={item}
            progressList={progressList}
            notes={notes}
            bookmarks={bookmarks}
            onBack={() => router.push('/library')}
            onSaveProgress={(vid, pos, comp) => handleSaveProgress(vid, pos, comp, true)}
            onSaveNote={(vid, title, content) => handleSaveNote(item.id, vid, content, title)}
            onDeleteNote={handleDeleteNote}
            onSaveBookmark={(vid, pos, label) => handleSaveBookmark(vid, pos, label)}
            onDeleteBookmark={handleDeleteBookmark}
          />
        );
      }
    }

    if (pathname === '/library') {
      return (
        <LibraryView
          items={learningItems}
          progressList={progressList}
          warningMessage={libraryWarning}
          onOpenImport={() => setIsAddModalOpen(true)}
          onSelectVideo={(videoId) => {
            const match = learningItems.find((i) => i.sourceId === videoId);
            if (match) {
              router.push(`/library/${match.id}`);
            } else {
              router.push(`/library/${videoId}`);
            }
          }}
          onEditCourse={() => {}}
          onDeleteCourse={handleDeleteCourse}
        />
      );
    }

    if (pathname === '/notes') {
      return (
        <NotesView
          activeProfile={activeProfile}
          learningItems={learningItems}
          notes={notes}
          bookmarks={bookmarks}
          onSaveNote={(itemId, vid, content) => handleSaveNote(itemId, vid, content)}
          onDeleteNote={handleDeleteNote}
          onDeleteBookmark={handleDeleteBookmark}
          onSelectVideo={(videoId) => {
            const match = learningItems.find((i) => i.sourceId === videoId);
            router.push(`/library/${match?.id || videoId}`);
          }}
          showToast={showToast}
        />
      );
    }

    if (pathname === '/focus') {
      return (
        <FocusView
          activeProfile={activeProfile}
          focusSessions={focusSessions}
          onSaveFocusSession={handleSaveFocusSession}
          showToast={showToast}
        />
      );
    }

    if (pathname === '/roadmaps') {
      return (
        <RoadmapsView
          activeProfile={activeProfile}
          learningItems={learningItems}
          roadmapCompleted={roadmapCompleted}
          onToggleMilestone={handleToggleRoadmapMilestone}
          onSelectVideo={(videoId) => {
            const match = learningItems.find((i) => i.sourceId === videoId);
            router.push(`/library/${match?.id || videoId}`);
          }}
          showToast={showToast}
        />
      );
    }

    if (pathname.startsWith('/settings')) {
      return (
        <SettingsView
          activeProfile={activeProfile}
          profiles={profiles}
          onSelectProfile={handleSelectProfile}
          onCreateProfile={handleCreateProfile}
          platform={platform}
          learningItems={learningItems}
          notes={notes}
          modules={modules}
          onToggleModule={handleToggleModule}
          onSelectAllModules={handleSelectAllModules}
          onDeselectAllModules={handleDeselectAllModules}
          syncDiagnostics={syncDiagnostics}
          isSyncing={isSyncing}
          onSyncNow={handleSyncNow}
          onTogglePauseSync={handleTogglePauseSync}
          onLinkAccount={handleLinkAccount}
          onUnlinkAccount={handleUnlinkAccount}
          onSignOut={handleSignOut}
          showToast={showToast}
        />
      );
    }

    // Default: Dashboard View
    return (
      <DashboardView
        activeProfile={activeProfile}
        learningItems={learningItems}
        progressList={progressList}
        focusSessions={focusSessions}
        notes={notes}
        bookmarks={bookmarks}
        roadmapCompleted={roadmapCompleted}
        onOpenImport={() => setIsAddModalOpen(true)}
        onOpenNotes={() => router.push('/notes')}
        onResumeLecture={() => {
          if (learningItems.length > 0) {
            router.push(`/library/${learningItems[0].id}`);
          }
        }}
        onSelectVideo={(videoId) => {
          const match = learningItems.find((i) => i.sourceId === videoId);
          router.push(`/library/${match?.id || videoId}`);
        }}
      />
    );
  };

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--sf-bg-surface, #ffffff)', color: 'var(--sf-text-primary, #0f172a)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚀</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Initializing LearnUp Desktop...</h2>
          <p style={{ color: 'var(--sf-text-muted, #64748b)', marginTop: '0.5rem' }}>Loading native SQLite storage engine</p>
        </div>
      </div>
    );
  }

  if (!activeProfile || pathname === '/login') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--sf-bg-surface, #ffffff)' }}>
        <AuthLoginClient
          onSelectProfile={async (profileId) => {
            const profs = await platform.storage.listProfiles();
            const target = profs.find((p) => p.id === profileId);
            if (target) {
              await platform.storage.setActiveProfile(target.id);
              setActiveProfile(target);
              router.push('/dashboard');
              showToast(`Logged in as ${target.name}`, 'success');
            }
          }}
          onSelectGuest={async () => {
            let profs = await platform.storage.listProfiles();
            let guest = profs.find((p) => p.isGuest);
            if (!guest) {
              guest = {
                id: `guest_${Date.now()}`,
                name: 'Desktop Guest',
                email: null,
                color: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                initials: 'DG',
                lockType: 'none',
                updatedAt: new Date().toISOString(),
                isGuest: true,
              };
              await platform.storage.saveProfile(guest);
              setProfiles((prev) => [...prev, guest!]);
            }
            await platform.storage.setActiveProfile(guest.id);
            setActiveProfile(guest);
            router.push('/dashboard');
            showToast('Entered guest study workspace', 'info');
          }}
        />
      </div>
    );
  }

  return (
    <AppShell activeProfile={activeProfile} onSignOut={handleSignOut}>
      {renderView()}

      {/* Global Add YouTube Course Modal (Full LearnUp-Web UI & Feature Parity) */}
      <AddCourseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        activeProfileId={activeProfile?.id}
        cloudUserId={activeProfile?.cloudUserId}
        onSuccess={async (courseId) => {
          setIsAddModalOpen(false);
          if (activeProfile) {
            const items = await platform.storage.listLearningItems(activeProfile.id);
            setLearningItems(items);
          }
          if (courseId) {
            router.push(`/library/${courseId}`);
          }
          showToast('Curriculum imported into your private library', 'success');
        }}
      />

      {/* Keyboard Shortcuts Help Modal (F1) */}
      {isShortcutsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsShortcutsModalOpen(false);
          }}
        >
          <div
            style={{
              background: 'var(--sf-bg-surface, #ffffff)',
              border: '1px solid var(--sf-border-subtle, #e2e8f0)',
              borderRadius: '16px',
              padding: '2rem',
              width: '520px',
              maxWidth: '92vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 id="shortcuts-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--sf-text-primary, #0f172a)' }}>
                ⌨️ Native Keyboard Shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--sf-border-default, #cbd5e1)',
                  color: 'var(--sf-text-muted, #64748b)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                }}
                aria-label="Close shortcuts modal"
              >
                ✕
              </button>
            </div>
            <p style={{ color: 'var(--sf-text-muted, #64748b)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Fast in-app navigation designed for desktop productivity without conflicting with text input.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Dashboard', key: 'Ctrl + 1' },
                { label: 'Library', key: 'Ctrl + 2' },
                { label: 'Notes Hub', key: 'Ctrl + 3' },
                { label: 'Focus Session', key: 'Ctrl + 4' },
                { label: 'Skill Roadmaps', key: 'Ctrl + 5' },
                { label: 'Settings & Modules', key: 'Ctrl + 6 or Ctrl + ,' },
                { label: 'Import New Course', key: 'Ctrl + N' },
                { label: 'Close Modals / Dismiss', key: 'Esc' },
                { label: 'Shortcuts Reference', key: 'F1 or ?' },
              ].map((sc) => (
                <div
                  key={sc.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--sf-bg-subtle, #f8fafc)',
                    border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ color: 'var(--sf-text-primary, #0f172a)', fontSize: '0.875rem' }}>{sc.label}</span>
                  <kbd style={{ background: 'var(--sf-bg-surface, #ffffff)', border: '1px solid var(--sf-border-default, #cbd5e1)', color: 'var(--sf-text-primary, #0f172a)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                style={{
                  background: 'var(--sf-accent-primary, #0d9488)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.55rem 1.4rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Toast Container */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 9999,
          maxWidth: '380px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const bg =
            toast.type === 'success'
              ? '#065f46'
              : toast.type === 'error'
              ? '#991b1b'
              : toast.type === 'warning'
              ? '#92400e'
              : '#0f766e';
          const icon =
            toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '⚠ ' : toast.type === 'warning' ? '⚡ ' : 'ℹ ';
          return (
            <div
              key={toast.id}
              style={{
                background: bg,
                color: '#ffffff',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                fontSize: '0.85rem',
                pointerEvents: 'auto',
              }}
            >
              <span>
                <strong>{icon}</strong>
                {toast.message}
              </span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: 0,
                }}
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
