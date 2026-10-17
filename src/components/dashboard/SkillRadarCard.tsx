'use client';

import React from 'react';
import styles from './SkillRadarCard.module.css';

export interface SkillRadarCardProps {
  domains?: Array<{ name: string; percentage: number }>;
  overallScore?: number;
}

export interface RadarAxis {
  label: string;
  value: number;
}

export interface RadarPoint {
  x: number;
  y: number;
}

export function buildRadarGeometry(
  axes: RadarAxis[],
  center = 110,
  radius = 70
): { dataPoints: RadarPoint[]; axisPoints: RadarPoint[]; labelPoints: RadarPoint[]; ringPoints: string[] } | null {
  if (axes.length < 3) return null;

  const pointAt = (index: number, pointRadius: number): RadarPoint => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const value = Math.max(0, Math.min(100, Number.isFinite(axes[index].value) ? axes[index].value : 0));
    const scaledRadius = (value / 100) * pointRadius;

    return {
      x: center + Math.cos(angle) * scaledRadius,
      y: center + Math.sin(angle) * scaledRadius
    };
  };

  const coordinateAt = (index: number, pointRadius: number): RadarPoint => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * pointRadius,
      y: center + Math.sin(angle) * pointRadius
    };
  };

  return {
    dataPoints: axes.map((_, index) => pointAt(index, radius)),
    axisPoints: axes.map((_, index) => coordinateAt(index, radius)),
    labelPoints: axes.map((_, index) => coordinateAt(index, radius + 27)),
    ringPoints: [0.25, 0.5, 0.75, 1].map((scale) =>
      axes.map((_, index) => {
        const point = coordinateAt(index, radius * scale);
        return `${point.x},${point.y}`;
      }).join(' ')
    )
  };
}

export function SkillRadarCard({ domains = [] }: SkillRadarCardProps) {
  const axes = domains
    .filter((domain) => domain.name.trim().length > 0)
    .slice(0, 6)
    .map((domain) => ({
      label: domain.name,
      value: Math.max(0, Math.min(100, Number.isFinite(domain.percentage) ? domain.percentage : 0))
    }));
  const geometry = buildRadarGeometry(axes);
  const largestDomain = axes.reduce<RadarAxis | null>(
    (largest, axis) => !largest || axis.value > largest.value ? axis : largest,
    null
  );

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Study Dimension Radar</h3>
          <p className={styles.subtitle}>Distribution across your learning library</p>
        </div>
        <div className={styles.scoreBadge}>{axes.length} {axes.length === 1 ? 'domain' : 'domains'}</div>
      </div>

      <div className={styles.radarWrapper}>
        {geometry ? (
          <svg
            className={styles.radarSvg}
            viewBox="0 0 220 220"
            role="img"
            aria-label="Learning library distribution radar chart"
          >
            {geometry.ringPoints.map((points, index) => (
              <polygon key={index} points={points} className={styles.webRing} />
            ))}
            {geometry.axisPoints.map((point, index) => (
              <line
                key={axes[index].label}
                x1="110"
                y1="110"
                x2={point.x}
                y2={point.y}
                className={styles.webAxis}
              />
            ))}
            <polygon
              points={geometry.dataPoints.map((point) => `${point.x},${point.y}`).join(' ')}
              className={styles.skillPolygon}
            />
            {geometry.dataPoints.map((point, index) => (
              <circle key={axes[index].label} cx={point.x} cy={point.y} r="3" className={styles.skillPoint}>
                <title>{`${axes[index].label}: ${axes[index].value}% of courses`}</title>
              </circle>
            ))}
            {geometry.labelPoints.map((point, index) => (
              <text
                key={axes[index].label}
                x={point.x}
                y={point.y}
                className={styles.axisLabel}
                textAnchor={point.x < 96 ? 'end' : point.x > 124 ? 'start' : 'middle'}
                dominantBaseline={point.y < 100 ? 'auto' : 'hanging'}
              >
                <title>{axes[index].label}</title>
                {axes[index].label.length > 14 ? `${axes[index].label.slice(0, 13)}…` : axes[index].label}
              </text>
            ))}
          </svg>
        ) : (
          <div className={styles.emptyState}>
            <p>{axes.length ? 'Import courses across at least three domains to display a radar chart.' : 'Your library has no learning dimensions yet.'}</p>
            {axes.map((axis) => (
              <span key={axis.label}>{axis.label}: {axis.value}% of courses</span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <span>
          {largestDomain
            ? <>Largest domain: <strong>{largestDomain.label} ({largestDomain.value}%)</strong></>
            : 'Import learning content to build your library distribution.'}
        </span>
      </div>
    </div>
  );
}
