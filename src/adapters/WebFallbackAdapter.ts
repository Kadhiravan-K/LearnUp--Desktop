import {
  IStorageAdapter,
  UserProfile,
  DurableNote,
  DurableBookmark,
  DurableProgress,
  LearningItem,
  MutationJournalEntry,
  MutationState,
  FocusSession,
} from '../types/contracts';

export class WebFallbackAdapter implements IStorageAdapter {
  private profilesKey = 'learnup_profiles_v1';
  private activeProfileKey = 'learnup_active_profile_v1';
  private notesKey = 'learnup_notes_v1';
  private bookmarksKey = 'learnup_bookmarks_v1';
  private progressKey = 'learnup_progress_v1';
  private learningItemsKey = 'learnup_items_v1';
  private mutationsKey = 'learnup_mutations_v1';
  private focusKey = 'learnup_focus_v1';
  private roadmapsKey = 'learnup_roadmaps_v1';

  public async init(): Promise<void> {
    // Ensure default guest profile exists if none present
    const profiles = await this.listProfiles();
    if (profiles.length === 0) {
      const defaultGuest: UserProfile = {
        id: 'guest_local_default',
        name: 'Guest Learner',
        email: null,
        color: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
        initials: 'GL',
        lockType: 'none',
        updatedAt: new Date().toISOString(),
        isGuest: true,
      };
      await this.saveProfile(defaultGuest);
      await this.setActiveProfile(defaultGuest.id);
    }
  }

  public async close(): Promise<void> {}

  private getItem<T>(key: string): T[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private setItem<T>(key: string, value: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  }

  // Profiles
  public async listProfiles(): Promise<UserProfile[]> {
    return this.getItem<UserProfile>(this.profilesKey);
  }

  public async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const list = this.getItem<UserProfile>(this.profilesKey);
    const idx = list.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      list[idx] = profile;
    } else {
      list.push(profile);
    }
    this.setItem(this.profilesKey, list);
    return profile;
  }

  public async getActiveProfile(): Promise<UserProfile | null> {
    const activeId = localStorage.getItem(this.activeProfileKey);
    if (!activeId) return null;
    const profiles = await this.listProfiles();
    return profiles.find((p) => p.id === activeId) || null;
  }

  public async setActiveProfile(profileId: string): Promise<void> {
    localStorage.setItem(this.activeProfileKey, profileId);
  }

  // Notes
  public async getNote(userId: string, noteId: string): Promise<DurableNote | null> {
    const list = this.getItem<DurableNote>(this.notesKey);
    return list.find((n) => n.userId === userId && n.id === noteId && !n.isDeleted) || null;
  }

  public async listNotes(userId: string, filters?: { learningItemId?: string; youtubeVideoId?: string }): Promise<DurableNote[]> {
    let list = this.getItem<DurableNote>(this.notesKey).filter((n) => n.userId === userId && !n.isDeleted);
    if (filters?.learningItemId) {
      list = list.filter((n) => n.learningItemId === filters.learningItemId);
    }
    if (filters?.youtubeVideoId) {
      list = list.filter((n) => n.youtubeVideoId === filters.youtubeVideoId);
    }
    return list;
  }

  public async saveNote(note: DurableNote): Promise<DurableNote> {
    const list = this.getItem<DurableNote>(this.notesKey);
    const idx = list.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      list[idx] = note;
    } else {
      list.push(note);
    }
    this.setItem(this.notesKey, list);
    return note;
  }

  public async markNoteDeleted(userId: string, noteId: string): Promise<void> {
    const list = this.getItem<DurableNote>(this.notesKey);
    const note = list.find((n) => n.id === noteId && n.userId === userId);
    if (note) {
      note.isDeleted = true;
      note.tombstoneAt = new Date().toISOString();
      this.setItem(this.notesKey, list);
    }
  }

  // Bookmarks
  public async getBookmark(userId: string, bookmarkId: string): Promise<DurableBookmark | null> {
    const list = this.getItem<DurableBookmark>(this.bookmarksKey);
    return list.find((b) => b.userId === userId && b.id === bookmarkId && !b.isDeleted) || null;
  }

  public async listBookmarks(userId: string, filters?: { learningItemId?: string; youtubeVideoId?: string }): Promise<DurableBookmark[]> {
    let list = this.getItem<DurableBookmark>(this.bookmarksKey).filter((b) => b.userId === userId && !b.isDeleted);
    if (filters?.learningItemId) {
      list = list.filter((b) => b.learningItemId === filters.learningItemId);
    }
    if (filters?.youtubeVideoId) {
      list = list.filter((b) => b.youtubeVideoId === filters.youtubeVideoId);
    }
    return list;
  }

  public async saveBookmark(bookmark: DurableBookmark): Promise<DurableBookmark> {
    const list = this.getItem<DurableBookmark>(this.bookmarksKey);
    const idx = list.findIndex((b) => b.id === bookmark.id);
    if (idx >= 0) {
      list[idx] = bookmark;
    } else {
      list.push(bookmark);
    }
    this.setItem(this.bookmarksKey, list);
    return bookmark;
  }

  public async markBookmarkDeleted(userId: string, bookmarkId: string): Promise<void> {
    const list = this.getItem<DurableBookmark>(this.bookmarksKey);
    const bm = list.find((b) => b.id === bookmarkId && b.userId === userId);
    if (bm) {
      bm.isDeleted = true;
      bm.tombstoneAt = new Date().toISOString();
      this.setItem(this.bookmarksKey, list);
    }
  }

  // Progress
  public async getProgress(userId: string, youtubeVideoId: string): Promise<DurableProgress | null> {
    const list = this.getItem<DurableProgress>(this.progressKey);
    return list.find((p) => p.userId === userId && p.youtubeVideoId === youtubeVideoId && !p.isDeleted) || null;
  }

  public async listProgress(userId: string): Promise<DurableProgress[]> {
    return this.getItem<DurableProgress>(this.progressKey).filter((p) => p.userId === userId && !p.isDeleted);
  }

  public async saveProgress(progress: DurableProgress): Promise<DurableProgress> {
    const list = this.getItem<DurableProgress>(this.progressKey);
    const idx = list.findIndex((p) => p.id === progress.id || (p.userId === progress.userId && p.youtubeVideoId === progress.youtubeVideoId));
    if (idx >= 0) {
      list[idx] = progress;
    } else {
      list.push(progress);
    }
    this.setItem(this.progressKey, list);
    return progress;
  }

  // Learning Items
  public async listLearningItems(userId: string): Promise<LearningItem[]> {
    return this.getItem<LearningItem>(this.learningItemsKey).filter((i) => i.userId === userId);
  }

  public async saveLearningItem(item: LearningItem): Promise<LearningItem> {
    const list = this.getItem<LearningItem>(this.learningItemsKey);
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    this.setItem(this.learningItemsKey, list);
    return item;
  }

  public async deleteLearningItem(userId: string, itemId: string): Promise<void> {
    const list = this.getItem<LearningItem>(this.learningItemsKey).filter((i) => !(i.userId === userId && i.id === itemId));
    this.setItem(this.learningItemsKey, list);
  }

  // Mutations
  public async appendMutation(mutation: MutationJournalEntry): Promise<MutationJournalEntry> {
    const list = this.getItem<MutationJournalEntry>(this.mutationsKey);
    const idx = list.findIndex((m) => m.id === mutation.id);
    if (idx >= 0) {
      list[idx] = mutation;
    } else {
      list.push(mutation);
    }
    this.setItem(this.mutationsKey, list);
    return mutation;
  }

  public async getPendingMutations(userId: string): Promise<MutationJournalEntry[]> {
    return this.getItem<MutationJournalEntry>(this.mutationsKey).filter(
      (m) => m.userId === userId && (m.status === 'pending' || m.status === 'retryable_failure' || m.status === 'in_flight')
    );
  }

  public async updateMutationStatus(mutationId: string, status: MutationState, error?: string): Promise<void> {
    const list = this.getItem<MutationJournalEntry>(this.mutationsKey);
    const mut = list.find((m) => m.id === mutationId);
    if (mut) {
      mut.status = status;
      if (error) mut.errorMessage = error;
      if (status === 'retryable_failure') {
        mut.retryCount = (mut.retryCount || 0) + 1;
        mut.lastAttemptAt = new Date().toISOString();
      }
      this.setItem(this.mutationsKey, list);
    }
  }

  public async deleteMutation(mutationId: string): Promise<void> {
    const list = this.getItem<MutationJournalEntry>(this.mutationsKey).filter((m) => m.id !== mutationId);
    this.setItem(this.mutationsKey, list);
  }

  // Focus Sessions
  public async saveFocusSession(session: FocusSession): Promise<FocusSession> {
    const list = this.getItem<FocusSession>(this.focusKey);
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      list[idx] = session;
    } else {
      list.push(session);
    }
    this.setItem(this.focusKey, list);
    return session;
  }

  public async listFocusSessions(userId: string): Promise<FocusSession[]> {
    return this.getItem<FocusSession>(this.focusKey)
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Roadmap Progress
  public async toggleRoadmapMilestone(userId: string, roadmapId: string, milestoneId: string, completed: boolean): Promise<void> {
    interface StoredMilestone {
      userId: string;
      roadmapId: string;
      milestoneId: string;
      completed: boolean;
    }
    let list = this.getItem<StoredMilestone>(this.roadmapsKey);
    if (completed) {
      if (!list.some((m) => m.userId === userId && m.roadmapId === roadmapId && m.milestoneId === milestoneId)) {
        list.push({ userId, roadmapId, milestoneId, completed: true });
      }
    } else {
      list = list.filter((m) => !(m.userId === userId && m.roadmapId === roadmapId && m.milestoneId === milestoneId));
    }
    this.setItem(this.roadmapsKey, list);
  }

  public async getRoadmapCompletedMilestones(userId: string, roadmapId: string): Promise<string[]> {
    interface StoredMilestone {
      userId: string;
      roadmapId: string;
      milestoneId: string;
      completed: boolean;
    }
    const list = this.getItem<StoredMilestone>(this.roadmapsKey);
    return list
      .filter((m) => m.userId === userId && m.roadmapId === roadmapId && m.completed)
      .map((m) => m.milestoneId);
  }

  public async purgeAccountData(userId: string): Promise<void> {
    const notes = this.getItem<DurableNote>(this.notesKey).filter((n) => n.userId !== userId);
    this.setItem(this.notesKey, notes);

    const bookmarks = this.getItem<DurableBookmark>(this.bookmarksKey).filter((b) => b.userId !== userId);
    this.setItem(this.bookmarksKey, bookmarks);

    const progress = this.getItem<DurableProgress>(this.progressKey).filter((p) => p.userId !== userId);
    this.setItem(this.progressKey, progress);

    const items = this.getItem<LearningItem>(this.learningItemsKey).filter((i) => i.userId !== userId);
    this.setItem(this.learningItemsKey, items);

    const focus = this.getItem<FocusSession>(this.focusKey).filter((s) => s.userId !== userId);
    this.setItem(this.focusKey, focus);

    interface StoredMilestone {
      userId: string;
      roadmapId: string;
      milestoneId: string;
      completed: boolean;
    }
    const roadmaps = this.getItem<StoredMilestone>(this.roadmapsKey).filter((m) => m.userId !== userId);
    this.setItem(this.roadmapsKey, roadmaps);
  }

  public async runIntegrityCheck(): Promise<{ ok: boolean; issues: string[] }> {
    return { ok: true, issues: [] };
  }
}
