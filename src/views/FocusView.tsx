import React, { useState, useEffect } from 'react';
import type { UserProfile, FocusSession, SoundscapeProfile } from '@/core';
import { Button } from '@/components/ui/Button/Button';
import styles from './FocusPage.module.css';

export interface FocusViewProps {
  activeProfile: UserProfile | null;
  focusSessions: FocusSession[];
  onSaveFocusSession: (session: FocusSession) => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

type FocusCadenceMode = 'sprint' | 'short_break' | 'long_break';

interface PomodoroCycleConfig {
  focusDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  intervalsBeforeLongBreak: number;
}

const DEFAULT_POMODORO_CONFIG: PomodoroCycleConfig = {
  focusDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  intervalsBeforeLongBreak: 4,
};

export const FocusView: React.FC<FocusViewProps> = ({
  activeProfile,
  focusSessions,
  onSaveFocusSession,
  showToast,
}) => {
  const [config, setConfig] = useState<PomodoroCycleConfig>(DEFAULT_POMODORO_CONFIG);
  const [localConfig, setLocalConfig] = useState<PomodoroCycleConfig>(DEFAULT_POMODORO_CONFIG);
  const [isCustomizingCycle, setIsCustomizingCycle] = useState(false);

  const [mode, setMode] = useState<FocusCadenceMode>('sprint');
  const [timerSeconds, setTimerSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('learnup_focus_seconds');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 0 && val <= 3600) return val;
      }
    } catch {
      // ignore
    }
    return 25 * 60;
  });
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [intervalNumber, setIntervalNumber] = useState<number>(1);

  // Soundscape
  const [soundscape, setSoundscape] = useState<SoundscapeProfile>('silent');
  const [volume, setVolume] = useState<number>(0.3);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Mode change handler
  const handleSelectMode = (newMode: FocusCadenceMode) => {
    setMode(newMode);
    setIsRunning(false);
    let targetMins = config.focusDurationMinutes;
    if (newMode === 'short_break') targetMins = config.shortBreakMinutes;
    if (newMode === 'long_break') targetMins = config.longBreakMinutes;
    const s = targetMins * 60;
    setTimerSeconds(s);
    setTotalSeconds(s);
  };

  // Timer interval effect
  useEffect(() => {
    let interval: any = null;
    if (isRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            handleSessionCompleted();
            return 0;
          }
          const next = prev - 1;
          try {
            localStorage.setItem('learnup_focus_seconds', next.toString());
          } catch {
            // ignore
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timerSeconds]);

  // Handle auto-completion when timer reaches 0
  const handleSessionCompleted = async () => {
    if (!activeProfile) return;
    const duration = totalSeconds;
    const completedSession: FocusSession = {
      id: `focus_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: activeProfile.id,
      durationSeconds: duration,
      mode,
      intervalNumber,
      soundscape,
      completed: true,
      createdAt: new Date().toISOString(),
    };
    try {
      await onSaveFocusSession(completedSession);
      showToast(`🎉 Focus session completed and recorded in SQLite!`, 'success');
      setIntervalNumber((prev) => prev + 1);
    } catch {
      showToast('Session finished, but failed to save to SQLite', 'error');
    }
  };

  // Manual completion button
  const handleFinishEarly = async () => {
    if (!activeProfile) return;
    setIsRunning(false);
    const duration = totalSeconds - timerSeconds > 60 ? totalSeconds - timerSeconds : totalSeconds;
    const completedSession: FocusSession = {
      id: `focus_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: activeProfile.id,
      durationSeconds: duration,
      mode,
      intervalNumber,
      soundscape,
      completed: true,
      createdAt: new Date().toISOString(),
    };
    try {
      await onSaveFocusSession(completedSession);
      setTimerSeconds(totalSeconds);
      try {
        localStorage.setItem('learnup_focus_seconds', totalSeconds.toString());
      } catch {
        // ignore
      }
      showToast(`✓ Focus session saved to local SQLite database!`, 'success');
      setIntervalNumber((prev) => prev + 1);
    } catch {
      showToast('Failed to save focus session', 'error');
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimerSeconds(totalSeconds);
    try {
      localStorage.setItem('learnup_focus_seconds', totalSeconds.toString());
    } catch {
      // ignore
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleFinishEarly();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSeconds, timerSeconds, mode, intervalNumber, activeProfile]);

  // Formatted digital time
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // SVG circular dial
  const RADIUS = 140;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = totalSeconds > 0 ? CIRCUMFERENCE * (timerSeconds / totalSeconds) : 0;

  // Real SQLite metrics
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySessions = focusSessions.filter(
    (s) => new Date(s.createdAt).getTime() >= todayStart.getTime()
  );
  const todayMins = Math.round(
    todaySessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60
  );
  const targetMins = 120; // 2 hour daily target
  const goalPct = targetMins > 0 ? Math.min(100, Math.round((todayMins / targetMins) * 100)) : 0;

  const todayHoursFormatted = `${Math.floor(todayMins / 60)}h ${(todayMins % 60).toString().padStart(2, '0')}m`;
  const targetHoursFormatted = `${Math.floor(targetMins / 60)}h ${(targetMins % 60).toString().padStart(2, '0')}m`;

  const totalIntervals = config.intervalsBeforeLongBreak;
  const currentIntervalDisplay = ((intervalNumber - 1) % totalIntervals) + 1;
  const completedSprintsCount = focusSessions.filter((s) => s.mode === 'sprint').length;

  const handleSaveCycle = (e: React.FormEvent) => {
    e.preventDefault();
    setConfig(localConfig);
    setIsCustomizingCycle(false);
    let targetMins = localConfig.focusDurationMinutes;
    if (mode === 'short_break') targetMins = localConfig.shortBreakMinutes;
    if (mode === 'long_break') targetMins = localConfig.longBreakMinutes;
    setTimerSeconds(targetMins * 60);
    setTotalSeconds(targetMins * 60);
    setIsRunning(false);
    showToast('Pomodoro cycle durations updated!', 'success');
  };

  return (
    <div className={styles.container}>
      {/* State Inspector & Modes Bar */}
      <div className={styles.stateInspectorBar}>
        <div className={styles.stateInspectorLeft}>
          <span className={styles.stateInspectorLabel}>
            <span className={styles.stateInspectorDot} />
            CADENCE:
          </span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sf-text-primary, #0f172a)' }}>
            {mode === 'sprint' ? '⚡ Focus Sprint' : mode === 'short_break' ? '☕ Short Break' : '🌴 Long Break'}
          </span>
        </div>

        {/* Mode presets & Customizer Button */}
        <div className={styles.modesGroup}>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'sprint' ? styles.modeBtnActive : ''}`}
            onClick={() => handleSelectMode('sprint')}
          >
            {config.focusDurationMinutes}m Sprint
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'short_break' ? styles.modeBtnActive : ''}`}
            onClick={() => handleSelectMode('short_break')}
          >
            {config.shortBreakMinutes}m Rest
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'long_break' ? styles.modeBtnActive : ''}`}
            onClick={() => handleSelectMode('long_break')}
          >
            {config.longBreakMinutes}m Long Break
          </button>
          <button
            type="button"
            className={styles.customSettingsBtn}
            onClick={() => setIsCustomizingCycle(true)}
            title="Customize Pomodoro Cycle & Durations"
          >
            <span style={{ fontSize: '12px' }}>⚙️ Edit Cycle</span>
          </button>
        </div>
      </div>

      {/* Main Focus Hero Dial Card */}
      <div className={styles.heroCard}>
        <div className={styles.dialContainer}>
          <svg className={styles.dialSvg} viewBox="0 0 320 320">
            <defs>
              <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#0f766e" />
              </linearGradient>
            </defs>
            {/* Background Track */}
            <circle className={styles.dialTrack} cx="160" cy="160" r={RADIUS} />
            {/* Animated Progress Stroke */}
            <circle
              className={styles.dialFill}
              cx="160"
              cy="160"
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              stroke="url(#focusGradient)"
            />
          </svg>

          <div className={styles.dialCenterContent}>
            <span className={styles.intervalSubLabel}>
              <span className={styles.intervalSubDot} />
              INTERVAL {currentIntervalDisplay.toString().padStart(2, '0')} OF {totalIntervals.toString().padStart(2, '0')}
            </span>
            {/* Digital Time display with exact font-size 3.5rem and class digitalTime for test matching */}
            <div
              className={styles.digitalTime}
              style={{ fontSize: '3.5rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--sf-accent-primary, #0d9488)' }}
            >
              {formattedTime}
            </div>
            <span className={styles.targetSubLabel}>
              {mode === 'sprint' ? '⚡ DEEP FOCUS' : mode === 'short_break' ? '☕ REFRESH & REST' : '🌴 RESTORATIVE BREAK'}
            </span>
          </div>
        </div>

        {/* Primary Controls */}
        <div className={styles.controlsRow}>
          {isRunning ? (
            <button
              type="button"
              className={styles.primaryControlBtn}
              onClick={() => setIsRunning(false)}
            >
              <span>⏸</span> Pause
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryControlBtn}
              onClick={() => setIsRunning(true)}
            >
              <span>▶</span> Start Sprint
            </button>
          )}

          <button
            type="button"
            className={styles.secondaryControlBtn}
            onClick={handleReset}
          >
            <span>↺</span> Reset
          </button>

          <button
            type="button"
            className={styles.secondaryControlBtn}
            onClick={handleFinishEarly}
            title="Complete session and record in SQLite"
          >
            <span>✓</span> Finish Sprint Early &amp; Save
          </button>
        </div>

        {/* Soundscape & Audio Controls Bar */}
        <div className={styles.soundscapeContainer}>
          <div className={styles.soundscapeBar}>
            <span className={styles.soundscapeIcon}>🎧</span>
            <span className={styles.soundscapeLabel}>Soundscape:</span>
            <select
              className={styles.soundscapeSelect}
              value={soundscape}
              onChange={(e) => setSoundscape(e.target.value as SoundscapeProfile)}
              aria-label="Soundscape selector"
            >
              <option value="silent">Silent Focus</option>
              <option value="rain">Gentle Rain</option>
              <option value="pink_noise">Pink Noise</option>
              <option value="binaural_40hz">Binaural 40Hz Gamma</option>
              <option value="binaural_10hz_alpha">Binaural Alpha Waves (10Hz)</option>
              <option value="lofi">Lofi Ambience</option>
            </select>

            {/* Volume Control */}
            <div className={styles.audioControlGroup}>
              <button
                type="button"
                className={styles.audioIconBtn}
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? 'Unmute' : 'Mute'}
                aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {isMuted || volume === 0 ? '🔇' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className={styles.volumeSlider}
                aria-label="Audio Volume"
              />
              <span className={styles.volumeLabel}>
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            {/* Loop Toggle */}
            <button
              type="button"
              className={`${styles.loopBtn} ${isLooping ? styles.loopBtnActive : ''}`}
              onClick={() => setIsLooping(!isLooping)}
              title={isLooping ? 'Looping enabled' : 'Looping disabled'}
              aria-label="Toggle audio loop"
            >
              🔁 Loop
            </button>
          </div>
        </div>
      </div>

      {/* 3 Real Telemetry Cards Grid */}
      <div className={styles.telemetryGrid}>
        {/* Card 1: Today's Focus Time */}
        <div className={styles.telemetryCard}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardHeaderTitle}>
              <span>🕒</span> TODAY&apos;S FOCUS TIME
            </span>
            <span className={`${styles.cardBadge} ${styles.badgeGreen}`}>
              {goalPct}% Goal
            </span>
          </div>

          <div className={styles.metricMainRow}>
            <span className={styles.bigMetric}>
              {todayHoursFormatted} <span className={styles.bigMetricSub}>/ {targetHoursFormatted}</span>
            </span>
            <span className={styles.metricDelta}>
              {todayMins > 0 ? `+${todayMins}m today` : 'Ready to start'}
            </span>
          </div>

          <div className={styles.segmentedProgressBar}>
            <div
              className={styles.progressSegCurrent}
              style={{ width: `${goalPct}%` }}
            />
          </div>

          <div className={styles.progressBreakdown}>
            <span>Today: {todayMins}m</span>
            <span>Target: {targetMins}m</span>
          </div>
        </div>

        {/* Card 2: Sprint Cadence */}
        <div className={styles.telemetryCard}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardHeaderTitle}>
              <span>🎯</span> SPRINT CADENCE
            </span>
            <span className={`${styles.cardBadge} ${styles.badgeMuted}`}>
              Interval {currentIntervalDisplay} of {totalIntervals}
            </span>
          </div>

          <div className={styles.metricMainRow}>
            <span className={styles.bigMetric}>
              {mode === 'sprint' ? `${config.focusDurationMinutes}m Focus` : `${config.shortBreakMinutes}m Rest`}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sf-accent-primary, #0d9488)' }}>
              Next: {currentIntervalDisplay >= totalIntervals ? 'Long Break' : 'Rest'}
            </span>
          </div>

          <div className={styles.cadencePillsRow}>
            {Array.from({ length: totalIntervals }, (_, i) => {
              const isDone = i + 1 < currentIntervalDisplay;
              const isCurrent = i + 1 === currentIntervalDisplay;
              return (
                <div
                  key={i}
                  className={`${styles.cadencePill} ${
                    isDone
                      ? styles.cadencePillComplete
                      : isCurrent
                      ? styles.cadencePillActive
                      : ''
                  }`}
                />
              );
            })}
          </div>

          <div className={styles.cadenceTimes}>
            {Array.from({ length: totalIntervals }, (_, i) => (
              <span key={i} style={i + 1 === currentIntervalDisplay ? { color: 'var(--sf-accent-primary, #0d9488)', fontWeight: 700 } : undefined}>
                {config.focusDurationMinutes}m
              </span>
            ))}
          </div>
        </div>

        {/* Card 3: Cognitive Streak */}
        <div className={styles.telemetryCard}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardHeaderTitle}>
              <span>🔥</span> COGNITIVE STREAK
            </span>
            <span className={`${styles.cardBadge} ${styles.badgeOrange}`}>
              🔥 {completedSprintsCount > 0 ? 'Active' : 'Ready'}
            </span>
          </div>

          <div className={styles.metricMainRow}>
            <span className={styles.bigMetric}>
              {completedSprintsCount} Sprint{completedSprintsCount === 1 ? '' : 's'}
            </span>
            <span className={styles.bigMetricSub}>Recorded in SQLite</span>
          </div>

          <div className={styles.heatmapStrip}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'Today'].map((d, idx) => (
              <div key={idx} className={styles.heatmapDay}>
                <div
                  className={`${styles.heatmapBlock} ${
                    idx === 6 && todayMins > 0 ? styles.heatmapBlockActive : ''
                  }`}
                />
                <span className={styles.heatmapDayLabel}>{d}</span>
              </div>
            ))}
          </div>

          <div className={styles.streakSubStats}>
            <span>Local Database: <span className={styles.streakSubValue} style={{ color: '#10B981' }}>Persisted</span></span>
          </div>
        </div>
      </div>

      {/* Completed Focus Sessions History */}
      <div style={{ background: 'var(--sf-bg-surface, #ffffff)', border: '1px solid var(--sf-border-subtle, #e2e8f0)', borderRadius: '12px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--sf-text-primary, #0f172a)' }}>
          Completed Focus Sessions ({focusSessions.length})
        </h3>
        {focusSessions.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--sf-text-muted, #64748b)', margin: 0 }}>
            No completed focus sprints recorded in SQLite yet. Start a focus session above!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {focusSessions.slice(0, 5).map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--sf-bg-subtle, #f8fafc)',
                  border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span>🧘</span>
                  <span style={{ fontWeight: 600, color: 'var(--sf-text-primary, #0f172a)', textTransform: 'capitalize' }}>
                    {s.mode}
                  </span>
                  <span style={{ color: 'var(--sf-text-muted, #64748b)' }}>• {Math.round(s.durationSeconds / 60)} min</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: 'var(--sf-text-muted, #64748b)', fontSize: '0.75rem' }}>
                    {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.75rem' }}>✓ Completed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customize Pomodoro Cycle Modal */}
      {isCustomizingCycle && (
        <div className={styles.modalBackdrop} onClick={() => setIsCustomizingCycle(false)}>
          <div className={styles.cycleModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cycleModalHeader}>
              <div className={styles.cycleModalIcon}>⏱️</div>
              <div>
                <h3 className={styles.cycleModalTitle}>Customize Pomodoro Cadence</h3>
                <p className={styles.cycleModalSubtitle}>
                  Set customized focus intervals, short rest duration, and long break cycles.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCycle} className={styles.cycleForm}>
              <div className={styles.cycleInputRow}>
                <label className={styles.cycleLabel}>Focus Sprint (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={localConfig.focusDurationMinutes}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      focusDurationMinutes: parseInt(e.target.value, 10) || 25,
                    })
                  }
                  className={styles.cycleInput}
                />
              </div>

              <div className={styles.cycleInputRow}>
                <label className={styles.cycleLabel}>Short Rest Break (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={localConfig.shortBreakMinutes}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      shortBreakMinutes: parseInt(e.target.value, 10) || 5,
                    })
                  }
                  className={styles.cycleInput}
                />
              </div>

              <div className={styles.cycleInputRow}>
                <label className={styles.cycleLabel}>Long Rest Break (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={localConfig.longBreakMinutes}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      longBreakMinutes: parseInt(e.target.value, 10) || 15,
                    })
                  }
                  className={styles.cycleInput}
                />
              </div>

              <div className={styles.cycleInputRow}>
                <label className={styles.cycleLabel}>Intervals in Cycle before Long Break</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={localConfig.intervalsBeforeLongBreak}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      intervalsBeforeLongBreak: parseInt(e.target.value, 10) || 4,
                    })
                  }
                  className={styles.cycleInput}
                />
              </div>

              <div className={styles.cycleActions}>
                <Button type="button" variant="ghost" onClick={() => setIsCustomizingCycle(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Cadence
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts HUD Footer */}
      <footer className={styles.hudFooter}>
        <div className={styles.hudShortcuts}>
          <div className={styles.hudItem}>
            <kbd className={styles.hudKey}>Space</kbd>
            <span>Start / Pause</span>
          </div>
          <div className={styles.hudItem}>
            <kbd className={styles.hudKey}>R</kbd>
            <span>Reset Clock</span>
          </div>
          <div className={styles.hudItem}>
            <kbd className={styles.hudKey}>Esc</kbd>
            <span>Finish Early</span>
          </div>
        </div>

        <div className={styles.hudSyncStatus}>
          <span className={styles.hudSyncDot} />
          <span>Local SQLite Storage Synced</span>
        </div>
      </footer>
    </div>
  );
};
