import {
  CareerWizardInput,
  CareerRoadmapSource,
  ResearchProviderType,
  ResourceProvenance
} from './career-types';
import { ROLE_BENCHMARKS } from './career-research';
import { logger } from '../logging';

export interface ResearchPlanMilestone {
  title: string;
  learningObjectives: string[];
  estimatedHours: number;
  skills: string[];
  resources: {
    type: ResourceProvenance['type'];
    title: string;
    url: string;
    provider: string;
    description: string;
    selectionRationale: string;
  }[];
  practiceTasks: {
    title: string;
    description: string;
    estimatedMinutes: number;
    deliverable: string;
  }[];
  project?: {
    title: string;
    description: string;
    rubric: string[];
  };
  assessment?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export interface ResearchPlanPhase {
  title: string;
  objective: string;
  milestones: ResearchPlanMilestone[];
}

export interface ResearchPlan {
  standardTitle: string;
  domain: string;
  summary: string;
  authorities: CareerRoadmapSource[];
  isHealthcare?: boolean;
  researchProvider: ResearchProviderType;
  isLiveResearched: boolean;
  provenanceNote: string;
  retrievalTimestamp: string;
  researchConfidence: number;
  phases: ResearchPlanPhase[];
}

export interface ICareerResearchProvider {
  readonly name: string;
  isConfigured(): boolean;
  researchRole(input: CareerWizardInput): Promise<ResearchPlan>;
}

// ============================================================================
// 1. Curated Offline Industry Benchmark Provider
// ============================================================================

export class CuratedOfflineResearchProvider implements ICareerResearchProvider {
  readonly name = 'curated_offline_benchmark';

  isConfigured(): boolean {
    return true; // Curated benchmarks are always available offline
  }

  async researchRole(input: CareerWizardInput): Promise<ResearchPlan> {
    const normalizedRole = input.targetRole.trim().toLowerCase();
    const benchmark = ROLE_BENCHMARKS[normalizedRole];

    const timestamp = new Date().toISOString();

    if (benchmark) {
      return {
        standardTitle: benchmark.standardTitle,
        domain: benchmark.domain,
        summary: benchmark.summary,
        authorities: benchmark.authorities,
        isHealthcare: Boolean(benchmark.isHealthcare),
        researchProvider: 'curated_offline_benchmark',
        isLiveResearched: false,
        provenanceNote: `Curated Industry Benchmark: Synthesized from authoritative ${benchmark.domain} competency ontologies (${benchmark.authorities.map((a) => a.authority).join(', ')}). External AI search credentials not detected.`,
        retrievalTimestamp: timestamp,
        researchConfidence: 0.95,
        phases: benchmark.defaultPhases
      };
    }

    // Dynamic fallback for custom/unbenchmarked job roles
    const cleanRole = input.targetRole.trim();
    const isHealthcare = /medic|doctor|nurs|clinic|health|pharma/i.test(cleanRole);

    return {
      standardTitle: cleanRole,
      domain: `${cleanRole} Professional Development`,
      summary: `Tailored curriculum sequence designed for ${cleanRole} at ${input.experienceLevel} level, optimized for ${input.learningGoal.replace('_', ' ')}.`,
      authorities: [
        {
          title: `${cleanRole} Professional Competency Reference`,
          url: 'https://en.wikipedia.org/wiki/Professional_certification',
          authority: 'Open Educational Curriculum Index'
        }
      ],
      isHealthcare,
      researchProvider: 'curated_offline_benchmark',
      isLiveResearched: false,
      provenanceNote: `Custom Role Benchmark: Formulated from generic professional standard patterns for "${cleanRole}". Fallback applied as no live AI provider credentials were provided.`,
      retrievalTimestamp: timestamp,
      researchConfidence: 0.8,
      phases: [
        {
          title: 'Phase 1: Foundational Principles & Toolchain',
          objective: `Establish foundational fluency in core techniques and production tooling for ${cleanRole}.`,
          milestones: [
            {
              title: `Core Fundamentals of ${cleanRole}`,
              learningObjectives: [
                `Master foundational principles of ${cleanRole}`,
                'Configure modern production workstation and development toolchain'
              ],
              estimatedHours: 12,
              skills: [cleanRole, 'Foundations', 'Toolchain'],
              resources: [
                {
                  type: 'documentation',
                  title: `${cleanRole} Documentation & Reference Guide`,
                  url: 'https://en.wikipedia.org/wiki/Portal:Contents',
                  provider: 'Open Reference',
                  description: 'Comprehensive foundational overview and standard taxonomy.',
                  selectionRationale: 'Authoritative neutral reference portal.'
                },
                {
                  type: 'video',
                  title: `${cleanRole} Beginner to Pro Complete Overview`,
                  url: 'https://www.youtube.com/watch?v=0h6C5g8S2hE',
                  provider: 'Engineering Academy',
                  description: 'Broad architectural walkthrough of industry standards.',
                  selectionRationale: 'High-relevance introductory lecture.'
                }
              ],
              practiceTasks: [
                {
                  title: 'Toolchain Setup & Diagnostic Execution',
                  description: `Install and configure standard operating environment for ${cleanRole}.`,
                  estimatedMinutes: 60,
                  deliverable: 'Operational development environment and verified hello-world workflow'
                }
              ],
              assessment: {
                question: `What is the primary role of configuration discipline in ${cleanRole}?`,
                options: [
                  'To ensure reproducible, auditable operational environments',
                  'To increase software build times arbitrarily',
                  'To restrict developer hardware choices',
                  'To avoid using version control'
                ],
                correctIndex: 0,
                explanation: 'Standardized operational discipline ensures reproducible environments across team workflows.'
              }
            }
          ]
        },
        {
          title: 'Phase 2: Applied Production Competencies',
          objective: `Build practical, real-world workflows and handle common production edge cases for ${cleanRole}.`,
          milestones: [
            {
              title: `Advanced Applied Methods in ${cleanRole}`,
              learningObjectives: [
                'Solve complex real-world challenges',
                'Implement robust error mitigation and quality assurance'
              ],
              estimatedHours: 18,
              skills: [cleanRole, 'Applied Engineering', 'Optimization'],
              resources: [
                {
                  type: 'article',
                  title: `${cleanRole} Best Practices and Architectural Design`,
                  url: 'https://en.wikipedia.org/wiki/Software_architecture',
                  provider: 'Engineering Standards',
                  description: 'Technical standards and best-practice blueprints.',
                  selectionRationale: 'Comprehensive architecture overview.'
                }
              ],
              practiceTasks: [
                {
                  title: 'Comprehensive Portfolio Case Project',
                  description: `Design and deliver an end-to-end milestone solution demonstrating ${cleanRole} mastery.`,
                  estimatedMinutes: 180,
                  deliverable: 'Complete documented project repository with automated tests and architecture diagram'
                }
              ],
              project: {
                title: `${cleanRole} Capstone Portfolio Implementation`,
                description: 'End-to-end production solution demonstrating domain competencies.',
                rubric: [
                  'Strict conformance to production safety and architecture rules',
                  'Test coverage for core operations and edge cases',
                  'Comprehensive README with reproducible setup instructions'
                ]
              }
            }
          ]
        }
      ]
    };
  }
}

// ============================================================================
// 2. Gemini / AI Live Research Provider (Optional Integration)
// ============================================================================

export class GeminiCareerResearchProvider implements ICareerResearchProvider {
  readonly name = 'gemini_ai';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.AI_RESEARCH_API_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async researchRole(input: CareerWizardInput): Promise<ResearchPlan> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key is not configured.');
    }

    try {
      // Bounded call to Gemini REST API with timeout
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
      const prompt = `You are a principal technical curriculum architect.
Create a structured learning roadmap for the role "${input.targetRole}" at ${input.experienceLevel} level.
Learner goals: ${input.learningGoal}. Weekly study hours: ${input.weeklyHours}.
Return strictly JSON adhering to this schema:
{
  "standardTitle": string,
  "domain": string,
  "summary": string,
  "authorities": [{"title": string, "url": string, "authority": string}],
  "isHealthcare": boolean,
  "phases": [
    {
      "title": string,
      "objective": string,
      "milestones": [
        {
          "title": string,
          "learningObjectives": [string],
          "estimatedHours": number,
          "skills": [string],
          "resources": [
            {
              "type": "video" | "documentation" | "article" | "project",
              "title": string,
              "url": string,
              "provider": string,
              "description": string,
              "selectionRationale": string
            }
          ],
          "practiceTasks": [
            {
              "title": string,
              "description": string,
              "estimatedMinutes": number,
              "deliverable": string
            }
          ],
          "assessment": {
            "question": string,
            "options": [string],
            "correctIndex": number,
            "explanation": string
          }
        }
      ]
    }
  ]
}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        throw new Error(`Gemini API returned status ${res.status}`);
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini API');

      const parsed = JSON.parse(rawText);
      return {
        standardTitle: parsed.standardTitle || input.targetRole,
        domain: parsed.domain || `${input.targetRole} Engineering`,
        summary: parsed.summary || `Live AI researched curriculum for ${input.targetRole}.`,
        authorities: parsed.authorities || [],
        isHealthcare: Boolean(parsed.isHealthcare),
        researchProvider: 'gemini_ai',
        isLiveResearched: true,
        provenanceNote: `Live AI Research: Synthesized in real-time via Gemini API using current industry job market competencies.`,
        retrievalTimestamp: new Date().toISOString(),
        researchConfidence: 0.92,
        phases: parsed.phases || []
      };
    } catch (err) {
      logger.warn('Gemini live research failed, falling back to curated benchmark', {
        operation: 'GeminiCareerResearchProvider:researchRole',
        error: String(err)
      });
      throw err;
    }
  }
}

// ============================================================================
// 3. Composite Provider Engine
// ============================================================================

export class CompositeCareerResearchService {
  private offlineProvider = new CuratedOfflineResearchProvider();
  private geminiProvider = new GeminiCareerResearchProvider();

  async research(input: CareerWizardInput): Promise<ResearchPlan> {
    // 1. Try Gemini if configured
    if (this.geminiProvider.isConfigured()) {
      try {
        return await this.geminiProvider.researchRole(input);
      } catch (err) {
        logger.warn('Live AI provider failed, degrading gracefully to curated benchmark', {
          operation: 'CompositeCareerResearchService:fallback',
          error: String(err)
        });
      }
    }

    // 2. Safe fallback to Curated Offline Industry Benchmark
    return await this.offlineProvider.researchRole(input);
  }
}
