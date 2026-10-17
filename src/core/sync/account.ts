/**
 * LearnUp Shared Core — Account Linking & Data Ownership
 * Manages explicit account linking, previewing local data before cloud association,
 * and maintaining strict profile data isolation.
 */

import { IStorageAdapter, UserProfile } from '../types';
import { AccountLinkPreview } from './types';

export class AccountLinkingManager {
  constructor(private storage: IStorageAdapter) {}

  /**
   * Previews the local dataset that would be associated with a cloud account.
   */
  public async generateLinkPreview(
    profileId: string,
    cloudUserId: string,
    cloudUserEmail: string
  ): Promise<AccountLinkPreview> {
    const profiles = await this.storage.listProfiles();
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) {
      throw new Error(`Profile with ID "${profileId}" not found.`);
    }

    const notes = await this.storage.listNotes(profileId);
    const courses = await this.storage.listLearningItems(profileId);
    const progress = await this.storage.listProgress(profileId);
    const pending = await this.storage.getPendingMutations(profileId);

    return {
      profileId,
      profileName: profile.name,
      cloudUserId,
      cloudUserEmail,
      notesCount: notes.length,
      coursesCount: courses.length,
      progressCount: progress.length,
      pendingMutationsCount: pending.length
    };
  }

  /**
   * Explicitly links a local profile to an authenticated Supabase cloud account.
   * Only executes after explicit user consent.
   */
  public async linkProfile(
    profileId: string,
    cloudUserId: string,
    cloudUserEmail: string
  ): Promise<UserProfile> {
    const profiles = await this.storage.listProfiles();
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) {
      throw new Error(`Profile with ID "${profileId}" not found.`);
    }

    // Update profile with cloud metadata
    const updatedProfile: UserProfile = {
      ...profile,
      cloudUserId,
      cloudUserEmail,
      cloudSyncEnabled: true,
      updatedAt: new Date().toISOString()
    };

    const saved = await this.storage.saveProfile(updatedProfile);

    // Update existing pending mutations to tag the cloud user ID
    const pending = await this.storage.getPendingMutations(profileId);
    for (const m of pending) {
      if (!m.cloudUserId) {
        m.cloudUserId = cloudUserId;
        await this.storage.appendMutation(m);
      }
    }

    return saved;
  }

  /**
   * Unlinks a cloud account, returning profile to 100% local guest mode.
   * Does NOT delete local notes or courses.
   */
  public async unlinkProfile(profileId: string): Promise<UserProfile> {
    const profiles = await this.storage.listProfiles();
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) {
      throw new Error(`Profile with ID "${profileId}" not found.`);
    }

    const updatedProfile: UserProfile = {
      ...profile,
      cloudUserId: null,
      cloudUserEmail: null,
      cloudSyncEnabled: false,
      updatedAt: new Date().toISOString()
    };

    return this.storage.saveProfile(updatedProfile);
  }
}
