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

interface TauriInvoke {
  <T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export class TauriStorageAdapter implements IStorageAdapter {
  private invoke: TauriInvoke | null = null;
  private isInitialized = false;

  constructor() {
    // Dynamic import to support both Tauri and non-Tauri bundling
  }

  private async getInvoke(): Promise<TauriInvoke> {
    if (!this.invoke) {
      const { invoke } = await import('@tauri-apps/api/core');
      this.invoke = invoke;
    }
    return this.invoke;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    const inv = await this.getInvoke();
    await inv<void>('db_init');
    this.isInitialized = true;
  }

  public async close(): Promise<void> {
    this.isInitialized = false;
  }

  // Profiles
  public async listProfiles(): Promise<UserProfile[]> {
    const inv = await this.getInvoke();
    return inv<UserProfile[]>('db_list_profiles');
  }

  public async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const inv = await this.getInvoke();
    return inv<UserProfile>('db_save_profile', { profile });
  }

  public async getActiveProfile(): Promise<UserProfile | null> {
    const inv = await this.getInvoke();
    return inv<UserProfile | null>('db_get_active_profile');
  }

  public async setActiveProfile(profileId: string): Promise<void> {
    const inv = await this.getInvoke();
    await inv<void>('db_set_active_profile', { profileId });
  }

  // Notes
  public async getNote(userId: string, noteId: string): Promise<DurableNote | null> {
    const inv = await this.getInvoke();
    return inv<DurableNote | null>('db_get_note', { userId, noteId });
  }

  public async listNotes(userId: string, filters?: { learningItemId?: string; youtubeVideoId?: string }): Promise<DurableNote[]> {
    const inv = await this.getInvoke();
    return inv<DurableNote[]>('db_list_notes', { userId, filters });
  }

  public async saveNote(note: DurableNote): Promise<DurableNote> {
    const inv = await this.getInvoke();
    return inv<DurableNote>('db_save_note', { note });
  }

  public async markNoteDeleted(userId: string, noteId: string): Promise<void> {
    const inv = await this.getInvoke();
    await inv<void>('db_delete_note', { userId, noteId });
  }

  // Bookmarks
  public async getBookmark(userId: string, bookmarkId: string): Promise<DurableBookmark | null> {
    const inv = await this.getInvoke();
    return inv<DurableBookmark | null>('db_get_bookmark', { userId, bookmarkId });
  }

  public async listBookmarks(userId: string, filters?: { learningItemId?: string; youtubeVideoId?: string }): Promise<DurableBookmark[]> {
    const inv = await this.getInvoke();
    const list = await inv<DurableBookmark[]>('db_list_bookmarks', { userId });
    if (!filters) return list;
    return list.filter((b) => {
      if (filters.learningItemId && b.learningItemId !== filters.learningItemId) return false;
      if (filters.youtubeVideoId && b.youtubeVideoId !== filters.youtubeVideoId) return false;
      return true;
    });
  }

  public async saveBookmark(bookmark: DurableBookmark): Promise<DurableBookmark> {
    const inv = await this.getInvoke();
    return inv<DurableBookmark>('db_save_bookmark', { bookmark });
  }

  public async markBookmarkDeleted(userId: string, bookmarkId: string): Promise<void> {
    const inv = await this.getInvoke();
    await inv<void>('db_delete_bookmark', { userId, bookmarkId });
  }

  // Progress
  public async getProgress(userId: string, youtubeVideoId: string): Promise<DurableProgress | null> {
    const inv = await this.getInvoke();
    return inv<DurableProgress | null>('db_get_progress', { userId, youtubeVideoId });
  }

  public async listProgress(userId: string): Promise<DurableProgress[]> {
    const inv = await this.getInvoke();
    return inv<DurableProgress[]>('db_list_progress', { userId });
  }

  public async saveProgress(progress: DurableProgress): Promise<DurableProgress> {
    const inv = await this.getInvoke();
    return inv<DurableProgress>('db_save_progress', { progress });
  }

  // Learning Items
  public async listLearningItems(userId: string): Promise<LearningItem[]> {
    const inv = await this.getInvoke();
    return inv<LearningItem[]>('db_list_learning_items', { userId });
  }

  public async saveLearningItem(item: LearningItem): Promise<LearningItem> {
    const inv = await this.getInvoke();
    return inv<LearningItem>('db_save_learning_item', { item });
  }

  public async deleteLearningItem(userId: string, itemId: string): Promise<void> {
    const inv = await this.getInvoke();
    await inv<void>('db_delete_learning_item', { userId, itemId });
  }

  // Mutation Journal
  public async appendMutation(mutation: MutationJournalEntry): Promise<MutationJournalEntry> {
    const inv = await this.getInvoke();
    return inv<MutationJournalEntry>('db_append_mutation', { mutation });
  }

  public async getPendingMutations(userId: string): Promise<MutationJournalEntry[]> {
    const inv = await this.getInvoke();
    return inv<MutationJournalEntry[]>('db_get_pending_mutations', { userId });
  }

  public async updateMutationStatus(mutationId: string, status: MutationState, error?: string): Promise<void> {
    const inv = await this.getInvoke();
    await inv<void>('db_update_mutation_status', { mutationId, status, error });
  }

  public async deleteMutation(mutationId: string): Promise<void> {
    const inv = await this.getInvoke();
    await inv<void>('db_delete_mutation', { mutationId });
  }

  // Focus Sessions
  public async saveFocusSession(session: FocusSession): Promise<FocusSession> {
    const inv = await this.getInvoke();
    return inv<FocusSession>('db_save_focus_session', { session });
  }

  public async listFocusSessions(userId: string): Promise<FocusSession[]> {
    const inv = await this.getInvoke();
    return inv<FocusSession[]>('db_list_focus_sessions', { userId });
  }

  // Roadmap Progress
  public async toggleRoadmapMilestone(userId: string, roadmapId: string, milestoneId: string, completed: boolean): Promise<void> {
    const inv = await this.getInvoke();
    await inv<void>('db_toggle_milestone', { userId, roadmapId, milestoneId, completed });
  }

  public async getRoadmapCompletedMilestones(userId: string, roadmapId: string): Promise<string[]> {
    const inv = await this.getInvoke();
    return inv<string[]>('db_get_roadmap_progress', { userId, roadmapId });
  }

  // Maintenance
  public async purgeAccountData(userId: string): Promise<void> {
    const inv = await this.getInvoke();
    await inv<void>('db_purge_account', { userId });
  }

  public async runIntegrityCheck(): Promise<{ ok: boolean; issues: string[] }> {
    const inv = await this.getInvoke();
    return inv<{ ok: boolean; issues: string[] }>('db_integrity_check');
  }
}
