import { ResourceProvenance, ExperienceLevel, LearningFormat } from './career-types';

export interface RankingCriteria {
  targetRole: string;
  milestoneTitle: string;
  learningObjectives: string[];
  experienceLevel: ExperienceLevel;
  preferredLanguage?: string;
  preferredFormats: LearningFormat[];
}

export interface RankedResourceResult {
  resource: ResourceProvenance;
  score: number;
  reasons: string[];
}

const HIGH_AUTHORITY_DOMAINS = [
  'developer.arm.com',
  'developer.mozilla.org',
  'docs.python.org',
  'react.dev',
  'nextjs.org',
  'kubernetes.io',
  'aws.amazon.com',
  'cloud.google.com',
  'learn.microsoft.com',
  'github.com',
  'nxp.com',
  'freertos.org',
  'who.int',
  'nih.gov',
  'w3.org'
];

/**
 * Deduplicates and ranks learning resources for a milestone based on multi-dimensional pedagogical fit.
 */
export function rankMilestoneResources(
  resources: ResourceProvenance[],
  criteria: RankingCriteria
): ResourceProvenance[] {
  if (!resources || resources.length === 0) return [];

  // Deduplicate by canonical URL and videoId
  const seenUrls = new Set<string>();
  const seenVideoIds = new Set<string>();
  const uniqueList: ResourceProvenance[] = [];

  for (const r of resources) {
    const normUrl = r.canonicalUrl.toLowerCase().trim();
    if (seenUrls.has(normUrl)) continue;
    seenUrls.add(normUrl);

    if (r.type === 'video' && r.sourceMetadata?.videoId) {
      if (seenVideoIds.has(r.sourceMetadata.videoId)) continue;
      seenVideoIds.add(r.sourceMetadata.videoId);
    }

    uniqueList.push(r);
  }

  // Score each candidate
  const scored = uniqueList.map((res) => {
    let score = 50; // base score
    const reasons: string[] = [];

    // 1. Topic and keyword relevance
    const textBlob = `${res.title} ${res.description} ${res.relevantSkill}`.toLowerCase();
    const milestoneKeywords = criteria.milestoneTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    let matchCount = 0;
    for (const kw of milestoneKeywords) {
      if (textBlob.includes(kw)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      const kwBoost = Math.min(25, matchCount * 8);
      score += kwBoost;
      reasons.push(`+${kwBoost} topic keyword match (${matchCount} matches)`);
    }

    // 2. Authority & Credibility
    try {
      const urlObj = new URL(res.canonicalUrl);
      const host = urlObj.hostname.toLowerCase();
      if (HIGH_AUTHORITY_DOMAINS.some((d) => host === d || host.endsWith('.' + d))) {
        score += 20;
        reasons.push('+20 primary vendor / standards authority domain');
      } else if (res.provider && res.provider !== 'Unknown') {
        score += 10;
        reasons.push('+10 verified publisher/provider');
      }
    } catch {
      // ignore
    }

    // 3. Verification status
    if (res.verificationStatus === 'verified') {
      score += 20;
      reasons.push('+20 verified availability and metadata');
    } else if (res.verificationStatus === 'partially_verified') {
      score += 10;
      reasons.push('+10 partially verified metadata');
    } else if (res.verificationStatus === 'unavailable') {
      score -= 40;
      reasons.push('-40 unavailable resource');
    }

    // 4. Experience level alignment
    if (res.difficulty === criteria.experienceLevel) {
      score += 15;
      reasons.push(`+15 exact experience level match (${res.difficulty})`);
    }

    // 5. Format preference match
    const isPreferred =
      (res.type === 'video' && criteria.preferredFormats.includes('videos')) ||
      (res.type === 'documentation' && criteria.preferredFormats.includes('official_docs')) ||
      (res.type === 'article' && criteria.preferredFormats.includes('articles')) ||
      (res.type === 'project' && criteria.preferredFormats.includes('projects'));

    if (isPreferred) {
      score += 15;
      reasons.push('+15 matches learner preferred format');
    }

    return { resource: res, score, reasons };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((item) => item.resource);
}
