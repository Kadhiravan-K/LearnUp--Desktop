/**
 * LearnUp Community Marketplace — Search Query Parser & Filter Evaluator
 * Pure algorithmic search, filtering, and multi-criteria sorting for marketplace items in LearnUp-Desktop.
 */

import { MarketplaceItem, MarketplaceCategory, DifficultyLevel, PricingModel } from './contracts';

export type MarketplaceSortCriteria =
  | 'relevance'
  | 'highest_rated'
  | 'most_installed'
  | 'newest'
  | 'title';

export interface MarketplaceSearchParams {
  query?: string;
  category?: 'all' | MarketplaceCategory;
  domain?: string;
  difficulty?: 'all' | DifficultyLevel;
  pricing?: 'all' | PricingModel;
  minRating?: number;
  tags?: string[];
  sortBy?: MarketplaceSortCriteria;
}

/**
 * Normalizes query string into lowercase search tokens.
 */
export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Calculates a search relevance score for an item against search tokens.
 * Higher score = more relevant.
 */
export function computeRelevanceScore(item: MarketplaceItem, tokens: string[]): number {
  if (tokens.length === 0) return 1;

  let score = 0;
  const titleLower = item.title.toLowerCase();
  const summaryLower = (item.summary || '').toLowerCase();
  const descLower = (item.description || '').toLowerCase();
  const authorLower = item.authorName.toLowerCase();
  const tagsLower = item.tags.map((t) => t.toLowerCase());

  for (const token of tokens) {
    let tokenMatched = false;

    // Exact title match receives highest weight
    if (titleLower === token) {
      score += 50;
      tokenMatched = true;
    } else if (titleLower.includes(token)) {
      score += 25;
      tokenMatched = true;
    }

    // Tag matches receive strong weight
    for (const tag of tagsLower) {
      if (tag === token) {
        score += 20;
        tokenMatched = true;
      } else if (tag.includes(token)) {
        score += 10;
        tokenMatched = true;
      }
    }

    // Summary / description matches
    if (summaryLower.includes(token)) {
      score += 8;
      tokenMatched = true;
    }
    if (descLower.includes(token)) {
      score += 3;
      tokenMatched = true;
    }

    // Author match
    if (authorLower.includes(token)) {
      score += 5;
      tokenMatched = true;
    }

    // If a token was not found anywhere, penalize relevance
    if (!tokenMatched) {
      score -= 10;
    }
  }

  return score;
}

/**
 * Filters and sorts marketplace items according to the provided search parameters.
 */
export function filterMarketplaceItems(
  items: MarketplaceItem[],
  params: MarketplaceSearchParams = {}
): MarketplaceItem[] {
  const {
    query = '',
    category = 'all',
    domain = 'all',
    difficulty = 'all',
    pricing = 'all',
    minRating = 0,
    tags = [],
    sortBy = 'relevance',
  } = params;

  const tokens = tokenizeQuery(query);

  // 1. Filter items
  const filtered = items.filter((item) => {
    if (category !== 'all' && item.category !== category) {
      return false;
    }

    if (domain !== 'all' && item.domain.toLowerCase() !== domain.toLowerCase()) {
      return false;
    }

    if (difficulty !== 'all' && item.difficulty !== difficulty) {
      return false;
    }

    if (pricing !== 'all' && item.pricing !== pricing) {
      return false;
    }

    if (minRating > 0 && item.ratingAverage < minRating) {
      return false;
    }

    if (tags.length > 0) {
      const itemTagsLower = item.tags.map((t) => t.toLowerCase());
      const hasAllTags = tags.every((reqTag) =>
        itemTagsLower.includes(reqTag.toLowerCase())
      );
      if (!hasAllTags) {
        return false;
      }
    }

    // If query tokens provided, item must have at least one token match
    if (tokens.length > 0) {
      const score = computeRelevanceScore(item, tokens);
      if (score <= 0) {
        return false;
      }
    }

    return true;
  });

  // 2. Sort items
  return filtered.sort((a, b) => {
    switch (sortBy) {
      case 'highest_rated':
        if (b.ratingBayesian !== a.ratingBayesian) {
          return b.ratingBayesian - a.ratingBayesian;
        }
        return b.ratingCount - a.ratingCount;

      case 'most_installed':
        return b.installCount - a.installCount;

      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

      case 'title':
        return a.title.localeCompare(b.title);

      case 'relevance':
      default:
        if (tokens.length > 0) {
          const scoreA = computeRelevanceScore(a, tokens);
          const scoreB = computeRelevanceScore(b, tokens);
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
        }
        // Secondary sort: highest bayesian rating, then installs
        if (b.ratingBayesian !== a.ratingBayesian) {
          return b.ratingBayesian - a.ratingBayesian;
        }
        return b.installCount - a.installCount;
    }
  });
}
