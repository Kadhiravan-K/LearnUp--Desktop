/**
 * LearnUp Theme System — Type Definitions
 * Centralized contracts for light and dark theme tokens, metadata, and provider context.
 */

export type CoreThemeId = 'light' | 'dark';

export type ExtendedThemeId = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryLight: string;
  primaryBorder: string;
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  border: string;
  borderHover: string;
  borderFocus: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textInverse: string;
  cardBg: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  focusRingColor: string;
  glow?: string;
  accentSecondary?: string;
}

export interface MotionTokens {
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
  easeDefault: string;
}

export interface ThemeDefinition {
  id: ExtendedThemeId;
  name: string;
  tagline: string;
  description: string;
  category: 'core' | 'immersive' | 'plugin';
  badge?: string;
  icon: string;
  colors: ThemeColors;
  telemetryLabels?: {
    systemStatus: string;
    learningCore: string;
    sessionActive: string;
    syncOnline: string;
  };
}

export interface ThemeContextValue {
  theme: ExtendedThemeId;
  resolvedTheme: ExtendedThemeId;
  setTheme: (theme: ExtendedThemeId) => void;
  toggleTheme: () => void;
  isDark: boolean;
  prefersReducedMotion: boolean;
  themeConfig: ThemeDefinition;
  availableThemes: ThemeDefinition[];
}
