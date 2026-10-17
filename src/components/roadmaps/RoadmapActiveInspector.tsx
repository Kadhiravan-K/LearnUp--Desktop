'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { RoadmapTrack, RoadmapNode, AttachedCourseData } from '@/lib/types';
import { formatPercentage } from '@/lib/utils/formatPercentage';
import { extractMilestoneFromNode } from '@/lib/roadmaps/career-helpers';
import { useLibrary } from '@/lib/hooks/useLibrary';
import { ImportRoadmapResourcesModal } from './ImportRoadmapResourcesModal';
import styles from './RoadmapActiveInspector.module.css';

export interface RoadmapActiveInspectorProps {
  track: RoadmapTrack;
  node: RoadmapNode;
  onAttachCourseClick: () => void;
  onUpdateNode?: (nodeId: string, updates: Partial<RoadmapNode>) => Promise<void>;
  onLinkCourseToNode?: (trackId: string, nodeId: string, courseData: AttachedCourseData) => Promise<void>;
}

export function RoadmapActiveInspector({
  track,
  node,
  onAttachCourseClick,
  onUpdateNode,
  onLinkCourseToNode
}: RoadmapActiveInspectorProps) {
  const { items: libraryItems, refresh: refreshLibrary } = useLibrary();
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const course = node.attached_course;
  const milestone = extractMilestoneFromNode(node);

  const libraryByVideoId = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of libraryItems) {
      const vid = item.youtube_video_id || (item as any).source_id;
      if (vid) map.set(vid, item);
      if (item.source_url) {
        const id = extractYoutubeId(item.source_url);
        if (id) map.set(id, item);
      }
    }
    return map;
  }, [libraryItems]);

  const handleToggleTask = (taskId: string) => {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleToggleComplete = async () => {
    if (!onUpdateNode || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const isCurrentlyCompleted = node.status === 'completed';
      const newStatus = isCurrentlyCompleted ? 'in_progress' : 'completed';
      const newProgress = isCurrentlyCompleted ? 50 : 100;
      await onUpdateNode(node.id, {
        status: newStatus,
        progress_percentage: newProgress
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const extractYoutubeId = (url: string): string | null => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) {
        return u.searchParams.get('v');
      }
      if (u.hostname.includes('youtu.be')) {
        return u.pathname.slice(1);
      }
    } catch {
      // ignore
    }
    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.inspectorBadge}>
            🔍 ACTIVE MILESTONE INSPECTOR
          </span>
          <span className={styles.nodeCountTag}>
            Node {node.node_number} / 0{track.nodes.length}
          </span>
        </div>

        <h3 className={styles.nodeTitle}>{node.title}</h3>
        <p className={styles.nodeDescription}>
          Phase: {milestone.phaseTitle} &bull; Estimated: ~{milestone.estimatedHours}h &bull; Logged: {node.hours_logged || 0}h
        </p>

        {/* Milestone Completion Progression Action */}
        <div className={styles.statusActionBar}>
          <button
            type="button"
            className={node.status === 'completed' ? styles.btnMarkCompletedActive : styles.btnMarkCompleted}
            onClick={handleToggleComplete}
            disabled={isUpdatingStatus}
          >
            {node.status === 'completed' ? (
              <span>✓ Milestone Completed (100%)</span>
            ) : (
              <span>⚡ Mark Milestone Complete</span>
            )}
          </button>
          <button
            type="button"
            className={styles.btnImportResources}
            onClick={() => setIsImportModalOpen(true)}
            title="Import verified learning resources from this roadmap into your library"
          >
            <span>📥 Import Resources</span>
          </button>
        </div>
      </div>

      {/* Active Attached Course Display (if attached) */}
      {course && (
        <div className={styles.courseCard}>
          <div className={styles.courseHeader}>
            <div className={styles.providerTag}>
              <span>RT</span>
            </div>
            <div className={styles.courseMeta}>
              <div className={styles.courseTitleRow}>
                <h4 className={styles.courseTitle}>{course.title}</h4>
                <span className={styles.activeTag}>Active</span>
              </div>
              <span className={styles.providerName}>Provider: {course.provider || 'LearnUp Library'}</span>
            </div>
          </div>

          <div className={styles.courseProgressRow}>
            <span className={styles.progressLabel}>
              Progress <strong>{formatPercentage(course.progress_percentage)}%</strong>
            </span>
          </div>

          <div className={styles.courseCardFooter}>
            <Link href={`/library/${course.id}`} className={styles.viewCurriculumLink}>
              View Full Curriculum ›
            </Link>
            {course.runtime_formatted && (
              <span className={styles.runtimeTag}>➔ {course.runtime_formatted}</span>
            )}
          </div>
        </div>
      )}

      {/* Core Learning Objectives */}
      {milestone.learningObjectives.length > 0 && (
        <div>
          <div className={styles.inspectorSubheader}>
            <span>🎯</span>
            <span>Learning Objectives</span>
          </div>
          <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '0.75rem', color: 'var(--sf-color-text-secondary, #64748b)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {milestone.learningObjectives.map((obj, idx) => (
              <li key={idx}>{obj}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Verified Educational Resources */}
      {milestone.resources.length > 0 && (
        <div>
          <div className={styles.inspectorSubheader}>
            <span>📚</span>
            <span>Verified Educational Resources ({milestone.resources.length})</span>
          </div>
          <div className={styles.materialsList} style={{ marginTop: '8px' }}>
            {milestone.resources.map((res) => {
              const ytId = res.type === 'video' ? extractYoutubeId(res.canonicalUrl) : null;
              const libraryItem = ytId ? libraryByVideoId.get(ytId) : null;
              const isInLibrary = Boolean(libraryItem && libraryItem.status === 'ready');
              const progressPercentage = libraryItem?.progress?.progress_percentage;

              return (
                <div key={res.id} className={styles.materialCard}>
                  <div className={styles.materialMeta}>
                    <span style={{ fontWeight: 700, textTransform: 'uppercase', color: '#14b8a6' }}>
                      {res.type}
                    </span>
                    <span>{res.provider}</span>
                    {isInLibrary && (
                      <Link
                        href={`/library/${libraryItem.id}`}
                        className={styles.inLibraryBadge}
                        title="View in your personal library"
                      >
                        ✓ In Library{typeof progressPercentage === 'number' && progressPercentage > 0 ? ` (${progressPercentage}%)` : ''}
                      </Link>
                    )}
                  </div>
                  <h5 className={styles.materialTitle}>{res.title}</h5>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {ytId ? (
                        <button
                          type="button"
                          className={styles.materialLink}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => setActiveVideoId(ytId)}
                        >
                          ▶ Watch Lesson in App
                        </button>
                      ) : (
                        <a
                          href={res.canonicalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.materialLink}
                        >
                          Open Material ↗
                        </a>
                      )}
                      {!isInLibrary && ytId && (
                        <button
                          type="button"
                          className={styles.btnQuickImport}
                          onClick={() => setIsImportModalOpen(true)}
                          title="Import this video into your library"
                        >
                          + Import to Library
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#10b981' }}>✔ {res.verificationStatus}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Applied Practice Tasks Checklist */}
      {milestone.practiceTasks.length > 0 && (
        <div>
          <div className={styles.inspectorSubheader}>
            <span>🛠️</span>
            <span>Applied Practice Deliverables ({milestone.practiceTasks.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
            {milestone.practiceTasks.map((task) => {
              const isDone = completedTaskIds.has(task.id);
              return (
                <label key={task.id} className={`${styles.taskItemRow} ${isDone ? styles.taskItemDone : ''}`}>
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => handleToggleTask(task.id)}
                    style={{ marginTop: '2px', accentColor: '#14b8a6', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>{task.title}</span> (~{task.estimatedMinutes}m)
                    <div style={{ fontSize: '0.7rem', color: 'var(--sf-color-text-secondary, #64748b)' }}>
                      Deliverable: <code>{task.deliverable}</code>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Checkpoint Knowledge Assessment */}
      {milestone.assessment && (
        <div style={{ background: 'rgba(20, 184, 166, 0.05)', border: '1px solid rgba(20, 184, 166, 0.25)', borderRadius: '8px', padding: '10px' }}>
          <div className={styles.inspectorSubheader} style={{ marginTop: 0 }}>
            <span>❓</span>
            <span>Knowledge Checkpoint</span>
          </div>
          <p style={{ margin: '6px 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--sf-color-text-primary, #0f172a)' }}>
            {milestone.assessment.question}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {milestone.assessment.options.map((opt, optIdx) => {
              const isSelected = selectedQuizOption === optIdx;
              const isCorrect = optIdx === milestone.assessment?.correctIndex;
              const isAnswered = selectedQuizOption !== null;

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => setSelectedQuizOption(optIdx)}
                  style={{
                    textAlign: 'left',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    border: '1px solid',
                    background: isSelected ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
                    borderColor: isAnswered && isCorrect ? '#10b981' : isSelected ? '#14b8a6' : 'rgba(148, 163, 184, 0.3)',
                    color: 'inherit'
                  }}
                >
                  <span style={{ fontWeight: 700, marginRight: '6px' }}>{String.fromCharCode(65 + optIdx)})</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
          {selectedQuizOption !== null && (
            <div style={{ marginTop: '8px', fontSize: '0.7rem', lineHeight: 1.4 }}>
              {selectedQuizOption === milestone.assessment.correctIndex ? (
                <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Correct! {milestone.assessment.explanation}</span>
              ) : (
                <span style={{ color: '#ef4444', fontWeight: 600 }}>✗ Incorrect. {milestone.assessment.explanation}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Attach Course to Topic Collapsible Section */}
      <div className={styles.attachSection}>
        <button
          type="button"
          className={styles.attachHeaderBtn}
          onClick={() => setIsAttachOpen(!isAttachOpen)}
        >
          <div className={styles.attachHeaderLeft}>
            <span>🔗</span>
            <span className={styles.attachHeaderTitle}>Link Library Course</span>
          </div>
          <span className={styles.collapseIcon}>{isAttachOpen ? '✕' : '▼'}</span>
        </button>

        {isAttachOpen && (
          <div className={styles.attachForm}>
            <p className={styles.fieldLabel}>Synchronize video telemetry from your private library to this milestone.</p>
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={onAttachCourseClick}
            >
              <span>🔗</span>
              <span>{course ? 'Change Linked Course' : 'Select from Library'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Embedded YouTube Player Modal */}
      {activeVideoId && (
        <div className={styles.videoModalOverlay} onClick={() => setActiveVideoId(null)}>
          <div className={styles.videoModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.videoModalHeader}>
              <span>Interactive Educational Player</span>
              <button
                type="button"
                className={styles.videoModalCloseBtn}
                onClick={() => setActiveVideoId(null)}
              >
                ✕
              </button>
            </div>
            <iframe
              className={styles.videoIframe}
              src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Import Learning Resources Modal */}
      <ImportRoadmapResourcesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        track={track}
        onImportComplete={async () => {
          await refreshLibrary();
        }}
        onLinkCourseToNode={onLinkCourseToNode}
      />
    </div>
  );
}
