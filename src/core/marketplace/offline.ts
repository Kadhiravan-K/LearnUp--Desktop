/**
 * LearnUp Community Marketplace — Desktop Offline Compatibility & Conversion
 * Bridges marketplace items and SkillManifest into local offline SQLite / memory structures.
 */

import { SkillManifest, AnyManifest, MarketplaceItem } from './contracts';
import { assertValidSkillGraph } from './dag';

export interface LocalRoadmapNodeDraft {
  nodeNumber: string;
  title: string;
  description: string;
  status: 'locked' | 'active' | 'in_progress' | 'completed';
  progressPercentage: number;
  hoursLogged: number;
  tags: string[];
  youtubeVideoId?: string;
  youtubePlaylistId?: string;
  canonicalUrl: string;
  prerequisiteNodeNumber?: string;
}

export interface LocalRoadmapTrackDraft {
  title: string;
  description: string;
  category: string;
  nodes: LocalRoadmapNodeDraft[];
}

/**
 * Converts a validated SkillManifest into a local roadmap track draft
 * ready to be persisted into Desktop SQLite.
 * Nodes are ordered according to DAG topological sort order.
 */
export function convertSkillManifestToLocalRoadmap(manifest: SkillManifest): LocalRoadmapTrackDraft {
  // Validate acyclicity and compute topological execution sequence
  const sortedNodeIds = assertValidSkillGraph(manifest);

  const nodeMap = new Map(manifest.nodes.map((n) => [n.id, n]));
  const nodeIndexMap = new Map<string, number>();
  sortedNodeIds.forEach((id, idx) => nodeIndexMap.set(id, idx + 1));

  // Build prerequisite map from edges (source -> target means target depends on source)
  const prereqMap = new Map<string, string>();
  for (const edge of manifest.edges) {
    prereqMap.set(edge.target, edge.source);
  }

  const localNodes: LocalRoadmapNodeDraft[] = sortedNodeIds.map((nodeId, idx) => {
    const node = nodeMap.get(nodeId)!;
    const nodeNumber = String(idx + 1);

    const canonicalUrl = node.youtubeVideoId
      ? `https://www.youtube.com/watch?v=${node.youtubeVideoId}`
      : node.youtubePlaylistId
      ? `https://www.youtube.com/playlist?list=${node.youtubePlaylistId}`
      : '';

    const sourcePrereqId = prereqMap.get(nodeId);
    const prerequisiteNodeNumber = sourcePrereqId
      ? String(nodeIndexMap.get(sourcePrereqId))
      : undefined;

    return {
      nodeNumber,
      title: node.title,
      description: node.description || '',
      // Root milestone starts as 'active', all subsequent start as 'locked'
      status: idx === 0 ? 'active' : 'locked',
      progressPercentage: 0,
      hoursLogged: 0,
      tags: node.tags || [],
      youtubeVideoId: node.youtubeVideoId,
      youtubePlaylistId: node.youtubePlaylistId,
      canonicalUrl,
      prerequisiteNodeNumber,
    };
  });

  return {
    title: manifest.title,
    description: manifest.description,
    category: manifest.domain,
    nodes: localNodes,
  };
}

/**
 * Offline Marketplace Cache state manager for LearnUp-Desktop.
 * Allows browsing cached catalog and tracking local installations when offline.
 */
export class DesktopMarketplaceCache {
  private items = new Map<string, MarketplaceItem>();
  private manifests = new Map<string, AnyManifest>();
  private installedItemIds = new Set<string>();

  constructor(initialItems: MarketplaceItem[] = []) {
    initialItems.forEach((item) => this.items.set(item.id, item));
  }

  public cacheCatalog(items: MarketplaceItem[]): void {
    items.forEach((item) => this.items.set(item.id, item));
  }

  public getCatalog(): MarketplaceItem[] {
    return Array.from(this.items.values());
  }

  public getItem(id: string): MarketplaceItem | undefined {
    return this.items.get(id);
  }

  public cacheManifest(itemId: string, manifest: AnyManifest): void {
    this.manifests.set(itemId, manifest);
  }

  public getManifest(itemId: string): AnyManifest | undefined {
    return this.manifests.get(itemId);
  }

  public recordInstallation(itemId: string): boolean {
    if (!this.items.has(itemId)) return false;
    this.installedItemIds.add(itemId);
    const item = this.items.get(itemId)!;
    item.installCount += 1;
    return true;
  }

  public recordUninstallation(itemId: string): boolean {
    if (!this.installedItemIds.has(itemId)) return false;
    this.installedItemIds.delete(itemId);
    return true;
  }

  public isInstalled(itemId: string): boolean {
    return this.installedItemIds.has(itemId);
  }

  public getInstalledItemIds(): string[] {
    return Array.from(this.installedItemIds);
  }
}
