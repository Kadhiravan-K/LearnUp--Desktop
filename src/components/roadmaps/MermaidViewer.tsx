'use client';

import React, { useState, useRef } from 'react';
import styles from './MermaidViewer.module.css';

export interface MermaidViewerProps {
  title: string;
  type: 'flowchart' | 'mindmap';
  code: string;
  isRichUiEnabled?: boolean;
}

interface ParsedNode {
  id: string;
  label: string;
  phaseId?: string;
}

interface ParsedPhase {
  id: string;
  title: string;
  nodes: ParsedNode[];
}

export function MermaidViewer({
  title,
  type,
  code,
  isRichUiEnabled = true
}: MermaidViewerProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'source' | 'outline'>(
    isRichUiEnabled ? 'visual' : 'outline'
  );
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Parse Mermaid code into structured phases and nodes
  const parsedPhases: ParsedPhase[] = [];
  const lines = code.split('\n');
  let currentPhase: ParsedPhase | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for subgraph Phase
    const subgraphMatch = trimmed.match(/subgraph\s+([A-Za-z0-9_]+)\s+\["([^"]+)"\]/i);
    if (subgraphMatch) {
      currentPhase = {
        id: subgraphMatch[1],
        title: subgraphMatch[2],
        nodes: []
      };
      parsedPhases.push(currentPhase);
      continue;
    }

    // Check for mindmap phase branch
    if (type === 'mindmap' && trimmed.startsWith('["') && trimmed.endsWith('"]')) {
      currentPhase = {
        id: `phase-${parsedPhases.length + 1}`,
        title: trimmed.slice(2, -2),
        nodes: []
      };
      parsedPhases.push(currentPhase);
      continue;
    }

    if (trimmed === 'end') {
      currentPhase = null;
      continue;
    }

    // Check for flowchart milestone node
    const nodeMatch = trimmed.match(/([A-Za-z0-9_]+)\["([^"]+)"\]/);
    if (nodeMatch) {
      const nodeObj: ParsedNode = {
        id: nodeMatch[1],
        label: nodeMatch[2],
        phaseId: currentPhase?.id
      };
      if (currentPhase) {
        currentPhase.nodes.push(nodeObj);
      } else {
        // standalone or start/target node
        if (parsedPhases.length === 0) {
          parsedPhases.push({
            id: 'phase-root',
            title: 'Core Trajectory',
            nodes: [nodeObj]
          });
        } else {
          parsedPhases[parsedPhases.length - 1].nodes.push(nodeObj);
        }
      }
      continue;
    }

    // Check for mindmap milestone leaf
    if (type === 'mindmap' && trimmed.startsWith('("') && trimmed.endsWith('")')) {
      const leafLabel = trimmed.slice(2, -2);
      const leafNode: ParsedNode = {
        id: `node-${Date.now()}-${Math.random()}`,
        label: leafLabel,
        phaseId: currentPhase?.id
      };
      if (currentPhase) {
        currentPhase.nodes.push(leafNode);
      }
    }
  }

  // Calculate SVG layout dimensions
  const nodeWidth = 280;
  const nodeHeight = 52;
  const nodeGapY = 32;
  const phasePadding = 24;

  let currentY = 40;
  const renderedPhases = parsedPhases.map((phase) => {
    const phaseTop = currentY;
    const phaseNodes = phase.nodes.map((node, nIdx) => {
      const y = phaseTop + 44 + nIdx * (nodeHeight + nodeGapY);
      return { ...node, x: 100, y };
    });
    const totalHeight = 44 + phase.nodes.length * (nodeHeight + nodeGapY) + phasePadding;
    currentY += totalHeight + 36;
    return { ...phase, top: phaseTop, height: totalHeight, nodes: phaseNodes };
  });

  const svgWidth = 480;
  const svgHeight = Math.max(480, currentY + 30);

  const handleCopySource = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-diagram.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      {/* Top Header Bar */}
      <div className={styles.topBar}>
        <div className={styles.titleGroup}>
          <h3 className={styles.diagramTitle}>
            <span>{type === 'flowchart' ? '📊' : '🧠'}</span>
            <span>{title}</span>
          </h3>
          <span className={styles.diagramSubtitle}>
            {type === 'flowchart' ? 'Sequential Prerequisite Graph' : 'Hierarchical Competency Breakdown'}
          </span>
        </div>

        <div className={styles.controlsGroup}>
          <div className={styles.tabButtons}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'visual' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('visual')}
            >
              Visual
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'source' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('source')}
            >
              Source
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'outline' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('outline')}
            >
              Accessible Outline
            </button>
          </div>

          {activeTab === 'visual' && (
            <>
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
                title="Zoom Out"
              >
                −
              </button>
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => setZoom(1)}
                title="Reset Zoom"
              >
                1x
              </button>
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={handleDownloadSvg}
                title="Download SVG Diagram"
              >
                💾 Export SVG
              </button>
            </>
          )}

          <button type="button" className={styles.actionBtn} onClick={handleCopySource}>
            {copied ? '✓ Copied' : '📋 Copy Mermaid'}
          </button>
        </div>
      </div>

      {/* VIEWPORT: Visual SVG Diagram */}
      {activeTab === 'visual' && (
        <div className={styles.viewportArea}>
          <div
            className={styles.svgWrapper}
            style={{ transform: `scale(${zoom})` }}
          >
            <svg
              ref={svgRef}
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label={`${title} graphical representation`}
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#14b8a6" />
                </marker>
                <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f2b2e" />
                  <stop offset="100%" stopColor="#081a1c" />
                </linearGradient>
              </defs>

              {/* Render Phases Subgraphs */}
              {renderedPhases.map((phase) => (
                <g key={phase.id}>
                  <rect
                    x="40"
                    y={phase.top}
                    width={svgWidth - 80}
                    height={phase.height}
                    rx="12"
                    fill="rgba(20, 184, 166, 0.04)"
                    stroke="rgba(20, 184, 166, 0.25)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="56"
                    y={phase.top + 24}
                    fill="#2dd4bf"
                    fontSize="13"
                    fontWeight="700"
                    fontFamily="Inter, sans-serif"
                  >
                    {phase.title}
                  </text>

                  {/* Nodes inside phase */}
                  {phase.nodes.map((node, idx) => (
                    <g key={node.id}>
                      <rect
                        x={node.x}
                        y={node.y}
                        width={nodeWidth}
                        height={nodeHeight}
                        rx="8"
                        fill="url(#nodeGrad)"
                        stroke="#14b8a6"
                        strokeWidth="1.5"
                      />
                      <text
                        x={node.x + 14}
                        y={node.y + 30}
                        fill="#f8fafc"
                        fontSize="12"
                        fontWeight="600"
                        fontFamily="Inter, sans-serif"
                      >
                        {node.label.length > 34 ? `${node.label.substring(0, 32)}...` : node.label}
                      </text>

                      {/* Intra-phase sequential arrow */}
                      {idx < phase.nodes.length - 1 && (
                        <line
                          x1={node.x + nodeWidth / 2}
                          y1={node.y + nodeHeight}
                          x2={node.x + nodeWidth / 2}
                          y2={node.y + nodeHeight + nodeGapY - 4}
                          stroke="#14b8a6"
                          strokeWidth="2"
                          markerEnd="url(#arrow)"
                        />
                      )}
                    </g>
                  ))}
                </g>
              ))}

              {/* Inter-phase connecting arrows */}
              {renderedPhases.map((phase, pIdx) => {
                if (pIdx < renderedPhases.length - 1) {
                  const currentLastNode = phase.nodes[phase.nodes.length - 1];
                  const nextFirstNode = renderedPhases[pIdx + 1].nodes[0];
                  if (currentLastNode && nextFirstNode) {
                    return (
                      <path
                        key={`inter-${phase.id}`}
                        d={`M ${currentLastNode.x + nodeWidth / 2} ${currentLastNode.y + nodeHeight} 
                           C ${currentLastNode.x + nodeWidth / 2} ${nextFirstNode.y - 20}, 
                             ${nextFirstNode.x + nodeWidth / 2} ${nextFirstNode.y - 20}, 
                             ${nextFirstNode.x + nodeWidth / 2} ${nextFirstNode.y - 6}`}
                        fill="none"
                        stroke="#2dd4bf"
                        strokeWidth="2.5"
                        strokeDasharray="6 3"
                        markerEnd="url(#arrow)"
                      />
                    );
                  }
                }
                return null;
              })}
            </svg>
          </div>
        </div>
      )}

      {/* VIEWPORT: Raw Mermaid Code Block */}
      {activeTab === 'source' && (
        <div className={styles.sourceArea}>
          <pre className={styles.codeBlock}>
            <code>{code}</code>
          </pre>
        </div>
      )}

      {/* VIEWPORT: Accessible Outline View */}
      {activeTab === 'outline' && (
        <div className={styles.outlineArea}>
          <nav aria-label="Curriculum Skill Graph Outline">
            <ol className={styles.outlineList}>
              {parsedPhases.map((phase, pIdx) => (
                <li key={phase.id} className={styles.outlinePhaseItem}>
                  <div className={styles.outlinePhaseHeader}>
                    Phase {pIdx + 1}: {phase.title}
                  </div>
                  <ol className={styles.outlineMilestoneList}>
                    {phase.nodes.map((n) => (
                      <li key={n.id}>{n.label}</li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </nav>
          <div className={styles.a11yNote}>
            Screen-reader accessible representation of prerequisite and dependency order.
          </div>
        </div>
      )}
    </div>
  );
}
