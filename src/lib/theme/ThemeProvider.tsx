'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ExtendedThemeId, ThemeContextValue } from './types';
import { DARK_THEME, LIGHT_THEME } from './default';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function applyAccentToDOM(accent: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-accent', accent);
  const accentMap: Record<string, { primary: string; hover: string; light: string; border: string }> = {
    indigo: { primary: '#6366F1', hover: '#4F46E5', light: 'rgba(99, 102, 241, 0.12)', border: '#A5B4FC' },
    violet: { primary: '#8B5CF6', hover: '#7C3AED', light: 'rgba(139, 92, 246, 0.12)', border: '#C4B5FD' },
    cobalt: { primary: '#2563EB', hover: '#1D4ED8', light: 'rgba(37, 99, 235, 0.12)', border: '#93C5FD' },
    orange: { primary: '#F97316', hover: '#EA580C', light: 'rgba(249, 115, 22, 0.12)', border: '#FDBA74' },
    cyan: { primary: '#06B6D4', hover: '#0891B2', light: 'rgba(6, 182, 212, 0.12)', border: '#67E8F9' },
    emerald: { primary: '#10B981', hover: '#059669', light: 'rgba(16, 185, 129, 0.12)', border: '#6EE7B7' },
    rose: { primary: '#F43F5E', hover: '#E11D48', light: 'rgba(244, 63, 94, 0.12)', border: '#FDA4AF' },
    amber: { primary: '#F59E0B', hover: '#D97706', light: 'rgba(245, 158, 11, 0.12)', border: '#FCD34D' }
  };

  const palette = accentMap[accent] || { primary: '#0F766E', hover: '#0D9488', light: '#F0FDFA', border: '#99F6E4' };

  document.documentElement.style.setProperty('--sf-color-primary', palette.primary);
  document.documentElement.style.setProperty('--sf-color-primary-hover', palette.hover);
  document.documentElement.style.setProperty('--sf-color-primary-light', palette.light);
  document.documentElement.style.setProperty('--sf-color-primary-border', palette.border);
  document.documentElement.style.setProperty('--sf-accent-primary', palette.primary);
  document.documentElement.style.setProperty('--sf-accent-hover', palette.hover);
  document.documentElement.style.setProperty('--sf-accent-subtle', palette.light);
  document.documentElement.style.setProperty('--sf-color-border-focus', palette.primary);
  document.documentElement.style.setProperty('--sf-color-selected-border', palette.primary);
  document.documentElement.style.setProperty('--sf-color-selected-text', palette.primary);
  document.documentElement.style.setProperty('--sf-color-accent-custom', palette.primary);
}

export function applyFontScaleToDOM(scale: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-font-scale', scale);
  const scaleMap: Record<string, string> = {
    compact: '14px',
    standard: '16px',
    large: '18px',
    '90%': '14px',
    '100%': '16px',
    '110%': '18px'
  };
  if (scaleMap[scale]) {
    document.documentElement.style.setProperty('--sf-font-base-size', scaleMap[scale]);
  }
}

export function applyDensityToDOM(density: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-density', density);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ExtendedThemeId>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const applyThemeToDOM = useCallback((targetTheme: ExtendedThemeId) => {
    let effective: 'light' | 'dark' = 'light';
    if (targetTheme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } else {
      effective = targetTheme === 'dark' ? 'dark' : 'light';
    }

    setResolvedTheme(effective);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', effective);
      document.documentElement.style.colorScheme = effective;
      try {
        localStorage.setItem('theme', effective);
      } catch {}

      // Re-apply saved custom accent if set
      const savedAccent = localStorage.getItem('LearnUp_accent');
      if (savedAccent) {
        applyAccentToDOM(savedAccent);
      }
    }
  }, []);

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('LearnUp_theme') || localStorage.getItem('theme')) as ExtendedThemeId | null;
      const initial: ExtendedThemeId = saved === 'dark' || saved === 'system' ? saved : 'light';
      setThemeState(initial);
      applyThemeToDOM(initial);

      // Load saved accent
      const savedAccent = localStorage.getItem('LearnUp_accent');
      if (savedAccent) applyAccentToDOM(savedAccent);

      // Load saved font scale
      const savedScale = localStorage.getItem('LearnUp_font_scale');
      if (savedScale) applyFontScaleToDOM(savedScale);

      // Load saved density
      const savedDensity = localStorage.getItem('LearnUp_display_density');
      if (savedDensity) applyDensityToDOM(savedDensity);
    } catch {
      applyThemeToDOM('light');
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(motionQuery.matches);

      const handleMotionChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };
      motionQuery.addEventListener('change', handleMotionChange);

      return () => {
        motionQuery.removeEventListener('change', handleMotionChange);
      };
    }
  }, [applyThemeToDOM]);

  // Listen for theme change events dispatched from settings or header
  useEffect(() => {
    const handleExternalThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ExtendedThemeId>;
      if (customEvent.detail && customEvent.detail !== theme) {
        setThemeState(customEvent.detail);
        applyThemeToDOM(customEvent.detail);
      }
    };
    window.addEventListener('LearnUp_theme_changed', handleExternalThemeChange);
    return () => window.removeEventListener('LearnUp_theme_changed', handleExternalThemeChange);
  }, [theme, applyThemeToDOM]);

  // Listen to OS color scheme changes when mode is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      applyThemeToDOM('system');
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme, applyThemeToDOM]);

  const setTheme = (newTheme: ExtendedThemeId) => {
    const sanitized: ExtendedThemeId = newTheme === 'dark' || newTheme === 'system' ? newTheme : 'light';
    setThemeState(sanitized);
    try {
      localStorage.setItem('LearnUp_theme', sanitized);
      localStorage.setItem('theme', sanitized === 'system' ? resolvedTheme : sanitized);
      window.dispatchEvent(new CustomEvent('LearnUp_theme_changed', { detail: sanitized }));
    } catch {
      // Ignore localStorage errors
    }
    applyThemeToDOM(sanitized);
  };

  const toggleTheme = () => {
    const next: ExtendedThemeId = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const currentConfig = resolvedTheme === 'dark' ? DARK_THEME : LIGHT_THEME;

  const contextValue: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    prefersReducedMotion,
    themeConfig: currentConfig,
    availableThemes: [LIGHT_THEME, DARK_THEME]
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useLearnUpTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
      prefersReducedMotion: false,
      themeConfig: LIGHT_THEME,
      availableThemes: [LIGHT_THEME, DARK_THEME]
    };
  }
  return context;
}
