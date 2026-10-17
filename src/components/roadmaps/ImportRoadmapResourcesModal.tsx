'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Alert } from '@/components/ui/Alert/Alert';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useLibrary } from '@/lib/hooks/useLibrary';
import {
  extractRoadmapResources,
  importBatchResources,
  importSingleResource,
  type SynchronizableResource,
  type ImportItemResult
} from '@/lib/roadmaps/roadmap-library-sync';
import type { RoadmapTrack, AttachedCourseData } from '@/lib/types';
import styles from './ImportRoadmapResourcesModal.module.css';

export interface ImportRoadmapResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: RoadmapTrack;
  onImportComplete?: () => void;
  onLinkCourseToNode?: (trackId: string, nodeId: string, courseData: AttachedCourseData) => Promise<void>;
}

type TabType = 'all' | 'new' | 'existing' | 'unavailable';

export function ImportRoadmapResourcesModal({
  isOpen,
  onClose,
  track,
  onImportComplete,
  onLinkCourseToNode
}: ImportRoadmapResourcesModalProps) {
  const { items: libraryItems, isLoading: isLibraryLoading, refresh: refreshLibrary } = useLibrary();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progressState, setProgressState] = useState<{ completed: number; total: number; currentTitle: string } | null>(null);
  const [importResults, setImportResults] = useState<Map<string, ImportItemResult>>(new Map());
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Extract and categorize roadmap resources cross-referenced with library
  const summary = useMemo(() => {
    return extractRoadmapResources(track, libraryItems);
  }, [track, libraryItems]);

  // Pre-select all new resources when modal opens
  useEffect(() => {
    if (isOpen) {
      const newIds = new Set(
        summary.resources.filter((r) => r.category === 'new').map((r) => r.id)
      );
      setSelectedIds(newIds);
      setIsConfirming(false);
      setIsImporting(false);
      setProgressState(null);
      setImportResults(new Map());
      setGeneralError(null);
    }
  }, [isOpen, summary.resources]);

  // Filtered resources for active tab
  const displayedResources = useMemo(() => {
    switch (activeTab) {
      case 'new':
        return summary.resources.filter((r) => r.category === 'new');
      case 'existing':
        return summary.resources.filter((r) => r.category === 'existing');
      case 'unavailable':
        return summary.resources.filter((r) => r.category === 'unavailable' || r.category === 'invalid');
      case 'all':
      default:
        return summary.resources;
    }
  }, [summary.resources, activeTab]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllNew = () => {
    const newIds = new Set(
      summary.resources.filter((r) => r.category === 'new').map((r) => r.id)
    );
    setSelectedIds(newIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectedResourcesToImport = useMemo(() => {
    return summary.resources.filter((r) => selectedIds.has(r.id) && r.category === 'new');
  }, [summary.resources, selectedIds]);

  const handleStartImport = async () => {
    if (selectedResourcesToImport.length === 0) return;

    setIsConfirming(false);
    setIsImporting(true);
    setGeneralError(null);

    try {
      const results = await importBatchResources(
        selectedResourcesToImport,
        track.id,
        (completed, total, currentItem) => {
          setProgressState({ completed, total, currentTitle: currentItem.title });
        },
        onLinkCourseToNode
      );

      const resultsMap = new Map<string, ImportItemResult>();
      for (const r of results) {
        resultsMap.set(r.resourceId, r);
      }
      setImportResults(resultsMap);

      await refreshLibrary();
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      setGeneralError(err?.message || 'A batch import failure occurred.');
    } finally {
      setIsImporting(false);
      setProgressState(null);
    }
  };

  const handleRetrySingle = async (resource: SynchronizableResource) => {
    try {
      const result = await importSingleResource(resource, track.id, onLinkCourseToNode);
      setImportResults((prev) => {
        const next = new Map(prev);
        next.set(result.resourceId, result);
        return next;
      });
      await refreshLibrary();
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      setGeneralError(`Retry failed: ${err?.message || err}`);
    }
  };

  const hasImportedAny = importResults.size > 0;
  const successfulImportsCount = Array.from(importResults.values()).filter((r) => r.status === 'success').length;
  const failedImportsCount = Array.from(importResults.values()).filter((r) => r.status === 'failed').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isImporting ? () => {} : onClose}
      title="Import Learning Resources into Library"
    >
      <div className={styles.container}>
        {generalError && <Alert variant="error">{generalError}</Alert>}

        {/* Header Summary Card */}
        <div className={styles.headerSummary}>
          <h3 className={styles.summaryTitle}>
            <span>📥</span>
            <span>{track.title}</span>
          </h3>
          <p className={styles.summarySubtitle}>
            Extract and import verified video courses directly into your personal library.
            Imported items are linked to their corresponding milestones, with duplicate prevention and progress preservation.
          </p>

          <div className={styles.statsRow}>
            <span className={styles.statTag}>
              Total Videos: <strong>{summary.uniqueVideos}</strong>
            </span>
            <span className={`${styles.statTag} ${styles.statTagHighlight}`}>
              New to Import: <strong>{summary.newCount}</strong>
            </span>
            <span className={styles.statTag}>
              In Library: <strong>{summary.existingCount}</strong>
            </span>
            {summary.unavailableCount > 0 && (
              <span className={styles.statTag} style={{ color: '#b91c1c' }}>
                Unavailable: <strong>{summary.unavailableCount}</strong>
              </span>
            )}
          </div>
        </div>

        {/* In-Progress Telemetry Bar */}
        {isImporting && progressState && (
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span>
                Importing {progressState.completed + 1} of {progressState.total}: {progressState.currentTitle}
              </span>
              <span>{Math.round(((progressState.completed) / progressState.total) * 100)}%</span>
            </div>
            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${((progressState.completed) / progressState.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Post-Import Results Banner */}
        {hasImportedAny && !isImporting && (
          <Alert
            variant={failedImportsCount > 0 ? 'warning' : 'success'}
            title="Import Completed"
          >
            {successfulImportsCount} videos imported successfully into your library.
            {failedImportsCount > 0 && ` ${failedImportsCount} videos encountered an import error.`}
          </Alert>
        )}

        {/* Confirmation Screen */}
        {isConfirming && !isImporting ? (
          <div className={styles.confirmDialog}>
            <h4 className={styles.confirmTitle}>Confirm Video Import</h4>
            <p className={styles.confirmMessage}>
              You are about to import <strong>{selectedResourcesToImport.length}</strong> verified video courses into your personal LearnUp library.
              These items will become available in your library and will automatically link to their respective roadmap milestones.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setIsConfirming(false)}>
                Back to Selection
              </Button>
              <Button variant="primary" onClick={handleStartImport}>
                Confirm &amp; Start Import
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Filter Tabs */}
            <div className={styles.tabBar}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Videos ({summary.uniqueVideos})
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'new' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('new')}
              >
                New to Import ({summary.newCount})
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'existing' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('existing')}
              >
                Already in Library ({summary.existingCount})
              </button>
              {(summary.unavailableCount > 0 || summary.invalidCount > 0) && (
                <button
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === 'unavailable' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('unavailable')}
                >
                  Unavailable ({summary.unavailableCount + summary.invalidCount})
                </button>
              )}
            </div>

            {/* Selection Toolbar */}
            {!isImporting && (
              <div className={styles.selectionToolbar}>
                <div className={styles.selectAllGroup}>
                  <button type="button" className={styles.linkBtn} onClick={handleSelectAllNew}>
                    Select All New
                  </button>
                  <span>&bull;</span>
                  <button type="button" className={styles.linkBtn} onClick={handleDeselectAll}>
                    Deselect All
                  </button>
                </div>
                <span>
                  {selectedResourcesToImport.length} of {summary.newCount} selected
                </span>
              </div>
            )}

            {/* Video Resources List */}
            {isLibraryLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <Spinner size="md" />
                <span style={{ marginLeft: '8px', fontSize: '0.85rem' }}>Checking library items...</span>
              </div>
            ) : displayedResources.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                No resources found in this category.
              </div>
            ) : (
              <div className={styles.resourceList}>
                {displayedResources.map((res) => {
                  const isSelectable = res.category === 'new' && !isImporting;
                  const isChecked = selectedIds.has(res.id);
                  const result = importResults.get(res.id);

                  return (
                    <div
                      key={res.id}
                      className={`${styles.resourceCard} ${
                        isChecked ? styles.resourceCardSelected : ''
                      } ${!isSelectable ? styles.resourceCardDisabled : ''}`}
                    >
                      {/* Checkbox */}
                      <div className={styles.checkboxCol}>
                        <input
                          type="checkbox"
                          className={styles.checkboxInput}
                          checked={isChecked}
                          disabled={!isSelectable}
                          onChange={() => toggleSelect(res.id)}
                          aria-label={`Select ${res.title}`}
                        />
                      </div>

                      {/* YouTube Thumbnail Preview */}
                      <div className={styles.thumbnailCol}>
                        {res.videoId ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={`https://i.ytimg.com/vi/${res.videoId}/mqdefault.jpg`}
                            alt={res.title}
                            className={styles.thumbnailImg}
                            onError={(e) => {
                              // Fallback on image load error
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className={styles.thumbnailFallback}>▶</div>
                        )}
                      </div>

                      {/* Video Details */}
                      <div className={styles.detailsCol}>
                        <h4 className={styles.resourceTitle} title={res.title}>
                          {res.title}
                        </h4>
                        <div className={styles.resourceMeta}>
                          <span>Channel: {res.provider}</span>
                          {res.runtimeFormatted && <span>&bull; {res.runtimeFormatted}</span>}
                          {res.relevantSkill && <span>&bull; Skill: {res.relevantSkill}</span>}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                          {res.associatedMilestones.map((m) => (
                            <span key={m.nodeId} className={styles.milestonePill}>
                              Node {m.nodeNumber}: {m.milestoneTitle}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Status / Actions Column */}
                      <div className={styles.statusCol}>
                        {result ? (
                          result.status === 'success' ? (
                            <span className={styles.badgeSuccess}>✓ Imported</span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className={styles.badgeFailed}>✗ Failed</span>
                              <button
                                type="button"
                                className={styles.retryBtn}
                                onClick={() => handleRetrySingle(res)}
                              >
                                Retry
                              </button>
                            </div>
                          )
                        ) : res.category === 'existing' ? (
                          <>
                            <span className={styles.badgeInLibrary}>✓ In Library</span>
                            {res.progressPercentage !== undefined && res.progressPercentage > 0 && (
                              <span style={{ fontSize: '0.68rem', color: '#047857' }}>
                                {res.progressPercentage}% watched
                              </span>
                            )}
                            {res.libraryItemId && (
                              <Link
                                href={`/library/${res.libraryItemId}`}
                                className={styles.viewInLibraryLink}
                              >
                                View in Library ›
                              </Link>
                            )}
                          </>
                        ) : res.category === 'unavailable' ? (
                          <span className={styles.badgeUnavailable}>Unavailable</span>
                        ) : res.category === 'invalid' ? (
                          <span className={styles.badgeUnavailable}>Invalid URL</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 600 }}>
                            Ready
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <div className={styles.footerLeft}>
                {selectedResourcesToImport.length > 0 && (
                  <span>
                    <strong>{selectedResourcesToImport.length}</strong> videos ready to import
                  </span>
                )}
              </div>
              <div className={styles.footerRight}>
                <Button variant="secondary" onClick={onClose} disabled={isImporting}>
                  {hasImportedAny ? 'Close' : 'Cancel'}
                </Button>
                {selectedResourcesToImport.length > 0 && !hasImportedAny && (
                  <Button
                    variant="primary"
                    onClick={() => setIsConfirming(true)}
                    disabled={isImporting}
                  >
                    Import Selected ({selectedResourcesToImport.length})
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
