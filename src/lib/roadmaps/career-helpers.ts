import { RoadmapMilestone, SavedMilestonePayload, ResourceProvenance } from './career-types';
import { RoadmapNode } from '../types';

const METADATA_TAG_START = '<!-- LEARNUP_SAVED_MILESTONE:';
const METADATA_TAG_END = '-->';

/**
 * Formats a complete structured milestone into human-readable markdown with an embedded JSON envelope.
 */
export function serializeMilestoneToNodeDescription(
  milestone: RoadmapMilestone,
  phaseTitle: string
): string {
  const lines: string[] = [];

  // 1. Objectives summary
  lines.push(`Phase: ${phaseTitle}`);
  lines.push(milestone.learningObjectives.join('. '));
  lines.push('');

  // 2. Learning Objectives
  lines.push('### 🎯 Core Objectives');
  for (const obj of milestone.learningObjectives) {
    lines.push(`- ${obj}`);
  }
  lines.push('');

  // 3. Verified Resources with clickable markdown links
  if (milestone.resources.length > 0) {
    lines.push('### 📚 Verified Educational Resources');
    for (const r of milestone.resources) {
      lines.push(
        `- [${r.title}](${r.canonicalUrl}) — *${r.provider}* (${r.type}, ${r.difficulty})`
      );
      if (r.selectionRationale) {
        lines.push(`  > Rationale: ${r.selectionRationale}`);
      }
    }
    lines.push('');
  }

  // 4. Practice Tasks
  if (milestone.practiceTasks.length > 0) {
    lines.push('### 🛠️ Practice Tasks & Deliverables');
    for (const t of milestone.practiceTasks) {
      lines.push(`- **${t.title}** (~${t.estimatedMinutes}m): ${t.description}`);
      lines.push(`  Deliverable: \`${t.deliverable}\``);
    }
    lines.push('');
  }

  // 5. Checkpoint Assessment
  if (milestone.assessment) {
    lines.push('### ❓ Knowledge Checkpoint');
    lines.push(`**Question:** ${milestone.assessment.question}`);
    milestone.assessment.options.forEach((opt, idx) => {
      lines.push(`- ${String.fromCharCode(65 + idx)}) ${opt}`);
    });
    lines.push(`*(Answer reveal: ${milestone.assessment.explanation})*`);
    lines.push('');
  }

  // 6. Capstone Project
  if (milestone.project) {
    lines.push(`### 🏆 Milestone Project: ${milestone.project.title}`);
    lines.push(milestone.project.description);
    if (milestone.project.rubric.length > 0) {
      lines.push('**Rubric:**');
      for (const rule of milestone.project.rubric) {
        lines.push(`- [ ] ${rule}`);
      }
    }
    lines.push('');
  }

  // 7. Embedded Complete Machine-Readable Envelope
  const payload: SavedMilestonePayload = {
    milestoneId: milestone.id,
    phaseId: milestone.phaseId,
    phaseTitle,
    learningObjectives: milestone.learningObjectives,
    resources: milestone.resources,
    practiceTasks: milestone.practiceTasks,
    assessment: milestone.assessment,
    project: milestone.project,
    estimatedHours: milestone.estimatedHours,
    completionCriteria: milestone.completionCriteria
  };

  lines.push(`${METADATA_TAG_START} ${JSON.stringify(payload)} ${METADATA_TAG_END}`);

  return lines.join('\n');
}

/**
 * Extracts the full structured milestone payload from a saved RoadmapNode.
 */
export function extractMilestoneFromNode(node: RoadmapNode): SavedMilestonePayload {
  if (node.description && node.description.includes(METADATA_TAG_START)) {
    try {
      const startIndex = node.description.indexOf(METADATA_TAG_START) + METADATA_TAG_START.length;
      const endIndex = node.description.indexOf(METADATA_TAG_END, startIndex);
      if (endIndex > startIndex) {
        const jsonStr = node.description.substring(startIndex, endIndex).trim();
        const parsed = JSON.parse(jsonStr) as SavedMilestonePayload;
        return parsed;
      }
    } catch {
      // fallback to manual extraction if parsing fails
    }
  }

  // Fallback heuristic extraction for standard nodes
  const objectives: string[] = [];
  const resources: ResourceProvenance[] = [];

  // Parse markdown links as resources: [title](url)
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(node.description || '')) !== null) {
    const isVideo = match[2].includes('youtube.com') || match[2].includes('youtu.be');
    resources.push({
      id: `res-${resources.length + 1}`,
      type: isVideo ? 'video' : 'documentation',
      title: match[1],
      canonicalUrl: match[2],
      provider: isVideo ? 'YouTube' : 'Web Resource',
      description: 'Extracted curriculum resource',
      relevantSkill: node.tags?.[0] || 'Core Skill',
      difficulty: 'intermediate',
      verificationStatus: 'verified',
      verificationTimestamp: new Date().toISOString(),
      selectionRationale: 'Preserved from milestone syllabus'
    });
  }

  return {
    milestoneId: node.id,
    phaseId: 'phase-1',
    phaseTitle: 'Curriculum Progression',
    learningObjectives: objectives.length > 0 ? objectives : [node.description || node.title],
    resources,
    practiceTasks: [],
    estimatedHours: Number(node.hours_logged) || 10,
    completionCriteria: ['Milestone objectives verified']
  };
}
