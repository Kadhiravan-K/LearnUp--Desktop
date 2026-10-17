'use client';

import React, { useState } from 'react';
import { RichBlock, DiagramBlock, QuizBlock, FlashcardBlock, TimelineBlock, TableBlock } from '@/lib/ai/rich-output';
import styles from './RichMessageRenderer.module.css';

export interface RichMessageRendererProps {
  blocks: RichBlock[];
  isRichUiEnabled: boolean;
  onCopySource?: (text: string) => void;
}

export function RichMessageRenderer({
  blocks,
  isRichUiEnabled,
  onCopySource
}: RichMessageRendererProps) {
  if (!isRichUiEnabled) {
    // Plain text / standard markdown fallback when Rich UI toggle is OFF
    return (
      <div className={styles.fallbackContainer}>
        {blocks.map((b, idx) => {
          if (b.type === 'text') {
            return <p key={idx} className={styles.fallbackText}>{b.content}</p>;
          }
          if (b.type === 'diagram') {
            return (
              <pre key={idx} className={styles.fallbackCode}>
                <code>{`%% [Mermaid ${b.diagramType}]\n${b.code}`}</code>
              </pre>
            );
          }
          if (b.type === 'table') {
            return (
              <p key={idx} className={styles.fallbackText}>
                [Table: {b.headers.join(' | ')}]
              </p>
            );
          }
          if (b.type === 'quiz') {
            return (
              <p key={idx} className={styles.fallbackText}>
                [Quiz: {b.question}]
              </p>
            );
          }
          if (b.type === 'flashcard') {
            return (
              <p key={idx} className={styles.fallbackText}>
                [Flashcard: {b.front} &rarr; {b.back}]
              </p>
            );
          }
          if (b.type === 'timeline') {
            return (
              <p key={idx} className={styles.fallbackText}>
                [Timeline: {b.title}]
              </p>
            );
          }
          return null;
        })}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'text':
            return <p key={idx} className={styles.textBlock}>{block.content}</p>;
          case 'table':
            return <RichTable key={idx} block={block} />;
          case 'quiz':
            return <RichQuiz key={idx} block={block} />;
          case 'flashcard':
            return <RichFlashcard key={idx} block={block} />;
          case 'timeline':
            return <RichTimeline key={idx} block={block} />;
          case 'diagram':
            return <RichDiagram key={idx} block={block} onCopySource={onCopySource} />;
          case 'tool_call':
            return (
              <div key={idx} className={styles.toolPill}>
                <span className={styles.toolStatusDot} />
                <span className={styles.toolName}>{block.toolName}</span>
                <span className={styles.toolSummary}>&bull; {block.summary}</span>
              </div>
            );
        }
      })}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Subcomponents for Rich Blocks
// ----------------------------------------------------------------------------

function RichTable({ block }: { block: TableBlock }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {block.headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RichQuiz({ block }: { block: QuizBlock }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const isAnswered = selectedIdx !== null;

  return (
    <div className={styles.quizCard}>
      <span className={styles.quizBadge}>Interactive Knowledge Check</span>
      <h4 className={styles.quizQuestion}>{block.question}</h4>
      <div className={styles.quizOptions}>
        {block.options.map((opt, optIdx) => {
          let btnClass = styles.quizOptionBtn;
          if (isAnswered) {
            if (optIdx === block.answerIndex) {
              btnClass = `${styles.quizOptionBtn} ${styles.quizOptionCorrect}`;
            } else if (optIdx === selectedIdx) {
              btnClass = `${styles.quizOptionBtn} ${styles.quizOptionWrong}`;
            }
          }
          return (
            <button
              key={optIdx}
              type="button"
              className={btnClass}
              onClick={() => !isAnswered && setSelectedIdx(optIdx)}
              disabled={isAnswered}
            >
              <span className={styles.optionLetter}>
                {String.fromCharCode(65 + optIdx)}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {isAnswered && (
        <div className={styles.quizExplanation}>
          <strong>{selectedIdx === block.answerIndex ? '✓ Correct!' : '✗ Not quite.'}</strong>{' '}
          {block.explanation}
        </div>
      )}
    </div>
  );
}

function RichFlashcard({ block }: { block: FlashcardBlock }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  return (
    <div className={styles.flashcardContainer}>
      <div className={styles.flashcardTop}>
        <span className={styles.flashcardBadge}>Spaced Recall Card</span>
        {block.hint && (
          <button
            type="button"
            className={styles.hintBtn}
            onClick={() => setShowHint(!showHint)}
          >
            {showHint ? 'Hide Hint' : '💡 Need a hint?'}
          </button>
        )}
      </div>

      {showHint && block.hint && (
        <div className={styles.hintBox}>
          <strong>Hint:</strong> {block.hint}
        </div>
      )}

      <div
        className={`${styles.flashcardBox} ${isFlipped ? styles.flashcardFlipped : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setIsFlipped(!isFlipped);
          }
        }}
      >
        <span className={styles.sideLabel}>{isFlipped ? 'ANSWER / BACK' : 'QUESTION / FRONT'}</span>
        <p className={styles.cardContent}>{isFlipped ? block.back : block.front}</p>
        <span className={styles.flipPrompt}>Click to {isFlipped ? 'view question' : 'reveal answer'}</span>
      </div>
    </div>
  );
}

function RichTimeline({ block }: { block: TimelineBlock }) {
  return (
    <div className={styles.timelineCard}>
      <h4 className={styles.timelineTitle}>📅 {block.title}</h4>
      <div className={styles.timelineList}>
        {block.events.map((ev, i) => (
          <div key={i} className={styles.timelineItem}>
            <div className={styles.timelineMarker} />
            <div className={styles.timelineBody}>
              <span className={styles.timelineTime}>{ev.time}</span>
              <h5 className={styles.timelineEventTitle}>{ev.title}</h5>
              <p className={styles.timelineDesc}>{ev.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RichDiagram({
  block,
  onCopySource
}: {
  block: DiagramBlock;
  onCopySource?: (text: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'preview' | 'source'>('preview');
  const [copied, setCopied] = useState(false);
  const [showA11y, setShowA11y] = useState(false);

  const handleCopy = () => {
    if (onCopySource) {
      onCopySource(block.code);
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(block.code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.diagramContainer}>
      <div className={styles.diagramHeader}>
        <div className={styles.diagramTypePill}>
          <span>📐</span>
          <span>Mermaid {block.diagramType.toUpperCase()}</span>
        </div>
        <div className={styles.diagramActions}>
          <div className={styles.tabsToggle}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'source' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('source')}
            >
              Source
            </button>
          </div>
          <button type="button" className={styles.actionBtn} onClick={handleCopy}>
            {copied ? '✓ Copied' : '📋 Copy Source'}
          </button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        <div className={styles.diagramPreviewArea}>
          {/* Structured diagram preview without executing arbitrary untrusted scripts */}
          <div className={styles.diagramBox} aria-label={block.accessibleText}>
            <div className={styles.diagramGraphHeader}>
              <span className={styles.diagramGraphDot} />
              <span className={styles.diagramGraphDot} />
              <span className={styles.diagramGraphDot} />
              <span className={styles.diagramGraphLabel}>SYNTHESIZED ARCHITECTURE VIEW</span>
            </div>
            <pre className={styles.diagramFormattedCode}>
              <code>{block.code}</code>
            </pre>
          </div>
        </div>
      ) : (
        <div className={styles.diagramSourceArea}>
          <pre className={styles.diagramCodeBlock}>
            <code>{block.code}</code>
          </pre>
        </div>
      )}

      {/* Accessible Text Alternative */}
      <div className={styles.a11yFooter}>
        <button
          type="button"
          className={styles.a11yToggleBtn}
          onClick={() => setShowA11y(!showA11y)}
        >
          {showA11y ? '▲ Hide textual description' : '♿ Accessible textual description'}
        </button>
        {showA11y && (
          <p className={styles.a11yText}>{block.accessibleText}</p>
        )}
      </div>
    </div>
  );
}
