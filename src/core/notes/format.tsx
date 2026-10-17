import React from 'react';

/**
 * Parses markdown, headings, bullet lists, inline code, and LaTeX math into styled JSX elements.
 */
export function renderFormattedNote(content: string): React.ReactNode {
  if (!content) return null;

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
                background: 'rgba(99, 102, 241, 0.1)',
                borderLeft: '3px solid #6366f1',
                padding: '10px 14px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.9375rem',
                color: '#818cf8',
                overflowX: 'auto',
                margin: '4px 0'
              }}
            >
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                📐 LATEX / EQUATION
              </div>
              <div>{math}</div>
            </div>
          );
        }

        // 2. Headings: #, ##, ###
        if (trimmed.startsWith('### ')) {
          return (
            <h5 key={idx} style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '6px 0 2px', color: '#f8fafc' }}>
              {renderInlineFormatting(trimmed.slice(4))}
            </h5>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h4 key={idx} style={{ fontSize: '1rem', fontWeight: 700, margin: '8px 0 2px', color: '#f8fafc' }}>
              {renderInlineFormatting(trimmed.slice(3))}
            </h4>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} style={{ fontSize: '1.125rem', fontWeight: 700, margin: '10px 0 4px', color: '#f8fafc' }}>
              {renderInlineFormatting(trimmed.slice(2))}
            </h3>
          );
        }

        // 3. Bullet points: - or *
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingLeft: '8px' }}>
              <span style={{ color: '#6366f1', fontWeight: 700 }}>•</span>
              <span style={{ color: '#cbd5e1' }}>{renderInlineFormatting(trimmed.slice(2))}</span>
            </div>
          );
        }

        // 4. Code blocks: ```
        if (trimmed.startsWith('```')) {
          return (
            <div
              key={idx}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                color: '#38bdf8'
              }}
            >
              {trimmed}
            </div>
          );
        }

        if (!trimmed) {
          return <div key={idx} style={{ height: '4px' }} />;
        }

        return (
          <p key={idx} style={{ margin: 0, color: '#cbd5e1' }}>
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
  const regex = /(\$[^$]+\$|`[^`]+`|\*\*[^*]+\*\*)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return (
        <span
          key={i}
          style={{
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#a5b4fc',
            padding: '1px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
          title="Math Formula"
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
            background: 'rgba(15, 23, 42, 0.6)',
            color: '#38bdf8',
            padding: '1px 5px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.875rem'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} style={{ color: '#f8fafc' }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
