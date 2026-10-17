import React, { useState, useEffect, useMemo } from 'react';
import { getPlatform } from './adapters/platform';
import {
  UserProfile,
  LearningItem,
  DurableNote,
  DurableBookmark,
  DurableProgress,
  FocusSession,
  computeAnalyticsSummary,
  computeWeeklyStudyMinutes,
  computeStudyActivityTimeline,
  parseYouTubeUrl,
  renderFormattedNote,
  CURATED_OFFLINE_ROADMAPS,
  SyncEngine,
  MockSyncTransport,
  AccountLinkingManager,
  SyncDiagnostics,
  AccountLinkPreview,
  createMutationJournalEntry
} from './core';

type ActiveTab = 'dashboard' | 'library' | 'notes' | 'focus' | 'roadmaps' | 'settings';

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export function App() {
  const platform = getPlatform();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Module preferences state with persistence
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
      analytics: false,
      rewards: false,
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
  const [libraryWarning, setLibraryWarning] = useState<string | null>(null);

  // Notes authoring & editing state
  const [noteTitleInput, setNoteTitleInput] = useState('');
  const [noteContentInput, setNoteContentInput] = useState('');
  const [notePreviewMode, setNotePreviewMode] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState('');
  const [editingNoteContent, setEditingNoteContent] = useState('');

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Video bookmarks state
  const [bookmarks, setBookmarks] = useState<DurableBookmark[]>([]);
  const [bookmarkLabelInput, setBookmarkLabelInput] = useState('');
  const [bookmarkTimeInput, setBookmarkTimeInput] = useState('');

  // Search and filter states
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryFilterStatus, setLibraryFilterStatus] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [notesSearchQuery, setNotesSearchQuery] = useState('');

  // Modals & Navigation
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Video player & automatic progress tracking state
  const [autoTrackingActive, setAutoTrackingActive] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number | null>(null);
  const [currentDuration, setCurrentDuration] = useState<number | null>(null);
  const [playerState, setPlayerState] = useState<number | null>(null);
  const lastSavedPosRef = React.useRef<number>(0);
  const lastSaveTimeRef = React.useRef<number>(0);

  // Focus timer state with persistence restoration
  const [focusSeconds, setFocusSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('learnup_focus_seconds');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 0 && val <= 3600) return val;
      }
    } catch {
      // Fallback
    }
    return 1500; // 25 min default
  });
  const [isFocusRunning, setIsFocusRunning] = useState(false);

  // Persist focus timer state
  useEffect(() => {
    try {
      localStorage.setItem('learnup_focus_seconds', focusSeconds.toString());
    } catch {
      // ignore
    }
  }, [focusSeconds]);

  // Focus timer tick & completion handler
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isFocusRunning && focusSeconds > 0) {
      timer = setInterval(() => setFocusSeconds((s) => s - 1), 1000);
    } else if (isFocusRunning && focusSeconds === 0) {
      setIsFocusRunning(false);
      setFocusSeconds(1500);
      if (activeProfile) {
        const completedSession: FocusSession = {
          id: `focus_${Date.now()}`,
          userId: activeProfile.id,
          durationSeconds: 1500,
          mode: 'sprint',
          intervalNumber: 1,
          soundscape: 'silent',
          completed: true,
          createdAt: new Date().toISOString(),
        };
        platform.storage.saveFocusSession(completedSession).then((saved) => {
          setFocusSessions((prev) => [saved, ...prev]);
        });
      }
    }
    return () => clearInterval(timer);
  }, [isFocusRunning, focusSeconds, activeProfile]);

  // Draft autosave for notes
  useEffect(() => {
    if (!activeProfile) return;
    try {
      const saved = localStorage.getItem(`learnup_note_draft_${activeProfile.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setNoteTitleInput(parsed.title);
        if (parsed.content) setNoteContentInput(parsed.content);
      }
    } catch {
      // ignore
    }
  }, [activeProfile?.id]);

  const updateDraft = (title: string, content: string) => {
    setNoteTitleInput(title);
    setNoteContentInput(content);
    if (activeProfile) {
      try {
        localStorage.setItem(`learnup_note_draft_${activeProfile.id}`, JSON.stringify({ title, content }));
      } catch {
        // ignore
      }
    }
  };

  const clearDraft = () => {
    setNoteTitleInput('');
    setNoteContentInput('');
    if (activeProfile) {
      try {
        localStorage.removeItem(`learnup_note_draft_${activeProfile.id}`);
      } catch {
        // ignore
      }
    }
  };

  // Offline-to-Cloud Sync State
  const [syncTransport] = useState(() => new MockSyncTransport());
  const [syncEngine, setSyncEngine] = useState<SyncEngine | null>(null);
  const [syncDiagnostics, setSyncDiagnostics] = useState<SyncDiagnostics | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkEmailInput, setLinkEmailInput] = useState('');
  const [linkPreview, setLinkPreview] = useState<AccountLinkPreview | null>(null);
  const [linkConsent, setLinkConsent] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

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
          color: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
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

  // React to active profile change: load learning items, notes, progress, focus sessions, and roadmap progress
  useEffect(() => {
    if (!isInitialized) return;
    if (!activeProfile) {
      setLearningItems([]);
      setNotes([]);
      setProgressList([]);
      setFocusSessions([]);
      setRoadmapCompleted({});
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
          roadmapProgress[rm.id] = await platform.storage.getRoadmapCompletedMilestones(activeProfile.id, rm.id);
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

  // Derived real analytics summary via Shared Core
  const analytics = useMemo(() => {
    return computeAnalyticsSummary(learningItems, progressList, focusSessions, notes);
  }, [learningItems, progressList, focusSessions, notes]);

  // Derived accurate Resume Lecture target
  const resumeLecture = useMemo(() => {
    if (learningItems.length === 0) return null;
    if (progressList.length > 0) {
      const sorted = [...progressList].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      for (const p of sorted) {
        const match = learningItems.find((item) => item.sourceId === p.youtubeVideoId);
        if (match) {
          return { item: match, progress: p };
        }
      }
    }
    return { item: learningItems[0], progress: undefined };
  }, [learningItems, progressList]);

  // Derived weekly study minutes breakdown (7-day timeline)
  const weeklyStudyMinutes = useMemo(() => {
    return computeWeeklyStudyMinutes(progressList, focusSessions, 7);
  }, [progressList, focusSessions]);

  // Derived offline study activity timeline
  const studyActivityTimeline = useMemo(() => {
    return computeStudyActivityTimeline({
      learningItems,
      progressList,
      focusSessions,
      notes,
      bookmarks,
      roadmapCompleted,
    }, 25);
  }, [learningItems, progressList, focusSessions, notes, bookmarks, roadmapCompleted]);

  // Derived course completion rate
  const courseCompletionPercent = useMemo(() => {
    if (learningItems.length === 0) return 0;
    const completed = progressList.filter((p) => p.isCompleted).length;
    return Math.round((completed / learningItems.length) * 100);
  }, [learningItems, progressList]);

  // Derived roadmap milestones count
  const totalRoadmapMilestonesAchieved = useMemo(() => {
    return Object.values(roadmapCompleted).reduce((acc, list) => acc + list.length, 0);
  }, [roadmapCompleted]);

  // Reset or initialize player state when selectedVideoId changes
  useEffect(() => {
    setAutoTrackingActive(false);
    setCurrentPlaybackTime(null);
    setCurrentDuration(null);
    setPlayerState(null);
    if (selectedVideoId) {
      const p = progressList.find((prog) => prog.youtubeVideoId === selectedVideoId);
      lastSavedPosRef.current = p?.positionSeconds || 0;
      lastSaveTimeRef.current = Date.now();
    }
  }, [selectedVideoId]);

  // YouTube IFrame postMessage listener for automatic playback tracking
  useEffect(() => {
    if (!selectedVideoId || !activeProfile) return;

    const handleWindowMessage = (event: MessageEvent) => {
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== 'object') return;

      // Handle YouTube postMessage infoDelivery
      if (data.event === 'infoDelivery' && data.info) {
        setAutoTrackingActive(true);
        const info = data.info;
        if (typeof info.currentTime === 'number') {
          setCurrentPlaybackTime(info.currentTime);
          const now = Date.now();
          // While playing (playerState === 1), throttle auto-save to once every 5 seconds
          if (info.playerState === 1 && now - lastSaveTimeRef.current >= 5000) {
            if (Math.abs(info.currentTime - lastSavedPosRef.current) >= 3) {
              lastSavedPosRef.current = info.currentTime;
              lastSaveTimeRef.current = now;
              handleSaveProgress(selectedVideoId, Math.floor(info.currentTime), false, false);
            }
          }
        }
        if (typeof info.duration === 'number' && info.duration > 0) {
          setCurrentDuration(info.duration);
        }
        if (typeof info.playerState === 'number') {
          setPlayerState(info.playerState);
          // If paused (2), save immediately
          if (info.playerState === 2 && typeof info.currentTime === 'number') {
            lastSavedPosRef.current = info.currentTime;
            lastSaveTimeRef.current = Date.now();
            handleSaveProgress(selectedVideoId, Math.floor(info.currentTime), false, true);
          }
          // If ended (0), mark completed
          if (info.playerState === 0) {
            const dur = typeof info.duration === 'number' ? info.duration : (currentDuration || 1800);
            handleSaveProgress(selectedVideoId, Math.floor(dur), true, true);
            showToast('Course completed! Recorded to your offline study history 🎉', 'success');
          }
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [selectedVideoId, activeProfile?.id, currentDuration]);

  // Load bookmarks when activeProfile or selectedVideoId changes
  useEffect(() => {
    if (activeProfile && selectedVideoId) {
      platform.storage.listBookmarks(activeProfile.id, { youtubeVideoId: selectedVideoId }).then((bms) => {
        setBookmarks(bms.filter((b) => !b.isDeleted));
      }).catch((err) => {
        console.error('Failed to load bookmarks', err);
      });
    } else {
      setBookmarks([]);
    }
  }, [activeProfile?.id, selectedVideoId]);

  // Filtered learning items by search query and completion status
  const filteredLearningItems = useMemo(() => {
    return learningItems.filter((item) => {
      if (librarySearchQuery.trim()) {
        const q = librarySearchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchAuthor = (item.channelTitle || '').toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor) return false;
      }
      if (libraryFilterStatus === 'completed') {
        const p = progressList.find((prog) => prog.youtubeVideoId === item.sourceId);
        return p?.isCompleted === true;
      }
      if (libraryFilterStatus === 'in_progress') {
        const p = progressList.find((prog) => prog.youtubeVideoId === item.sourceId);
        return p && !p.isCompleted && p.positionSeconds > 0;
      }
      return true;
    });
  }, [learningItems, librarySearchQuery, libraryFilterStatus, progressList]);

  // Filtered notes by search query
  const filteredNotes = useMemo(() => {
    if (!notesSearchQuery.trim()) return notes;
    const q = notesSearchQuery.toLowerCase();
    return notes.filter((n) => {
      const matchTitle = (n.title || '').toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      return matchTitle || matchContent;
    });
  }, [notes, notesSearchQuery]);

  // Real-time network connectivity listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Desktop keyboard shortcuts navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      // Escape key: closes modals and active video player safely
      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          e.preventDefault();
          return;
        }
        if (isLinkModalOpen) {
          setIsLinkModalOpen(false);
          e.preventDefault();
          return;
        }
        if (isAddModalOpen) {
          setIsAddModalOpen(false);
          e.preventDefault();
          return;
        }
        if (selectedVideoId) {
          setSelectedVideoId(null);
          e.preventDefault();
          return;
        }
        if (isTextInput && target) {
          target.blur();
          return;
        }
      }

      // F1 or ? (outside text input): Toggle shortcuts help modal
      if (e.key === 'F1' || (e.key === '?' && !isTextInput && !e.ctrlKey && !e.altKey)) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // In-app navigation shortcuts: Ctrl+1..6 or Alt+1..6
      if ((e.ctrlKey || e.altKey) && !e.shiftKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('dashboard');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('library');
        } else if (e.key === '3' && modules.notes) {
          e.preventDefault();
          setActiveTab('notes');
        } else if (e.key === '4' && modules.focus) {
          e.preventDefault();
          setActiveTab('focus');
        } else if (e.key === '5' && modules.roadmaps) {
          e.preventDefault();
          setActiveTab('roadmaps');
        } else if (e.key === '6' || e.key === ',') {
          e.preventDefault();
          setActiveTab('settings');
        }
      }

      // Ctrl+N: Quick Note (only if not already editing a text field)
      if (e.ctrlKey && (e.key === 'n' || e.key === 'N') && !isTextInput) {
        e.preventDefault();
        if (modules.notes) {
          setActiveTab('notes');
          setTimeout(() => {
            const input = document.getElementById('quick-note-input') as HTMLTextAreaElement | null;
            input?.focus();
          }, 50);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modules, isShortcutsModalOpen, isLinkModalOpen, isAddModalOpen, selectedVideoId]);

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
        console.error('Error fetching diagnostics', e);
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
      await syncEngine.syncProfile(activeProfile.id);
      await refreshPendingCount();
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTogglePauseSync = async () => {
    if (!syncEngine || !activeProfile) return;
    if (syncEngine.getIsPaused()) {
      syncEngine.resume();
    } else {
      syncEngine.pause();
    }
    const diag = await syncEngine.getDiagnostics(activeProfile.id);
    setSyncDiagnostics(diag);
  };

  const handleOpenLinkModal = async () => {
    if (!activeProfile) return;
    try {
      const accountManager = new AccountLinkingManager(platform.storage);
      const preview = await accountManager.generateLinkPreview(
        activeProfile.id,
        activeProfile.cloudUserId || 'pending_link',
        activeProfile.email || 'user@example.com'
      );
      setLinkPreview(preview);
    } catch (err) {
      console.warn('generateLinkPreview fallback:', err);
      setLinkPreview({
        profileId: activeProfile.id,
        profileName: activeProfile.name,
        cloudUserId: 'pending_link',
        cloudUserEmail: activeProfile.email || 'user@example.com',
        notesCount: notes.length,
        coursesCount: learningItems.length,
        progressCount: 0,
        pendingMutationsCount: syncDiagnostics?.pendingCount || 0
      });
    }
    setLinkEmailInput('');
    setLinkConsent(false);
    setIsLinkModalOpen(true);
  };

  const handleConfirmLink = async () => {
    if (!activeProfile || !linkConsent || !linkEmailInput.trim()) return;
    const mockCloudUid = `user_cloud_${Math.random().toString(36).substring(2, 10)}`;
    const accountManager = new AccountLinkingManager(platform.storage);
    const updated = await accountManager.linkProfile(
      activeProfile.id,
      mockCloudUid,
      linkEmailInput.trim()
    );
    setActiveProfile(updated);
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setIsLinkModalOpen(false);
  };

  const handleUnlinkAccount = async () => {
    if (!activeProfile) return;
    if (!confirm('Unlink this profile from cloud account? Local data will remain intact in SQLite.')) return;
    const accountManager = new AccountLinkingManager(platform.storage);
    const updated = await accountManager.unlinkProfile(activeProfile.id);
    setActiveProfile(updated);
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Handle module toggle
  const toggleModule = (id: string) => {
    setModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAllModules = () => {
    setModules({
      focus: true,
      notes: true,
      roadmaps: true,
      analytics: true,
      rewards: true,
    });
  };

  const deselectAllModules = () => {
    setModules({
      focus: false,
      notes: false,
      roadmaps: false,
      analytics: false,
      rewards: false,
    });
  };

  // Add video with duplicate prevention
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrlInput.trim() || !activeProfile) return;

    try {
      const parsed = parseYouTubeUrl(videoUrlInput);
      const videoId = parsed.id;

      // Duplicate check: if already in library, navigate to it and alert user gently
      const existing = learningItems.find((i) => i.sourceId === videoId);
      if (existing) {
        setVideoUrlInput('');
        setIsAddModalOpen(false);
        setSelectedVideoId(existing.sourceId);
        setActiveTab('library');
        setLibraryWarning(`"${existing.title}" is already in your Learning Library.`);
        setTimeout(() => setLibraryWarning(null), 5000);
        return;
      }

      const meta = await platform.fetchYouTubeMetadata(parsed.canonicalUrl);

      const newItem: LearningItem = {
        id: `item_${Date.now()}`,
        userId: activeProfile.id,
        title: meta.title || `${parsed.type === 'playlist' ? 'Playlist' : 'Video'} ${videoId}`,
        sourceType: parsed.type,
        sourceId: videoId,
        thumbnailUrl: meta.thumbnailUrl || (parsed.type === 'video' ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80'),
        channelTitle: meta.author || 'YouTube Creator',
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
      setSelectedVideoId(videoId);
      setActiveTab('library');
      showToast(`Added "${newItem.title}" to library`, 'success');
    } catch (err) {
      showToast(`Failed to add video: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // Video bookmarks handlers
  const handleAddBookmark = async () => {
    if (!activeProfile || !selectedVideoId) return;
    const currentProg = progressList.find((p) => p.youtubeVideoId === selectedVideoId);
    let seconds = currentPlaybackTime !== null ? Math.round(currentPlaybackTime) : (currentProg?.positionSeconds || 0);
    if (bookmarkTimeInput.trim()) {
      const parts = bookmarkTimeInput.trim().split(':').map((p) => parseInt(p, 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        seconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        seconds = parts[0];
      }
    }
    const label = bookmarkLabelInput.trim() || `Bookmark at ${Math.floor(seconds / 60)}:${(Math.round(seconds % 60)).toString().padStart(2, '0')}`;
    const selectedItem = learningItems.find((i) => i.sourceId === selectedVideoId);
    const newBookmark: DurableBookmark = {
      id: `bm_${Date.now()}`,
      userId: activeProfile.id,
      learningItemId: selectedItem?.id || 'general',
      youtubeVideoId: selectedVideoId,
      positionSeconds: seconds,
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
    setBookmarkLabelInput('');
    setBookmarkTimeInput('');
    const mins = Math.floor(seconds / 60);
    const secs = (Math.round(seconds % 60)).toString().padStart(2, '0');
    showToast(`Bookmark "${label}" added at ${mins}:${secs}`, 'success');
  };

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
    showToast('Bookmark deleted', 'info');
  };

  const handleJumpToBookmark = (b: DurableBookmark) => {
    handleSaveProgress(b.youtubeVideoId, b.positionSeconds, false);
    const mins = Math.floor(b.positionSeconds / 60);
    const secs = (Math.round(b.positionSeconds % 60)).toString().padStart(2, '0');
    showToast(`Jumped to bookmark: ${b.label} (${mins}:${secs})`, 'info');
  };

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
      durationSeconds: currentDuration || (existing?.durationSeconds) || 1800,
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

  // Sign out / switch profile
  const handleSignOut = async () => {
    setActiveProfile(null);
    setSelectedVideoId(null);
    setAutoTrackingActive(false);
    setCurrentPlaybackTime(null);
    setCurrentDuration(null);
    setPlayerState(null);
    setLearningItems([]);
    setNotes([]);
    setProgressList([]);
    setFocusSessions([]);
    setRoadmapCompleted({});
  };

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚀</div>
          <h2>Initializing LearnUp Desktop...</h2>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Loading native SQLite storage engine</p>
        </div>
      </div>
    );
  }

  // If signed out, show Profile Chooser
  if (!activeProfile) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#f8fafc' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2.5rem', width: '420px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎓</div>
          <h2>Who is studying?</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: '2rem' }}>
            Select an offline profile or continue as guest
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={async () => {
                  await platform.storage.setActiveProfile(p.id);
                  setActiveProfile(p);
                  showToast(`Switched to profile "${p.name}"`, 'info');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.85rem 1rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {p.initials}
                </div>
                <div>
                  <div style={{ fontWeight: '600' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.isGuest ? 'Local Guest Profile' : p.email}</div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={async () => {
              const newGuest: UserProfile = {
                id: `guest_${Date.now()}`,
                name: `Guest ${profiles.length + 1}`,
                email: null,
                color: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
                initials: `G${profiles.length + 1}`,
                lockType: 'none',
                updatedAt: new Date().toISOString(),
                isGuest: true,
              };
              await platform.storage.saveProfile(newGuest);
              await platform.storage.setActiveProfile(newGuest.id);
              setProfiles((prev) => [...prev, newGuest]);
              setActiveProfile(newGuest);
              showToast(`Created profile "${newGuest.name}"`, 'success');
            }}
            style={{
              width: '100%',
              padding: '0.85rem',
              background: '#6366f1',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Create New Guest Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a', color: '#f8fafc', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', background: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
        {/* Brand */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🚀</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>LearnUp Desktop</div>
            <div style={{ fontSize: '0.7rem', color: isOnline ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#10b981' : '#f59e0b' }} />
              {isOnline ? 'Online (YouTube Sync Ready)' : 'Offline (SQLite Storage)'}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: activeTab === 'dashboard' ? '#334155' : 'transparent',
              border: 'none',
              borderLeft: activeTab === 'dashboard' ? '4px solid #6366f1' : '4px solid transparent',
              color: activeTab === 'dashboard' ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: activeTab === 'dashboard' ? '600' : '500',
              textAlign: 'left',
            }}
          >
            <span>📊</span> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('library')}
            aria-current={activeTab === 'library' ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: activeTab === 'library' ? '#334155' : 'transparent',
              border: 'none',
              borderLeft: activeTab === 'library' ? '4px solid #6366f1' : '4px solid transparent',
              color: activeTab === 'library' ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: activeTab === 'library' ? '600' : '500',
              textAlign: 'left',
            }}
          >
            <span>📚</span> Library ({learningItems.length})
          </button>

          {modules.notes && (
            <button
              onClick={() => setActiveTab('notes')}
              aria-current={activeTab === 'notes' ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: activeTab === 'notes' ? '#334155' : 'transparent',
                border: 'none',
                borderLeft: activeTab === 'notes' ? '4px solid #6366f1' : '4px solid transparent',
                color: activeTab === 'notes' ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: activeTab === 'notes' ? '600' : '500',
                textAlign: 'left',
              }}
            >
              <span>📝</span> Notes ({notes.length})
            </button>
          )}

          {modules.focus && (
            <button
              onClick={() => setActiveTab('focus')}
              aria-current={activeTab === 'focus' ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: activeTab === 'focus' ? '#334155' : 'transparent',
                border: 'none',
                borderLeft: activeTab === 'focus' ? '4px solid #6366f1' : '4px solid transparent',
                color: activeTab === 'focus' ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: activeTab === 'focus' ? '600' : '500',
                textAlign: 'left',
              }}
            >
              <span>⏱️</span> Focus Session
            </button>
          )}

          {modules.roadmaps && (
            <button
              onClick={() => setActiveTab('roadmaps')}
              aria-current={activeTab === 'roadmaps' ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: activeTab === 'roadmaps' ? '#334155' : 'transparent',
                border: 'none',
                borderLeft: activeTab === 'roadmaps' ? '4px solid #6366f1' : '4px solid transparent',
                color: activeTab === 'roadmaps' ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: activeTab === 'roadmaps' ? '600' : '500',
                textAlign: 'left',
              }}
            >
              <span>🗺️</span> Skill Roadmaps
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: activeTab === 'settings' ? '#334155' : 'transparent',
              border: 'none',
              borderLeft: activeTab === 'settings' ? '4px solid #6366f1' : '4px solid transparent',
              color: activeTab === 'settings' ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: activeTab === 'settings' ? '600' : '500',
              textAlign: 'left',
            }}
          >
            <span>⚙️</span> Settings &amp; Modules
          </button>
        </nav>

        {/* User Footer */}
        <div style={{ padding: '1rem', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: activeProfile.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
              {activeProfile.initials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{activeProfile.name}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Guest Mode</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out / Switch Profile"
            style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
        {/* Top Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
              {activeTab === 'dashboard' && 'Study Dashboard'}
              {activeTab === 'library' && 'Learning Library'}
              {activeTab === 'notes' && 'Offline Notes & Key Takeaways'}
              {activeTab === 'focus' && 'Focus Sanctuary & Precision Timer'}
              {activeTab === 'roadmaps' && 'Learning Roadmaps & Progression'}
              {activeTab === 'settings' && 'Desktop Settings & Module Preferences'}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {activeTab === 'dashboard' && 'Track your learning momentum and resume ongoing courses.'}
              {activeTab === 'library' && 'All imported YouTube lectures and playlists with offline metadata.'}
              {activeTab === 'notes' && 'Fast, durable notes saved directly into local SQLite.'}
              {activeTab === 'focus' && 'Distraction-free study timer with local session tracking.'}
              {activeTab === 'roadmaps' && 'Step-by-step career tracks and structured skill milestones.'}
              {activeTab === 'settings' && 'Configure active system modules and storage parameters.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Clear Offline/Online Indicator */}
            <div
              role="status"
              aria-live="polite"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 0.85rem',
                borderRadius: '20px',
                background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                border: isOnline ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                color: isOnline ? '#10b981' : '#f59e0b',
                fontSize: '0.8rem',
                fontWeight: '600',
              }}
              title={isOnline ? 'Online: YouTube playback & metadata live' : 'Offline: Native SQLite safe mode active'}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isOnline ? '#10b981' : '#f59e0b',
                  display: 'inline-block',
                }}
              />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            {/* Keyboard Shortcuts Trigger Button */}
            <button
              onClick={() => setIsShortcutsModalOpen(true)}
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontWeight: '500',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              title="View Keyboard Shortcuts (F1)"
              aria-label="View Keyboard Shortcuts"
            >
              <span>⌨️</span> Shortcuts <kbd style={{ background: '#334155', padding: '1px 5px', borderRadius: '4px', fontSize: '0.75rem' }}>F1</kbd>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem 1.25rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>+</span> Add Video / Playlist
            </button>
          </div>
        </div>

        {/* Tab Content: Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Real Statistics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Study Momentum &amp; Streak</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#f59e0b' }}>
                  🔥 {analytics.activeStreakDays} {analytics.activeStreakDays === 1 ? 'Day' : 'Days'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Longest: {analytics.longestStreakDays}d active
                </div>
              </div>

              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Time Studied (Progress + Focus)</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#38bdf8' }}>
                  ⏱️ {analytics.totalHours}h
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {analytics.totalMinutes} total mins • {analytics.dailyAverageMinutes}m daily avg
                </div>
              </div>

              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Courses in Library</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#818cf8' }}>
                  📚 {analytics.totalCoursesCount}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {analytics.completedCoursesCount} completed ({courseCompletionPercent}%) • {analytics.inProgressCoursesCount} in progress
                </div>
              </div>

              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Focus Sanctuary Sprints</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#10b981' }}>
                  🧘 {analytics.totalFocusSessions}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {Math.round(focusSessions.filter((s) => s.completed).reduce((acc, s) => acc + s.durationSeconds, 0) / 60)} mins focused • {notes.length} notes
                </div>
              </div>

              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Roadmap Achievements</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#a855f7' }}>
                  🗺️ {totalRoadmapMilestonesAchieved}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Milestones achieved across active tracks
                </div>
              </div>
            </div>

            {/* Weekly Study Activity Breakdown (Past 7 Days Bar Chart) */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📊</span> Weekly Study Activity (Past 7 Days)
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                    Daily study minutes from video playback progress and completed focus sprints
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#6366f1', display: 'inline-block' }} /> Video
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981', display: 'inline-block', marginLeft: '0.5rem' }} /> Focus
                  </div>
                  <div style={{ background: '#0f172a', padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>
                    Total: {weeklyStudyMinutes.reduce((acc, d) => acc + d.totalMinutes, 0)} mins
                  </div>
                </div>
              </div>

              {(() => {
                const maxMins = Math.max(30, ...weeklyStudyMinutes.map((d) => d.totalMinutes));
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem', alignItems: 'flex-end', height: '150px', paddingTop: '1rem' }}>
                    {weeklyStudyMinutes.map((day) => {
                      const heightPct = Math.min(100, Math.max(day.totalMinutes > 0 ? 15 : 4, Math.round((day.totalMinutes / maxMins) * 100)));
                      const isToday = day.dayLabel === 'Today';
                      return (
                        <div
                          key={day.date}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                          title={`${day.date}: ${day.totalMinutes} total mins (${day.videoMinutes}m video, ${day.focusMinutes}m focus)`}
                        >
                          <span style={{ fontSize: '0.7rem', color: day.totalMinutes > 0 ? '#38bdf8' : '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                            {day.totalMinutes > 0 ? `${day.totalMinutes}m` : '0m'}
                          </span>
                          <div style={{ width: '100%', maxWidth: '42px', height: '90px', background: '#0f172a', borderRadius: '6px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', padding: '2px' }}>
                            <div
                              style={{
                                width: '100%',
                                height: `${heightPct}%`,
                                background: day.totalMinutes > 0
                                  ? isToday
                                    ? 'linear-gradient(180deg, #10b981, #059669)'
                                    : 'linear-gradient(180deg, #6366f1, #3b82f6)'
                                  : '#1e293b',
                                borderRadius: '4px',
                                transition: 'height 0.3s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: isToday ? '#10b981' : '#94a3b8', fontWeight: isToday ? 700 : 500, marginTop: '6px' }}>
                            {day.dayLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Active Roadmap Progress & Accurate Resume Lecture */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Active Roadmap Card */}
              {CURATED_OFFLINE_ROADMAPS.length > 0 && (() => {
                const activeRm = CURATED_OFFLINE_ROADMAPS[0];
                const totalMilestones = activeRm.phases.reduce((acc, p) => acc + p.milestones.length, 0);
                const completedCount = roadmapCompleted[activeRm.id]?.length || 0;
                const percent = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;
                return (
                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', background: '#334155', color: '#818cf8', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                          Active Track
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                          {percent}% Completed
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
                        {activeRm.title}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.4 }}>
                        {activeRm.description}
                      </p>
                      {/* Visual Progress Bar */}
                      <div style={{ background: '#0f172a', borderRadius: '6px', height: '8px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{ background: 'linear-gradient(90deg, #6366f1, #10b981)', width: `${percent}%`, height: '100%', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {completedCount} of {totalMilestones} Milestones achieved
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('roadmaps')}
                      style={{ marginTop: '1rem', background: '#334155', color: '#f8fafc', border: 'none', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      View Full Roadmap Track →
                    </button>
                  </div>
                );
              })()}

              {/* Resume Lecture Card */}
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Resume Lecture</h2>
                  {!resumeLecture ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                      <p style={{ margin: 0 }}>No courses in your library yet.</p>
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        style={{ marginTop: '0.75rem', background: '#6366f1', border: 'none', color: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        + Add YouTube Lecture
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: '#0f172a', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <img
                          src={resumeLecture.item.thumbnailUrl}
                          alt="Thumbnail"
                          style={{ width: '100px', height: '56px', objectFit: 'cover', borderRadius: '6px' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {resumeLecture.item.title}
                          </h4>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>
                            {resumeLecture.item.channelTitle || 'YouTube'}
                          </p>
                          {resumeLecture.progress && (
                            <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>
                              Saved Position: {Math.floor(resumeLecture.progress.positionSeconds / 60)}m {Math.round(resumeLecture.progress.positionSeconds % 60)}s
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedVideoId(resumeLecture.item.sourceId);
                          setActiveTab('library');
                        }}
                        style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none', padding: '0.65rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                      >
                        ▶ Resume Lecture
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Offline Study Activity Timeline */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⏱️</span> Offline Study Activity Timeline
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                    Chronological record of verified offline learning milestones, focus sprints, and note events
                  </p>
                </div>
                <span style={{ background: '#334155', color: '#f8fafc', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {studyActivityTimeline.length} events
                </span>
              </div>

              {studyActivityTimeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#0f172a', borderRadius: '8px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</div>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>
                    No study activity recorded yet. Start a focus session, study a lecture, or take notes to build your offline timeline!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {studyActivityTimeline.slice(0, 10).map((act) => (
                    <div
                      key={act.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <div style={{ fontSize: '1.25rem', background: '#1e293b', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {act.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {act.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {act.detail}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Courses and Notes Rows */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {/* Recent Courses */}
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Courses</h3>
                {learningItems.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>No recent courses.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {learningItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', background: '#0f172a', padding: '0.65rem 0.85rem', borderRadius: '8px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                          <img src={item.thumbnailUrl} alt={item.title} style={{ width: '48px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.channelTitle}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedVideoId(item.sourceId);
                            setActiveTab('library');
                          }}
                          style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          Play ▶
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Notes */}
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Notes</h3>
                {notes.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>No notes saved yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {notes.slice(0, 3).map((n) => (
                      <div
                        key={n.id}
                        style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '8px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#818cf8' }}>
                            {n.title || 'Untitled Note'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {n.content.slice(0, 80)}{n.content.length > 80 ? '...' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Library */}
        {activeTab === 'library' && (
          <div>
            {libraryWarning && (
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', borderRadius: '8px', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', color: '#fbbf24', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⚠️</span>
                  <span>{libraryWarning}</span>
                </div>
                <button
                  onClick={() => setLibraryWarning(null)}
                  style={{ background: 'transparent', border: 'none', color: '#fbbf24', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>
            )}

            {selectedVideoId && (() => {
              const currentProg = progressList.find((p) => p.youtubeVideoId === selectedVideoId);
              const posSec = currentProg?.positionSeconds || 0;
              const displaySec = currentPlaybackTime !== null ? currentPlaybackTime : posSec;
              const initialStartSec = Math.floor(posSec);

              return (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Active Player &amp; Progress Tracker</h2>
                      {autoTrackingActive ? (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          🟢 Auto-tracking Active
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #0284c7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          ⏱️ Manual Tracking Fallback
                        </span>
                      )}
                      {currentProg?.isCompleted && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedVideoId(null)}
                      style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Close Player ✕
                    </button>
                  </div>
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
                    <iframe
                      id="active-youtube-player-iframe"
                      title="YouTube Video Player"
                      src={`https://www.youtube-nocookie.com/embed/${selectedVideoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin || 'http://localhost')}${initialStartSec > 0 ? `&start=${initialStartSec}` : ''}`}
                      onLoad={(e) => {
                        try {
                          (e.currentTarget as HTMLIFrameElement).contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*');
                        } catch {
                          // ignore
                        }
                      }}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  {/* Progress Tracker Controls */}
                  <div style={{ marginTop: '1rem', background: '#0f172a', padding: '0.85rem 1rem', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                        Track Progress:
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600 }}>
                        ⏱️ {Math.floor(displaySec / 60)}m {(Math.round(displaySec % 60)).toString().padStart(2, '0')}s
                        {currentDuration ? ` / ${Math.floor(currentDuration / 60)}m ${(Math.round(currentDuration % 60)).toString().padStart(2, '0')}s` : ''}
                      </span>
                      {playerState === 1 && (
                        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>▶ Playing</span>
                      )}
                      {playerState === 2 && (
                        <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>⏸ Paused</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleSaveProgress(selectedVideoId, Math.round(displaySec + 300), false, true)}
                        style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        title="Add 5 minutes of study progress"
                      >
                        +5 Min
                      </button>
                      <button
                        onClick={() => handleSaveProgress(selectedVideoId, Math.round(displaySec + 600), false, true)}
                        style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        title="Add 10 minutes of study progress"
                      >
                        +10 Min
                      </button>
                      <button
                        onClick={() => handleSaveProgress(selectedVideoId, Math.max(Math.round(displaySec), 1800), true, true)}
                        style={{ background: '#10b981', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        ✓ Mark Completed
                      </button>
                      <button
                        onClick={() => platform.openExternalUrl(`https://www.youtube.com/watch?v=${selectedVideoId}`)}
                        style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Open on YouTube ↗
                      </button>
                    </div>
                  </div>
                  {/* Video Bookmarks Section */}
                  <div style={{ marginTop: '1.25rem', background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🔖 Video Bookmarks ({bookmarks.length})</span>
                      </h3>
                    </div>

                    {/* Add Bookmark Row */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddBookmark();
                      }}
                      style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}
                    >
                      <input
                        type="text"
                        placeholder={`Time (${Math.floor(posSec / 60)}:${(Math.round(posSec % 60)).toString().padStart(2, '0')})`}
                        value={bookmarkTimeInput}
                        onChange={(e) => setBookmarkTimeInput(e.target.value)}
                        style={{ width: '110px', padding: '0.45rem 0.65rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.8rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Bookmark note / topic..."
                        value={bookmarkLabelInput}
                        onChange={(e) => setBookmarkLabelInput(e.target.value)}
                        style={{ flex: 1, minWidth: '160px', padding: '0.45rem 0.65rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.8rem' }}
                      />
                      <button
                        type="submit"
                        style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        + Add Bookmark
                      </button>
                    </form>

                    {/* Bookmarks List */}
                    {bookmarks.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', padding: '0.5rem 0' }}>
                        No bookmarks for this video yet. Add one at your current study timestamp!
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {bookmarks.map((bm) => {
                          const mins = Math.floor(bm.positionSeconds / 60);
                          const secs = (Math.round(bm.positionSeconds % 60)).toString().padStart(2, '0');
                          return (
                            <div
                              key={bm.id}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #334155' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <button
                                  type="button"
                                  onClick={() => handleJumpToBookmark(bm)}
                                  style={{ background: '#334155', color: '#38bdf8', border: 'none', borderRadius: '4px', padding: '2px 6px', fontFamily: 'monospace', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                                  title="Jump to bookmark timestamp"
                                >
                                  ⏱️ {mins}:{secs}
                                </button>
                                <span style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{bm.label}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteBookmark(bm.id)}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 6px' }}
                                title="Delete Bookmark"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Library Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <input
                type="text"
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                placeholder="🔍 Search courses by title or channel..."
                style={{ flex: 1, minWidth: '220px', padding: '0.6rem 0.85rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.85rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['all', 'in_progress', 'completed'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLibraryFilterStatus(mode)}
                    style={{
                      background: libraryFilterStatus === mode ? '#6366f1' : '#1e293b',
                      color: libraryFilterStatus === mode ? '#fff' : '#94a3b8',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '0.5rem 0.85rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: libraryFilterStatus === mode ? 600 : 400,
                    }}
                  >
                    {mode === 'all' ? 'All' : mode === 'in_progress' ? 'In Progress' : 'Completed'}
                  </button>
                ))}
              </div>
            </div>

            {filteredLearningItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#94a3b8' }}>
                {learningItems.length === 0 ? (
                  <p style={{ margin: 0 }}>Your Learning Library is empty. Click "+ Add Video" above to import YouTube courses!</p>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 0.75rem 0' }}>No courses match "{librarySearchQuery}" or the active filter.</p>
                    <button
                      onClick={() => {
                        setLibrarySearchQuery('');
                        setLibraryFilterStatus('all');
                      }}
                      style={{ background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Clear Search &amp; Filters
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {filteredLearningItems.map((item) => (
                  <div key={item.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <img src={item.thumbnailUrl} alt={item.title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                    <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem', lineHeight: '1.3' }}>{item.title}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{item.channelTitle || 'YouTube'}</p>
                      </div>
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setSelectedVideoId(item.sourceId)}
                          style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Play Video
                        </button>
                        <button
                          onClick={async () => {
                            if (!activeProfile) return;
                            if (!window.confirm(`Delete "${item.title}" from your library and local SQLite?`)) return;
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
                            if (selectedVideoId === item.sourceId) setSelectedVideoId(null);
                            showToast('Course removed from library', 'info');
                          }}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 0.75rem', cursor: 'pointer' }}
                          title="Delete Course"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Notes */}
        {activeTab === 'notes' && (
          <div>
            {/* Note Creation Card */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>New Study Note</h2>
                <button
                  onClick={() => setNotePreviewMode(!notePreviewMode)}
                  style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  {notePreviewMode ? '✏️ Edit Mode' : '👁️ Preview Markdown/LaTeX'}
                </button>
              </div>

              {/* Title input */}
              <input
                type="text"
                value={noteTitleInput}
                onChange={(e) => updateDraft(e.target.value, noteContentInput)}
                placeholder="Note title (e.g. Asynchronous Rust, SQLite WAL Mode, React Hooks)..."
                style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', marginBottom: '0.75rem', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />

              {/* Content input or preview */}
              {!notePreviewMode ? (
                <textarea
                  id="quick-note-input"
                  value={noteContentInput}
                  onChange={(e) => updateDraft(noteTitleInput, e.target.value)}
                  placeholder="Write concepts, bullet points (- point), code (```code```), or math equations ($$ E=mc^2 $$)... Draft autosaves locally."
                  style={{ width: '100%', height: '100px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.75rem', color: '#f8fafc', resize: 'vertical', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              ) : (
                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '1rem', minHeight: '80px', marginBottom: '0.5rem' }}>
                  {noteContentInput.trim() ? (
                    renderFormattedNote(noteContentInput)
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Draft preview will appear here...</span>
                  )}
                </div>
              )}

              <button
                onClick={async () => {
                  if (!noteContentInput.trim() || !activeProfile) return;
                  const newNote: DurableNote = {
                    id: `note_${Date.now()}`,
                    userId: activeProfile.id,
                    learningItemId: 'general',
                    youtubeVideoId: 'general',
                    title: noteTitleInput.trim() || 'Untitled Note',
                    content: noteContentInput.trim(),
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
                    localVersion: newNote.version,
                    payload: newNote as unknown as Record<string, unknown>,
                  });
                  await platform.storage.appendMutation(mut);
                  await refreshPendingCount();
                  setNotes((prev) => [newNote, ...prev]);
                  clearDraft();
                  showToast('Note saved to SQLite', 'success');
                }}
                style={{ marginTop: '0.75rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.6rem 1.25rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
              >
                Save Note to SQLite
              </button>
            </div>

            {/* Notes Search Bar */}
            <div style={{ marginBottom: '1.25rem' }}>
              <input
                type="text"
                value={notesSearchQuery}
                onChange={(e) => setNotesSearchQuery(e.target.value)}
                placeholder="🔍 Search notes by title or content..."
                style={{ width: '100%', padding: '0.6rem 0.85rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>

            {/* Notes List with Inline Editing and Delete Confirmation */}
            {filteredNotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#1e293b', borderRadius: '10px', border: '1px solid #334155', color: '#94a3b8' }}>
                {notes.length === 0 ? (
                  <p style={{ margin: 0 }}>No notes saved yet. Write your first study note above!</p>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 0.5rem 0' }}>No notes found matching "{notesSearchQuery}".</p>
                    <button
                      onClick={() => setNotesSearchQuery('')}
                      style={{ background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Clear Search
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredNotes.map((n) => {
                  const isEditing = editingNoteId === n.id;
                  return (
                    <div key={n.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.25rem' }}>
                      {isEditing ? (
                        <div>
                          <input
                            type="text"
                            value={editingNoteTitle}
                            onChange={(e) => setEditingNoteTitle(e.target.value)}
                            placeholder="Note title..."
                            style={{ width: '100%', padding: '0.5rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', marginBottom: '0.5rem', boxSizing: 'border-box' }}
                          />
                          <textarea
                            value={editingNoteContent}
                            onChange={(e) => setEditingNoteContent(e.target.value)}
                            style={{ width: '100%', height: '80px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: '#f8fafc', resize: 'vertical', boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                              onClick={async () => {
                                if (!activeProfile) return;
                                const updated: DurableNote = {
                                  ...n,
                                  title: editingNoteTitle.trim() || 'Untitled Note',
                                  content: editingNoteContent.trim(),
                                  updatedAt: new Date().toISOString(),
                                  version: n.version + 1,
                                };
                                await platform.storage.saveNote(updated);
                                const mut = createMutationJournalEntry({
                                  userId: activeProfile.id,
                                  cloudUserId: activeProfile.cloudUserId,
                                  entityType: 'note',
                                  entityId: updated.id,
                                  operation: 'UPDATE',
                                  baseVersion: n.version,
                                  localVersion: updated.version,
                                  payload: updated as unknown as Record<string, unknown>,
                                });
                                await platform.storage.appendMutation(mut);
                                await refreshPendingCount();
                                setNotes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
                                setEditingNoteId(null);
                                showToast('Note updated', 'success');
                              }}
                              style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => setEditingNoteId(null)}
                              style={{ background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                              {n.title || 'Untitled Note'}
                            </h4>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <button
                                onClick={() => {
                                  setEditingNoteId(n.id);
                                  setEditingNoteTitle(n.title || '');
                                  setEditingNoteContent(n.content);
                                }}
                                style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                                title="Edit Note"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={async () => {
                                  if (!activeProfile) return;
                                  if (!window.confirm('Are you sure you want to delete this note from SQLite?')) return;
                                  await platform.storage.markNoteDeleted(activeProfile.id, n.id);
                                  const mut = createMutationJournalEntry({
                                    userId: activeProfile.id,
                                    cloudUserId: activeProfile.cloudUserId,
                                    entityType: 'note',
                                    entityId: n.id,
                                    operation: 'DELETE',
                                    baseVersion: n.version,
                                    localVersion: n.version + 1,
                                    payload: { id: n.id, isDeleted: true },
                                  });
                                  await platform.storage.appendMutation(mut);
                                  await refreshPendingCount();
                                  setNotes((prev) => prev.filter((note) => note.id !== n.id));
                                  showToast('Note deleted', 'info');
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                                title="Delete Note"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <div style={{ marginBottom: '0.75rem' }}>
                            {renderFormattedNote(n.content)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Created: {new Date(n.createdAt).toLocaleString()}</span>
                            <span style={{ color: n.syncStatus === 'synced' ? '#10b981' : '#38bdf8' }}>
                              ● {n.syncStatus} (v{n.version})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Focus */}
        {activeTab === 'focus' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: '1.5rem', color: '#6366f1' }}>
                {Math.floor(focusSeconds / 60).toString().padStart(2, '0')}:{(focusSeconds % 60).toString().padStart(2, '0')}
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIsFocusRunning(!isFocusRunning)}
                  style={{
                    background: isFocusRunning ? '#f59e0b' : '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 2rem',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  {isFocusRunning ? 'Pause' : 'Start Focus'}
                </button>
                <button
                  onClick={() => {
                    setIsFocusRunning(false);
                    setFocusSeconds(1500);
                  }}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={async () => {
                    if (!activeProfile) return;
                    setIsFocusRunning(false);
                    setFocusSeconds(1500);
                    const completedSession: FocusSession = {
                      id: `focus_${Date.now()}`,
                      userId: activeProfile.id,
                      durationSeconds: 1500,
                      mode: 'sprint',
                      intervalNumber: 1,
                      soundscape: 'silent',
                      completed: true,
                      createdAt: new Date().toISOString(),
                    };
                    const saved = await platform.storage.saveFocusSession(completedSession);
                    setFocusSessions((prev) => [saved, ...prev]);
                  }}
                  style={{
                    background: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.25rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                  title="Complete session and record in SQLite"
                >
                  ✓ Finish Sprint Early &amp; Save
                </button>
              </div>
            </div>

            {/* Recent Focus Sessions History */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Completed Focus Sessions ({focusSessions.length})
              </h3>
              {focusSessions.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  No completed focus sprints recorded in SQLite yet. Start a focus session above!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {focusSessions.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span>🧘</span>
                        <span style={{ fontWeight: 600, color: '#f8fafc', textTransform: 'capitalize' }}>{s.mode}</span>
                        <span style={{ color: '#94a3b8' }}>• {Math.round(s.durationSeconds / 60)} min</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                          {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.75rem' }}>✓ Completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Roadmaps */}
        {activeTab === 'roadmaps' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {CURATED_OFFLINE_ROADMAPS.map((roadmap) => {
                const completedMilestones = roadmapCompleted[roadmap.id] || [];
                const totalMilestones = roadmap.phases.reduce((acc, p) => acc + p.milestones.length, 0);
                const percent = totalMilestones > 0 ? Math.round((completedMilestones.length / totalMilestones) * 100) : 0;

                return (
                  <div key={roadmap.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', background: '#334155', color: '#818cf8', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                            {roadmap.category}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            ⏱️ {roadmap.estimatedWeeks} Weeks • {roadmap.difficulty}
                          </span>
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.5rem', color: '#f8fafc' }}>
                          {roadmap.title}
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, maxWidth: '700px', lineHeight: 1.5 }}>
                          {roadmap.description}
                        </p>
                      </div>

                      {/* Percentage & Progress Bar */}
                      <div style={{ minWidth: '180px', textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: percent === 100 ? '#10b981' : '#6366f1' }}>
                          {percent}% Complete
                        </div>
                        <div style={{ background: '#0f172a', borderRadius: '6px', height: '8px', overflow: 'hidden', marginTop: '0.5rem', width: '180px' }}>
                          <div style={{ background: 'linear-gradient(90deg, #6366f1, #10b981)', width: `${percent}%`, height: '100%', transition: 'width 0.3s ease' }} />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                          {completedMilestones.length} of {totalMilestones} Milestones Achieved
                        </div>
                      </div>
                    </div>

                    {/* Interactive Phases & Milestones */}
                    <div style={{ borderTop: '1px solid #334155', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {roadmap.phases.map((phase) => (
                        <div key={phase.id} style={{ background: '#0f172a', borderRadius: '8px', padding: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                              {phase.title}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{phase.estimatedHours}h est.</span>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.75rem' }}>
                            {phase.objective}
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {phase.milestones.map((m) => {
                              const isCompleted = completedMilestones.includes(m.id);
                              return (
                                <div
                                  key={m.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: isCompleted ? 'rgba(16, 185, 129, 0.08)' : '#1e293b',
                                    border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #334155',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: '6px',
                                  }}
                                >
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1 }}>
                                    <input
                                      type="checkbox"
                                      checked={isCompleted}
                                      onChange={async (e) => {
                                        if (!activeProfile) return;
                                        const checked = e.target.checked;
                                        await platform.storage.toggleRoadmapMilestone(activeProfile.id, roadmap.id, m.id, checked);
                                        setRoadmapCompleted((prev) => {
                                          const curr = prev[roadmap.id] || [];
                                          const next = checked ? [...curr, m.id] : curr.filter((id) => id !== m.id);
                                          return { ...prev, [roadmap.id]: next };
                                        });
                                      }}
                                      style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
                                    />
                                    <div>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isCompleted ? '#10b981' : '#f8fafc', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                                        {m.title}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        {m.learningObjectives.join(' • ')}
                                      </div>
                                    </div>
                                  </label>

                                  {m.resources[0]?.canonicalUrl && (
                                    <button
                                      onClick={() => {
                                        const vId = m.resources[0].canonicalUrl.match(/v=([a-zA-Z0-9_-]{11})/)?.[1];
                                        if (vId) {
                                          setSelectedVideoId(vId);
                                          setActiveTab('library');
                                        }
                                      }}
                                      style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                    >
                                      Study Video ▶
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Explicit Cloud-Only Feature Marker */}
              <div style={{ background: '#0f172a', border: '1px dashed #475569', borderRadius: '12px', padding: '1.25rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>☁️</div>
                <div style={{ fontWeight: 600, color: '#cbd5e1', fontSize: '0.9rem' }}>
                  Cloud Roadmaps &amp; AI Personalized Curricula
                </div>
                <p style={{ fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                  [Cloud / Enterprise Feature] Multi-device roadmap synchronization and generative pathfinding are available when linked to an authenticated Supabase backend.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Settings & Module Preferences */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: '650px' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem' }}>Modular System Registry</h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Enable or disable optional desktop modules</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={selectAllModules}
                    style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllModules}
                    style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(modules).map(([id, enabled]) => (
                  <label
                    key={id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: '#0f172a',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{id} Module</span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleModule(id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Offline-to-Cloud Sync Diagnostics & Control */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem' }}>Cloud Synchronization Foundation (SF-122)</h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Local SQLite durable journal with transport-independent sync engine
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: isOnline ? '#10b981' : '#ef4444',
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: isOnline ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Status details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Account Link Status</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '0.25rem', color: activeProfile?.cloudUserId ? '#60a5fa' : '#a78bfa' }}>
                    {activeProfile?.cloudUserId ? (
                      <div>
                        <span>Linked: {activeProfile.cloudUserEmail || 'Authenticated Cloud User'}</span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal', marginTop: '2px' }}>
                          Cloud ID: {activeProfile.cloudUserId}
                        </div>
                      </div>
                    ) : (
                      'Local Guest Mode (Unlinked)'
                    )}
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Pending Journal Mutations</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.25rem', color: (syncDiagnostics?.pendingCount || 0) > 0 ? '#f59e0b' : '#10b981' }}>
                    {syncDiagnostics?.pendingCount ?? 0}
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Sync State</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '0.25rem', color: syncDiagnostics?.isPaused ? '#f59e0b' : isSyncing ? '#60a5fa' : '#10b981' }}>
                    {syncDiagnostics?.isPaused ? '⏸ PAUSED' : isSyncing ? '🔄 SYNCING...' : 'IDLE (Ready)'}
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Last Sync Attempt</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#cbd5e1' }}>
                    {syncDiagnostics?.lastSyncTimestamp ? new Date(syncDiagnostics.lastSyncTimestamp).toLocaleTimeString() : 'Never'}
                  </div>
                </div>
              </div>

              {/* Safety notice regarding mock vs live */}
              <div style={{ background: '#091e3a', border: '1px solid #1e3a8a', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#93c5fd' }}>
                🛡️ <strong>Safety Guarantee:</strong> Currently running in <code>MockSyncTransport</code> isolated test mode. Local SQLite is the offline source of truth. No production Supabase service-role keys are exposed in this desktop client.
              </div>

              {/* Actions row */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing || syncDiagnostics?.isPaused}
                  style={{
                    background: isSyncing || syncDiagnostics?.isPaused ? '#475569' : '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.6rem 1.2rem',
                    fontWeight: 600,
                    cursor: isSyncing || syncDiagnostics?.isPaused ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>

                <button
                  onClick={handleTogglePauseSync}
                  style={{
                    background: syncDiagnostics?.isPaused ? '#10b981' : '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.6rem 1.2rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {syncDiagnostics?.isPaused ? 'Resume Sync' : 'Pause Sync'}
                </button>

                {activeProfile?.cloudUserId ? (
                  <button
                    onClick={handleUnlinkAccount}
                    style={{
                      background: 'transparent',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      borderRadius: '6px',
                      padding: '0.6rem 1.2rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Unlink Account
                  </button>
                ) : (
                  <button
                    onClick={handleOpenLinkModal}
                    style={{
                      background: '#0284c7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.6rem 1.2rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Link to Cloud Account...
                  </button>
                )}
              </div>
            </div>

            {/* Storage Info */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Storage Architecture Diagnostics</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Platform: {platform.capabilities.platformName} | Native Desktop: {platform.capabilities.isNativeDesktop ? 'Yes' : 'No'}
              </p>
              <button
                onClick={async () => {
                  const check = await platform.storage.runIntegrityCheck();
                  showToast(
                    `Storage Integrity Check: ${check.ok ? 'PASSED (0 issues)' : 'FAILED'}`,
                    check.ok ? 'success' : 'error'
                  );
                }}
                style={{ background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                Run Database Integrity Check
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Add Video Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem', width: '480px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Add YouTube Video to Library</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Enter any YouTube video or playlist URL. Metadata is saved in local SQLite.
            </p>

            <form onSubmit={handleAddVideo}>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  marginBottom: '1.5rem',
                }}
                autoFocus
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', padding: '0.6rem 1.2rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.6rem 1.2rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Import Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Linking Modal */}
      {isLinkModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLinkModalOpen(false);
          }}
        >
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem', width: '520px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Link Profile to Cloud Account</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Preview local data before linking. Offline data remains preserved locally in SQLite.
            </p>

            {linkPreview && (
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Local Data Preview (Will be linked to cloud)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>Profile: <strong>{linkPreview.profileName}</strong></div>
                  <div>Notes to Sync: <strong>{linkPreview.notesCount}</strong></div>
                  <div>Courses to Sync: <strong>{linkPreview.coursesCount}</strong></div>
                  <div>Progress Records: <strong>{linkPreview.progressCount}</strong></div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                Target Supabase User Email:
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={linkEmailInput}
                onChange={(e) => setLinkEmailInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={linkConsent}
                onChange={(e) => setLinkConsent(e.target.checked)}
                style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
              />
              <span>
                I authorize linking this local guest profile to my cloud account and syncing pending mutations.
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', padding: '0.6rem 1.2rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                disabled={!linkConsent || !linkEmailInput.trim()}
                style={{
                  background: !linkConsent || !linkEmailInput.trim() ? '#475569' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.2rem',
                  fontWeight: '600',
                  cursor: !linkConsent || !linkEmailInput.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                Confirm & Enable Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {isShortcutsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsShortcutsModalOpen(false);
          }}
        >
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem', width: '520px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 id="shortcuts-modal-title" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>⌨️ Native Keyboard Shortcuts</h2>
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
                aria-label="Close shortcuts modal"
              >
                ✕
              </button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Fast in-app navigation designed for desktop productivity without conflicting with text input.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#0f172a', borderRadius: '6px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Dashboard</span>
                <kbd style={{ background: '#334155', color: '#f8fafc', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>Ctrl + 1</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#0f172a', borderRadius: '6px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Library</span>
                <kbd style={{ background: '#334155', color: '#f8fafc', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>Ctrl + 2</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#0f172a', borderRadius: '6px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Notes</span>
                <kbd style={{ background: '#334155', color: '#f8fafc', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>Ctrl + 3</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#0f172a', borderRadius: '6px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Focus Session</span>
                <kbd style={{ background: '#334155', color: '#f8fafc', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>Ctrl + 4</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#0f172a', borderRadius: '6px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Skill Roadmaps</span>
                <kbd style={{ background: '#334155', color: '#f8fafc', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>Ctrl + 5</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#0f172a', borderRadius: '6px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Settings & Modules</span>
                <kbd style={{ background: '#334155', color: '#f8fafc', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>Ctrl + 6 or Ctrl + ,</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#0f172a', borderRadius: '6px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Create Quick Note</span>
                <kbd style={{ background: '#334155', color: '#f8fafc', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>Ctrl + N</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#0f172a', borderRadius: '6px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Close Modals / Dismiss</span>
                <kbd style={{ background: '#334155', color: '#f8fafc', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>Esc</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#0f172a', borderRadius: '6px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Shortcuts Reference</span>
                <kbd style={{ background: '#334155', color: '#f8fafc', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>F1 or ?</kbd>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.55rem 1.4rem', fontWeight: '600', cursor: 'pointer' }}
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
              : '#1e293b';
          const border =
            toast.type === 'success'
              ? '#10b981'
              : toast.type === 'error'
              ? '#ef4444'
              : toast.type === 'warning'
              ? '#f59e0b'
              : '#475569';
          const icon =
            toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '⚠ ' : toast.type === 'warning' ? '⚡ ' : 'ℹ ';
          return (
            <div
              key={toast.id}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                color: '#f8fafc',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
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
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#cbd5e1',
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
    </div>
  );
}
