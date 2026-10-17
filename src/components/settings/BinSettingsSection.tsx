'use client';

import React, { useState, useEffect } from 'react';
import { BinItem, BinSettings, BinRetentionUnit, BinItemType } from '@/lib/types';
import {
  getBinSettings,
  saveBinSettings,
  listBinItems,
  restoreFromBin,
  permanentDeleteFromBin,
  emptyBin
} from '@/lib/utils/bin';
import { Button } from '@/components/ui/Button/Button';
import styles from './BinSettingsSection.module.css';

export interface BinSettingsSectionProps {
  onNotify?: (msg: string) => void;
}

export function BinSettingsSection({ onNotify }: BinSettingsSectionProps) {
  const [settings, setSettings] = useState<BinSettings>(getBinSettings());
  const [items, setItems] = useState<BinItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isConfirmingEmpty, setIsConfirmingEmpty] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (onNotify) onNotify(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = () => {
    setSettings(getBinSettings());
    setItems(listBinItems());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateSettings = (newVal: number, newUnit: BinRetentionUnit) => {
    const updated: BinSettings = {
      retentionValue: Math.max(1, newVal),
      retentionUnit: newUnit
    };
    setSettings(updated);
    saveBinSettings(updated);
    showToast(`Retention period set to ${updated.retentionValue} ${updated.retentionUnit}.`);
  };

  const handleRestore = async (id: string) => {
    const restored = restoreFromBin(id);
    if (restored) {
      if (restored.itemType === 'course' && restored.data) {
        try {
          const itemData = restored.data;
          let sourceUrl = '';
          if (itemData.source_url) {
            sourceUrl = itemData.source_url;
          } else if (itemData.type === 'playlist' && itemData.youtube_playlist_id) {
            sourceUrl = `https://www.youtube.com/playlist?list=${itemData.youtube_playlist_id}`;
          } else if (itemData.youtube_video_id) {
            sourceUrl = `https://www.youtube.com/watch?v=${itemData.youtube_video_id}`;
          } else if (itemData.url_or_id) {
            sourceUrl = itemData.url_or_id;
          }
          if (sourceUrl) {
            await fetch('/api/learning-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: sourceUrl })
            });
          }
        } catch {}
        window.dispatchEvent(new CustomEvent('LearnUp_library_refresh'));
      } else if (restored.itemType === 'note' && restored.data) {
        try {
          await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              learningItemId: restored.data.learning_item_id,
              youtubeVideoId: restored.data.youtube_video_id,
              content: restored.data.content
            })
          });
        } catch {}
        window.dispatchEvent(new CustomEvent('LearnUp_notes_refresh'));
      }

      showToast(`Restored "${restored.title}" successfully.`);
      loadData();
    }
  };

  const handlePermanentDelete = (id: string) => {
    const ok = permanentDeleteFromBin(id);
    if (ok) {
      showToast('Item deleted permanently.');
      loadData();
    }
  };

  const handleEmptyBin = () => {
    emptyBin();
    setIsConfirmingEmpty(false);
    showToast('Recycle Bin emptied completely.');
    loadData();
  };

  const formatRemainingTime = (expiresAt: string) => {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Expiring now';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  const typeBadges: Record<BinItemType, { label: string; icon: string; className: string }> = {
    course: { label: 'COURSE', icon: '📺', className: styles.badgeCourse },
    note: { label: 'NOTE', icon: '📝', className: styles.badgeNote },
    bookmark: { label: 'BOOKMARK', icon: '🔖', className: styles.badgeBookmark },
    roadmap: { label: 'ROADMAP', icon: '🗺️', className: styles.badgeRoadmap }
  };

  return (
    <section className={styles.section} aria-labelledby="bin-heading">
      {toastMessage && <div className={styles.toastNotification}>{toastMessage}</div>}

      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.icon}>🗑️</span>
          <div>
            <h2 id="bin-heading" className={styles.title}>Recycle Bin &amp; Auto-Retention</h2>
            <p className={styles.subtitle}>
              Manage soft-deleted courses, notes, and roadmaps. Items in the bin are automatically purged once their retention window expires.
            </p>
          </div>
        </div>
      </div>

      {/* Retention Period Configuration Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Auto-Purge Retention Schedule</h3>
          <span className={styles.cardBadge}>SAFE RETENTION</span>
        </div>
        <p className={styles.cardDesc}>
          Specify how long deleted items should be retained in the bin before permanent deletion.
        </p>

        <div className={styles.settingsRow}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="retentionValueInput">
              Retention Duration
            </label>
            <div className={styles.inputControls}>
              <input
                id="retentionValueInput"
                type="number"
                min={1}
                max={365}
                value={settings.retentionValue}
                onChange={(e) =>
                  handleUpdateSettings(parseInt(e.target.value, 10) || 1, settings.retentionUnit)
                }
                className={styles.numberInput}
                aria-label="Retention duration number"
              />
              <select
                value={settings.retentionUnit}
                onChange={(e) =>
                  handleUpdateSettings(settings.retentionValue, e.target.value as BinRetentionUnit)
                }
                className={styles.unitSelect}
                aria-label="Retention duration unit"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </div>

          <div className={styles.retentionInfo}>
            <span className={styles.infoDot} />
            <span>
              Items deleted right now will be safely recoverable for{' '}
              <strong>
                {settings.retentionValue} {settings.retentionUnit}
              </strong>
              .
            </span>
          </div>
        </div>
      </div>

      {/* Bin Items Inventory Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>Bin Inventory</h3>
            <p className={styles.cardDesc}>
              {items.length === 0
                ? 'Your Recycle Bin is empty.'
                : `${items.length} item${items.length === 1 ? '' : 's'} waiting in auto-retention queue.`}
            </p>
          </div>

          {items.length > 0 && (
            <div>
              {isConfirmingEmpty ? (
                <div className={styles.confirmEmptyRow}>
                  <span className={styles.confirmWarning}>Permanently purge all?</span>
                  <Button variant="danger" size="sm" onClick={handleEmptyBin}>
                    Yes, Empty Bin
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsConfirmingEmpty(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsConfirmingEmpty(true)}
                >
                  Empty Entire Bin
                </Button>
              )}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>✨</div>
            <h4 className={styles.emptyTitle}>No deleted items</h4>
            <p className={styles.emptySub}>
              When you delete any video, course playlist, or study note, it will appear here for {settings.retentionValue} {settings.retentionUnit} before being permanently removed.
            </p>
          </div>
        ) : (
          <div className={styles.itemsList}>
            {items.map((item) => {
              const meta = typeBadges[item.itemType] || {
                label: 'ITEM',
                icon: '📦',
                className: styles.badgeGeneric
              };
              const deletedDate = new Date(item.deletedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemLeft}>
                    <span className={styles.itemTypeIcon}>{meta.icon}</span>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemTitleRow}>
                        <span className={styles.itemTitle}>{item.title}</span>
                        <span className={`${styles.itemBadge} ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className={styles.itemMetaRow}>
                        <span>Deleted: {deletedDate}</span>
                        <span>&bull;</span>
                        <span className={styles.expiresTime}>
                          ⏳ {formatRemainingTime(item.expiresAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRestore(item.id)}
                      title="Restore item back to workspace"
                    >
                      ↩ Restore
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handlePermanentDelete(item.id)}
                      title="Delete forever immediately"
                    >
                      ✕ Delete Forever
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
