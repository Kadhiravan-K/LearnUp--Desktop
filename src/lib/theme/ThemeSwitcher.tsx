'use client';

import React from 'react';
import { useLearnUpTheme } from './ThemeProvider';
import { ExtendedThemeId, ThemeDefinition } from './types';
import styles from './ThemeSwitcher.module.css';

export interface ThemeSwitcherProps {
  onThemeSelect?: (themeId: ExtendedThemeId) => void;
  className?: string;
}

export function ThemeSwitcher({ onThemeSelect, className = '' }: ThemeSwitcherProps) {
  const { theme, setTheme, availableThemes } = useLearnUpTheme();

  const handleSelect = (id: ExtendedThemeId) => {
    setTheme(id);
    if (onThemeSelect) {
      onThemeSelect(id);
    }
  };

  const getPreviewClass = (id: string) => {
    if (id === 'dark') return styles.previewDark;
    return styles.previewLight;
  };

  return (
    <div className={`${styles.container} ${className}`} role="radiogroup" aria-label="LearnUp Visual Themes">
      <div className={styles.themeGrid}>
        {availableThemes.map((t: ThemeDefinition) => {
          const isActive = theme === t.id;

          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={`${styles.themeCard} ${isActive ? styles.themeCardActive : ''}`}
              onClick={() => handleSelect(t.id)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.identityRow}>
                  <span className={styles.icon} aria-hidden="true">{t.icon}</span>
                  <span className={styles.title}>{t.name}</span>
                </div>
                <div className={isActive ? styles.activeCheck : styles.inactiveRadio} aria-hidden="true">
                  {isActive ? '✓' : ''}
                </div>
              </div>

              <span className={styles.tagline}>{t.tagline}</span>
              <p className={styles.description}>{t.description}</p>

              <div className={`${styles.previewBox} ${getPreviewClass(t.id)}`} aria-hidden="true">
                <div className={styles.previewBar} />
                <div className={styles.previewSurface} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
