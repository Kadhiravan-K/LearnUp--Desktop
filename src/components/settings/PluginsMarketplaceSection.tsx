'use client';

import React, { useState, useEffect } from 'react';
import { LearnUpPlugin, PluginCategory, PluginKind } from '@/lib/types';
import styles from './PluginsMarketplaceSection.module.css';

interface MergedPlugin extends LearnUpPlugin {
  isEnabled: boolean;
  isInstalled?: boolean;
  config: Record<string, any>;
}

export function PluginsMarketplaceSection() {
  const [plugins, setPlugins] = useState<MergedPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<'all' | 'plugin' | 'skill'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plugins');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          // Read local uninstalled plugins if any
          const uninstalledRaw = typeof window !== 'undefined' ? localStorage.getItem('LearnUp_uninstalled_plugins') : null;
          const uninstalledSet = new Set(uninstalledRaw ? JSON.parse(uninstalledRaw) : []);

          const enhanced: MergedPlugin[] = json.data.map((p: any) => ({
            ...p,
            kind: p.kind || (p.category === 'ai_skills' || p.id.includes('diagnostic') || p.id.includes('srs') ? 'skill' : 'plugin'),
            isInstalled: !uninstalledSet.has(p.id)
          }));
          setPlugins(enhanced);
        }
      }
    } catch {
      // Safe fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  const handleToggle = async (pluginId: string, newEnabled: boolean) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === pluginId ? { ...p, isEnabled: newEnabled } : p))
    );

    try {
      localStorage.setItem(`LearnUp_plugin_${pluginId}_enabled`, String(newEnabled));
      window.dispatchEvent(new CustomEvent('LearnUp_plugins_updated', { detail: { pluginId, enabled: newEnabled } }));

      await fetch('/api/plugins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plugin_id: pluginId,
          is_enabled: newEnabled
        })
      });
      showToast(newEnabled ? 'Plugin enabled successfully.' : 'Plugin disabled.');
    } catch {
      loadPlugins();
    }
  };

  const handleInstall = (pluginId: string) => {
    setInstallingId(pluginId);
    setTimeout(() => {
      // Update local storage uninstalled list
      const uninstalledRaw = localStorage.getItem('LearnUp_uninstalled_plugins');
      const uninstalledSet = new Set(uninstalledRaw ? JSON.parse(uninstalledRaw) : []);
      uninstalledSet.delete(pluginId);
      localStorage.setItem('LearnUp_uninstalled_plugins', JSON.stringify(Array.from(uninstalledSet)));
      localStorage.setItem(`LearnUp_plugin_${pluginId}_enabled`, 'true');
      window.dispatchEvent(new CustomEvent('LearnUp_plugins_updated', { detail: { pluginId, enabled: true } }));

      setPlugins((prev) =>
        prev.map((p) => (p.id === pluginId ? { ...p, isInstalled: true, isEnabled: true } : p))
      );
      setInstallingId(null);
      showToast('Plugin downloaded & installed successfully!');
      handleToggle(pluginId, true);
    }, 800);
  };

  const handleDelete = (pluginId: string) => {
    setDeletingId(pluginId);
    setTimeout(() => {
      const uninstalledRaw = localStorage.getItem('LearnUp_uninstalled_plugins');
      const uninstalledSet = new Set(uninstalledRaw ? JSON.parse(uninstalledRaw) : []);
      uninstalledSet.add(pluginId);
      localStorage.setItem('LearnUp_uninstalled_plugins', JSON.stringify(Array.from(uninstalledSet)));
      localStorage.setItem(`LearnUp_plugin_${pluginId}_enabled`, 'false');
      window.dispatchEvent(new CustomEvent('LearnUp_plugins_updated', { detail: { pluginId, enabled: false } }));

      setPlugins((prev) =>
        prev.map((p) => (p.id === pluginId ? { ...p, isInstalled: false, isEnabled: false } : p))
      );
      setDeletingId(null);
      showToast('Plugin uninstalled and deleted from library.');
      handleToggle(pluginId, false);
    }, 600);
  };

  const categories = [
    { id: 'all', label: 'All Domains', icon: '🌐' },
    { id: 'coding_vibe', label: 'Coding & Vibe AI', icon: '💻' },
    { id: 'engineering', label: 'Engineering & Systems', icon: '🛠️' },
    { id: 'api_data', label: 'API & Data Tooling', icon: '🔌' },
    { id: 'design_creative', label: 'Design & Creative', icon: '🎨' },
    { id: 'learning_science', label: 'Learning Science', icon: '🧠' },
    { id: 'productivity', label: 'Productivity & Focus', icon: '⏱️' }
  ];

  const filteredPlugins = plugins.filter((p) => {
    // 1. Kind filter (Plugin vs Skill)
    if (kindFilter !== 'all' && p.kind !== kindFilter) return false;
    // 2. Domain category filter
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    return true;
  });

  const pluginCount = plugins.filter((p) => p.kind === 'plugin').length;
  const skillCount = plugins.filter((p) => p.kind === 'skill').length;

  return (
    <section id="plugins-marketplace" className={styles.section} aria-labelledby="plugins-heading">
      {toastMessage && <div className={styles.toastNotification}>{toastMessage}</div>}

      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>🧩</span>
          <h2 id="plugins-heading" className={styles.title}>Plugins &amp; AI Skills Workstation</h2>
        </div>
        <span className={styles.marketplaceBadge}>MODULAR EXTENSIBILITY</span>
      </div>

      <p className={styles.description}>
        Plugins provide interactive developer tools, visual analyzers, and vault exporters. AI Skills power cognitive diagnostics, retention models, and adaptive tutoring.
      </p>

      {/* Kind Segmented Control: All vs Plugins vs AI Skills */}
      <div className={styles.kindSegmentedControl}>
        <button
          type="button"
          className={`${styles.kindBtn} ${kindFilter === 'all' ? styles.kindBtnActive : ''}`}
          onClick={() => setKindFilter('all')}
        >
          <span>🌐 All Capabilities</span>
          <span className={styles.kindCount}>{plugins.length}</span>
        </button>
        <button
          type="button"
          className={`${styles.kindBtn} ${kindFilter === 'plugin' ? styles.kindBtnActive : ''}`}
          onClick={() => setKindFilter('plugin')}
        >
          <span>🧩 Plugins &amp; Tools</span>
          <span className={styles.kindCount}>{pluginCount}</span>
        </button>
        <button
          type="button"
          className={`${styles.kindBtn} ${kindFilter === 'skill' ? styles.kindBtnActive : ''}`}
          onClick={() => setKindFilter('skill')}
        >
          <span>🧠 AI Skills &amp; Cognition</span>
          <span className={styles.kindCount}>{skillCount}</span>
        </button>
      </div>

      {/* Domain Category Filter Tabs */}
      <div className={styles.filterBar}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`${styles.filterBtn} ${selectedCategory === cat.id ? styles.filterBtnActive : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span style={{ marginRight: '4px' }}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--sf-color-text-secondary)' }}>
          Loading extensible plugins &amp; AI skills...
        </div>
      ) : filteredPlugins.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--sf-color-text-secondary)' }}>
          No items found in this view.
        </div>
      ) : (
        <div className={styles.pluginsGrid}>
          {filteredPlugins.map((plugin) => {
            const isInstalled = plugin.isInstalled !== false;
            const isPlugin = plugin.kind === 'plugin';

            return (
              <div
                key={plugin.id}
                className={`${styles.pluginCard} ${!isInstalled ? styles.pluginCardUninstalled : ''}`}
              >
                <div className={styles.pluginTop}>
                  <div className={styles.pluginIdentity}>
                    <span className={styles.pluginIcon} aria-hidden="true">{plugin.icon}</span>
                    <div className={styles.pluginMeta}>
                      <div className={styles.nameRow}>
                        <h3 className={styles.pluginName}>{plugin.name}</h3>
                        <span className={isPlugin ? styles.kindBadgePlugin : styles.kindBadgeSkill}>
                          {isPlugin ? 'PLUGIN' : 'AI SKILL'}
                        </span>
                      </div>
                      <span className={styles.pluginAuthor}>
                        v{plugin.version} • {plugin.author}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardTopRight}>
                    {isInstalled ? (
                      <label
                        className={styles.toggleSwitch}
                        title={plugin.isEnabled ? 'Disable capability' : 'Enable capability'}
                      >
                        <input
                          type="checkbox"
                          checked={plugin.isEnabled}
                          onChange={(e) => handleToggle(plugin.id, e.target.checked)}
                          aria-label={`Toggle ${plugin.name}`}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    ) : (
                      <span className={styles.notInstalledTag}>Not Installed</span>
                    )}
                  </div>
                </div>

                <p className={styles.pluginDesc}>{plugin.description}</p>

                <div className={styles.capabilitiesList}>
                  {plugin.capabilities.slice(0, 3).map((cap, i) => (
                    <span key={i} className={styles.capabilityBadge}>
                      ✓ {cap}
                    </span>
                  ))}
                </div>

                {/* Installation & Management Footer */}
                <div className={styles.pluginFooter}>
                  <span className={styles.statusIndicator}>
                    <span
                      className={`${styles.statusDot} ${
                        isInstalled && plugin.isEnabled ? styles.statusDotActive : styles.statusDotInactive
                      }`}
                    />
                    <span>
                      {!isInstalled
                        ? 'Available to Download'
                        : plugin.isEnabled
                        ? 'Active in Workspace'
                        : 'Installed (Inactive)'}
                    </span>
                  </span>

                  <div className={styles.footerActions}>
                    {!isInstalled ? (
                      <button
                        type="button"
                        className={styles.downloadBtn}
                        onClick={() => handleInstall(plugin.id)}
                        disabled={installingId === plugin.id}
                      >
                        <span>⬇️</span>
                        <span>{installingId === plugin.id ? 'Downloading...' : 'Download & Install'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.deletePluginBtn}
                        onClick={() => handleDelete(plugin.id)}
                        disabled={deletingId === plugin.id}
                        title="Uninstall and remove from library"
                      >
                        <span>🗑️</span>
                        <span>{deletingId === plugin.id ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
