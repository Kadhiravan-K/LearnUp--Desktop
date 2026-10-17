/**
 * Roadmap-to-Library Synchronization Engine
 * 
 * Extracts verified YouTube learning resources from roadmaps, deduplicates by canonical
 * YouTube video ID, cross-references against the user's private library items,
 * categorizes resources (new, existing, unavailable, invalid), and handles batch imports
 * with automated milestone course linking and rollback resilience.
 */

import { parseYouTubeUrl } from '../youtube/parser';
import { extractMilestoneFromNode } from './career-helpers';
import type { CareerRoadmap, ResourceProvenance } from './career-types';
import type { RoadmapTrack, RoadmapNode, LearningItem, AttachedCourseData } from '../types';
import { learningItemsApi } from '../api/learning-items';
import { logger } from '../logging';

export type ResourceCategory = 'new' | 'existing' | 'unavailable' | 'invalid';

export interface AssociatedMilestone {
  nodeId: string;
  nodeNumber: string;
  milestoneTitle: string;
  phaseTitle?: string;
}

export interface SynchronizableResource {
  id: string; // Canonical video ID or fallback unique identifier
  rawUrl: string;
  canonicalUrl: string;
  title: string;
  provider: string;
  type: string;
  relevantSkill?: string;
  videoId: string | null;
  category: ResourceCategory;
  categoryReason?: string;
  associatedMilestones: AssociatedMilestone[];
  libraryItemId?: string;
  progressPercentage?: number;
  runtimeFormatted?: string;
}

export interface RoadmapSyncSummary {
  totalExtracted: number;
  uniqueVideos: number;
  newCount: number;
  existingCount: number;
  unavailableCount: number;
  invalidCount: number;
  resources: SynchronizableResource[];
}

export interface ImportItemResult {
  resourceId: string;
  videoId: string;
  title: string;
  status: 'success' | 'failed' | 'skipped';
  duplicate?: boolean;
  libraryItem?: LearningItem;
  error?: string;
  linkedNodeIds: string[];
}

function formatDurationSeconds(seconds: number | null | undefined): string | undefined {
  if (!seconds || seconds < 1) return undefined;
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

interface RawExtractedItem {
  resource: ResourceProvenance;
  milestone: AssociatedMilestone;
}

/**
 * Extracts and categorizes all YouTube learning resources from a RoadmapTrack,
 * an array of RoadmapNodes, or a raw CareerRoadmap.
 */
export function extractRoadmapResources(
  input: RoadmapTrack | RoadmapNode[] | CareerRoadmap,
  libraryItems: LearningItem[] = []
): RoadmapSyncSummary {
  const rawItems: RawExtractedItem[] = [];

  // 1. Gather raw resources depending on input shape
  if (Array.isArray(input)) {
    // RoadmapNode[]
    for (const node of input) {
      const milestone = extractMilestoneFromNode(node);
      for (const res of milestone.resources) {
        rawItems.push({
          resource: res,
          milestone: {
            nodeId: node.id,
            nodeNumber: node.node_number,
            milestoneTitle: node.title,
            phaseTitle: milestone.phaseTitle
          }
        });
      }
    }
  } else if ('phases' in input) {
    // CareerRoadmap structure
    for (const phase of input.phases) {
      for (const m of phase.milestones) {
        for (const res of m.resources) {
          rawItems.push({
            resource: res,
            milestone: {
              nodeId: m.id,
              nodeNumber: `0${m.order}`,
              milestoneTitle: m.title,
              phaseTitle: phase.title
            }
          });
        }
      }
    }
  } else {
    // RoadmapTrack
    for (const node of input.nodes) {
      const milestone = extractMilestoneFromNode(node);
      for (const res of milestone.resources) {
        rawItems.push({
          resource: res,
          milestone: {
            nodeId: node.id,
            nodeNumber: node.node_number,
            milestoneTitle: node.title,
            phaseTitle: milestone.phaseTitle
          }
        });
      }
    }
  }

  // 2. Build library lookup maps by youtube_video_id, source_url, etc.
  const libraryByVideoId = new Map<string, LearningItem>();
  const libraryByUrl = new Map<string, LearningItem>();

  for (const item of libraryItems) {
    const videoId = item.youtube_video_id || (item as any).source_id;
    if (videoId) {
      libraryByVideoId.set(videoId, item);
    }
    if (item.source_url) {
      try {
        const parsed = parseYouTubeUrl(item.source_url);
        libraryByVideoId.set(parsed.id, item);
        libraryByUrl.set(parsed.canonicalUrl.toLowerCase(), item);
      } catch {
        libraryByUrl.set(item.source_url.toLowerCase(), item);
      }
    }
  }

  // 3. Process, classify, and deduplicate resources by canonical YouTube video ID
  const resourceMap = new Map<string, SynchronizableResource>();

  for (const { resource: res, milestone } of rawItems) {
    // Only video resources or YouTube URLs are eligible for library import
    const isVideoType = res.type === 'video';

    let videoId: string | null = null;
    let canonicalUrl = res.canonicalUrl;
    let isYouTube = false;

    try {
      const parsed = parseYouTubeUrl(res.canonicalUrl);
      videoId = parsed.id;
      canonicalUrl = parsed.canonicalUrl;
      isYouTube = true;
    } catch {
      // Not a valid YouTube URL
      isYouTube = false;
    }

    // Skip non-video documentation/books that are genuinely not videos
    if (!isVideoType && !isYouTube) {
      continue;
    }

    const key = videoId || `invalid-${res.id || res.canonicalUrl}`;

    if (resourceMap.has(key)) {
      // Deduplicate: merge associated milestone
      const existing = resourceMap.get(key)!;
      if (!existing.associatedMilestones.some((m) => m.nodeId === milestone.nodeId)) {
        existing.associatedMilestones.push(milestone);
      }
      continue;
    }

    // Categorization logic
    let category: ResourceCategory;
    let categoryReason: string | undefined;
    let matchingLibraryItem: LearningItem | undefined;

    if (!isYouTube || !videoId) {
      category = 'invalid';
      categoryReason = 'Invalid or unsupported YouTube URL format';
    } else if (res.verificationStatus === 'unavailable') {
      category = 'unavailable';
      categoryReason = 'Resource flagged as unavailable or removed by verification';
    } else {
      matchingLibraryItem = libraryByVideoId.get(videoId) || libraryByUrl.get(canonicalUrl.toLowerCase());

      if (matchingLibraryItem && matchingLibraryItem.status === 'ready') {
        category = 'existing';
        categoryReason = 'Already in your private library';
      } else if (matchingLibraryItem && matchingLibraryItem.status === 'failed') {
        category = 'new';
        categoryReason = 'Previous import attempt failed, retry available';
      } else {
        category = 'new';
        categoryReason = 'Verified video ready for library import';
      }
    }

    const progress = (matchingLibraryItem as any)?.progress?.progress_percentage;

    resourceMap.set(key, {
      id: key,
      rawUrl: res.canonicalUrl,
      canonicalUrl,
      title: res.title,
      provider: res.provider,
      type: res.type,
      relevantSkill: res.relevantSkill,
      videoId,
      category,
      categoryReason,
      associatedMilestones: [milestone],
      libraryItemId: matchingLibraryItem?.id,
      progressPercentage: typeof progress === 'number' ? progress : undefined,
      runtimeFormatted: formatDurationSeconds(matchingLibraryItem?.total_duration_seconds)
    });
  }

  const resources = Array.from(resourceMap.values());

  return {
    totalExtracted: rawItems.length,
    uniqueVideos: resources.length,
    newCount: resources.filter((r) => r.category === 'new').length,
    existingCount: resources.filter((r) => r.category === 'existing').length,
    unavailableCount: resources.filter((r) => r.category === 'unavailable').length,
    invalidCount: resources.filter((r) => r.category === 'invalid').length,
    resources
  };
}

/**
 * Imports a single verified resource into the library and links it to associated milestone nodes.
 */
export async function importSingleResource(
  resource: SynchronizableResource,
  trackId?: string,
  linkToNodes?: (trackId: string, nodeId: string, courseData: AttachedCourseData) => Promise<void>
): Promise<ImportItemResult> {
  const videoId = resource.videoId || resource.id;

  if (resource.category === 'invalid' || !resource.videoId) {
    return {
      resourceId: resource.id,
      videoId,
      title: resource.title,
      status: 'failed',
      error: 'Cannot import an invalid or non-YouTube resource.',
      linkedNodeIds: []
    };
  }

  try {
    const importRes = await learningItemsApi.importLearningItem(resource.canonicalUrl);
    const libraryItem = importRes.data;
    const linkedNodeIds: string[] = [];

    // Link imported course back to associated milestone nodes
    if (trackId && linkToNodes && libraryItem && libraryItem.id) {
      const courseData: AttachedCourseData = {
        id: libraryItem.id,
        title: libraryItem.title,
        provider: libraryItem.author || resource.provider || 'YouTube',
        total_lectures: libraryItem.type === 'playlist' ? (libraryItem.videos?.length || 1) : 1,
        progress_percentage: 0,
        runtime_formatted: formatDurationSeconds(libraryItem.total_duration_seconds)
      };

      for (const m of resource.associatedMilestones) {
        try {
          await linkToNodes(trackId, m.nodeId, courseData);
          linkedNodeIds.push(m.nodeId);
        } catch (linkErr) {
          logger.warn('Failed to link imported course to milestone node', {
            operation: 'importSingleResource:linkMilestone',
            trackId,
            nodeId: m.nodeId,
            learningItemId: libraryItem.id,
            error: String(linkErr)
          });
        }
      }
    }

    return {
      resourceId: resource.id,
      videoId,
      title: libraryItem?.title || resource.title,
      status: 'success',
      duplicate: importRes.duplicate,
      libraryItem,
      linkedNodeIds
    };
  } catch (err: any) {
    const errorMessage = err?.message || 'Failed to import video into library';
    logger.error('Failed to import roadmap resource', {
      operation: 'importSingleResource',
      videoId,
      url: resource.canonicalUrl,
      error: errorMessage
    });

    return {
      resourceId: resource.id,
      videoId,
      title: resource.title,
      status: 'failed',
      error: errorMessage,
      linkedNodeIds: []
    };
  }
}

/**
 * Imports an array of selected resources sequentially with progress telemetry
 * and per-item error isolation.
 */
export async function importBatchResources(
  resources: SynchronizableResource[],
  trackId?: string,
  onProgress?: (completed: number, total: number, currentItem: SynchronizableResource) => void,
  linkToNodes?: (trackId: string, nodeId: string, courseData: AttachedCourseData) => Promise<void>
): Promise<ImportItemResult[]> {
  const results: ImportItemResult[] = [];
  const total = resources.length;

  for (let i = 0; i < total; i++) {
    const resource = resources[i];
    if (onProgress) {
      onProgress(i, total, resource);
    }

    const result = await importSingleResource(resource, trackId, linkToNodes);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, total, resource);
    }
  }

  return results;
}
