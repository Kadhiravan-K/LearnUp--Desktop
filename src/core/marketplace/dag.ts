/**
 * LearnUp Community Marketplace — DAG Cycle Detection & Topological Sort
 * Algorithmic graph validation for Skill manifests in LearnUp-Desktop.
 */

import { SkillManifest, SkillNode, SkillEdge } from './contracts';

export interface GraphValidationResult {
  isValid: boolean;
  sortedNodeIds: string[];
  errors: string[];
  warnings: string[];
  isolatedNodeIds: string[];
}

export class SkillGraphError extends Error {
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message);
    this.name = 'SkillGraphError';
  }
}

/**
 * Validates the directed graph structure of a SkillManifest:
 * 1. Checks for duplicate node IDs.
 * 2. Ensures all edge sources and targets exist.
 * 3. Detects directed cycles using 3-color DFS (O(V+E)).
 * 4. Produces a topological sort order (prerequisites first).
 * 5. Identifies isolated/disconnected nodes.
 */
export function validateSkillManifestGraph(manifest: SkillManifest): GraphValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeMap = new Map<string, SkillNode>();

  // 1. Check duplicate node IDs
  for (const node of manifest.nodes) {
    if (nodeMap.has(node.id)) {
      errors.push(`Duplicate node ID detected: "${node.id}". Node IDs must be unique.`);
    } else {
      nodeMap.set(node.id, node);
    }
  }

  // 2. Build adjacency list and in-degree map
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of manifest.nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of manifest.edges) {
    const hasSource = nodeMap.has(edge.source);
    const hasTarget = nodeMap.has(edge.target);

    if (!hasSource) {
      errors.push(`Edge references non-existent source node: "${edge.source}".`);
    }
    if (!hasTarget) {
      errors.push(`Edge references non-existent target node: "${edge.target}".`);
    }

    if (hasSource && hasTarget) {
      adj.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  // If node ID errors exist, we cannot run cycle detection reliably
  if (errors.length > 0) {
    return {
      isValid: false,
      sortedNodeIds: [],
      errors,
      warnings,
      isolatedNodeIds: [],
    };
  }

  // 3. Cycle Detection using 3-color DFS
  // 0: White (unvisited), 1: Gray (visiting), 2: Black (visited)
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  for (const node of manifest.nodes) {
    color.set(node.id, 0);
    parent.set(node.id, null);
  }

  let cycleFound: string[] | null = null;

  function dfsVisit(u: string, stack: string[]): boolean {
    color.set(u, 1);
    stack.push(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (color.get(v) === 1) {
        // Gray node found -> cycle!
        const cycleStartIndex = stack.indexOf(v);
        cycleFound = stack.slice(cycleStartIndex).concat(v);
        return true;
      }
      if (color.get(v) === 0) {
        parent.set(v, u);
        if (dfsVisit(v, stack)) {
          return true;
        }
      }
    }

    stack.pop();
    color.set(u, 2);
    return false;
  }

  for (const node of manifest.nodes) {
    if (color.get(node.id) === 0) {
      if (dfsVisit(node.id, [])) {
        break;
      }
    }
  }

  if (cycleFound) {
    const cycleStr = (cycleFound as string[]).join(' -> ');
    errors.push(`Directed cycle detected in skill roadmap: ${cycleStr}`);
    return {
      isValid: false,
      sortedNodeIds: [],
      errors,
      warnings,
      isolatedNodeIds: [],
    };
  }

  // 4. Topological Sort (Kahn's Algorithm for deterministic queue-based ordering)
  const sortedNodeIds: string[] = [];
  const queue: string[] = [];
  const currentInDegree = new Map(inDegree);

  // Nodes with 0 in-degree are root entry points
  for (const node of manifest.nodes) {
    if ((currentInDegree.get(node.id) || 0) === 0) {
      queue.push(node.id);
    }
  }

  // Sort queue alphabetically to ensure stable deterministic order
  queue.sort();

  while (queue.length > 0) {
    const u = queue.shift()!;
    sortedNodeIds.push(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      const remaining = (currentInDegree.get(v) || 0) - 1;
      currentInDegree.set(v, remaining);
      if (remaining === 0) {
        queue.push(v);
      }
    }
  }

  // 5. Check for isolated nodes (nodes with 0 incoming and 0 outgoing edges when graph has >1 node)
  const isolatedNodeIds: string[] = [];
  if (manifest.nodes.length > 1) {
    for (const node of manifest.nodes) {
      const inDeg = inDegree.get(node.id) || 0;
      const outDeg = (adj.get(node.id) || []).length;
      if (inDeg === 0 && outDeg === 0) {
        isolatedNodeIds.push(node.id);
      }
    }
    if (isolatedNodeIds.length > 0) {
      warnings.push(
        `Skill manifest contains ${isolatedNodeIds.length} standalone node(s) with no prerequisites or dependents: [${isolatedNodeIds.join(', ')}]`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    sortedNodeIds,
    errors,
    warnings,
    isolatedNodeIds,
  };
}

/**
 * Convenience helper: throws SkillGraphError if graph is invalid.
 */
export function assertValidSkillGraph(manifest: SkillManifest): string[] {
  const result = validateSkillManifestGraph(manifest);
  if (!result.isValid) {
    throw new SkillGraphError(result.errors.join('; '), { errors: result.errors });
  }
  return result.sortedNodeIds;
}
