/**
 * LearnUp Shared Core — Library Service
 * Provides helper functions for course item instantiation, duration formatting,
 * and progress aggregation.
 */

import { parseYouTubeUrl } from '../youtube/parser';
import { LearningItem, LibraryProgress } from '../types';

export function formatDurationSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function buildLearningItemFromYouTubeUrl(
  url: string,
  userId: string,
  meta?: { title?: string; channelTitle?: string; thumbnailUrl?: string }
): LearningItem {
  const parsed = parseYouTubeUrl(url);
  const now = new Date().toISOString();

  return {
    id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    title: meta?.title || (parsed.type === 'playlist' ? `Playlist (${parsed.id})` : `Video (${parsed.id})`),
    sourceType: parsed.type,
    sourceId: parsed.id,
    thumbnailUrl:
      meta?.thumbnailUrl ||
      (parsed.type === 'video'
        ? `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`
        : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80'),
    channelTitle: meta?.channelTitle || 'YouTube Creator',
    itemCount: parsed.type === 'playlist' ? 10 : 1,
    createdAt: now,
    updatedAt: now
  };
}

export function calculateItemProgress(
  itemId: string,
  totalVideos: number,
  completedVideoIds: Set<string>
): LibraryProgress {
  if (totalVideos <= 0) {
    return { learningItemId: itemId, isCompleted: false, progressPercentage: 0 };
  }
  const completed = completedVideoIds.size;
  const percentage = Math.min(100, Math.round((completed / totalVideos) * 100));
  return {
    learningItemId: itemId,
    isCompleted: percentage >= 100,
    progressPercentage: percentage
  };
}
