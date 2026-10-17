'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button/Button';
import { Alert } from '@/components/ui/Alert/Alert';
import { useIsPluginEnabled } from '@/lib/hooks/useIsPluginEnabled';
import { renderFormattedNote, downloadAsMarkdownFile, downloadAsTexFile } from '@/lib/utils/formatNote';
import styles from './NoteEditor.module.css';

export interface NoteEditorProps {
  onSubmit: (content: string) => Promise<boolean>;
  initialContent?: string;
  placeholder?: string;
  submitLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function NoteEditor({
  onSubmit,
  initialContent = '',
  placeholder = 'Write your study note or summary here...',
  submitLabel = 'Save Note',
  onCancel,
  autoFocus = false
}: NoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'write' | 'preview' | 'tex_guide'>('write');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTexMdPluginActive = useIsPluginEnabled('markdown_tex_notes', true);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Note content cannot be empty.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const success = await onSubmit(trimmed);
      if (success) {
        if (!onCancel) {
          setContent('');
        }
      } else {
        setError('Failed to save note. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertSnippet = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${before}${selected || 'text'}${after}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + before.length,
          start + before.length + (selected ? selected.length : 4)
        );
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} aria-label="Note Editor">
      {error && (
        <div className={styles.alertWrapper}>
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* TeX & Markdown Workstation Bar (if plugin enabled) */}
      {isTexMdPluginActive && (
        <div className={styles.pluginToolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.modeTabs}>
              <button
                type="button"
                className={`${styles.modeTab} ${editorMode === 'write' ? styles.modeTabActive : ''}`}
                onClick={() => setEditorMode('write')}
              >
                ✏️ Write (.md / TeX)
              </button>
              <button
                type="button"
                className={`${styles.modeTab} ${editorMode === 'preview' ? styles.modeTabActive : ''}`}
                onClick={() => setEditorMode('preview')}
              >
                👁️ Live Math Preview
              </button>
              <button
                type="button"
                className={`${styles.modeTab} ${editorMode === 'tex_guide' ? styles.modeTabActive : ''}`}
                onClick={() => setEditorMode('tex_guide')}
              >
                📐 TeX Cheatsheet
              </button>
            </div>
          </div>

          {editorMode === 'write' && (
            <div className={styles.formattingButtons}>
              <button
                type="button"
                className={styles.formatBtn}
                onClick={() => insertSnippet('**', '**')}
                title="Bold (**text**)"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                className={styles.formatBtn}
                onClick={() => insertSnippet('*', '*')}
                title="Italic (*text*)"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                className={styles.formatBtn}
                onClick={() => insertSnippet('`', '`')}
                title="Inline Code (`code`)"
              >
                &lt;/&gt;
              </button>
              <button
                type="button"
                className={styles.formatBtn}
                onClick={() => insertSnippet('$$\n\\int_{0}^{\\infty} f(x)dx = ', '\n$$')}
                title="LaTeX Equation Block ($$ ... $$)"
              >
                ∑
              </button>
              <button
                type="button"
                className={styles.formatBtn}
                onClick={() => insertSnippet('$E = mc^2$', '')}
                title="Inline LaTeX Formula ($...$)"
              >
                $x$
              </button>
              <button
                type="button"
                className={styles.formatBtn}
                onClick={() => insertSnippet('## ')}
                title="Heading (## Title)"
              >
                H2
              </button>
              <button
                type="button"
                className={styles.formatBtn}
                onClick={() => insertSnippet('- ')}
                title="Bullet Item (- item)"
              >
                • List
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor Body or Preview */}
      <div className={styles.textareaWrapper}>
        {editorMode === 'write' ? (
          <textarea
            ref={textareaRef}
            className={`${styles.textarea} ${isTexMdPluginActive ? styles.textareaMono : ''}`}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isTexMdPluginActive
                ? 'Type notes in Markdown or TeX formula (e.g., $$ \\sum_{i=1}^n x_i $$ or **key takeaways**)...'
                : placeholder
            }
            rows={4}
            disabled={isSubmitting}
            autoFocus={autoFocus}
            aria-label="Note content"
          />
        ) : editorMode === 'preview' ? (
          <div className={styles.previewBox}>
            {content.trim() ? (
              renderFormattedNote(content)
            ) : (
              <p className={styles.emptyPreviewText}>Nothing to preview. Type something in Write mode first.</p>
            )}
          </div>
        ) : (
          /* TeX Guide */
          <div className={styles.texGuideBox}>
            <div className={styles.guideTitle}>📐 Quick LaTeX / TeX Syntax Reference</div>
            <div className={styles.guideGrid}>
              <div className={styles.guideItem}>
                <code>$$ \frac&#123;a&#125;&#123;b&#125; $$</code>
                <span>Fractions: a/b</span>
              </div>
              <div className={styles.guideItem}>
                <code>$$ \sqrt&#123;x^2 + y^2&#125; $$</code>
                <span>Square roots</span>
              </div>
              <div className={styles.guideItem}>
                <code>$$ \sum_&#123;i=1&#125;^n x_i $$</code>
                <span>Summations</span>
              </div>
              <div className={styles.guideItem}>
                <code>$$ \int_0^1 f(x)dx $$</code>
                <span>Integrals</span>
              </div>
              <div className={styles.guideItem}>
                <code>$$ \alpha, \beta, \theta, \lambda $$</code>
                <span>Greek characters</span>
              </div>
              <div className={styles.guideItem}>
                <code>$$ \nabla \times \mathbf&#123;B&#125; = \mu_0 \mathbf&#123;J&#125; $$</code>
                <span>Vectors &amp; Physics</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <span className={styles.hint}>
            {isTexMdPluginActive ? 'Markdown & TeX Studio Active' : 'Tip: Press Cmd/Ctrl + Enter to save'}
          </span>
          {isTexMdPluginActive && content.trim() && (
            <div className={styles.exportPills}>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={() => downloadAsMarkdownFile('LearnUp_note', content)}
                title="Download note as .md file"
              >
                ⬇️ .md
              </button>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={() => downloadAsTexFile('LearnUp_note', content)}
                title="Download note as .tex LaTeX file"
              >
                ⬇️ .tex
              </button>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            disabled={!content.trim()}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
