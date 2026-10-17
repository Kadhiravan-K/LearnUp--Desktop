import { TokenUsageSummary, TokenUsageRecord } from '../types';

export interface ModelPricing {
  promptCostPerMillion: number;
  completionCostPerMillion: number;
}

export const PROVIDER_MODEL_PRICING: Record<string, Record<string, ModelPricing>> = {
  anthropic: {
    'claude-3-5-sonnet-20241022': { promptCostPerMillion: 3.00, completionCostPerMillion: 15.00 },
    'claude-3-5-haiku-20241022': { promptCostPerMillion: 0.80, completionCostPerMillion: 4.00 },
    'claude-3-opus-20240229': { promptCostPerMillion: 15.00, completionCostPerMillion: 75.00 }
  },
  openai: {
    'gpt-4o': { promptCostPerMillion: 2.50, completionCostPerMillion: 10.00 },
    'gpt-4o-mini': { promptCostPerMillion: 0.15, completionCostPerMillion: 0.60 },
    'o1-preview': { promptCostPerMillion: 15.00, completionCostPerMillion: 60.00 }
  },
  google: {
    'gemini-1.5-pro': { promptCostPerMillion: 1.25, completionCostPerMillion: 5.00 },
    'gemini-1.5-flash': { promptCostPerMillion: 0.075, completionCostPerMillion: 0.30 }
  },
  ollama: {
    'llama3.2': { promptCostPerMillion: 0.00, completionCostPerMillion: 0.00 },
    'mistral': { promptCostPerMillion: 0.00, completionCostPerMillion: 0.00 },
    'deepseek-r1:14b': { promptCostPerMillion: 0.00, completionCostPerMillion: 0.00 },
    'qwen2.5-coder': { promptCostPerMillion: 0.00, completionCostPerMillion: 0.00 }
  },
  local: {
    'local-engine': { promptCostPerMillion: 0.00, completionCostPerMillion: 0.00 }
  }
};

/**
 * Calculates estimated cost in USD for a given LLM inference request.
 */
export function calculateTokenCost(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const providerModels = PROVIDER_MODEL_PRICING[provider.toLowerCase()];
  const pricing = providerModels?.[model.toLowerCase()] ||
    providerModels?.[Object.keys(providerModels)[0]] ||
    { promptCostPerMillion: 0.00, completionCostPerMillion: 0.00 };

  const promptCost = (promptTokens / 1_000_000) * pricing.promptCostPerMillion;
  const completionCost = (completionTokens / 1_000_000) * pricing.completionCostPerMillion;

  return Number((promptCost + completionCost).toFixed(6));
}

/**
 * Generates summary stats and provider breakdown from token usage records.
 */
export function summarizeTokenUsage(
  records: TokenUsageRecord[],
  monthlyBudgetUsd: number = 20.00
): TokenUsageSummary {
  const totalTokens = records.reduce((acc, r) => acc + r.total_tokens, 0);
  const totalCostUsd = records.reduce((acc, r) => acc + Number(r.estimated_cost_usd), 0);
  const totalRequests = records.length;

  const providerMap: Record<string, { tokens: number; cost: number }> = {};

  for (const r of records) {
    const key = r.provider;
    if (!providerMap[key]) {
      providerMap[key] = { tokens: 0, cost: 0 };
    }
    providerMap[key].tokens += r.total_tokens;
    providerMap[key].cost += Number(r.estimated_cost_usd);
  }

  const providerBreakdown = Object.entries(providerMap).map(([provider, data]) => ({
    provider,
    tokens: data.tokens,
    costUsd: Number(data.cost.toFixed(4)),
    percentage: totalCostUsd > 0 ? Math.round((data.cost / totalCostUsd) * 100) : 0
  }));

  const budgetUsedPercentage = monthlyBudgetUsd > 0
    ? Math.min(100, Math.round((totalCostUsd / monthlyBudgetUsd) * 100))
    : 0;

  return {
    totalTokens,
    totalCostUsd: Number(totalCostUsd.toFixed(4)),
    totalRequests,
    providerBreakdown,
    monthlyBudgetUsd,
    budgetUsedPercentage
  };
}
