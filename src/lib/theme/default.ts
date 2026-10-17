import { ThemeDefinition } from './types';

export const LIGHT_THEME: ThemeDefinition = {
  id: 'light',
  name: 'LearnUp Light',
  tagline: 'Daylight Minimal',
  description: 'Crisp high-readability design with neutral surfaces, balanced visual weight, and deep teal accents.',
  category: 'core',
  badge: 'LIGHT',
  icon: '☀️',
  colors: {
    primary: '#0F766E',
    primaryHover: '#115E59',
    primaryActive: '#0D4E4A',
    primaryLight: '#F0FDFA',
    primaryBorder: '#99F6E4',
    bg: '#F7FAF9',
    bgElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceHover: '#F0F4F3',
    surfaceActive: '#E5ECEB',
    border: '#E0E7E6',
    borderHover: '#CBD6D4',
    borderFocus: '#0F766E',
    textPrimary: '#132B29',
    textSecondary: '#57706C',
    textTertiary: '#7B9490',
    textMuted: '#6B8580',
    textInverse: '#FFFFFF',
    cardBg: '#FFFFFF',
    cardBorder: '#E0E7E6',
    inputBg: '#FFFFFF',
    inputBorder: '#CBD6D4',
    focusRingColor: 'rgba(15, 118, 110, 0.45)'
  },
  telemetryLabels: {
    systemStatus: 'System Nominal',
    learningCore: 'Learning Engine Ready',
    sessionActive: 'Session Active',
    syncOnline: 'Cloud Synced'
  }
};

export const DEFAULT_THEME: ThemeDefinition = {
  ...LIGHT_THEME,
  id: 'light',
  name: 'LearnUp Default',
  tagline: 'Clean Productivity'
};

export const DARK_THEME: ThemeDefinition = {
  id: 'dark',
  name: 'LearnUp Dark',
  tagline: 'Deep Obsidian Focus',
  description: 'Restrained dark mode with neutral slate surfaces, high-contrast text, and soft mint/teal accents.',
  category: 'core',
  badge: 'DARK',
  icon: '🌙',
  colors: {
    primary: '#5EEAD4',
    primaryHover: '#2DD4BF',
    primaryActive: '#14B8A6',
    primaryLight: 'rgba(94, 234, 212, 0.12)',
    primaryBorder: '#134E4A',
    bg: '#111B1B',
    bgElevated: '#1D2B2A',
    surface: '#1D2B2A',
    surfaceHover: '#263836',
    surfaceActive: '#2F4543',
    border: '#344743',
    borderHover: '#455F5A',
    borderFocus: '#5EEAD4',
    textPrimary: '#EDF7F4',
    textSecondary: '#A4B9B4',
    textTertiary: '#768E89',
    textMuted: '#708A85',
    textInverse: '#111B1B',
    cardBg: '#1D2B2A',
    cardBorder: '#344743',
    inputBg: '#152221',
    inputBorder: '#344743',
    focusRingColor: 'rgba(94, 234, 212, 0.45)'
  },
  telemetryLabels: {
    systemStatus: 'Dark Engine Active',
    learningCore: 'Low-Strain Focus',
    sessionActive: 'Nocturnal Session Active',
    syncOnline: 'Cloud Synced'
  }
};

