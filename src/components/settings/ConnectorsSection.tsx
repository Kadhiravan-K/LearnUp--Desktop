'use client';

import React, { useState, useEffect } from 'react';
import { ConnectorType } from '@/lib/types';
import styles from './ConnectorsSection.module.css';

interface ConnectorItem {
  type: ConnectorType;
  name: string;
  description: string;
  icon: string;
  category: 'Local Storage' | 'Productivity' | 'Developer';
  defaultEnabled: boolean;
  isEnabled: boolean;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  config: Record<string, any>;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  fields: Array<{ key: string; label: string; placeholder: string; type: string }>;
}

export function ConnectorsSection() {
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({});
  const [editingConfig, setEditingConfig] = useState<Record<string, Record<string, any>>>({});

  const loadConnectors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/connectors');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setConnectors(json.data);
          const initialConfigs: Record<string, Record<string, any>> = {};
          json.data.forEach((c: ConnectorItem) => {
            initialConfigs[c.type] = { ...c.config };
          });
          setEditingConfig(initialConfigs);
        }
      }
    } catch {
      // Safe fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnectors();
  }, []);

  const handleToggle = async (type: ConnectorType, newEnabled: boolean) => {
    setConnectors((prev) =>
      prev.map((c) => (c.type === type ? { ...c, isEnabled: newEnabled } : c))
    );

    try {
      await fetch('/api/connectors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connector_type: type,
          is_enabled: newEnabled
        })
      });
    } catch {
      // Revert if error
      loadConnectors();
    }
  };

  const handleFieldChange = (type: ConnectorType, key: string, val: string) => {
    setEditingConfig((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] || {}),
        [key]: val
      }
    }));
  };

  const handleSaveConfig = async (type: ConnectorType) => {
    const configToSave = editingConfig[type] || {};
    try {
      await fetch('/api/connectors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connector_type: type,
          config: configToSave
        })
      });
      alert(`${type.toUpperCase()} settings saved successfully.`);
      loadConnectors();
    } catch {
      alert(`Failed to save ${type} configuration.`);
    }
  };

  const handleSyncNow = async (type: ConnectorType) => {
    setSyncingMap((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch(`/api/connectors/${type}/sync`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        alert(`Synced ${json.data.syncedCount || 0} records to ${type.toUpperCase()}.`);
        loadConnectors();
      } else {
        alert(json.error?.message || `Sync failed for ${type}.`);
        loadConnectors();
      }
    } catch {
      alert(`Network error syncing ${type}.`);
    } finally {
      setSyncingMap((prev) => ({ ...prev, [type]: false }));
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'connected':
        return styles.statusConnected;
      case 'syncing':
        return styles.statusSyncing;
      case 'error':
        return styles.statusError;
      default:
        return styles.statusDisconnected;
    }
  };

  return (
    <section id="connectors" className={styles.section} aria-labelledby="connectors-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>🔌</span>
          <h2 id="connectors-heading" className={styles.title}>External App Connectors &amp; Vaults</h2>
        </div>
        <span className={styles.localFirstBadge}>LOCAL-FIRST ARCHITECTURE</span>
      </div>

      <div className={styles.banner}>
        <span className={styles.bannerTitle}>Zero Cloud Lock-in Philosophy</span>
        <p className={styles.bannerDesc}>
          LearnUp runs offline-first with all notes, course syllabi, and telemetry persisted in your local vault. Cloud connectors are optional bridges to your existing knowledge tools (Obsidian, GitHub, Notion, Google Calendar).
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.8125rem', color: '#6B7280' }}>
          Loading connectors...
        </div>
      ) : (
        <div className={styles.grid}>
          {connectors.map((connector) => {
            const isSyncing = syncingMap[connector.type] || connector.status === 'syncing';
            const currentConfig = editingConfig[connector.type] || {};

            return (
              <div key={connector.type} className={styles.connectorCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardLeft}>
                    <span className={styles.connectorIcon} aria-hidden="true">{connector.icon}</span>
                    <div className={styles.cardMeta}>
                      <h3 className={styles.connectorName}>
                        {connector.name}
                        <span className={styles.categoryPill}>{connector.category}</span>
                      </h3>
                      <p className={styles.connectorDesc}>{connector.description}</p>
                    </div>
                  </div>

                  <div className={styles.cardRight}>
                    <span className={`${styles.statusPill} ${getStatusClass(connector.status)}`}>
                      <span className={styles.statusDot} />
                      {connector.status.toUpperCase()}
                    </span>

                    <label className={styles.switch} aria-label={`Toggle ${connector.name}`}>
                      <input
                        type="checkbox"
                        checked={connector.isEnabled}
                        onChange={(e) => handleToggle(connector.type, e.target.checked)}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>
                </div>

                {/* Configuration form for connectors that have fields */}
                {connector.isEnabled && connector.fields.length > 0 && (
                  <div className={styles.configArea}>
                    <div className={styles.fieldsGrid}>
                      {connector.fields.map((field) => (
                        <div key={field.key} className={styles.fieldGroup}>
                          <label className={styles.fieldLabel} htmlFor={`${connector.type}-${field.key}`}>
                            {field.label.toUpperCase()}
                          </label>
                          <input
                            id={`${connector.type}-${field.key}`}
                            type={field.type}
                            className={styles.fieldInput}
                            placeholder={field.placeholder}
                            value={currentConfig[field.key] || ''}
                            onChange={(e) => handleFieldChange(connector.type, field.key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    {connector.errorMessage && (
                      <div className={styles.errorBanner}>
                        <strong>Error:</strong> {connector.errorMessage}
                      </div>
                    )}

                    <div className={styles.actionsRow}>
                      <span className={styles.syncTime}>
                        {connector.lastSyncedAt
                          ? `Last synced: ${new Date(connector.lastSyncedAt).toLocaleString()}`
                          : 'Never synced'}
                      </span>

                      <div className={styles.actionsButtons}>
                        <button
                          type="button"
                          className={styles.saveConfigBtn}
                          onClick={() => handleSaveConfig(connector.type)}
                        >
                          Save Config
                        </button>
                        <button
                          type="button"
                          className={styles.syncBtn}
                          onClick={() => handleSyncNow(connector.type)}
                          disabled={isSyncing}
                        >
                          {isSyncing ? '⏳ Syncing...' : '🔄 Sync Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
