'use client';

import React, { useState, useEffect } from 'react';
import { ThemeMode, AccentColor } from '@/lib/types';
import { useLearnUpTheme, applyAccentToDOM, applyFontScaleToDOM, applyDensityToDOM } from '@/lib/theme/ThemeProvider';
import { ExtendedThemeId } from '@/lib/theme/types';
import styles from './AppearanceSection.module.css';

export interface AppearanceSectionProps {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  onChangeTheme: (theme: ThemeMode) => void;
  onChangeAccent: (accent: AccentColor) => void;
}

const ACCENT_SPECTRUM: Array<{ id: AccentColor; name: string; hex: string }> = [
  { id: 'indigo', name: 'Indigo', hex: '#6366F1' },
  { id: 'violet', name: 'Violet', hex: '#8B5CF6' },
  { id: 'cobalt', name: 'Cobalt', hex: '#2563EB' },
  { id: 'orange', name: 'Orange', hex: '#F97316' },
  { id: 'cyan', name: 'Cyan', hex: '#06B6D4' },
  { id: 'emerald', name: 'Emerald', hex: '#10B981' },
  { id: 'rose', name: 'Rose', hex: '#F43F5E' },
  { id: 'amber', name: 'Amber', hex: '#F59E0B' }
];

export function AppearanceSection({
  themeMode,
  accentColor,
  onChangeTheme,
  onChangeAccent
}: AppearanceSectionProps) {
  const { theme, setTheme, resolvedTheme } = useLearnUpTheme();
  const [fontScale, setFontScale] = useState<'compact' | 'standard' | 'large'>('standard');
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');

  // Sync initial client state for font scale and density from localStorage
  useEffect(() => {
    try {
      const storedScale = localStorage.getItem('LearnUp_font_scale');
      if (storedScale === 'compact' || storedScale === 'standard' || storedScale === 'large') {
        setFontScale(storedScale);
      }
      const storedDensity = localStorage.getItem('LearnUp_display_density');
      if (storedDensity === 'compact' || storedDensity === 'comfortable' || storedDensity === 'spacious') {
        setDensity(storedDensity);
      }
    } catch {}
  }, []);

  const handleSelectThemeMode = (mode: ExtendedThemeId) => {
    setTheme(mode);
    // For UserSettings server sync, save resolved or explicit mode
    const serverThemeMode: ThemeMode = mode === 'dark' ? 'dark' : 'light';
    onChangeTheme(serverThemeMode);
  };

  const handleSelectAccent = (accent: AccentColor) => {
    onChangeAccent(accent);
    applyAccentToDOM(accent);
    try {
      localStorage.setItem('LearnUp_accent', accent);
      window.dispatchEvent(new CustomEvent('LearnUp_accent_changed', { detail: accent }));
    } catch {}
  };

  const handleSelectFontScale = (scale: 'compact' | 'standard' | 'large') => {
    setFontScale(scale);
    applyFontScaleToDOM(scale);
    try {
      localStorage.setItem('LearnUp_font_scale', scale);
      window.dispatchEvent(new CustomEvent('LearnUp_font_scale_changed', { detail: scale }));
    } catch {}
  };

  const handleSelectDensity = (d: 'compact' | 'comfortable' | 'spacious') => {
    setDensity(d);
    applyDensityToDOM(d);
    try {
      localStorage.setItem('LearnUp_display_density', d);
      window.dispatchEvent(new CustomEvent('LearnUp_density_changed', { detail: d }));
    } catch {}
  };

  const activeAccentObj = ACCENT_SPECTRUM.find((a) => a.id === accentColor) || ACCENT_SPECTRUM[0];

  return (
    <section id="appearance" className={styles.section} aria-labelledby="appearance-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>🎨</span>
          <div>
            <h2 id="appearance-heading" className={styles.title}>Appearance &amp; Interface System</h2>
            <p className={styles.subtext}>Customize your reading themes, interface density, and visual accent palette.</p>
          </div>
        </div>
        <span className={styles.engineBadge}>ENGINE: Geist Pro</span>
      </div>

      {/* Theme Mode Selector: Light, Dark, System */}
      <div className={styles.group}>
        <span className={styles.groupLabel}>THEME MODE</span>
        <div className={styles.themeGrid}>
          {/* Light Mode */}
          <button
            type="button"
            className={`${styles.themeCard} ${theme === 'light' ? styles.themeCardActive : ''}`}
            onClick={() => handleSelectThemeMode('light')}
            aria-pressed={theme === 'light'}
          >
            <div className={styles.themeCardTop}>
              <div className={styles.themeTitleRow}>
                <span>☀️</span>
                <span className={styles.themeName}>Light</span>
              </div>
              <span className={theme === 'light' ? styles.checkActive : styles.radioInactive}>
                {theme === 'light' ? '✓' : ''}
              </span>
            </div>
            <div className={styles.themePreviewLight}>
              <div className={styles.previewBarLight} />
              <div className={styles.previewBlockLight} />
            </div>
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            className={`${styles.themeCard} ${theme === 'dark' ? styles.themeCardActive : ''}`}
            onClick={() => handleSelectThemeMode('dark')}
            aria-pressed={theme === 'dark'}
          >
            <div className={styles.themeCardTop}>
              <div className={styles.themeTitleRow}>
                <span>🌙</span>
                <span className={styles.themeName}>Dark (OLED Focus)</span>
              </div>
              <span className={theme === 'dark' ? styles.checkActive : styles.radioInactive}>
                {theme === 'dark' ? '✓' : ''}
              </span>
            </div>
            <div className={styles.themePreviewDark}>
              <div className={styles.previewBarDark} />
              <div className={styles.previewBlockDark} />
            </div>
          </button>

          {/* System Mode */}
          <button
            type="button"
            className={`${styles.themeCard} ${theme === 'system' ? styles.themeCardActive : ''}`}
            onClick={() => handleSelectThemeMode('system')}
            aria-pressed={theme === 'system'}
          >
            <div className={styles.themeCardTop}>
              <div className={styles.themeTitleRow}>
                <span>💻</span>
                <span className={styles.themeName}>System ({resolvedTheme})</span>
              </div>
              <span className={theme === 'system' ? styles.checkActive : styles.radioInactive}>
                {theme === 'system' ? '✓' : ''}
              </span>
            </div>
            <div className={styles.themePreviewSystem}>
              <div className={styles.previewSplitLight} />
              <div className={styles.previewSplitDark} />
            </div>
          </button>
        </div>
      </div>

      {/* Accent Spectrum */}
      <div className={styles.group}>
        <div className={styles.accentHeader}>
          <div className={styles.accentText}>
            <span className={styles.groupLabel}>ACCENT SPECTRUM</span>
            <p className={styles.subtext}>
              Calibrates active markers, focus halos, and learning badges. Selected:{' '}
              <strong>{activeAccentObj.name}</strong>
            </p>
          </div>
          <div className={styles.colorPills} role="radiogroup" aria-label="Accent color selection">
            {ACCENT_SPECTRUM.map((acc) => (
              <button
                key={acc.id}
                type="button"
                className={`${styles.colorDot} ${accentColor === acc.id ? styles.dotActive : ''}`}
                style={{ backgroundColor: acc.hex }}
                onClick={() => handleSelectAccent(acc.id)}
                aria-label={`${acc.name} accent`}
                aria-checked={accentColor === acc.id}
                role="radio"
              >
                {accentColor === acc.id && <span className={styles.checkMark}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Font Scale & Display Density Controls */}
      <div className={styles.twoColumnGrid}>
        {/* Font Scale */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>TYPOGRAPHY FONT SCALE</span>
          <p className={styles.subtext}>Adjust reading scale across study notes, quizzes, and course outlines.</p>
          <div className={styles.segmentedControl} role="radiogroup" aria-label="Font scale">
            <button
              type="button"
              className={`${styles.segmentBtn} ${fontScale === 'compact' ? styles.segmentActive : ''}`}
              onClick={() => handleSelectFontScale('compact')}
              aria-checked={fontScale === 'compact'}
              role="radio"
            >
              Compact (90%)
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${fontScale === 'standard' ? styles.segmentActive : ''}`}
              onClick={() => handleSelectFontScale('standard')}
              aria-checked={fontScale === 'standard'}
              role="radio"
            >
              Standard (100%)
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${fontScale === 'large' ? styles.segmentActive : ''}`}
              onClick={() => handleSelectFontScale('large')}
              aria-checked={fontScale === 'large'}
              role="radio"
            >
              Large (110%)
            </button>
          </div>
        </div>

        {/* Display Density */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>INTERFACE DISPLAY DENSITY</span>
          <p className={styles.subtext}>Controls spacing and compact padding across sidebar, tables, and lists.</p>
          <div className={styles.segmentedControl} role="radiogroup" aria-label="Display density">
            <button
              type="button"
              className={`${styles.segmentBtn} ${density === 'compact' ? styles.segmentActive : ''}`}
              onClick={() => handleSelectDensity('compact')}
              aria-checked={density === 'compact'}
              role="radio"
            >
              Compact
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${density === 'comfortable' ? styles.segmentActive : ''}`}
              onClick={() => handleSelectDensity('comfortable')}
              aria-checked={density === 'comfortable'}
              role="radio"
            >
              Comfortable
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${density === 'spacious' ? styles.segmentActive : ''}`}
              onClick={() => handleSelectDensity('spacious')}
              aria-checked={density === 'spacious'}
              role="radio"
            >
              Spacious
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Theme Live Preview Card */}
      <div className={styles.previewWidget}>
        <div className={styles.previewWidgetHeader}>
          <span className={styles.groupLabel}>LIVE THEME PREVIEW</span>
          <span className={styles.previewModeBadge}>
            Mode: {theme.toUpperCase()} &bull; Accent: {activeAccentObj.name}
          </span>
        </div>
        <div className={styles.previewSampleBox}>
          <div className={styles.previewSampleRow}>
            <span
              className={styles.sampleBadge}
              style={{ backgroundColor: activeAccentObj.hex, color: '#FFFFFF' }}
            >
              Active Milestone
            </span>
            <span className={styles.sampleTag}>Sprint 4 &bull; 25m</span>
            <span className={styles.sampleStatus}>Synced</span>
          </div>
          <div className={styles.sampleProgressBarBg}>
            <div
              className={styles.sampleProgressBarFill}
              style={{ width: '68%', backgroundColor: activeAccentObj.hex }}
            />
          </div>
          <p className={styles.sampleText}>
            The quick brown fox jumps over the lazy dog &bull; Distributed consensus state machine active.
          </p>
        </div>
      </div>

      {/* Core Typography Pair Card */}
      <div className={styles.typographyCard}>
        <div className={styles.typographyLeft}>
          <span className={styles.typographyTitle}>Core Typography Pair</span>
          <span className={styles.typographyDesc}>Geist Sans (UI &amp; Prose) + JetBrains Mono (Telemetry &amp; Code)</span>
        </div>
        <span className={styles.hardwareBadge}>GPU ACCELERATED</span>
      </div>
    </section>
  );
}
