import React from 'react';

/**
 * Parses markdown and LaTeX math ($...$, $$...$$) into styled JSX elements.
 */
export function renderFormattedNote(content: string): React.ReactNode {
  if (!content) return null;

  // Split into lines or paragraphs
  const lines = content.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.6 }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // 1. Math block: $$ ... $$
        if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
          const math = trimmed.slice(2, -2).trim();
          return (
            <div
              key={idx}
              style={{
                background: 'var(--sf-color-primary-light)',
                borderLeft: '3px solid var(--sf-color-primary, #0F766E)',
                padding: '10px 14px',
                borderRadius: '6px',
                fontFamily: 'var(--sf-font-mono, monospace)',
                fontSize: '0.9375rem',
                color: 'var(--sf-color-primary, #0F766E)',
                overflowX: 'auto',
                margin: '4px 0'
              }}
            >
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--sf-color-text-tertiary)', marginBottom: '4px' }}>
                📐 LATEX / TEX EQUATION
              </div>
              <div>{math}</div>
            </div>
          );
        }

        // 2. Headings: #, ##, ###
        if (trimmed.startsWith('### ')) {
          return (
            <h5 key={idx} style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '6px 0 2px', color: 'var(--sf-color-text-primary)' }}>
              {renderInlineFormatting(trimmed.slice(4))}
            </h5>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h4 key={idx} style={{ fontSize: '1rem', fontWeight: 700, margin: '8px 0 2px', color: 'var(--sf-color-text-primary)' }}>
              {renderInlineFormatting(trimmed.slice(3))}
            </h4>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} style={{ fontSize: '1.125rem', fontWeight: 700, margin: '10px 0 4px', color: 'var(--sf-color-text-primary)' }}>
              {renderInlineFormatting(trimmed.slice(2))}
            </h3>
          );
        }

        // 3. Bullet points: - or *
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingLeft: '8px' }}>
              <span style={{ color: 'var(--sf-color-primary, #0F766E)', fontWeight: 700 }}>•</span>
              <span>{renderInlineFormatting(trimmed.slice(2))}</span>
            </div>
          );
        }

        // 4. Code blocks: ```
        if (trimmed.startsWith('```')) {
          return (
            <div
              key={idx}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontFamily: 'var(--sf-font-mono, monospace)',
                fontSize: '0.8125rem',
                color: '#38BDF8'
              }}
            >
              {trimmed}
            </div>
          );
        }

        // Regular paragraph with inline formatting
        if (!trimmed) {
          return <div key={idx} style={{ height: '4px' }} />;
        }

        return (
          <p key={idx} style={{ margin: 0, color: 'var(--sf-color-text-primary)' }}>
            {renderInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Handles inline bold (**...**), inline code (`...`), and inline math ($...$).
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // Regex to match $...$, `...`, **...**
  const regex = /(\$[^$]+\$|`[^`]+`|\*\*[^*]+\*\*)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return (
        <span
          key={i}
          style={{
            background: 'var(--sf-color-primary-light)',
            color: 'var(--sf-color-primary, #0F766E)',
            padding: '1px 6px',
            borderRadius: '4px',
            fontFamily: 'var(--sf-font-mono, monospace)',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
          title="LaTeX Math Equation"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={i}
          style={{
            background: 'rgba(15, 23, 42, 0.4)',
            color: '#38BDF8',
            padding: '1px 5px',
            borderRadius: '4px',
            fontFamily: 'var(--sf-font-mono, monospace)',
            fontSize: '0.875rem'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/**
 * Exports note content as a downloadable .md file.
 */
export function downloadAsMarkdownFile(title: string, content: string): void {
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'note'}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Converts note content into a clean compilable LaTeX .tex document and triggers download.
 */
export function downloadAsTexFile(title: string, content: string): void {
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'note'}.tex`;
  const texDocument = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{hyperref}

\\title{${title || 'LearnUp Lecture Note'}}
\\author{LearnUp Learner}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Lecture Study Note}
${content.replace(/\\/g, '\\\\').replace(/\$/g, '$')}

\\end{document}
`;

  const blob = new Blob([texDocument], { type: 'application/x-tex;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
