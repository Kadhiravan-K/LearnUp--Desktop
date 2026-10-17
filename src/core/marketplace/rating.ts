/**
 * LearnUp Community Marketplace — Bayesian Weighted Rating
 * Mathematical rating calculation to prevent rating manipulation and balance new items.
 *
 * Formula:
 *   WR = (v / (v + m)) * R + (m / (v + m)) * C
 *
 * Where:
 *   v = number of verified reviews for the item
 *   m = minimum threshold weight (default: 5)
 *   R = arithmetic average rating of the item (1.0 to 5.0)
 *   C = global prior mean rating (default: 3.5)
 */

export interface BayesianRatingConfig {
  minimumReviews: number; // m
  priorMean: number;       // C
}

export const DEFAULT_BAYESIAN_CONFIG: BayesianRatingConfig = {
  minimumReviews: 5,
  priorMean: 3.5,
};

export interface RatingStatsResult {
  reviewCount: number;
  averageRating: number;
  bayesianRating: number;
}

/**
 * Calculates the Bayesian weighted rating.
 * Returns a score between 1.00 and 5.00 rounded to 2 decimal places.
 * When v = 0 and r = 0, returns the priorMean C.
 */
export function calculateBayesianRating(
  v: number,
  r: number,
  config: Partial<BayesianRatingConfig> = {}
): number {
  const m = config.minimumReviews ?? DEFAULT_BAYESIAN_CONFIG.minimumReviews;
  const c = config.priorMean ?? DEFAULT_BAYESIAN_CONFIG.priorMean;

  if (v <= 0) {
    return Number(c.toFixed(2));
  }

  // Clamp r between 1 and 5
  const clampedR = Math.min(5, Math.max(1, r));

  const weighted = (v / (v + m)) * clampedR + (m / (v + m)) * c;
  return Number(weighted.toFixed(2));
}

/**
 * Computes arithmetic mean, review count, and Bayesian weighted rating
 * from a list of user ratings.
 */
export function calculateItemRatingStats(
  ratings: number[],
  config: Partial<BayesianRatingConfig> = {}
): RatingStatsResult {
  if (!ratings || ratings.length === 0) {
    const c = config.priorMean ?? DEFAULT_BAYESIAN_CONFIG.priorMean;
    return {
      reviewCount: 0,
      averageRating: 0,
      bayesianRating: Number(c.toFixed(2)),
    };
  }

  // Filter valid ratings 1 to 5
  const validRatings = ratings.filter((r) => typeof r === 'number' && r >= 1 && r <= 5);

  if (validRatings.length === 0) {
    const c = config.priorMean ?? DEFAULT_BAYESIAN_CONFIG.priorMean;
    return {
      reviewCount: 0,
      averageRating: 0,
      bayesianRating: Number(c.toFixed(2)),
    };
  }

  const sum = validRatings.reduce((acc, val) => acc + val, 0);
  const average = Number((sum / validRatings.length).toFixed(2));
  const bayesian = calculateBayesianRating(validRatings.length, average, config);

  return {
    reviewCount: validRatings.length,
    averageRating: average,
    bayesianRating: bayesian,
  };
}
