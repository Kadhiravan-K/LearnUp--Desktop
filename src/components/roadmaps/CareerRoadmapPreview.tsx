'use client';

import React, { useState } from 'react';
import {
  CareerRoadmap,
  RoadmapMilestone,
  RoadmapPhase,
  MilestoneRefinementAction,
  MilestoneDiff
} from '@/lib/roadmaps/career-types';
import { MermaidViewer } from './MermaidViewer';
import { apiFetch } from '@/lib/api/client';
import styles from './CareerRoadmapPreview.module.css';

export interface CareerRoadmapPreviewProps {
  roadmap: CareerRoadmap;
  onBackToWizard: () => void;
  onSaveRoadmap: (roadmap: CareerRoadmap) => Promise<void>;
  isSaving?: boolean;
}

export function CareerRoadmapPreview({
  roadmap: initialRoadmap,
  onBackToWizard,
  onSaveRoadmap,
  isSaving = false
}: CareerRoadmapPreviewProps) {
  const [roadmap, setRoadmap] = useState<CareerRoadmap>(initialRoadmap);
  const [activeTab, setActiveTab] = useState<'milestones' | 'diagram' | 'mindmap'>('milestones');
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(
    new Set([initialRoadmap.phases[0]?.milestones[0]?.id || ''])
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  // Selective Refinement state
  const [refiningMilestoneId, setRefiningMilestoneId] = useState<string | null>(null);
  const [activeRefineDropdown, setActiveRefineDropdown] = useState<string | null>(null);
  const [diffModal, setDiffModal] = useState<{
    phaseId: string;
    diff: MilestoneDiff;
    refinedMilestone: RoadmapMilestone;
  } | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);

  const toggleMilestoneExpanded = (id: string) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRemoveMilestone = (phaseId: string, milestoneId: string) => {
    setRoadmap((prev) => {
      const updatedPhases = prev.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const filtered = phase.milestones.filter((m) => m.id !== milestoneId);
        return {
          ...phase,
          milestones: filtered.map((m, idx) => ({ ...m, order: idx + 1 }))
        };
      });
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleMoveMilestone = (phaseId: string, milestoneIndex: number, direction: 'up' | 'down') => {
    setRoadmap((prev) => {
      const updatedPhases = prev.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const list = [...phase.milestones];
        const targetIndex = direction === 'up' ? milestoneIndex - 1 : milestoneIndex + 1;
        if (targetIndex < 0 || targetIndex >= list.length) return phase;

        const temp = list[milestoneIndex];
        list[milestoneIndex] = list[targetIndex];
        list[targetIndex] = temp;

        return {
          ...phase,
          milestones: list.map((m, idx) => ({ ...m, order: idx + 1 }))
        };
      });
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleUpdateMilestoneTitle = (phaseId: string, milestoneId: string, newTitle: string) => {
    setRoadmap((prev) => ({
      ...prev,
      phases: prev.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        return {
          ...phase,
          milestones: phase.milestones.map((m) =>
            m.id === milestoneId ? { ...m, title: newTitle } : m
          )
        };
      })
    }));
  };

  const handleRefineMilestone = async (
    phaseId: string,
    milestone: RoadmapMilestone,
    action: MilestoneRefinementAction
  ) => {
    setActiveRefineDropdown(null);
    setRefiningMilestoneId(milestone.id);
    setRefineError(null);
    try {
      const res = await apiFetch<{
        data: { refinedMilestone: RoadmapMilestone; diff: MilestoneDiff };
      }>('/api/roadmaps/refine-milestone', {
        method: 'POST',
        body: JSON.stringify({
          milestone,
          action,
          targetRole: roadmap.targetRole,
          experienceLevel: roadmap.experienceLevel,
          weeklyHours: roadmap.weeklyHours
        })
      });

      if (res?.data) {
        setDiffModal({
          phaseId,
          diff: res.data.diff,
          refinedMilestone: res.data.refinedMilestone
        });
      }
    } catch (err: any) {
      setRefineError(err.message || 'Failed to refine milestone.');
    } finally {
      setRefiningMilestoneId(null);
    }
  };

  const applyRefinement = () => {
    if (!diffModal) return;
    const { phaseId, refinedMilestone } = diffModal;
    setRoadmap((prev) => ({
      ...prev,
      phases: prev.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        return {
          ...phase,
          milestones: phase.milestones.map((m) =>
            m.id === refinedMilestone.id ? refinedMilestone : m
          )
        };
      })
    }));
    setDiffModal(null);
  };

  const totalMilestonesCount = roadmap.phases.reduce((acc, p) => acc + p.milestones.length, 0);

  return (
    <div className={styles.previewContainer}>
      {/* Top Header */}
      <div className={styles.topHeader}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.mainTitle}>{roadmap.title}</h1>
            <p className={styles.titleSubtitle}>{roadmap.skillGapSummary}</p>
          </div>
          <div className={styles.badgeRow}>
            <span className={styles.pillBadge}>🎯 {roadmap.targetRole}</span>
            <span className={styles.pillBadge}>⚡ {roadmap.experienceLevel.toUpperCase()}</span>
            <span className={styles.pillGreen}>⏱️ ~{roadmap.estimatedWeeks} WEEKS ({roadmap.weeklyHours}h/wk)</span>
            <span className={styles.pillBadge}>📚 {totalMilestonesCount} MILESTONES</span>
            {roadmap.researchProvider && (
              <span className={styles.pillBadge} style={{ borderColor: '#2dd4bf', color: '#2dd4bf' }}>
                {roadmap.isLiveResearched ? '✨ LIVE AI RESEARCH' : '🏛️ CURATED BENCHMARK'}
              </span>
            )}
          </div>
        </div>

        {/* Provenance Banner */}
        {roadmap.provenanceNote && (
          <div className={styles.provenanceBanner}>
            <span className={styles.provenanceIcon}>🏛️</span>
            <div className={styles.provenanceText}>
              <strong>Research Provenance:</strong> {roadmap.provenanceNote}
              {roadmap.retrievalTimestamp && (
                <span> &bull; Retrieved: {new Date(roadmap.retrievalTimestamp).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        )}

        {refineError && (
          <div className={styles.medicalAlert} style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', color: '#fca5a5' }}>
            ⚠️ Refinement Notice: {refineError}
          </div>
        )}

        {roadmap.medicalDisclaimer && (
          <div className={styles.medicalAlert}>
            ⚠️ <strong>Academic Notice:</strong> {roadmap.medicalDisclaimer}
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'milestones' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('milestones')}
        >
          <span>📋</span>
          <span>Curriculum &amp; Milestones ({totalMilestonesCount})</span>
        </button>

        {roadmap.mermaidDiagram && (
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'diagram' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('diagram')}
          >
            <span>📊</span>
            <span>Skill Graph (Mermaid Flow)</span>
          </button>
        )}

        {roadmap.mermaidMindmap && (
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'mindmap' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('mindmap')}
          >
            <span>🧠</span>
            <span>Competency Mind Map</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '24px' }}>
        {/* TAB 1: Milestones Curriculum */}
        {activeTab === 'milestones' && (
          <div className={styles.phaseList}>
            {roadmap.phases.map((phase) => (
              <div key={phase.id} className={styles.phaseCard}>
                <div className={styles.phaseHeader}>
                  <div className={styles.phaseHeaderLeft}>
                    <span className={styles.phaseOrderBadge}>Phase {phase.order}</span>
                    <h3 className={styles.phaseTitle}>{phase.title}</h3>
                  </div>
                  <span className={styles.phaseHoursBadge}>~{phase.estimatedHours} Hours Total</span>
                </div>
                <p className={styles.phaseObjective}>{phase.objective}</p>

                <div className={styles.milestoneList}>
                  {phase.milestones.map((milestone, mIdx) => {
                    const isExpanded = expandedMilestones.has(milestone.id);
                    return (
                      <div key={milestone.id} className={styles.milestoneItem}>
                        <div
                          className={styles.milestoneRow}
                          onClick={() => toggleMilestoneExpanded(milestone.id)}
                        >
                          <div className={styles.milestoneLeft}>
                            <span className={styles.milestoneOrder}>{milestone.order}</span>
                            {editingMilestoneId === milestone.id ? (
                              <input
                                type="text"
                                value={milestone.title}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  handleUpdateMilestoneTitle(phase.id, milestone.id, e.target.value)
                                }
                                onBlur={() => setEditingMilestoneId(null)}
                                autoFocus
                                style={{
                                  background: 'var(--sf-color-bg-primary)',
                                  color: '#fff',
                                  border: '1px solid #38bdf8',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  fontSize: '0.9rem'
                                }}
                              />
                            ) : (
                              <span className={styles.milestoneName}>{milestone.title}</span>
                            )}
                          </div>

                          <div className={styles.milestoneRight} onClick={(e) => e.stopPropagation()}>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              ~{milestone.estimatedHours}h
                            </span>

                            {/* Selective AI Refinement Dropdown */}
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                className={styles.btnRefine}
                                onClick={() =>
                                  setActiveRefineDropdown(
                                    activeRefineDropdown === milestone.id ? null : milestone.id
                                  )
                                }
                                disabled={refiningMilestoneId === milestone.id}
                                title="Refine milestone with AI"
                              >
                                <span>{refiningMilestoneId === milestone.id ? '⏳' : '⚡'}</span>
                                <span>Refine</span>
                              </button>
                              {activeRefineDropdown === milestone.id && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '4px',
                                    background: '#0d1b1e',
                                    border: '1px solid rgba(20, 184, 166, 0.4)',
                                    borderRadius: '8px',
                                    padding: '6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    zIndex: 50,
                                    minWidth: '200px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                                  }}
                                >
                                  <button
                                    type="button"
                                    className={styles.tabBtn}
                                    style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem' }}
                                    onClick={() => handleRefineMilestone(phase.id, milestone, 'find_better_video')}
                                  >
                                    📹 Find Better Video
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.tabBtn}
                                    style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem' }}
                                    onClick={() => handleRefineMilestone(phase.id, milestone, 'replace_unavailable_resource')}
                                  >
                                    🔄 Replace Broken Link
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.tabBtn}
                                    style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem' }}
                                    onClick={() => handleRefineMilestone(phase.id, milestone, 'add_practical_projects')}
                                  >
                                    🛠️ Add Practical Project
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.tabBtn}
                                    style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem' }}
                                    onClick={() => handleRefineMilestone(phase.id, milestone, 'simplify_topic')}
                                  >
                                    🟢 Simplify Topic
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.tabBtn}
                                    style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem' }}
                                    onClick={() => handleRefineMilestone(phase.id, milestone, 'deepen_advanced')}
                                  >
                                    🚀 Deepen Advanced
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.tabBtn}
                                    style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem' }}
                                    onClick={() => handleRefineMilestone(phase.id, milestone, 'refresh_resources')}
                                  >
                                    ⚡ Refresh Metadata
                                  </button>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              className={styles.actionIconBtn}
                              title="Edit Title"
                              onClick={() => setEditingMilestoneId(milestone.id)}
                            >
                              ✏️
                            </button>
                            {mIdx > 0 && (
                              <button
                                type="button"
                                className={styles.actionIconBtn}
                                title="Move Up"
                                onClick={() => handleMoveMilestone(phase.id, mIdx, 'up')}
                              >
                                ↑
                              </button>
                            )}
                            {mIdx < phase.milestones.length - 1 && (
                              <button
                                type="button"
                                className={styles.actionIconBtn}
                                title="Move Down"
                                onClick={() => handleMoveMilestone(phase.id, mIdx, 'down')}
                              >
                                ↓
                              </button>
                            )}
                            <button
                              type="button"
                              className={styles.actionIconBtn}
                              title="Remove Milestone"
                              onClick={() => handleRemoveMilestone(phase.id, milestone.id)}
                            >
                              🗑️
                            </button>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          </div>
                        </div>

                        {/* Expanded Milestone Details */}
                        {isExpanded && (
                          <div className={styles.milestoneDetails}>
                            {/* Objectives */}
                            <div>
                              <div className={styles.sectionSubtitle}>🎯 Core Learning Objectives</div>
                              <ul className={styles.objectivesList}>
                                {milestone.learningObjectives.map((obj, idx) => (
                                  <li key={idx} className={styles.objectiveItem}>
                                    <span>✔</span>
                                    <span>{obj}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Verified Educational Resources */}
                            <div>
                              <div className={styles.sectionSubtitle}>
                                📚 Verified Educational Resources ({milestone.resources.length})
                              </div>
                              <div className={styles.resourceGrid}>
                                {milestone.resources.map((res) => (
                                  <div key={res.id} className={styles.resourceCard}>
                                    <div className={styles.resourceHeader}>
                                      <span className={styles.resTypeTag}>
                                        {res.type === 'video' ? '📹 Video' : res.type === 'documentation' ? '📖 Docs' : '📄 Article'}
                                      </span>
                                      <span className={styles.resStatusVerified}>
                                        ✔ {res.verificationStatus}
                                      </span>
                                    </div>
                                    <div className={styles.resTitle}>{res.title}</div>
                                    <div className={styles.resProvider}>Provider: {res.provider}</div>
                                    <div className={styles.resRationale}>{res.selectionRationale}</div>
                                    <a
                                      href={res.canonicalUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.resLink}
                                    >
                                      Open Learning Material ↗
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Practice Tasks */}
                            {milestone.practiceTasks.length > 0 && (
                              <div>
                                <div className={styles.sectionSubtitle}>🛠️ Applied Practice Tasks</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {milestone.practiceTasks.map((t) => (
                                    <div key={t.id} className={styles.taskCard}>
                                      <div className={styles.taskHeader}>
                                        <div className={styles.taskTitle}>⚡ {t.title}</div>
                                        <div className={styles.taskTime}>~{t.estimatedMinutes} mins</div>
                                      </div>
                                      <div className={styles.taskDesc}>{t.description}</div>
                                      <div className={styles.taskDeliverable}>
                                        <strong>Expected Deliverable:</strong> {t.deliverable}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Interactive Quiz Checkpoint */}
                            {milestone.assessment && (
                              <div className={styles.quizBox}>
                                <div className={styles.quizHeader}>
                                  <span>❓ Knowledge Checkpoint</span>
                                </div>
                                <div className={styles.quizQuestion}>
                                  {milestone.assessment.question}
                                </div>
                                <div className={styles.quizOptions}>
                                  {milestone.assessment.options.map((opt, optIdx) => {
                                    const isSelected = quizAnswers[milestone.id] === optIdx;
                                    const isAnswered = quizAnswers[milestone.id] !== undefined;
                                    const isCorrect = optIdx === milestone.assessment?.correctIndex;

                                    return (
                                      <button
                                        key={optIdx}
                                        type="button"
                                        className={`${styles.quizOptionBtn} ${
                                          isSelected ? styles.quizOptionSelected : ''
                                        } ${
                                          isAnswered && isCorrect ? styles.quizOptionCorrect : ''
                                        }`}
                                        onClick={() =>
                                          setQuizAnswers((prev) => ({
                                            ...prev,
                                            [milestone.id]: optIdx
                                          }))
                                        }
                                      >
                                        <span>{String.fromCharCode(65 + optIdx)})</span>
                                        <span>{opt}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {quizAnswers[milestone.id] !== undefined && (
                                  <div className={styles.quizFeedback}>
                                    {quizAnswers[milestone.id] === milestone.assessment.correctIndex ? (
                                      <span style={{ color: '#34d399', fontWeight: 600 }}>
                                        ✓ Correct! {milestone.assessment.explanation}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#f87171', fontWeight: 600 }}>
                                        ✗ Not quite. {milestone.assessment.explanation}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Portfolio Capstone Project */}
                            {milestone.project && (
                              <div className={styles.projectCard}>
                                <div className={styles.projectHeader}>
                                  <span>🏆 Portfolio Deliverable</span>
                                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Verified Rubric</span>
                                </div>
                                <div className={styles.projectTitle}>{milestone.project.title}</div>
                                <div className={styles.projectDesc}>{milestone.project.description}</div>
                                <div className={styles.rubricList}>
                                  {milestone.project.rubric.map((rule, idx) => (
                                    <div key={idx} className={styles.rubricItem}>
                                      <span>✔</span>
                                      <span>{rule}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: Real Safe Mermaid Flowchart */}
        {activeTab === 'diagram' && roadmap.mermaidDiagram && (
          <MermaidViewer
            title={`${roadmap.targetRole} Prerequisite Flowchart`}
            type="flowchart"
            code={roadmap.mermaidDiagram}
            isRichUiEnabled={true}
          />
        )}

        {/* TAB 3: Real Safe Mermaid Mind Map */}
        {activeTab === 'mindmap' && roadmap.mermaidMindmap && (
          <MermaidViewer
            title={`${roadmap.targetRole} Competency Mind Map`}
            type="mindmap"
            code={roadmap.mermaidMindmap}
            isRichUiEnabled={true}
          />
        )}
      </div>

      {/* Diff Modal for Selective AI Regeneration */}
      {diffModal && (
        <div className={styles.diffModalOverlay}>
          <div className={styles.diffModalContent}>
            <div className={styles.diffHeader}>
              <h3 className={styles.diffTitle}>Review AI Refinement Changes</h3>
              <button
                type="button"
                className={styles.actionIconBtn}
                onClick={() => setDiffModal(null)}
              >
                ✕
              </button>
            </div>
            <p className={styles.diffSummary}>{diffModal.diff.summary}</p>

            <div className={styles.diffList}>
              {diffModal.diff.changes.map((c, idx) => (
                <div key={idx} className={styles.diffItem}>
                  <div className={styles.diffField}>{c.field}</div>
                  <div className={styles.diffBefore}>− {c.before}</div>
                  <div className={styles.diffAfter}>+ {c.after}</div>
                </div>
              ))}
            </div>

            <div className={styles.diffActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setDiffModal(null)}
              >
                Discard Changes
              </button>
              <button
                type="button"
                className={styles.btnSave}
                onClick={applyRefinement}
              >
                Apply Changes to Roadmap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className={styles.footerActions}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onBackToWizard}
          disabled={isSaving}
        >
          ← Back to Configuration
        </button>

        <button
          type="button"
          className={styles.btnSave}
          onClick={() => onSaveRoadmap(roadmap)}
          disabled={isSaving}
        >
          {isSaving ? (
            <span>Saving Roadmap...</span>
          ) : (
            <>
              <span>💾</span>
              <span>Confirm &amp; Save Roadmap to My Learning</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
