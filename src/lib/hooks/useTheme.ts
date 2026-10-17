'use client';

import { useState, useEffect, useCallback } from 'react';

export type Theme =
  | 'default'
  | 'light'
  | 'dark'
  | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<Theme>('light');

  const applyTheme = useCallback((targetTheme: Theme) => {
    let effective: Theme = 'light';
    if (targetTheme === 'system') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      effective = prefersDark ? 'dark' : 'light';
    } else if (targetTheme === 'dark') {
      effective = 'dark';
    } else {
      effective = 'light';
    }

    setResolvedTheme(effective);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', effective);
      document.documentElement.style.colorScheme = effective;
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('LearnUp_theme') as Theme | null;
      const initial = saved === 'dark' ? 'dark' : (saved === 'system' ? 'system' : 'light');
      setThemeState(initial);
      applyTheme(initial);
    } catch {
      applyTheme('light');
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const current = localStorage.getItem('LearnUp_theme') as Theme | null;
        if (current === 'system') {
          applyTheme('system');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [applyTheme]);

  const setTheme = (newTheme: Theme) => {
    const sanitized = newTheme === 'dark' ? 'dark' : (newTheme === 'system' ? 'system' : 'light');
    setThemeState(sanitized);
    try {
      localStorage.setItem('LearnUp_theme', sanitized);
      window.dispatchEvent(new CustomEvent('LearnUp_theme_changed', { detail: sanitized }));
    } catch {
      // Ignore
    }
    applyTheme(sanitized);
  };

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark'
  };
}
