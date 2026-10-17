'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BinItem, BinItemType } from '../types';
import { moveToBin, restoreFromBin } from '../utils/bin';
import styles from './UndoToast.module.css';

export interface UndoableAction {
  id: string;
  itemType: BinItemType;
  title: string;
  details?: string;
  data: any;
  onUndo?: (item: BinItem) => void;
  onPermanentDelete?: () => void;
}

interface UndoContextType {
  triggerUndoableDelete: (action: UndoableAction) => void;
  dismissToast: () => void;
  undoCurrent: () => void;
}

const UndoContext = createContext<UndoContextType | null>(null);

const UNDO_DURATION_MS = 5000;

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [activeAction, setActiveAction] = useState<UndoableAction | null>(null);
  const [activeBinItem, setActiveBinItem] = useState<BinItem | null>(null);
  const [progress, setProgress] = useState(100);
  const [isRestoredToast, setIsRestoredToast] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const dismissToast = useCallback(() => {
    clearAllTimers();
    setActiveAction(null);
    setActiveBinItem(null);
    setProgress(100);
  }, []);

  const triggerUndoableDelete = useCallback((action: UndoableAction) => {
    clearAllTimers();
    setIsRestoredToast(false);

    // 1. Move to Bin with auto-retention
    const binItem = moveToBin({
      id: action.id,
      itemType: action.itemType,
      title: action.title,
      details: action.details,
      data: action.data
    });

    setActiveAction(action);
    setActiveBinItem(binItem);
    setProgress(100);

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / UNDO_DURATION_MS) * 100);
      setProgress(remainingPct);
    }, 50);

    timerRef.current = setTimeout(() => {
      dismissToast();
    }, UNDO_DURATION_MS);
  }, [dismissToast]);

  const undoCurrent = useCallback(() => {
    if (!activeAction || !activeBinItem) return;

    clearAllTimers();
    // 2. Restore from bin
    const restored = restoreFromBin(activeBinItem.id);
    if (restored && activeAction.onUndo) {
      activeAction.onUndo(restored);
    }

    setActiveAction(null);
    setActiveBinItem(null);
    setIsRestoredToast(true);

    setTimeout(() => {
      setIsRestoredToast(false);
    }, 3000);
  }, [activeAction, activeBinItem]);

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  const typeLabels: Record<BinItemType, string> = {
    course: 'Course',
    note: 'Note',
    bookmark: 'Bookmark',
    roadmap: 'Roadmap Track'
  };

  return (
    <UndoContext.Provider value={{ triggerUndoableDelete, dismissToast, undoCurrent }}>
      {children}

      {/* Floating 5-Second Gmail-Style Undo Bar */}
      {activeAction && activeBinItem && (
        <div className={styles.toastContainer} role="alert" aria-live="polite">
          <div className={styles.toastCard}>
            <div className={styles.toastLeft}>
              <span className={styles.binIcon}>🗑️</span>
              <span className={styles.toastText}>
                <strong>{typeLabels[activeAction.itemType] || 'Item'}</strong> &ldquo;{activeAction.title.slice(0, 30)}
                {activeAction.title.length > 30 ? '...' : ''}&rdquo; moved to Bin.
              </span>
            </div>

            <div className={styles.toastRight}>
              <button
                type="button"
                className={styles.undoButton}
                onClick={undoCurrent}
                aria-label="Undo deletion"
              >
                Undo
              </button>
              <button
                type="button"
                className={styles.dismissButton}
                onClick={dismissToast}
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>

            {/* 5-Second Animated Progress Track */}
            <div
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Restored Toast confirmation */}
      {isRestoredToast && (
        <div className={styles.toastContainer} role="status">
          <div className={`${styles.toastCard} ${styles.restoredCard}`}>
            <span className={styles.checkIcon}>✓</span>
            <span className={styles.toastText}>Item restored from Bin successfully!</span>
          </div>
        </div>
      )}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}
