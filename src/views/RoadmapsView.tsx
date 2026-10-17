import React, { useState, useMemo } from 'react';
import { CURATED_OFFLINE_ROADMAPS } from '@/core';
import type { UserProfile, LearningItem } from '@/core';
import styles from './RoadmapsPage.module.css';

export interface RoadmapsViewProps {
  activeProfile: UserProfile | null;
  learningItems: LearningItem[];
  roadmapCompleted: Record<string, string[]>;
  onToggleMilestone: (roadmapId: string, milestoneId: string, checked: boolean) => Promise<void>;
  onSelectVideo: (videoId: string) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const RoadmapsView: React.FC<RoadmapsViewProps> = ({
  activeProfile,
  learningItems,
  roadmapCompleted,
  onToggleMilestone,
  onSelectVideo,
  showToast,
}) => {
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string>(
    CURATED_OFFLINE_ROADMAPS[0]?.id || ''
  );

  const activeRoadmap = useMemo(() => {
    return CURATED_OFFLINE_ROADMAPS.find((r) => r.id === selectedRoadmapId) || CURATED_OFFLINE_ROADMAPS[0];
  }, [selectedRoadmapId]);

  const handleCheckboxToggle = async (roadmapId: string, milestoneId: string, checked: boolean) => {
    if (!activeProfile) return;
    try {
      await onToggleMilestone(roadmapId, milestoneId, checked);
      showToast(checked ? 'Milestone marked completed!' : 'Milestone unmarked.', 'success');
    } catch {
      showToast('Failed to update milestone progress', 'error');
    }
  };

  const completedList = roadmapCompleted[activeRoadmap?.id || ''] || [];
  const totalMilestones = activeRoadmap?.phases.reduce((acc, p) => acc + p.milestones.length, 0) || 0;
  const masteryPercent = totalMilestones > 0 ? Math.round((completedList.length / totalMilestones) * 100) : 0;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--sf-text-muted, #94a3b8)', marginBottom: '6px' }}>
            <span>Dashboard</span>
            <span>/</span>
            <span style={{ color: 'var(--sf-accent-primary, #0d9488)' }}>Skill Roadmaps</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--sf-text-primary, #0f172a)' }}>
            Engineering Roadmaps &amp; Trajectories
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--sf-text-muted, #64748b)' }}>
            Step-by-step career tracks, structured skill milestones, and offline-verified competency progress.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '9999px', background: 'rgba(13, 148, 136, 0.1)', color: 'var(--sf-accent-primary, #0d9488)' }}>
            ✓ SQLite Persistent
          </span>
        </div>
      </header>

      {/* Track Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', borderBottom: '1px solid var(--sf-border-subtle, #e2e8f0)' }}>
        {CURATED_OFFLINE_ROADMAPS.map((rm) => {
          const rmCompleted = roadmapCompleted[rm.id] || [];
          const rmTotal = rm.phases.reduce((acc, p) => acc + p.milestones.length, 0);
          const rmPercent = rmTotal > 0 ? Math.round((rmCompleted.length / rmTotal) * 100) : 0;
          const isActive = rm.id === activeRoadmap?.id;

          return (
            <button
              key={rm.id}
              type="button"
              onClick={() => setSelectedRoadmapId(rm.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--sf-accent-primary, #0d9488)' : '2px solid transparent',
                background: isActive ? 'var(--sf-bg-surface, #ffffff)' : 'transparent',
                color: isActive ? 'var(--sf-accent-primary, #0d9488)' : 'var(--sf-text-muted, #64748b)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span>🧭</span>
              <span>{rm.title}</span>
              <span style={{ fontSize: '0.75rem', background: 'var(--sf-bg-subtle, #f1f5f9)', padding: '2px 6px', borderRadius: '4px', color: 'var(--sf-text-primary, #0f172a)' }}>
                {rmPercent}% Mastery
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Track Overview Card */}
      {activeRoadmap && (
        <div style={{ background: 'var(--sf-bg-surface, #ffffff)', border: '1px solid var(--sf-border-subtle, #e2e8f0)', borderRadius: '12px', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', background: 'var(--sf-bg-subtle, #f1f5f9)', color: 'var(--sf-accent-primary, #0d9488)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                  {activeRoadmap.category}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted, #64748b)' }}>
                  ⏱️ {activeRoadmap.estimatedWeeks} Weeks • {activeRoadmap.difficulty}
                </span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--sf-text-primary, #0f172a)' }}>
                {activeRoadmap.title}
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--sf-text-muted, #64748b)', margin: 0, maxWidth: '720px', lineHeight: 1.5 }}>
                {activeRoadmap.description}
              </p>
            </div>

            {/* Percentage & Progress Bar */}
            <div style={{ minWidth: '200px', textAlign: 'right' }}>
              <div
                style={{ fontSize: '1.5rem', fontWeight: 700, color: masteryPercent === 100 ? '#10b981' : 'var(--sf-accent-primary, #0d9488)' }}
              >
                {masteryPercent}% Mastery
              </div>
              <div style={{ background: 'var(--sf-bg-subtle, #f1f5f9)', borderRadius: '9999px', height: '8px', overflow: 'hidden', marginTop: '0.5rem', width: '200px' }}>
                <div
                  style={{
                    background: 'linear-gradient(90deg, #0d9488, #10b981)',
                    width: `${masteryPercent}%`,
                    height: '100%',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted, #64748b)', marginTop: '0.35rem' }}>
                {completedList.length} of {totalMilestones} Milestones Achieved
              </div>
            </div>
          </div>

          {/* Interactive Phases & Milestones */}
          <div style={{ borderTop: '1px solid var(--sf-border-subtle, #e2e8f0)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {activeRoadmap.phases.map((phase) => (
              <div
                key={phase.id}
                style={{
                  background: 'var(--sf-bg-subtle, #f8fafc)',
                  border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '1.15rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--sf-text-primary, #0f172a)' }}>
                    {phase.title}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted, #64748b)' }}>{phase.estimatedHours}h estimated</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--sf-text-muted, #64748b)', margin: '0 0 1rem' }}>
                  {phase.objective}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {phase.milestones.map((m) => {
                    const isCompleted = completedList.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'var(--sf-bg-surface, #ffffff)',
                          border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--sf-border-subtle, #e2e8f0)',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={(e) => handleCheckboxToggle(activeRoadmap.id, m.id, e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                          />
                          <div>
                            <div
                              style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: isCompleted ? '#059669' : 'var(--sf-text-primary, #0f172a)',
                                textDecoration: isCompleted ? 'line-through' : 'none',
                              }}
                            >
                              {m.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted, #64748b)', marginTop: '2px' }}>
                              {m.learningObjectives.join(' • ')}
                            </div>
                          </div>
                        </label>

                        {m.resources[0]?.canonicalUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              const match = m.resources[0].canonicalUrl.match(/v=([a-zA-Z0-9_-]{11})/);
                              if (match && match[1]) {
                                onSelectVideo(match[1]);
                              }
                            }}
                            style={{
                              background: 'var(--sf-bg-subtle, #f1f5f9)',
                              color: 'var(--sf-text-primary, #0f172a)',
                              border: '1px solid var(--sf-border-subtle, #e2e8f0)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Study Video ▶
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cloud Roadmaps & AI Trajectory Card */}
      <div style={{ background: 'var(--sf-bg-subtle, #f8fafc)', border: '1px dashed var(--sf-border-default, #cbd5e1)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center', color: 'var(--sf-text-muted, #64748b)' }}>
        <div style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>☁️</div>
        <div style={{ fontWeight: 600, color: 'var(--sf-text-primary, #0f172a)', fontSize: '0.9rem' }}>
          Cloud Roadmaps &amp; AI Personalized Curricula
        </div>
        <p style={{ fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
          Multi-device roadmap synchronization and generative AI pathfinding are available when linked to an authenticated cloud account in Settings.
        </p>
      </div>
    </div>
  );
};
