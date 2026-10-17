import { BinItem, BinSettings, BinItemType, BinRetentionUnit } from '../types';

const BIN_STORAGE_KEY = 'LearnUp_bin_items';
const BIN_SETTINGS_KEY = 'LearnUp_bin_settings';

export const DEFAULT_BIN_SETTINGS: BinSettings = {
  retentionValue: 10,
  retentionUnit: 'days'
};

/**
 * Calculates milliseconds for a given retention duration and unit.
 */
export function calculateRetentionMs(value: number, unit: BinRetentionUnit): number {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  switch (unit) {
    case 'weeks':
      return value * 7 * ONE_DAY;
    case 'months':
      return value * 30 * ONE_DAY;
    case 'years':
      return value * 365 * ONE_DAY;
    case 'days':
    default:
      return value * ONE_DAY;
  }
}

/**
 * Gets user-defined bin settings from localStorage with fallback.
 */
export function getBinSettings(): BinSettings {
  if (typeof window === 'undefined') return DEFAULT_BIN_SETTINGS;
  try {
    const raw = localStorage.getItem(BIN_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.retentionValue && parsed.retentionUnit) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_BIN_SETTINGS;
}

/**
 * Saves updated bin settings to localStorage.
 */
export function saveBinSettings(settings: BinSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BIN_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

/**
 * Lists all non-expired items in the bin.
 */
export function listBinItems(): BinItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BIN_STORAGE_KEY);
    if (!raw) return [];
    const items: BinItem[] = JSON.parse(raw);
    const now = Date.now();

    // Filter out items that have exceeded expiration timestamp
    const activeItems = items.filter((item) => new Date(item.expiresAt).getTime() > now);

    // If any expired items were filtered, clean storage
    if (activeItems.length !== items.length) {
      localStorage.setItem(BIN_STORAGE_KEY, JSON.stringify(activeItems));
    }

    return activeItems.sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  } catch {
    return [];
  }
}

/**
 * Moves an item to the Bin with calculated retention expiration.
 */
export function moveToBin(item: {
  id: string;
  itemType: BinItemType;
  title: string;
  details?: string;
  data: any;
}): BinItem {
  const settings = getBinSettings();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + calculateRetentionMs(settings.retentionValue, settings.retentionUnit));

  const binItem: BinItem = {
    id: item.id || `bin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    itemType: item.itemType,
    title: item.title || 'Untitled Item',
    details: item.details,
    data: item.data,
    deletedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  if (typeof window !== 'undefined') {
    try {
      const existing = listBinItems();
      const updated = [binItem, ...existing.filter((i) => i.id !== binItem.id)];
      localStorage.setItem(BIN_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  return binItem;
}

/**
 * Restores an item from the bin and removes it from bin storage.
 */
export function restoreFromBin(id: string): BinItem | null {
  if (typeof window === 'undefined') return null;
  try {
    const items = listBinItems();
    const target = items.find((i) => i.id === id);
    if (!target) return null;

    const remaining = items.filter((i) => i.id !== id);
    localStorage.setItem(BIN_STORAGE_KEY, JSON.stringify(remaining));
    return target;
  } catch {
    return null;
  }
}

/**
 * Permanently deletes an item from the bin.
 */
export function permanentDeleteFromBin(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const items = listBinItems();
    const remaining = items.filter((i) => i.id !== id);
    localStorage.setItem(BIN_STORAGE_KEY, JSON.stringify(remaining));
    return true;
  } catch {
    return false;
  }
}

/**
 * Empties all items currently in the bin.
 */
export function emptyBin(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BIN_STORAGE_KEY);
  } catch {}
}
