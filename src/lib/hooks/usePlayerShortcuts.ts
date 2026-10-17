'use client';

import { useState, useEffect } from 'react';

export interface PlayerShortcuts {
  togglePlay: string;
  seekBackward: string;
  seekForward: string;
  speedBoost: string;
  toggleCaptions: string;
  toggleMute: string;
  toggleFullscreen: string;
  volumeUp: string;
  volumeDown: string;
}

export const DEFAULT_PLAYER_SHORTCUTS: PlayerShortcuts = {
  togglePlay: 'Space',
  seekBackward: 'j',
  seekForward: 'l',
  speedBoost: 'Shift',
  toggleCaptions: 'c',
  toggleMute: 'm',
  toggleFullscreen: 'f',
  volumeUp: 'ArrowUp',
  volumeDown: 'ArrowDown'
};

const STORAGE_KEY = 'LearnUp_custom_player_shortcuts';

export function usePlayerShortcuts() {
  const [shortcuts, setShortcuts] = useState<PlayerShortcuts>(DEFAULT_PLAYER_SHORTCUTS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setShortcuts({ ...DEFAULT_PLAYER_SHORTCUTS, ...JSON.parse(stored) });
      }
    } catch {
      // fallback to default
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveShortcuts = (updated: PlayerShortcuts) => {
    setShortcuts(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const resetShortcuts = () => {
    setShortcuts(DEFAULT_PLAYER_SHORTCUTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return {
    shortcuts,
    saveShortcuts,
    resetShortcuts,
    isLoaded
  };
}
