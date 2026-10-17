'use client';

import React from 'react';
import styles from './AIAssistantWidget.module.css';

export function AIAssistantWidget() {
  return (
    <section className={styles.widget} aria-label="AI Study Assistant Widget">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <svg className={styles.sparkleIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
          </svg>
          <h3 className={styles.title}>AI Study Assistant</h3>
        </div>
        <span className={styles.modelBadge}>GPT-4o</span>
      </div>

      <div className={styles.inputWrapper}>
        <input
          type="text"
          className={styles.input}
          placeholder="Ask anything about your courses..."
          aria-label="Ask AI Study Assistant"
        />
      </div>

      <div className={styles.chipsRow} role="group" aria-label="Quick AI prompts">
        <button type="button" className={styles.chip}>
          <span>▶</span>
          <span>Summarize</span>
        </button>
        <button type="button" className={styles.chip}>
          <span>📊</span>
          <span>Generate Quiz</span>
        </button>
        <button type="button" className={styles.chip}>
          <span>❓</span>
          <span>Ask a Doubt</span>
        </button>
      </div>

      <div className={styles.synthesisCard}>
        <div className={styles.synthesisHeader}>
          <span className={styles.synthesisTitle}>Recent Synthesis: Raft Log Invariant</span>
          <span className={styles.synthesisTime}>12m ago</span>
        </div>
        <p className={styles.synthesisQuote}>
          &ldquo;If a leader has applied a log entry at index $i$, no other server will ever apply a different entry for that index...&rdquo;
        </p>
        <span className={styles.flashcardsLink}>
          Expand to Flashcards &rarr;
        </span>
      </div>
    </section>
  );
}
