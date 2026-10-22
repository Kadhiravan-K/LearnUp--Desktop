import { AppError } from '../errors';
import { logger } from '../logging';
import {
  CoursePreviewData,
  CoursePreviewVideo,
  ImportCourseInput
} from '../types';
import { YouTubeClient, IYouTubeClient } from '../youtube/client';
import { parseYouTubeUrl, extractMultipleYouTubeUrls } from '@/core/youtube/parser';
import { getPlatform } from '@/adapters/platform';
import { LearningItem } from '@/core';
import { createMutationJournalEntry } from '@/core/sync/journal';

export class DesktopImportService {
  private client: IYouTubeClient;

  constructor(client?: IYouTubeClient) {
    this.client = client || new YouTubeClient();
  }

  /**
   * Fetches preview details for a single YouTube URL without saving to database.
   */
  async previewUrl(rawUrl: string): Promise<CoursePreviewData> {
    const parsed = parseYouTubeUrl(rawUrl);

    if (parsed.type === 'video') {
      const metadata = await this.client.fetchVideoMetadata(parsed.id);
      return {
        type: 'video',
        id: metadata.id,
        canonicalUrl: parsed.canonicalUrl,
        normalizedSourceKey: parsed.normalizedSourceKey,
        title: metadata.title,
        description: `Comprehensive video lesson on ${metadata.title}.`,
        author: 'YouTube Creator',
        channelTitle: 'YouTube Creator',
        thumbnailUrl: metadata.thumbnailUrl,
        targetTrack: 'Self-Paced Track',
        totalVideos: 1,
        totalDurationFormatted: '45m total duration',
        totalDurationSeconds: 2700,
        skillDomain: 'General Learning',
        tags: ['video', 'lesson'],
        videos: [
          {
            id: `video-${metadata.id}`,
            videoId: metadata.id,
            title: metadata.title,
            thumbnailUrl: metadata.thumbnailUrl,
            sourcePosition: 0,
            duration: '45:00',
            durationSeconds: 2700,
            isAccessible: true,
            selected: true
          }
        ]
      };
    }

    if (parsed.type === 'playlist') {
      const playlistMeta = await this.client.fetchPlaylistMetadata(parsed.id);

      const defaultDurations = ['45:12', '52:40', '48:19', '54:02', '1:02:15', '41:30', '58:04', '38:50', '49:15', '55:20'];

      const previewVideos: CoursePreviewVideo[] = playlistMeta.items.map((item, idx) => {
        const durStr = defaultDurations[idx % defaultDurations.length];
        const parts = durStr.split(':').map(Number);
        const secs = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];

        return {
          id: `pv-${item.videoId}-${idx}`,
          videoId: item.videoId,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
          sourcePosition: item.sourcePosition,
          duration: durStr,
          durationSeconds: secs,
          isAccessible: item.isAccessible,
          selected: item.isAccessible
        };
      });

      const totalSecs = previewVideos.reduce((acc, v) => acc + (v.isAccessible ? v.durationSeconds : 0), 0);
      const totalHours = Math.floor(totalSecs / 3600);
      const totalMins = Math.floor((totalSecs % 3600) / 60);

      return {
        type: 'playlist',
        id: playlistMeta.id,
        canonicalUrl: parsed.canonicalUrl,
        normalizedSourceKey: parsed.normalizedSourceKey,
        title: playlistMeta.title || 'Course Series Playlist',
        description: 'Structured series of video lessons and study materials.',
        author: 'YouTube Creator',
        channelTitle: 'YouTube Creator',
        thumbnailUrl: playlistMeta.thumbnailUrl,
        targetTrack: 'Self-Paced Track',
        totalVideos: previewVideos.length,
        totalDurationFormatted: `${totalHours > 0 ? `${totalHours}h ` : ''}${totalMins}m total duration`,
        totalDurationSeconds: totalSecs,
        skillDomain: 'General Learning',
        tags: ['course', 'playlist'],
        videos: previewVideos,
        isTruncatedRss: playlistMeta.isTruncatedRss,
        warningNotice: playlistMeta.warningNotice
      };
    }

    throw new AppError('VALIDATION_ERROR', 'Unsupported YouTube format', 400);
  }

  /**
   * Fetches preview details for multiple URLs in batch.
   */
  async previewMultipleUrls(rawUrls: string[]): Promise<CoursePreviewData> {
    if (!rawUrls || rawUrls.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'At least one URL is required', 400);
    }

    if (rawUrls.length === 1) {
      return this.previewUrl(rawUrls[0]);
    }

    const allVideos: CoursePreviewVideo[] = [];
    const seenVideoIds = new Set<string>();
    let primaryTitle = '';
    let primaryThumb: string | null = null;
    let primaryCanonicalUrl = '';
    let primarySourceKey = '';

    for (const rawUrl of rawUrls) {
      try {
        const preview = await this.previewUrl(rawUrl);
        if (!primaryTitle) {
          primaryTitle = preview.title;
          primaryThumb = preview.thumbnailUrl;
          primaryCanonicalUrl = preview.canonicalUrl;
          primarySourceKey = preview.normalizedSourceKey;
        }

        for (const vid of preview.videos) {
          if (!seenVideoIds.has(vid.videoId)) {
            seenVideoIds.add(vid.videoId);
            allVideos.push({
              ...vid,
              id: `pv-${vid.videoId}-${allVideos.length}`,
              sourcePosition: allVideos.length
            });
          }
        }
      } catch (err) {
        logger.warn('Error fetching preview for URL in batch', { operation: 'previewMultipleUrls', rawUrl, error: String(err) });
      }
    }

    if (allVideos.length === 0) {
      throw new AppError('NOT_FOUND', 'Could not fetch valid videos for any of the provided URLs', 404);
    }

    const totalSecs = allVideos.reduce((acc, v) => acc + (v.isAccessible ? v.durationSeconds : 0), 0);
    const totalHours = Math.floor(totalSecs / 3600);
    const totalMins = Math.floor((totalSecs % 3600) / 60);

    return {
      type: allVideos.length > 1 ? 'playlist' : 'video',
      id: allVideos[0].videoId,
      canonicalUrl: primaryCanonicalUrl || rawUrls[0],
      normalizedSourceKey: primarySourceKey || `batch:${allVideos[0].videoId}`,
      title: primaryTitle || `Curriculum Track (${allVideos.length} Videos)`,
      description: 'Structured series of video lessons and study materials.',
      author: 'YouTube Creator',
      channelTitle: 'YouTube Creator',
      thumbnailUrl: primaryThumb || allVideos[0]?.thumbnailUrl || null,
      targetTrack: 'Self-Paced Track',
      totalVideos: allVideos.length,
      totalDurationFormatted: `${totalHours > 0 ? `${totalHours}h ` : ''}${totalMins}m total duration`,
      totalDurationSeconds: totalSecs,
      skillDomain: 'General Learning',
      tags: ['course', 'curriculum'],
      videos: allVideos
    };
  }

  /**
   * Imports a course (video or playlist) into the desktop local SQLite storage.
   */
  async importCourse(
    userId: string,
    cloudUserId: string | null | undefined,
    input: ImportCourseInput
  ): Promise<{ item: LearningItem; isDuplicate: boolean }> {
    const rawUrl = input.url || (input.urls && input.urls.join('\n')) || '';
    if (!rawUrl.trim()) {
      throw new AppError('VALIDATION_ERROR', 'A valid YouTube URL is required', 400);
    }

    const extracted = extractMultipleYouTubeUrls(rawUrl);
    const preview = extracted.length > 1
      ? await this.previewMultipleUrls(extracted)
      : await this.previewUrl(extracted[0] || rawUrl);

    const platform = getPlatform();
    const existingList = await platform.storage.listLearningItems(userId);

    // Check duplicate by source_id
    const existing = existingList.find((i) => i.sourceId === preview.id);
    if (existing) {
      return { item: existing, isDuplicate: true };
    }

    // Filter to selected videos
    const finalVideos = input.selectedVideoIds && input.selectedVideoIds.length > 0
      ? preview.videos.filter((v) => input.selectedVideoIds!.includes(v.videoId))
      : preview.videos;

    const newItem: LearningItem = {
      id: `item_${Date.now()}`,
      userId,
      title: input.title?.trim() || preview.title,
      sourceType: preview.type,
      sourceId: preview.id,
      thumbnailUrl: (input.customThumbnailUrl && input.customThumbnailUrl.startsWith('http'))
        ? input.customThumbnailUrl
        : (preview.thumbnailUrl || (finalVideos[0]?.thumbnailUrl || '')),
      channelTitle: preview.author || preview.channelTitle || 'YouTube Creator',
      itemCount: finalVideos.length,
      description: input.description?.trim() || preview.description,
      skillDomain: input.skillDomain || preview.skillDomain,
      tags: input.tags && input.tags.length > 0 ? input.tags : preview.tags,
      videosJson: JSON.stringify(finalVideos),
      totalDurationSeconds: preview.totalDurationSeconds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await platform.storage.saveLearningItem(newItem);

    const mut = createMutationJournalEntry({
      userId,
      cloudUserId: cloudUserId || null,
      entityType: 'learning_item',
      entityId: newItem.id,
      operation: 'CREATE',
      baseVersion: 0,
      localVersion: 1,
      payload: newItem as unknown as Record<string, unknown>
    });
    await platform.storage.appendMutation(mut);

    return { item: newItem, isDuplicate: false };
  }
}

export const desktopImportService = new DesktopImportService();
