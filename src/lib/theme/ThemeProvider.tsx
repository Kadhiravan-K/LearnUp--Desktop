'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ExtendedThemeId, ThemeContextValue } from './types';
import { DARK_THEME, LIGHT_THEME } from './default';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function applyAccentToDOM(accent: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-accent', accent);
  const accentHexMap: Record<string, string> = {
    indigo: '#6366F1',
    violet: '#8B5CF6',
    cobalt: '#2563EB',
    orange: '#F97316',
    cyan: '#06B6D4',
    emerald: '#10B981',
    rose: '#F43F5E',
    amber: '#F59E0B'
  };
  const hex = accentHexMap[accent] || '#0F766E';
  document.documentElement.style.setProperty('--sf-color-accent-custom', hex);
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
      document.documentElement.style.removeProperty('--sf-color-primary');
      document.documentElement.setAttribute('data-theme', effective);
      document.documentElement.style.colorScheme = effective;
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('LearnUp_theme') as ExtendedThemeId | null;
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
      window.dispatchEvent(new CustomEvent('LearnUp_theme_changed', { detail: sanitized }));
    } catch {
      // Ignore localStorage errors
    }
    applyThemeToDOM(sanitized);
  };

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
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
