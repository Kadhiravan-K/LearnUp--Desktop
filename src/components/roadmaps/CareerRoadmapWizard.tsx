'use client';

import React, { useState } from 'react';
import {
  CareerWizardInput,
  ExperienceLevel,
  LearningGoal,
  LearningFormat
} from '@/lib/roadmaps/career-types';
import styles from './CareerRoadmapWizard.module.css';

export interface CareerRoadmapWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (input: CareerWizardInput) => Promise<void>;
  isGenerating?: boolean;
  initialRole?: string;
}

export const CURATED_ROLES = [
  'Embedded Systems Engineer',
  'Full-Stack Software Engineer',
  'AI/ML Engineer',
  'Data Scientist',
  'UI/UX Designer',
  'Design Engineer',
  'HR Manager',
  'SEO Specialist',
  'Product Manager',
  'CEO / Founder',
  'Healthcare Education'
];

export function CareerRoadmapWizard({
  isOpen,
  onClose,
  onGenerate,
  isGenerating = false,
  initialRole = ''
}: CareerRoadmapWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [targetRole, setTargetRole] = useState<string>(initialRole || 'Full-Stack Software Engineer');
  const [customRole, setCustomRole] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [existingSkills, setExistingSkills] = useState<string[]>(['Git', 'JavaScript', 'HTTP/REST']);
  const [newExistingSkill, setNewExistingSkill] = useState<string>('');
  const [strengthenSkills, setStrengthenSkills] = useState<string[]>(['System Architecture', 'Performance']);
  const [newStrengthenSkill, setNewStrengthenSkill] = useState<string>('');
  const [skipSkills, setSkipSkills] = useState<string[]>([]);
  const [newSkipSkill, setNewSkipSkill] = useState<string>('');
  const [weeklyHours, setWeeklyHours] = useState<number>(10);
  const [preferredTimelineWeeks, setPreferredTimelineWeeks] = useState<number>(12);
  const [learningGoal, setLearningGoal] = useState<LearningGoal>('job_readiness');
  const [preferredLanguage, setPreferredLanguage] = useState<string>('English');
  const [preferredFormats, setPreferredFormats] = useState<LearningFormat[]>([
    'videos',
    'official_docs',
    'projects'
  ]);
  const [targetMarket, setTargetMarket] = useState<string>('Global / Remote');
  const [jobDescriptionText, setJobDescriptionText] = useState<string>('');
  const [isRichUiEnabled, setIsRichUiEnabled] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleAddTag = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    clearFn: () => void
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      clearFn();
    }
  };

  const handleRemoveTag = (
    tagToRemove: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList(list.filter((tag) => tag !== tagToRemove));
  };

  const toggleFormat = (fmt: LearningFormat) => {
    if (preferredFormats.includes(fmt)) {
      if (preferredFormats.length > 1) {
        setPreferredFormats(preferredFormats.filter((f) => f !== fmt));
      }
    } else {
      setPreferredFormats([...preferredFormats, fmt]);
    }
  };

  const handleSelectCuratedRole = (role: string) => {
    setTargetRole(role);
    setCustomRole('');
  };

  const effectiveRole = customRole.trim() || targetRole;

  const handleSubmit = async () => {
    const payload: CareerWizardInput = {
      targetRole: effectiveRole,
      experienceLevel,
      existingSkills,
      strengthenSkills,
      skipSkills,
      weeklyHours,
      preferredTimelineWeeks,
      learningGoal,
      preferredLanguage,
      preferredFormats,
      targetMarket: targetMarket.trim() || undefined,
      jobDescriptionText: jobDescriptionText.trim() || undefined,
      isRichUiEnabled
    };

    await onGenerate(payload);
  };

  const isHealthcareRole = effectiveRole.toLowerCase().includes('health') || effectiveRole.toLowerCase().includes('medical');

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>🎯</div>
            <div>
              <h2 className={styles.headerTitle}>AI Career Roadmap Builder</h2>
              <p className={styles.headerSubtitle}>
                Research-grounded learning trajectories backed by verified educational curricula
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className={styles.stepBar}>
          <div className={`${styles.stepItem} ${currentStep === 1 ? styles.stepActive : currentStep > 1 ? styles.stepCompleted : ''}`}>
            <span className={styles.stepNumber}>1</span>
            <span>Target Role</span>
          </div>
          <div className={styles.stepSeparator} />
          <div className={`${styles.stepItem} ${currentStep === 2 ? styles.stepActive : currentStep > 2 ? styles.stepCompleted : ''}`}>
            <span className={styles.stepNumber}>2</span>
            <span>Skill Audit</span>
          </div>
          <div className={styles.stepSeparator} />
          <div className={`${styles.stepItem} ${currentStep === 3 ? styles.stepActive : currentStep > 3 ? styles.stepCompleted : ''}`}>
            <span className={styles.stepNumber}>3</span>
            <span>Pacing &amp; Style</span>
          </div>
          <div className={styles.stepSeparator} />
          <div className={`${styles.stepItem} ${currentStep === 4 ? styles.stepActive : ''}`}>
            <span className={styles.stepNumber}>4</span>
            <span>Research &amp; Review</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {/* STEP 1: Target Role & Experience */}
          {currentStep === 1 && (
            <div className={styles.section}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Select or specify your target profession / job role</label>
                <span className={styles.sublabel}>Choose from curated industry benchmarks or enter any custom technical title.</span>
                <div className={styles.curatedRolesGrid}>
                  {CURATED_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`${styles.roleChip} ${targetRole === role && !customRole ? styles.roleChipSelected : ''}`}
                      onClick={() => handleSelectCuratedRole(role)}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Or enter a custom role</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Distributed Consensus Architect, Rust Kernel Engineer..."
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Current Experience Level</label>
                <div className={styles.cardOptionsGrid}>
                  <div
                    className={`${styles.optionCard} ${experienceLevel === 'beginner' ? styles.optionCardSelected : ''}`}
                    onClick={() => setExperienceLevel('beginner')}
                  >
                    <span className={styles.optionCardTitle}>🌱 Beginner</span>
                    <span className={styles.optionCardDesc}>Transitioning or building foundational domain understanding from scratch.</span>
                  </div>
                  <div
                    className={`${styles.optionCard} ${experienceLevel === 'intermediate' ? styles.optionCardSelected : ''}`}
                    onClick={() => setExperienceLevel('intermediate')}
                  >
                    <span className={styles.optionCardTitle}>⚡ Intermediate</span>
                    <span className={styles.optionCardDesc}>1–3 years experience; seeking to deepen production competencies and master systems.</span>
                  </div>
                  <div
                    className={`${styles.optionCard} ${experienceLevel === 'advanced' ? styles.optionCardSelected : ''}`}
                    onClick={() => setExperienceLevel('advanced')}
                  >
                    <span className={styles.optionCardTitle}>🚀 Advanced / Lead</span>
                    <span className={styles.optionCardDesc}>Senior or specialized practitioner focusing on high-scale architecture and leadership.</span>
                  </div>
                </div>
              </div>

              {isHealthcareRole && (
                <div className={styles.disclaimerNotice}>
                  ⚠️ <strong>Academic Notice:</strong> Healthcare and clinical roadmaps are generated strictly for academic and continuing educational study. They do not constitute certified medical treatment or clinical diagnostic advice.
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Skill Audit & Gap Analysis */}
          {currentStep === 2 && (
            <div className={styles.section}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Skills you already know (Existing Skills)</label>
                <span className={styles.sublabel}>The research pipeline will treat these as completed prerequisites.</span>
                <div className={styles.addTagRow}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Type skill and press Add (e.g. Docker, Python, SQL)..."
                    value={newExistingSkill}
                    onChange={(e) => setNewExistingSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newExistingSkill, existingSkills, setExistingSkills, () => setNewExistingSkill(''));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => handleAddTag(newExistingSkill, existingSkills, setExistingSkills, () => setNewExistingSkill(''))}
                  >
                    Add
                  </button>
                </div>
                <div className={styles.tagList}>
                  {existingSkills.map((skill) => (
                    <span key={skill} className={styles.tagPill}>
                      {skill}
                      <button
                        type="button"
                        className={styles.tagRemoveBtn}
                        onClick={() => handleRemoveTag(skill, existingSkills, setExistingSkills)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Skills to Strengthen or Focus On</label>
                <span className={styles.sublabel}>We will emphasize dedicated milestones, practice drills, and projects for these.</span>
                <div className={styles.addTagRow}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Distributed Consensus, Raft, WebAssembly..."
                    value={newStrengthenSkill}
                    onChange={(e) => setNewStrengthenSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newStrengthenSkill, strengthenSkills, setStrengthenSkills, () => setNewStrengthenSkill(''));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => handleAddTag(newStrengthenSkill, strengthenSkills, setStrengthenSkills, () => setNewStrengthenSkill(''))}
                  >
                    Add
                  </button>
                </div>
                <div className={styles.tagList}>
                  {strengthenSkills.map((skill) => (
                    <span key={skill} className={styles.tagPill}>
                      {skill}
                      <button
                        type="button"
                        className={styles.tagRemoveBtn}
                        onClick={() => handleRemoveTag(skill, strengthenSkills, setStrengthenSkills)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Skills to Skip</label>
                <span className={styles.sublabel}>Optional: Exclude topics you already mastered or that are irrelevant to your goal.</span>
                <div className={styles.addTagRow}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Legacy jQuery, PHP 5, Cloud Foundry..."
                    value={newSkipSkill}
                    onChange={(e) => setNewSkipSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newSkipSkill, skipSkills, setSkipSkills, () => setNewSkipSkill(''));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => handleAddTag(newSkipSkill, skipSkills, setSkipSkills, () => setNewSkipSkill(''))}
                  >
                    Add
                  </button>
                </div>
                <div className={styles.tagList}>
                  {skipSkills.map((skill) => (
                    <span key={skill} className={styles.tagPill}>
                      {skill}
                      <button
                        type="button"
                        className={styles.tagRemoveBtn}
                        onClick={() => handleRemoveTag(skill, skipSkills, setSkipSkills)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Optional: Paste Target Job Description Snippet</label>
                <span className={styles.sublabel}>Grounds the research in specific employer requirements. Private and processed securely.</span>
                <textarea
                  rows={3}
                  className={styles.textarea}
                  placeholder="Paste requirements section from your dream job posting..."
                  value={jobDescriptionText}
                  onChange={(e) => setJobDescriptionText(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Commitment & Learning Style */}
          {currentStep === 3 && (
            <div className={styles.section}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Primary Learning Goal</label>
                <div className={styles.cardOptionsGrid}>
                  <div
                    className={`${styles.optionCard} ${learningGoal === 'job_readiness' ? styles.optionCardSelected : ''}`}
                    onClick={() => setLearningGoal('job_readiness')}
                  >
                    <span className={styles.optionCardTitle}>💼 Job Readiness</span>
                    <span className={styles.optionCardDesc}>Build production portfolio, master end-to-end tooling, and prepare for hire.</span>
                  </div>
                  <div
                    className={`${styles.optionCard} ${learningGoal === 'interview_preparation' ? styles.optionCardSelected : ''}`}
                    onClick={() => setLearningGoal('interview_preparation')}
                  >
                    <span className={styles.optionCardTitle}>🎯 Interview Prep</span>
                    <span className={styles.optionCardDesc}>Focus on algorithms, system design rubrics, and high-yield technical rounds.</span>
                  </div>
                  <div
                    className={`${styles.optionCard} ${learningGoal === 'upskilling' ? styles.optionCardSelected : ''}`}
                    onClick={() => setLearningGoal('upskilling')}
                  >
                    <span className={styles.optionCardTitle}>📈 Upskilling</span>
                    <span className={styles.optionCardDesc}>Close specific architectural gaps to level up at your current company.</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Weekly Study Availability: {weeklyHours} Hours/week</label>
                  <input
                    type="range"
                    min={2}
                    max={40}
                    step={1}
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-brand, #38bdf8)' }}
                  />
                  <span className={styles.sublabel}>
                    {weeklyHours < 6 ? 'Light / Casual pace' : weeklyHours < 16 ? 'Recommended / Consistent pace' : 'Intensive / Accelerated pace'}
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Preferred Timeline: {preferredTimelineWeeks} Weeks</label>
                  <input
                    type="range"
                    min={4}
                    max={36}
                    step={2}
                    value={preferredTimelineWeeks}
                    onChange={(e) => setPreferredTimelineWeeks(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-brand, #38bdf8)' }}
                  />
                  <span className={styles.sublabel}>
                    Total estimated study: ~{weeklyHours * preferredTimelineWeeks} dedicated hours
                  </span>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Preferred Learning Formats</label>
                <div className={styles.checkboxGrid}>
                  <label className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={preferredFormats.includes('videos')}
                      onChange={() => toggleFormat('videos')}
                    />
                    <span>🎥 YouTube &amp; Video Courses</span>
                  </label>
                  <label className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={preferredFormats.includes('official_docs')}
                      onChange={() => toggleFormat('official_docs')}
                    />
                    <span>📖 Official Documentation</span>
                  </label>
                  <label className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={preferredFormats.includes('projects')}
                      onChange={() => toggleFormat('projects')}
                    />
                    <span>🛠️ Hands-on Projects &amp; Repos</span>
                  </label>
                  <label className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={preferredFormats.includes('articles')}
                      onChange={() => toggleFormat('articles')}
                    />
                    <span>📰 Technical Deep Dives &amp; RFCs</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Target Job Market / Region</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={targetMarket}
                    onChange={(e) => setTargetMarket(e.target.value)}
                    placeholder="e.g. US / Canada, Europe, Global Remote..."
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Language Preference</label>
                  <select
                    className={styles.select}
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="German">German</option>
                    <option value="French">French</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Japanese">Japanese</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Pipeline Launch */}
          {currentStep === 4 && (
            <div className={styles.section}>
              <div className={styles.summaryBox}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Target Profession</span>
                  <span className={styles.summaryValue}>{effectiveRole}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Seniority &amp; Level</span>
                  <span className={styles.summaryValue}>{experienceLevel.toUpperCase()}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Learning Goal</span>
                  <span className={styles.summaryValue}>{learningGoal.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Commitment</span>
                  <span className={styles.summaryValue}>{weeklyHours} hrs/week across {preferredTimelineWeeks} weeks (~{weeklyHours * preferredTimelineWeeks} hrs total)</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Known Skills (Prerequisites)</span>
                  <span className={styles.summaryValue}>{existingSkills.length > 0 ? existingSkills.join(', ') : 'None specified'}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Core Skills to Strengthen</span>
                  <span className={styles.summaryValue}>{strengthenSkills.length > 0 ? strengthenSkills.join(', ') : 'Standard curriculum'}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Verified Resource Formats</span>
                  <span className={styles.summaryValue}>{preferredFormats.join(', ')}</span>
                </div>
              </div>

              {/* Rich UI Option */}
              <div className={styles.formGroup}>
                <label className={styles.checkboxItem} style={{ border: '1px solid var(--accent-brand, #38bdf8)' }}>
                  <input
                    type="checkbox"
                    checked={isRichUiEnabled}
                    onChange={(e) => setIsRichUiEnabled(e.target.checked)}
                  />
                  <span>
                    <strong>✨ Enable Generative Rich UI Output:</strong> Render interactive Mermaid dependency diagrams, interactive knowledge checks, and 3D skill cards.
                  </span>
                </label>
              </div>

              {/* Research Pipeline Info */}
              <div className={styles.pipelineStatus}>
                🔍 <strong>Server-Controlled Research Pipeline Ready:</strong>
                <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                  <li>STEP A: Synthesize competency standards for <strong>{effectiveRole}</strong>.</li>
                  <li>STEP B: Resolve prerequisite graph and isolate skill gaps.</li>
                  <li>STEP C: Discover and validate real educational resources (YouTube Data API + SSRF-safe URL verification).</li>
                  <li>STEP D: Generate editable phases, milestones, practice projects, and quiz assessments.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className={styles.footer}>
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={isGenerating}
              >
                ← Back
              </button>
            )}
          </div>
          <div>
            {currentStep < 4 ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!effectiveRole.trim()}
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleSubmit}
                disabled={isGenerating || !effectiveRole.trim()}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner" />
                    <span>Researching &amp; Validating Resources...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Generate Career Roadmap Preview</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
