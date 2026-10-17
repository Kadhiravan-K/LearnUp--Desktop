'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ActionableError.module.css';

export interface ActionableErrorProps {
  error: string | Error | null;
  errorCode?: string;
  onRetry?: () => void;
  onAutoFillUrl?: (sampleUrl: string) => void;
  className?: string;
}

interface DiagnosticGuide {
  category: string;
  icon: string;
  title: string;
  summary: string;
  primaryActionLabel: string;
  primaryAction: (router: ReturnType<typeof useRouter>, onRetry?: () => void, onAutoFillUrl?: (url: string) => void) => void;
  secondaryActionLabel?: string;
  secondaryAction?: (router: ReturnType<typeof useRouter>, onRetry?: () => void, onAutoFillUrl?: (url: string) => void) => void;
  blog: {
    overview: string;
    whyItHappens: string;
    steps: Array<{
      stepNumber: number;
      title: string;
      description: string;
      actionSnippet?: string;
      buttonText?: string;
      onClick?: (router: ReturnType<typeof useRouter>, onRetry?: () => void, onAutoFillUrl?: (url: string) => void) => void;
    }>;
    proTip?: string;
  };
}

/**
 * Diagnostic mapping matching system errors to 1-click solutions and walkthrough blogs.
 */
function resolveDiagnosticGuide(rawError: string, errorCode?: string): DiagnosticGuide {
  const err = (rawError || '').toLowerCase();
  const code = (errorCode || '').toUpperCase();

  // 1. Authentication & Bearer Token Errors
  if (
    code === 'UNAUTHORIZED' ||
    err.includes('bearer token') ||
    err.includes('authentication required') ||
    err.includes('session token') ||
    err.includes('unauthorized') ||
    err.includes('jwt')
  ) {
    return {
      category: 'Authentication & Session',
      icon: '🔐',
      title: 'Authentication Required (Missing Bearer Token)',
      summary:
        'LearnUp protects your learning vault with secure sessions. Your browser session was not detected or needs to be refreshed.',
      primaryActionLabel: '🔑 Sign In / Open Account',
      primaryAction: (router) => {
        router.push('/login');
      },
      secondaryActionLabel: '🚀 Quick Guest Mode',
      secondaryAction: (router) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('LearnUp_guest_mode', 'true');
          window.location.href = '/dashboard';
        }
      },
      blog: {
        overview:
          'LearnUp enforces strict ownership boundaries. Every learning ingestion and playlist parsing operation checks for an authenticated user session to associate courses with your private curriculum vault.',
        whyItHappens:
          'This typically occurs when accessing the application in a fresh browser session, following a cookie expiration, or when calling backend endpoints without an active session header.',
        steps: [
          {
            stepNumber: 1,
            title: 'Sign In to Your Workspace Profile',
            description:
              'Navigate to the authentication portal and sign in with your email or credentials to obtain an active session token.',
            buttonText: 'Go to Sign In Portal',
            onClick: (router) => router.push('/login')
          },
          {
            stepNumber: 2,
            title: 'Or Activate Local-First Guest Mode',
            description:
              'If you are exploring LearnUp locally without a cloud backend, you can enable Instant Guest Mode with 1 click.',
            buttonText: 'Activate Guest Mode',
            onClick: () => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('LearnUp_guest_mode', 'true');
                window.location.href = '/dashboard';
              }
            }
          },
          {
            stepNumber: 3,
            title: 'Retry Your Ingestion',
            description: 'Once authenticated, return here and paste your YouTube course link to proceed.',
            buttonText: 'Retry Now',
            onClick: (_, onRetry) => onRetry?.()
          }
        ],
        proTip: 'LearnUp retains all your imported courses offline in local storage when guest mode is active.'
      }
    };
  }

  // 2. Invalid or Unsupported URL
  if (
    code === 'VALIDATION_ERROR' ||
    err.includes('invalid url') ||
    err.includes('unsupported domain') ||
    err.includes('format') ||
    err.includes('youtube url')
  ) {
    const SAMPLE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    return {
      category: 'URL Validation',
      icon: '🔗',
      title: 'Unsupported or Malformed YouTube Link',
      summary:
        'The submitted link could not be parsed as a supported YouTube video or playlist format.',
      primaryActionLabel: '📋 Auto-Fill Working Sample Link',
      primaryAction: (_, __, onAutoFillUrl) => {
        if (onAutoFillUrl) {
          onAutoFillUrl(SAMPLE_URL);
        } else if (typeof navigator !== 'undefined') {
          navigator.clipboard?.writeText(SAMPLE_URL);
        }
      },
      blog: {
        overview:
          'LearnUp accepts direct YouTube Video URLs, Playlist URLs, and Shorts links. Channel homepages (@handle) or invalid web domains cannot be converted into curriculum lessons.',
        whyItHappens:
          'The link might contain extra tracking parameters, be missing the standard "v=" identifier, or belong to an unsupported video host.',
        steps: [
          {
            stepNumber: 1,
            title: 'Verify URL Structure',
            description:
              'Ensure your URL matches one of these supported formats:',
            actionSnippet:
              '• Standard: https://www.youtube.com/watch?v=VIDEO_ID\n• Short: https://youtu.be/VIDEO_ID\n• Playlist: https://www.youtube.com/playlist?list=PLAYLIST_ID\n• Shorts: https://www.youtube.com/shorts/VIDEO_ID'
          },
          {
            stepNumber: 2,
            title: 'Use Tested Sample Curriculum',
            description: 'Click below to instantly populate the URL field with a verified test lesson.',
            buttonText: 'Apply Sample Link',
            onClick: (_, __, onAutoFillUrl) => onAutoFillUrl?.(SAMPLE_URL)
          }
        ],
        proTip: 'You can also paste YouTube playlist links to automatically import complete multi-video curricula!'
      }
    };
  }

  // 3. YouTube API Key or Quota Limit
  if (
    code === 'YOUTUBE_ERROR' ||
    err.includes('quota') ||
    err.includes('api key') ||
    err.includes('restricted') ||
    err.includes('private')
  ) {
    return {
      category: 'YouTube Provider & Quota',
      icon: '⚙️',
      title: 'YouTube API Quota or Access Notice',
      summary:
        'YouTube rate limits or privacy restrictions prevented fetching this resource directly.',
      primaryActionLabel: '⚙️ Open API Key & AI Settings',
      primaryAction: (router) => {
        router.push('/settings');
      },
      blog: {
        overview:
          'LearnUp features zero-auth public fallback, but videos marked Private by their creator or heavy batch playlist imports require personal API keys.',
        whyItHappens:
          'The target video might be set to Private, or the shared Google Cloud API quota threshold was temporarily reached.',
        steps: [
          {
            stepNumber: 1,
            title: 'Check Video Privacy Status on YouTube',
            description: 'Ensure the YouTube video is set to "Public" or "Unlisted" rather than "Private".'
          },
          {
            stepNumber: 2,
            title: 'Configure Your Personal YouTube API Key',
            description:
              'Add your free YouTube Data v3 API Key in Settings to bypass all public quota limits.',
            buttonText: 'Open Settings Page',
            onClick: (router) => router.push('/settings')
          }
        ],
        proTip: 'YouTube Data API keys are free and provide 10,000 daily quota units directly from Google Cloud Console.'
      }
    };
  }

  // 4. Network or Offline Connectivity
  if (
    code === 'NETWORK_ERROR' ||
    err.includes('network') ||
    err.includes('failed to fetch') ||
    err.includes('connection') ||
    err.includes('offline')
  ) {
    return {
      category: 'Network & Connectivity',
      icon: '📡',
      title: 'Network Communication Error',
      summary: 'Could not communicate with the LearnUp server or YouTube services.',
      primaryActionLabel: '🔄 Retry Connection',
      primaryAction: (_, onRetry) => onRetry?.(),
      blog: {
        overview:
          'Your client encountered a network transport timeout or certificate negotiation failure when querying the backend.',
        whyItHappens:
          'This may occur due to temporary offline connectivity, local VPN/firewall filtering, or TLS certificate handshakes.',
        steps: [
          {
            stepNumber: 1,
            title: 'Check Local Internet Connection',
            description: 'Verify your Wi-Fi or cellular network connection is active.'
          },
          {
            stepNumber: 2,
            title: 'Retry Operation',
            description: 'Click the Retry button to re-establish the connection.',
            buttonText: 'Retry Now',
            onClick: (_, onRetry) => onRetry?.()
          }
        ]
      }
    };
  }

  // 5. Database Service Offline / Unreachable
  if (
    code === 'DATABASE_ERROR' ||
    err.includes('database') ||
    err.includes('failed to query library') ||
    err.includes('failed to save')
  ) {
    return {
      category: 'Database Service Diagnostic',
      icon: '🗄️',
      title: 'Database Service Offline',
      summary: 'LearnUp could not connect to the database to save your learning item.',
      primaryActionLabel: '🚀 Use Instant Guest Mode',
      primaryAction: () => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('LearnUp_guest_mode', 'true');
          localStorage.setItem('LearnUp_is_guest', 'true');
          document.cookie = 'LearnUp_guest_mode=true; path=/; max-age=86400; SameSite=Lax';
          window.location.reload();
        }
      },
      secondaryActionLabel: '🔄 Try Again',
      secondaryAction: (_, onRetry) => onRetry?.(),
      blog: {
        overview:
          'When running LearnUp locally, persistent storage requires Docker Desktop and the local Supabase container.',
        whyItHappens:
          'The local Supabase database is not currently running. You can either use Instant Guest Mode to test immediately without Docker, or launch Docker Desktop and start Supabase.',
        steps: [
          {
            stepNumber: 1,
            title: 'Use Instant Guest Mode (No Setup Required)',
            description:
              'Enable Guest Mode to import videos, track playback, and take notes locally without running a database.',
            buttonText: 'Switch to Guest Mode',
            onClick: () => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('LearnUp_guest_mode', 'true');
                localStorage.setItem('LearnUp_is_guest', 'true');
                document.cookie = 'LearnUp_guest_mode=true; path=/; max-age=86400; SameSite=Lax';
                window.location.reload();
              }
            }
          },
          {
            stepNumber: 2,
            title: 'Or Start Docker Desktop & Supabase',
            description:
              'If you want full multi-device persistent accounts, launch Docker Desktop on your machine and run `npx supabase start`.'
          }
        ]
      }
    };
  }

  // 6. Default Generic Error
  return {
    category: 'System Diagnostic',
    icon: '⚠️',
    title: 'Action Could Not Complete',
    summary: rawError || 'An unexpected operation error was encountered.',
    primaryActionLabel: '🔄 Try Again',
    primaryAction: (_, onRetry) => onRetry?.(),
    secondaryActionLabel: '⚙️ Go to Dashboard',
    secondaryAction: (router) => router.push('/dashboard'),
    blog: {
      overview:
        'The requested operation encountered an unhandled condition during execution.',
      whyItHappens: rawError,
      steps: [
        {
          stepNumber: 1,
          title: 'Review System Logs & Retry',
          description: 'Try repeating the action or refresh your workspace.',
          buttonText: 'Retry Action',
          onClick: (_, onRetry) => onRetry?.()
        },
        {
          stepNumber: 2,
          title: 'Navigate to Dashboard',
          description: 'Return to your main learning dashboard to inspect existing items.',
          buttonText: 'Open Dashboard',
          onClick: (router) => router.push('/dashboard')
        }
      ]
    }
  };
}

export function ActionableError({
  error,
  errorCode,
  onRetry,
  onAutoFillUrl,
  className = ''
}: ActionableErrorProps) {
  const router = useRouter();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  if (!error) return null;

  const rawMessage = typeof error === 'string' ? error : error.message;
  const guide = resolveDiagnosticGuide(rawMessage, errorCode);

  const handleCopySnippet = (snippet: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(snippet);
      setCopyStatus('Copied to clipboard!');
      setTimeout(() => setCopyStatus(null), 2000);
    }
  };

  return (
    <div className={`${styles.errorCard} ${className}`} role="alert">
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <span className={styles.categoryBadge}>{guide.category}</span>
          <h4 className={styles.errorTitle}>
            <span className={styles.icon}>{guide.icon}</span> {guide.title}
          </h4>
        </div>
      </div>

      <p className={styles.errorMessage}>{rawMessage || guide.summary}</p>

      {/* Actionable Solution Buttons */}
      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.primaryActionButton}
          onClick={() => guide.primaryAction(router, onRetry, onAutoFillUrl)}
        >
          {guide.primaryActionLabel}
        </button>

        {guide.secondaryActionLabel && (
          <button
            type="button"
            className={styles.secondaryActionButton}
            onClick={() => guide.secondaryAction?.(router, onRetry, onAutoFillUrl)}
          >
            {guide.secondaryActionLabel}
          </button>
        )}

        <button
          type="button"
          className={styles.howToFixButton}
          onClick={() => setShowGuideModal(true)}
        >
          📘 Step-by-Step Fix Guide
        </button>
      </div>

      {/* Interactive Step-by-Step Diagnostic Blog Modal */}
      {showGuideModal && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowGuideModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="diagnostic-title"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleWrap}>
                <span className={styles.modalIcon}>{guide.icon}</span>
                <div>
                  <span className={styles.modalCategory}>DIAGNOSTIC & REPAIR GUIDE</span>
                  <h3 id="diagnostic-title" className={styles.modalHeading}>
                    {guide.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowGuideModal(false)}
                aria-label="Close Guide"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Blog Overview Section */}
              <div className={styles.sectionCard}>
                <h5 className={styles.sectionTitle}>🔍 What Happened?</h5>
                <p className={styles.sectionText}>{guide.blog.overview}</p>
                <div className={styles.whyBox}>
                  <strong>Root Cause:</strong> {guide.blog.whyItHappens}
                </div>
              </div>

              {/* Step-by-Step Resolution Steps */}
              <div className={styles.stepsContainer}>
                <h5 className={styles.sectionTitle}>🛠️ How to Fix (Step-by-Step)</h5>
                {guide.blog.steps.map((step) => (
                  <div key={step.stepNumber} className={styles.stepCard}>
                    <div className={styles.stepHeader}>
                      <span className={styles.stepNumberBadge}>Step {step.stepNumber}</span>
                      <h6 className={styles.stepHeading}>{step.title}</h6>
                    </div>
                    <p className={styles.stepDescription}>{step.description}</p>

                    {step.actionSnippet && (
                      <div className={styles.snippetWrap}>
                        <pre className={styles.snippetCode}>{step.actionSnippet}</pre>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => handleCopySnippet(step.actionSnippet!)}
                        >
                          {copyStatus || 'Copy Formats'}
                        </button>
                      </div>
                    )}

                    {step.buttonText && step.onClick && (
                      <button
                        type="button"
                        className={styles.stepActionBtn}
                        onClick={() => {
                          step.onClick?.(router, onRetry, onAutoFillUrl);
                          setShowGuideModal(false);
                        }}
                      >
                        {step.buttonText} &rarr;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Pro Tip */}
              {guide.blog.proTip && (
                <div className={styles.proTipBox}>
                  <span className={styles.proTipIcon}>💡</span>
                  <div>
                    <strong>Pro-Tip:</strong> {guide.blog.proTip}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.footerDismissBtn}
                onClick={() => setShowGuideModal(false)}
              >
                Close Diagnostic
              </button>
              <button
                type="button"
                className={styles.footerPrimaryBtn}
                onClick={() => {
                  guide.primaryAction(router, onRetry, onAutoFillUrl);
                  setShowGuideModal(false);
                }}
              >
                {guide.primaryActionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
