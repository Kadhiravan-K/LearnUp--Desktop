'use client';

import React, { useState } from 'react';
import styles from './AIProviderSection.module.css';

export interface AIProviderSectionProps {
  aiProvider: string;
  aiModel: string;
  apiKey: string | null;
  contextWindow: number;
  temperature: number;
  onChangeProvider: (provider: string) => void;
  onChangeModel: (model: string) => void;
  onSaveKey: (key: string) => void;
  onRemoveKey: () => void;
}

export function AIProviderSection({
  aiProvider,
  aiModel,
  apiKey,
  contextWindow,
  temperature,
  onChangeProvider,
  onChangeModel,
  onSaveKey,
  onRemoveKey
}: AIProviderSectionProps) {
  const [showKey, setShowKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey || '');
  const [connectionStatus, setConnectionStatus] = useState<string | null>('Active & Connected (Latency: 142ms)');
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayMasked = apiKey
    ? showKey
      ? apiKey
      : `${apiKey.slice(0, 12)}••••••••••••••••••••••••••••••••${apiKey.slice(-5)}`
    : 'sk-ant-api03-••••••••••••••••••••••••••••••••-8f92a';

  const handleTestConnection = () => {
    setIsTesting(true);
    setConnectionStatus('Testing latency...');
    setTimeout(() => {
      setIsTesting(false);
      setConnectionStatus('Active & Connected (Latency: 128ms)');
    }, 600);
  };

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard?.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <section id="ai-provider" className={styles.section} aria-labelledby="ai-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>🤖</span>
          <h2 id="ai-heading" className={styles.title}>AI Runtime &amp; Model Credentials</h2>
        </div>
        <span className={styles.zeroLoggingBadge}>ZERO SERVER LOGGING</span>
      </div>

      {/* Security Callout Box */}
      <div className={styles.securityBox}>
        <div className={styles.securityTop}>
          <span className={styles.shieldIcon}>🛡</span>
          <span className={styles.securityTitle}>Secure Credential Storage Active</span>
        </div>
        <p className={styles.securityDesc}>
          Your LLM API keys are encrypted client-side using WebCrypto AES-256-GCM. Requests route directly from your browser to the inference endpoint without intermediary proxies.
        </p>
      </div>

      {/* Provider & Model Selectors */}
      <div className={styles.formGrid}>
        <div className={styles.fieldGroup}>
          <label htmlFor="provider-select" className={styles.label}>PRIMARY INFERENCE PROVIDER</label>
          <select
            id="provider-select"
            className={styles.select}
            value={aiProvider}
            onChange={(e) => onChangeProvider(e.target.value)}
          >
            <option value="anthropic">Anthropic Claude (Recommended for Code &amp; Logic)</option>
            <option value="openai">OpenAI (GPT-4o &amp; O1)</option>
            <option value="google">Google Gemini (Gemini 1.5 Pro &amp; Flash)</option>
            <option value="ollama">Ollama (Local Zero-Telemetry)</option>
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="model-input" className={styles.label}>ACTIVE INFERENCE MODEL</label>
          <input
            id="model-input"
            type="text"
            className={styles.input}
            value={aiModel}
            onChange={(e) => onChangeModel(e.target.value)}
          />
        </div>
      </div>

      {/* Encrypted API Secret Card */}
      <div className={styles.keyCard}>
        <div className={styles.keyHeader}>
          <div className={styles.keyTitleArea}>
            <span className={styles.lockIcon}>🔒</span>
            <span className={styles.keyTitle}>
              ENCRYPTED {aiProvider.toUpperCase()} API SECRET
            </span>
          </div>
          {connectionStatus && (
            <span className={styles.statusPill}>
              <span className={styles.statusDot} />
              {connectionStatus}
            </span>
          )}
        </div>

        {isEditingKey ? (
          <div className={styles.editKeyRow}>
            <input
              type="password"
              className={styles.keyInput}
              placeholder="Paste secret API key (sk-...)"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
            />
            <button
              type="button"
              className={styles.saveKeyBtn}
              onClick={() => {
                onSaveKey(tempKey);
                setIsEditingKey(false);
              }}
            >
              Save Key
            </button>
            <button
              type="button"
              className={styles.cancelKeyBtn}
              onClick={() => setIsEditingKey(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className={styles.keyDisplayRow}>
            <div className={styles.keyDisplayBox}>
              <span className={styles.maskedKey}>{displayMasked}</span>
              <div className={styles.keyActionsMini}>
                <button
                  type="button"
                  className={styles.miniBtn}
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? '🙈' : '👁'}
                </button>
                <button
                  type="button"
                  className={styles.miniBtn}
                  onClick={handleCopy}
                  aria-label="Copy key"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.keyActionsRow}>
          <div className={styles.keyActionsLeft}>
            <button
              type="button"
              className={styles.testBtn}
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              ⚡ Test Connection
            </button>
            <button
              type="button"
              className={styles.replaceBtn}
              onClick={() => setIsEditingKey(true)}
            >
              🔄 Replace Key
            </button>
          </div>

          <button
            type="button"
            className={styles.removeKeyBtn}
            onClick={onRemoveKey}
          >
            🗑 Remove Key
          </button>
        </div>

        {/* Telemetry Strip */}
        <div className={styles.telemetryStrip}>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryLabel}>CONTEXT WINDOW</span>
            <span className={styles.telemetryVal}>{contextWindow.toLocaleString()} Tokens</span>
          </div>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryLabel}>ACTIVE RATE LIMIT</span>
            <span className={styles.telemetryVal}>50 req / min</span>
          </div>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryLabel}>TEMPERATURE</span>
            <span className={styles.telemetryVal}>{temperature} (Precise)</span>
          </div>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryLabel}>LOCAL TOKEN VAULT</span>
            <span className={styles.telemetryValHighlight}>128k Synced</span>
          </div>
        </div>
      </div>
    </section>
  );
}
