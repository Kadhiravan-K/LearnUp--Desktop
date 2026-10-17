export type MarketplaceItemKind =
  | 'template'
  | 'agent'
  | 'skill'
  | 'plugin'
  | 'connector'
  | 'feature_pack';

export type MarketplaceCategoryTab =
  | 'for_you'
  | 'discover'
  | 'templates'
  | 'agents'
  | 'skills'
  | 'plugins'
  | 'connectors';

export type MarketplaceDomain =
  | 'Software Engineering'
  | 'Embedded Engineering'
  | 'Design Engineering'
  | 'HR & Recruitment'
  | 'Leadership / CEO'
  | 'SEO & Marketing'
  | 'Data Science'
  | 'Education'
  | 'Healthcare Education';

export type MarketplaceSortOption =
  | 'relevance'
  | 'recently_published'
  | 'recently_updated'
  | 'most_installed'
  | 'highest_rated'
  | 'alphabetical';

export type MarketplaceDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface MarketplaceItem {
  id: string;
  kind: MarketplaceItemKind;
  title: string;
  description: string;
  domain: MarketplaceDomain;
  version: string;
  publisher: string;
  isVerifiedPublisher: boolean;
  isCurated: boolean;
  isAiPowered: boolean;
  isInstalled: boolean;
  rating: number; // 0 if no verified reviews exist
  reviewCount: number;
  installCount: number;
  tags: string[];
  difficulty?: MarketplaceDifficulty;
  requiredConnectors?: string[];
  includedAgents?: string[];
  includedSkills?: string[];
  includedTemplates?: string[];
  permissions?: string[];
  pricing: 'free' | 'pro';
  medicalDisclaimer?: string;
  updatedAt: string;
  data?: Record<string, any>;
}

export interface MarketplaceFilterState {
  searchQuery: string;
  categoryTab: MarketplaceCategoryTab;
  domain: string; // 'all' or MarketplaceDomain
  difficulty: string; // 'all' or MarketplaceDifficulty
  aiOnly: boolean;
  installedOnly: boolean;
  verifiedOnly: boolean;
  sortBy: MarketplaceSortOption;
}
