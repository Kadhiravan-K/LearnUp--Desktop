/**
 * LearnUp Shared Core — Focus Session & Pomodoro Logic
 * Framework-independent configuration, durations, and state transitions.
 */

import { FocusMode, PomodoroCycleConfig, SoundscapeProfile } from '../types';

export const DEFAULT_POMODORO_CONFIG: PomodoroCycleConfig = {
  focusDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  intervalsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartSprints: false
};

export const MODE_DURATIONS: Record<FocusMode, number> = {
  sprint: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
  deep_block: 50 * 60,
  flow_state: 90 * 60,
  custom: 30 * 60
};

export interface FocusTimerSnapshot {
  mode: FocusMode;
  totalSeconds: number;
  secondsLeft: number;
  timerState: 'ready' | 'running' | 'paused' | 'completed';
  intervalNumber: number;
  soundscape: SoundscapeProfile;
}

export function getDurationForMode(mode: FocusMode, config: PomodoroCycleConfig = DEFAULT_POMODORO_CONFIG): number {
  if (mode === 'sprint') return config.focusDurationMinutes * 60;
  if (mode === 'short_break') return config.shortBreakMinutes * 60;
  if (mode === 'long_break') return config.longBreakMinutes * 60;
  return MODE_DURATIONS[mode] || 25 * 60;
}

export function getNextModeAfterInterval(
  currentMode: FocusMode,
  currentInterval: number,
  config: PomodoroCycleConfig = DEFAULT_POMODORO_CONFIG
): { nextMode: FocusMode; nextInterval: number } {
  if (currentMode === 'sprint') {
    const isLongBreak = currentInterval % config.intervalsBeforeLongBreak === 0;
    return {
      nextMode: isLongBreak ? 'long_break' : 'short_break',
      nextInterval: currentInterval
    };
  } else {
    // Break finished, advance to next sprint
    return {
      nextMode: 'sprint',
      nextInterval: currentInterval + 1
    };
  }
}
