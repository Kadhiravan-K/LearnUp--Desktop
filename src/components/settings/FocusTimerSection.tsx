'use client';

import React from 'react';
import styles from './FocusTimerSection.module.css';

export interface FocusTimerSectionProps {
  sprintDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  acousticCue: string;
  autoStartBreaks: boolean;
  autoStartNextSprint: boolean;
  ambientSoundscape: boolean;
  compactHudTimer: boolean;
  onChangeSprint: (minutes: number) => void;
  onChangeShortBreak: (minutes: number) => void;
  onChangeLongBreak: (minutes: number) => void;
  onChangeAcousticCue: (cue: string) => void;
  onToggle: (field: string, value: boolean) => void;
}

export function FocusTimerSection({
  sprintDuration,
  shortBreakDuration,
  longBreakDuration,
  acousticCue,
  autoStartBreaks,
  autoStartNextSprint,
  ambientSoundscape,
  compactHudTimer,
  onChangeSprint,
  onChangeShortBreak,
  onChangeLongBreak,
  onChangeAcousticCue,
  onToggle
}: FocusTimerSectionProps) {
  const sprintPills = [
    { label: '15m', value: 15 },
    { label: '25m (Standard)', value: 25 },
    { label: '45m', value: 45 },
    { label: '50m', value: 50 },
    { label: '90m Ultra', value: 90 }
  ];

  return (
    <section id="focus-timer" className={styles.section} aria-labelledby="focus-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>⏱</span>
          <h2 id="focus-heading" className={styles.title}>Focus Engine &amp; Cadence</h2>
        </div>
        <span className={styles.timerHud}>
          {String(sprintDuration).padStart(2, '0')}:00
        </span>
      </div>

      {/* Default Sprint Duration */}
      <div className={styles.group}>
        <span className={styles.groupLabel}>DEFAULT SPRINT DURATION</span>
        <div className={styles.pillsRow}>
          {sprintPills.map((pill) => {
            const isActive = sprintDuration === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                className={`${styles.pillBtn} ${isActive ? styles.pillBtnActive : ''}`}
                onClick={() => onChangeSprint(pill.value)}
              >
                {pill.label}
              </button>
            );
          })}
          <div className={styles.customPill}>
            <span>Custom</span>
            <input
              type="number"
              min={1}
              max={180}
              className={styles.customInput}
              value={sprintPills.some((p) => p.value === sprintDuration) ? '' : sprintDuration}
              placeholder="min"
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                  onChangeSprint(val);
                }
              }}
            />
            <span>min</span>
          </div>
        </div>
      </div>

      {/* Break Duration Steppers */}
      <div className={styles.steppersGrid}>
        {/* Short Break */}
        <div className={styles.stepperCard}>
          <span className={styles.stepperLabel}>SHORT BREAK DURATION</span>
          <div className={styles.stepperControl}>
            <span className={styles.stepperValue}>
              {String(shortBreakDuration).padStart(2, '0')}:00 mins
            </span>
            <div className={styles.stepperBtns}>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => onChangeShortBreak(Math.max(1, shortBreakDuration - 1))}
                aria-label="Decrease short break"
              >
                -
              </button>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => onChangeShortBreak(shortBreakDuration + 1)}
                aria-label="Increase short break"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Long Break */}
        <div className={styles.stepperCard}>
          <span className={styles.stepperLabel}>LONG BREAK DURATION (EVERY 4 SPRINTS)</span>
          <div className={styles.stepperControl}>
            <span className={styles.stepperValue}>
              {String(longBreakDuration).padStart(2, '0')}:00 mins
            </span>
            <div className={styles.stepperBtns}>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => onChangeLongBreak(Math.max(1, longBreakDuration - 1))}
                aria-label="Decrease long break"
              >
                -
              </button>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => onChangeLongBreak(longBreakDuration + 1)}
                aria-label="Increase long break"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Acoustic Cue Profile */}
      <div className={styles.group}>
        <label htmlFor="acoustic-select" className={styles.groupLabel}>ACOUSTIC CUE PROFILE</label>
        <select
          id="acoustic-select"
          className={styles.select}
          value={acousticCue}
          onChange={(e) => onChangeAcousticCue(e.target.value)}
        >
          <option value="binaural_chime">Binaural Chime (Subtle Japanese Temple Bell - 528Hz)</option>
          <option value="lofi_bell">Lo-Fi Soft Synth Chime (432Hz)</option>
          <option value="tibetan_bowl">Tibetan Singing Bowl Resonance</option>
          <option value="zen_water">Minimalist Zen Water Drop</option>
        </select>
      </div>

      {/* Toggles */}
      <div className={styles.toggleList}>
        {/* Toggle 1 */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Auto-start breaks after focus sprint</span>
            <p className={styles.toggleDesc}>Instantly engages break countdown to reduce cognitive friction.</p>
          </div>
          <button
            type="button"
            className={`${styles.toggleSwitch} ${autoStartBreaks ? styles.toggleOn : ''}`}
            onClick={() => onToggle('auto_start_breaks', !autoStartBreaks)}
            aria-pressed={autoStartBreaks}
          >
            <span className={styles.toggleHandle} />
          </button>
        </div>

        {/* Toggle 2 */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Auto-start next focus sprint</span>
            <p className={styles.toggleDesc}>Loop directly into study block without manual confirmation.</p>
          </div>
          <button
            type="button"
            className={`${styles.toggleSwitch} ${autoStartNextSprint ? styles.toggleOn : ''}`}
            onClick={() => onToggle('auto_start_next_sprint', !autoStartNextSprint)}
            aria-pressed={autoStartNextSprint}
          >
            <span className={styles.toggleHandle} />
          </button>
        </div>

        {/* Toggle 3 */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Ambient soundscape during session</span>
            <p className={styles.toggleDesc}>Generates client-side Alpha 40Hz isochronic waves.</p>
          </div>
          <button
            type="button"
            className={`${styles.toggleSwitch} ${ambientSoundscape ? styles.toggleOn : ''}`}
            onClick={() => onToggle('ambient_soundscape', !ambientSoundscape)}
            aria-pressed={ambientSoundscape}
          >
            <span className={styles.toggleHandle} />
          </button>
        </div>

        {/* Toggle 4 */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Compact HUD timer pinned in navigation bar</span>
            <p className={styles.toggleDesc}>Retains micro-readout at top header across all views.</p>
          </div>
          <button
            type="button"
            className={`${styles.toggleSwitch} ${compactHudTimer ? styles.toggleOn : ''}`}
            onClick={() => onToggle('compact_hud_timer', !compactHudTimer)}
            aria-pressed={compactHudTimer}
          >
            <span className={styles.toggleHandle} />
          </button>
        </div>
      </div>
    </section>
  );
}
