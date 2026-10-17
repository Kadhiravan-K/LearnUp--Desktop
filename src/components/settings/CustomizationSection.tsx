'use client';

import React, { useState, useEffect } from 'react';
import { usePlayerShortcuts, PlayerShortcuts, DEFAULT_PLAYER_SHORTCUTS } from '@/lib/hooks/usePlayerShortcuts';
import { Button } from '@/components/ui/Button/Button';
import styles from './CustomizationSection.module.css';

export interface CustomizationSectionProps {
  onNotify?: (msg: string) => void;
}

export interface ThemeOption {
  id: 'light' | 'dark';
  name: string;
  category: 'core' | 'premium_plugin';
  desc: string;
  primaryColor: string;
  bgPreview: string;
  borderPreview: string;
  accentPreview: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    name: 'Daylight Minimal (Light)',
    category: 'core',
    desc: 'Crisp high-readability design with clean neutral surfaces and focused deep teal accents.',
    primaryColor: '#0F766E',
    bgPreview: '#F7FAF9',
    borderPreview: '#D2DFDC',
    accentPreview: '#0F766E'
  },
  {
    id: 'dark',
    name: 'Midnight Void (Dark)',
    category: 'core',
    desc: 'Low-strain OLED dark mode with deep neutral slate surfaces and mint teal accents.',
    primaryColor: '#5EEAD4',
    bgPreview: '#111B1B',
    borderPreview: '#344743',
    accentPreview: '#5EEAD4'
  }
];

export function CustomizationSection({ onNotify }: CustomizationSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'workspace' | 'player' | 'ai_motion'>('workspace');
  const { shortcuts, saveShortcuts, resetShortcuts } = usePlayerShortcuts();

  // Sidebar Behavior State
  const [sidebarBehavior, setSidebarBehavior] = useState<'expanded' | 'collapsed' | 'hover'>('expanded');

  // Dashboard Widget Visibility State
  const [widgetToggles, setWidgetToggles] = useState({
    showHeatmap: true,
    showStats: true,
    showRadar: true,
    showAssistant: true
  });

  // Media Player Engine & Shortcuts State
  const [playerEngine, setPlayerEngine] = useState<'custom_player' | 'youtube_native'>('custom_player');
  const [recordingField, setRecordingField] = useState<keyof PlayerShortcuts | null>(null);
  const [localShortcuts, setLocalShortcuts] = useState<PlayerShortcuts>(shortcuts);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Motion & Accessibility State
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ambientGlow, setAmbientGlow] = useState(true);
  const [highContrastVideo, setHighContrastVideo] = useState(false);

  // AI Presentation Preferences
  const [richUiDefault, setRichUiDefault] = useState(true);
  const [showTokenMetrics, setShowTokenMetrics] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedSidebar = localStorage.getItem('LearnUp_sidebar_behavior');
      if (storedSidebar === 'expanded' || storedSidebar === 'collapsed' || storedSidebar === 'hover') {
        setSidebarBehavior(storedSidebar);
      }

      const storedWidgets = localStorage.getItem('LearnUp_dashboard_widgets');
      if (storedWidgets) {
        setWidgetToggles(JSON.parse(storedWidgets));
      }

      const storedEngine = localStorage.getItem('LearnUp_player_engine');
      if (storedEngine === 'youtube_native' || storedEngine === 'custom_player') {
        setPlayerEngine(storedEngine);
      }

      const storedReduceMotion = localStorage.getItem('LearnUp_reduce_motion');
      if (storedReduceMotion) setReduceMotion(storedReduceMotion === 'true');

      const storedGlow = localStorage.getItem('LearnUp_ambient_glow');
      if (storedGlow) setAmbientGlow(storedGlow === 'true');

      const storedContrast = localStorage.getItem('LearnUp_high_contrast_video');
      if (storedContrast) setHighContrastVideo(storedContrast === 'true');

      const storedRichUi = localStorage.getItem('LearnUp_ai_rich_ui_default');
      if (storedRichUi) setRichUiDefault(storedRichUi === 'true');

      const storedTokenMetrics = localStorage.getItem('LearnUp_show_token_metrics');
      if (storedTokenMetrics) setShowTokenMetrics(storedTokenMetrics === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    setLocalShortcuts(shortcuts);
  }, [shortcuts]);

  // Handle shortcut key recording
  useEffect(() => {
    if (!recordingField) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let keyName = e.key;
      if (keyName === ' ') keyName = 'Space';
      else if (keyName === 'ArrowLeft') keyName = 'ArrowLeft';
      else if (keyName === 'ArrowRight') keyName = 'ArrowRight';
      else if (keyName === 'ArrowUp') keyName = 'ArrowUp';
      else if (keyName === 'ArrowDown') keyName = 'ArrowDown';

      setLocalShortcuts((prev) => ({
        ...prev,
        [recordingField]: keyName
      }));
      setRecordingField(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [recordingField]);

  // Sidebar behavior change
  const handleSelectSidebarBehavior = (val: 'expanded' | 'collapsed' | 'hover') => {
    setSidebarBehavior(val);
    try {
      localStorage.setItem('LearnUp_sidebar_behavior', val);
      window.dispatchEvent(new CustomEvent('LearnUp_sidebar_changed', { detail: val }));
    } catch {}
    if (onNotify) onNotify(`Sidebar behavior set to: ${val}`);
  };

  // Toggle widget visibility
  const handleToggleWidget = (key: keyof typeof widgetToggles) => {
    const next = { ...widgetToggles, [key]: !widgetToggles[key] };
    setWidgetToggles(next);
    try {
      localStorage.setItem('LearnUp_dashboard_widgets', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('LearnUp_widgets_changed', { detail: next }));
    } catch {}
  };

  // Save player shortcuts & engine
  const handleSavePlayerConfig = () => {
    saveShortcuts(localShortcuts);
    try {
      localStorage.setItem('LearnUp_player_engine', playerEngine);
      window.dispatchEvent(new CustomEvent('LearnUp_player_engine_changed', { detail: playerEngine }));
    } catch {}
    setSavedSuccess(true);
    if (onNotify) onNotify('Player shortcuts & engine saved successfully!');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetShortcuts = () => {
    resetShortcuts();
    setLocalShortcuts(DEFAULT_PLAYER_SHORTCUTS);
    if (onNotify) onNotify('Restored default shortcut mappings.');
  };

  // Toggle Reduce Motion
  const handleToggleReduceMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    try {
      localStorage.setItem('LearnUp_reduce_motion', String(next));
      document.documentElement.setAttribute('data-reduced-motion', String(next));
    } catch {}
  };

  // Toggle Ambient Glow
  const handleToggleAmbientGlow = () => {
    const next = !ambientGlow;
    setAmbientGlow(next);
    try {
      localStorage.setItem('LearnUp_ambient_glow', String(next));
    } catch {}
  };

  // Toggle High Contrast Video
  const handleToggleHighContrast = () => {
    const next = !highContrastVideo;
    setHighContrastVideo(next);
    try {
      localStorage.setItem('LearnUp_high_contrast_video', String(next));
    } catch {}
  };

  // Toggle Rich UI Default
  const handleToggleRichUiDefault = () => {
    const next = !richUiDefault;
    setRichUiDefault(next);
    try {
      localStorage.setItem('LearnUp_ai_rich_ui_default', String(next));
    } catch {}
    if (onNotify) onNotify(`Rich AI Output default: ${next ? 'Enabled' : 'Disabled'}`);
  };

  // Toggle Token Metrics
  const handleToggleTokenMetrics = () => {
    const next = !showTokenMetrics;
    setShowTokenMetrics(next);
    try {
      localStorage.setItem('LearnUp_show_token_metrics', String(next));
    } catch {}
  };

  return (
    <section id="customization" className={styles.section} aria-labelledby="customization-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>🛠️</span>
          <div>
            <h2 id="customization-heading" className={styles.title}>Workspace &amp; Learning Customization</h2>
            <p className={styles.subtext}>
              Configure sidebar behavior, dashboard layout, media playback shortcuts, motion, and AI presentation.
            </p>
          </div>
        </div>
      </div>

      {/* Subtabs Navigation */}
      <div className={styles.subtabsNav} role="tablist" aria-label="Customization categories">
        <button
          type="button"
          className={`${styles.subtabBtn} ${activeSubTab === 'workspace' ? styles.subtabActive : ''}`}
          onClick={() => setActiveSubTab('workspace')}
          role="tab"
          aria-selected={activeSubTab === 'workspace'}
        >
          📂 Sidebar &amp; Dashboard
        </button>
        <button
          type="button"
          className={`${styles.subtabBtn} ${activeSubTab === 'player' ? styles.subtabActive : ''}`}
          onClick={() => setActiveSubTab('player')}
          role="tab"
          aria-selected={activeSubTab === 'player'}
        >
          ⌨️ Player Engine &amp; Shortcuts
        </button>
        <button
          type="button"
          className={`${styles.subtabBtn} ${activeSubTab === 'ai_motion' ? styles.subtabActive : ''}`}
          onClick={() => setActiveSubTab('ai_motion')}
          role="tab"
          aria-selected={activeSubTab === 'ai_motion'}
        >
          ✨ Motion &amp; AI Presentation
        </button>
      </div>

      {/* 1. Sidebar & Dashboard Subtab */}
      {activeSubTab === 'workspace' && (
        <div className={styles.subtabContent}>
          {/* Sidebar Behavior */}
          <div className={styles.group}>
            <span className={styles.groupLabel}>SIDEBAR BEHAVIOR</span>
            <p className={styles.subtext}>Choose default navigation state for desktop viewports.</p>
            <div className={styles.segmentedControl} role="radiogroup" aria-label="Sidebar behavior">
              <button
                type="button"
                className={`${styles.segmentBtn} ${sidebarBehavior === 'expanded' ? styles.segmentActive : ''}`}
                onClick={() => handleSelectSidebarBehavior('expanded')}
                role="radio"
                aria-checked={sidebarBehavior === 'expanded'}
              >
                Always Expanded
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${sidebarBehavior === 'collapsed' ? styles.segmentActive : ''}`}
                onClick={() => handleSelectSidebarBehavior('collapsed')}
                role="radio"
                aria-checked={sidebarBehavior === 'collapsed'}
              >
                Compact Icons
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${sidebarBehavior === 'hover' ? styles.segmentActive : ''}`}
                onClick={() => handleSelectSidebarBehavior('hover')}
                role="radio"
                aria-checked={sidebarBehavior === 'hover'}
              >
                Hover Peek
              </button>
            </div>
          </div>

          {/* Dashboard Widgets Visibility */}
          <div className={styles.group}>
            <span className={styles.groupLabel}>DASHBOARD WIDGETS VISIBILITY</span>
            <p className={styles.subtext}>Enable or disable telemetry cards rendered on the home dashboard.</p>
            <div className={styles.toggleList}>
              <label className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleTitle}>Focus Heatmap Matrix</span>
                  <span className={styles.toggleDesc}>Weekly 7-day study consistency and time distribution.</span>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={widgetToggles.showHeatmap}
                  onChange={() => handleToggleWidget('showHeatmap')}
                />
              </label>

              <label className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleTitle}>Productivity &amp; Course Stats</span>
                  <span className={styles.toggleDesc}>Completion rate, total hours studied, and streaks.</span>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={widgetToggles.showStats}
                  onChange={() => handleToggleWidget('showStats')}
                />
              </label>

              <label className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleTitle}>Skill Domain Radar</span>
                  <span className={styles.toggleDesc}>Multidimensional proficiency map across learning topics.</span>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={widgetToggles.showRadar}
                  onChange={() => handleToggleWidget('showRadar')}
                />
              </label>

              <label className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleTitle}>AI Study Assistant Quick Launcher</span>
                  <span className={styles.toggleDesc}>Socratic doubt solving and active lecture recall widget.</span>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={widgetToggles.showAssistant}
                  onChange={() => handleToggleWidget('showAssistant')}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 2. Player Engine & Shortcuts Subtab */}
      {activeSubTab === 'player' && (
        <div className={styles.subtabContent}>
          {/* Engine Choice */}
          <div className={styles.group}>
            <span className={styles.groupLabel}>MEDIA PLAYER ENGINE</span>
            <p className={styles.subtext}>Select the rendering engine used for course playback.</p>
            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${playerEngine === 'custom_player' ? styles.segmentActive : ''}`}
                onClick={() => setPlayerEngine('custom_player')}
              >
                LearnUp Custom Player (Keyboard HUD &amp; Notes)
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${playerEngine === 'youtube_native' ? styles.segmentActive : ''}`}
                onClick={() => setPlayerEngine('youtube_native')}
              >
                Standard YouTube IFrame
              </button>
            </div>
          </div>

          {/* Shortcuts Grid */}
          <div className={styles.group}>
            <div className={styles.shortcutsHeader}>
              <span className={styles.groupLabel}>KEYBOARD SHORTCUT BINDINGS</span>
              <button type="button" className={styles.resetBtn} onClick={handleResetShortcuts}>
                Restore Defaults
              </button>
            </div>
            <div className={styles.shortcutsGrid}>
              {[
                { field: 'togglePlay' as const, label: 'Play / Pause Video' },
                { field: 'seekBackward' as const, label: 'Seek Backward (5s)' },
                { field: 'seekForward' as const, label: 'Seek Forward (5s)' },
                { field: 'toggleFullscreen' as const, label: 'Toggle Fullscreen' },
                { field: 'speedBoost' as const, label: 'Speed Boost (2x)' }
              ].map(({ field, label }) => (
                <div key={field} className={styles.shortcutRow}>
                  <span className={styles.shortcutLabel}>{label}</span>
                  <button
                    type="button"
                    className={`${styles.keyBadge} ${recordingField === field ? styles.keyRecording : ''}`}
                    onClick={() => setRecordingField(recordingField === field ? null : field)}
                  >
                    {recordingField === field ? 'Press any key...' : localShortcuts[field]}
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.saveActionRow}>
              <Button onClick={handleSavePlayerConfig} variant="primary">
                {savedSuccess ? '✓ Saved!' : 'Save Player Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Motion & AI Presentation Subtab */}
      {activeSubTab === 'ai_motion' && (
        <div className={styles.subtabContent}>
          {/* Motion Preferences */}
          <div className={styles.group}>
            <span className={styles.groupLabel}>MOTION &amp; VISUAL COMFORT</span>
            <div className={styles.toggleList}>
              <label className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleTitle}>Reduce UI Animations</span>
                  <span className={styles.toggleDesc}>Disables smooth panel sliding and motion transitions.</span>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={reduceMotion}
                  onChange={handleToggleReduceMotion}
                />
              </label>

              <label className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleTitle}>Ambient Video Glow</span>
                  <span className={styles.toggleDesc}>Casts a gentle dynamic halo around the media player.</span>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={ambientGlow}
                  onChange={handleToggleAmbientGlow}
                />
              </label>

              <label className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleTitle}>High-Contrast Video Frame</span>
                  <span className={styles.toggleDesc}>Adds a distinct border around video playback on dark backgrounds.</span>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={highContrastVideo}
                  onChange={handleToggleHighContrast}
                />
              </label>
            </div>
          </div>

          {/* AI Presentation Preferences */}
          <div className={styles.group}>
            <span className={styles.groupLabel}>AI ASSISTANT PRESENTATION</span>
            <div className={styles.toggleList}>
              <label className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleTitle}>Rich AI Generative UI Default</span>
                  <span className={styles.toggleDesc}>
                    When enabled, the assistant formats responses with interactive flashcards, timelines, and Mermaid diagrams by default.
                  </span>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={richUiDefault}
                  onChange={handleToggleRichUiDefault}
                />
              </label>

              <label className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleTitle}>Token Telemetry &amp; Metrics Badge</span>
                  <span className={styles.toggleDesc}>Displays context window size and token usage indicators in the AI header.</span>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={showTokenMetrics}
                  onChange={handleToggleTokenMetrics}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
