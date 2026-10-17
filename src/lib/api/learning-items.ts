import { apiFetch } from './client';
import type { LearningItem, LearningItemWithVideos } from '@/lib/types';

export interface ImportResponse {
  data: LearningItemWithVideos;
  duplicate: boolean;
}

export const learningItemsApi = {
  /**
   * Returns all learning items in the user's library, sorted by creation date descending.
   */
  async listLearningItems(): Promise<LearningItem[]> {
    const response = await apiFetch<{ data: LearningItem[] }>('/api/learning-items');
    return response.data;
  },

  /**
   * Retrieves a single learning item. Includes child videos if it's a playlist.
   */
  async getLearningItem(id: string): Promise<LearningItemWithVideos> {
    const response = await apiFetch<{ data: LearningItemWithVideos }>(`/api/learning-items/${id}`);
    return response.data;
  },

  /**
   * Accepts a YouTube URL (video or playlist), resolves metadata, and persists the item.
   */
  async importLearningItem(url: string): Promise<ImportResponse> {
    const response = await apiFetch<ImportResponse>('/api/learning-items', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    return response;
  },

  /**
   * Removes a learning item from the user's library.
   */
  async deleteLearningItem(id: string): Promise<void> {
    await apiFetch<{ data: { success: boolean } }>(`/api/learning-items/${id}`, {
      method: 'DELETE',
    });
  }
};
