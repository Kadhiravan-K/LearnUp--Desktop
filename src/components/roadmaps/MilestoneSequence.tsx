'use client';

import React from 'react';
import Link from 'next/link';
import type { RoadmapTrack, RoadmapNode } from '@/lib/types';
import { formatPercentage } from '@/lib/utils/formatPercentage';
import styles from './MilestoneSequence.module.css';

export interface MilestoneSequenceProps {
  track: RoadmapTrack;
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onAppendNodeClick: () => void;
  onAttachCourseClick: (node: RoadmapNode) => void;
}

export function MilestoneSequence({
  track,
  selectedNodeId,
  onSelectNode,
  onAppendNodeClick,
  onAttachCourseClick
}: MilestoneSequenceProps) {
  const doneCount = track.nodes.filter((n) => n.status === 'completed').length;
  const activeCount = track.nodes.filter((n) => n.status === 'active' || n.status === 'in_progress').length;
  const lockedCount = track.nodes.filter((n) => n.status === 'locked' || n.status === 'capstone').length;

  const renderTimelineIcon = (node: RoadmapNode) => {
    switch (node.status) {
      case 'completed':
        return <span className={`${styles.nodeIcon} ${styles.iconDone}`}>✓</span>;
      case 'active':
        return <span className={`${styles.nodeIcon} ${styles.iconActive}`}>⚡</span>;
      case 'in_progress':
        return <span className={`${styles.nodeIcon} ${styles.iconInProgress}`}>▶</span>;
      case 'capstone':
        return <span className={`${styles.nodeIcon} ${styles.iconCapstone}`}>🏆</span>;
      default:
        return <span className={`${styles.nodeIcon} ${styles.iconLocked}`}>🔒</span>;
    }
  };

  const renderStatusBadge = (node: RoadmapNode) => {
    switch (node.status) {
      case 'completed':
        return <span className={styles.badgeCompleted}>Completed (100%)</span>;
      case 'active':
        return <span className={styles.badgeActive}>Active Node ({node.progress_percentage}%)</span>;
      case 'in_progress':
        return <span className={styles.badgeInProgress}>In Progress ({node.progress_percentage}%)</span>;
      case 'capstone':
        return <span className={styles.badgeCapstone}>Capstone Milestone</span>;
      default:
        return <span className={styles.badgePrereq}>{node.prerequisite_label || 'Locked'}</span>;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.sectionIcon}>📑</span>
          <h3 className={styles.sectionTitle}>Curriculum Milestone Sequence</h3>
          <span className={styles.countBadge}>• {doneCount} Done</span>
          <span className={styles.countBadge}>• {activeCount} Active</span>
          <span className={styles.countBadge}>• {lockedCount} Locked</span>
        </div>
      </div>

      <div className={styles.timeline}>
        {track.nodes.map((node, index) => {
          const isSelected = node.id === selectedNodeId;
          const isActiveNode = node.status === 'active';

          return (
            <div key={node.id} className={styles.timelineRow}>
              {/* Left Timeline Indicator */}
              <div className={styles.indicatorCol}>
                {renderTimelineIcon(node)}
                {index < track.nodes.length - 1 && <div className={styles.timelineLine} />}
              </div>

              {/* Node Milestone Card */}
              <div
                className={`${styles.nodeCard} ${isSelected ? styles.nodeCardSelected : ''} ${
                  isActiveNode ? styles.nodeCardActiveHighlight : ''
                }`}
                onClick={() => onSelectNode(node.id)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <span className={styles.nodeNum}>{node.node_number}</span>
                    <h4 className={styles.nodeTitle}>{node.title}</h4>
                  </div>

                  <div className={styles.cardHeaderRight}>
                    {renderStatusBadge(node)}
                    {node.hours_logged > 0 && (
                      <span className={styles.hoursTag}>{node.hours_logged}h logged</span>
                    )}
                    <span className={styles.dragHandle} title="Drag to reorder">⋮⋮</span>
                  </div>
                </div>

                <p className={styles.nodeDesc}>{node.description}</p>

                {/* Active Node 05 Special Focus View */}
                {isActiveNode && (
                  <div className={styles.activeNodeFocusArea}>
                    <div className={styles.progressRow}>
                      <span className={styles.progressLabel}>Node Completion Target</span>
                      <span className={styles.progressPct}>{node.progress_percentage}% Progress</span>
                    </div>
                    <div className={styles.progressBarTrack}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${node.progress_percentage}%` }}
                      />
                    </div>

                    {node.attached_course && (
                      <div className={styles.currentSyllabusCard}>
                        <div className={styles.syllabusIcon}>📖</div>
                        <div className={styles.syllabusContent}>
                          <span className={styles.syllabusPre}>
                            CURRENT SYLLABUS • {node.attached_course.completed_lectures} of {node.attached_course.total_lectures} Completed
                          </span>
                          <span className={styles.syllabusCourseTitle}>
                            {node.attached_course.title}
                          </span>
                          {node.attached_course.next_chapter && (
                            <span className={styles.syllabusNext}>
                              Next: {node.attached_course.next_chapter}
                            </span>
                          )}
                        </div>

                        <Link href="/library" className={styles.continueLectureBtn}>
                          <span>▶ Continue @ Lec {node.attached_course.completed_lectures || 1}</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Standard Attached Course Display */}
                {!isActiveNode && node.attached_course && (
                  <div className={styles.attachedCourseStrip}>
                    <span className={styles.playIconSmall}>▶</span>
                    <div className={styles.attachedInfo}>
                      <span className={styles.attachedTitle}>{node.attached_course.title}</span>
                      <span className={styles.attachedMeta}>
                        Attached Course • {node.attached_course.runtime_formatted || `${formatPercentage(node.attached_course.progress_percentage)}% Watched`}
                      </span>
                    </div>
                    <span className={styles.watchedBadge}>
                      {node.attached_course.progress_percentage === 100 ? '100% Watched' : `${formatPercentage(node.attached_course.progress_percentage)}% Watched`}
                    </span>
                  </div>
                )}

                {/* Locked Node Suggested Course or Attach Prompt */}
                {!node.attached_course && (
                  <div className={styles.emptyAttachmentBox}>
                    {node.suggested_course_title ? (
                      <div className={styles.suggestedCourseRow}>
                        <span>💡 Suggested: <strong>{node.suggested_course_title}</strong></span>
                      </div>
                    ) : (
                      <span className={styles.noCourseText}>No courses currently attached to this node</span>
                    )}

                    <button
                      type="button"
                      className={styles.attachBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAttachCourseClick(node);
                      }}
                    >
                      <span>➕</span>
                      <span>Attach Course</span>
                    </button>
                  </div>
                )}

                {/* Tags & Action Row */}
                <div className={styles.cardFooter}>
                  <div className={styles.tagList}>
                    {node.tags.map((tag) => (
                      <span key={tag} className={styles.tagChip}>
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {node.attached_course && (
                    <button
                      type="button"
                      className={styles.manageCourseLink}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAttachCourseClick(node);
                      }}
                    >
                      <span>🔗 Manage Attached Courses (1)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.appendNodeBtn}
        onClick={onAppendNodeClick}
      >
        <span>➕</span>
        <span>Append Node {track.nodes.length + 1} to {track.title} Sequence</span>
      </button>
    </div>
  );
}
