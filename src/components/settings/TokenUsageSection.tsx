'use client';

import React, { useState, useEffect } from 'react';
import { TokenUsageSummary, TokenUsageRecord } from '@/lib/types';
import styles from './TokenUsageSection.module.css';

export function TokenUsageSection() {
  const [summary, setSummary] = useState<TokenUsageSummary | null>(null);
  const [recentRecords, setRecentRecords] = useState<TokenUsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plugins/token-usage');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSummary(json.data.summary);
          setRecentRecords(json.data.recentRecords || []);
        }
      }
    } catch {
      // Safe fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getBudgetFillClass = (percentage: number) => {
    if (percentage > 90) return styles.budgetFillExceeded;
    if (percentage > 70) return styles.budgetFillWarning;
    return styles.budgetFill;
  };

  return (
    <section id="token-usage" className={styles.section} aria-labelledby="tokens-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>📊</span>
          <h2 id="tokens-heading" className={styles.title}>API Monetization &amp; Token Ledger</h2>
        </div>
        <span className={styles.costPill}>CLIENT-SIDE COST AUDITOR</span>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.8125rem', color: '#6B7280' }}>
          Loading token analytics...
        </div>
      ) : (
        <>
          {/* Top 4 Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>TOTAL CONSUMED</span>
              <span className={styles.statValue}>
                {summary ? summary.totalTokens.toLocaleString() : '0'}
              </span>
              <span className={styles.statSub}>Tokens</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>ESTIMATED COST</span>
              <span className={styles.statValue}>
                ${summary ? summary.totalCostUsd.toFixed(4) : '0.0000'}
              </span>
              <span className={styles.statSub}>USD Incurred</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>INFERENCE CALLS</span>
              <span className={styles.statValue}>
                {summary ? summary.totalRequests.toLocaleString() : '0'}
              </span>
              <span className={styles.statSub}>Requests</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>LOCAL (OLLAMA) SAVINGS</span>
              <span className={styles.statValue} style={{ color: '#059669' }}>
                $0.00
              </span>
              <span className={styles.statSub}>Free Local Inference</span>
            </div>
          </div>

          {/* Monthly Budget Cap Tracker */}
          <div className={styles.budgetCard}>
            <div className={styles.budgetHeader}>
              <span className={styles.budgetTitle}>Monthly Inference Budget Cap</span>
              <span className={styles.budgetRatio}>
                ${summary ? summary.totalCostUsd.toFixed(2) : '0.00'} / ${summary ? summary.monthlyBudgetUsd.toFixed(2) : '20.00'} (
                {summary ? summary.budgetUsedPercentage : 0}%)
              </span>
            </div>
            <div className={styles.budgetBar}>
              <div
                className={`${styles.budgetFill} ${getBudgetFillClass(summary?.budgetUsedPercentage || 0)}`}
                style={{ width: `${Math.min(100, summary?.budgetUsedPercentage || 0)}%` }}
              />
            </div>
          </div>

          {/* Provider Breakdown */}
          <div className={styles.providerSection}>
            <span className={styles.providerSectionTitle}>INFERENCE BY PROVIDER</span>
            <div className={styles.providerList}>
              {summary && summary.providerBreakdown.length > 0 ? (
                summary.providerBreakdown.map((p) => (
                  <div key={p.provider} className={styles.providerRow}>
                    <span className={styles.providerName}>
                      {p.provider.toUpperCase()}
                      {['ollama', 'local'].includes(p.provider.toLowerCase()) && (
                        <span className={styles.freePill}>100% LOCAL FREE</span>
                      )}
                    </span>
                    <div className={styles.providerMetrics}>
                      <span>{p.tokens.toLocaleString()} tokens</span>
                      <span>${p.costUsd.toFixed(4)}</span>
                      <span>({p.percentage}%)</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.providerRow}>
                  <span className={styles.providerName}>
                    OLLAMA LOCAL
                    <span className={styles.freePill}>100% LOCAL FREE</span>
                  </span>
                  <div className={styles.providerMetrics}>
                    <span>0 tokens</span>
                    <span>$0.0000</span>
                    <span>(0%)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Model Context Protocol (MCP) Server Box */}
          <div className={styles.mcpBox}>
            <div className={styles.mcpHeader}>
              <span className={styles.mcpTitle}>
                <span>🔌</span> Model Context Protocol (MCP) Server Active
              </span>
              <span className={styles.mcpEndpoint}>/api/mcp</span>
            </div>
            <p className={styles.mcpDesc}>
              Connect Claude Desktop, Cursor, Zed, or any MCP-compliant agent directly to your LearnUp vault. JSON-RPC 2.0 tools &amp; resources are exposed with zero third-party telemetry.
            </p>
          </div>

          {/* Recent Token Ledger Records */}
          {recentRecords.length > 0 && (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>TIMESTAMP</th>
                    <th>PROVIDER</th>
                    <th>MODEL</th>
                    <th>TOKENS</th>
                    <th>EST. COST</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map((r) => (
                    <tr key={r.id}>
                      <td>{new Date(r.created_at).toLocaleTimeString()}</td>
                      <td>{r.provider}</td>
                      <td>{r.model}</td>
                      <td>{r.total_tokens.toLocaleString()}</td>
                      <td>${Number(r.estimated_cost_usd).toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
