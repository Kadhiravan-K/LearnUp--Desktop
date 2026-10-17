import React, { useState, useEffect, useRef } from 'react';
import {
  LearningItem,
  DurableProgress,
  DurableNote,
  DurableBookmark,
  renderFormattedNote,
} from '@/core';
import styles from './ItemDetail.module.css';

interface PlayerViewProps {
  item: LearningItem;
  progressList: DurableProgress[];
  notes: DurableNote[];
  bookmarks: DurableBookmark[];
  onBack: () => void;
  onSaveProgress: (videoId: string, positionSeconds: number, isCompleted: boolean) => void;
  onSaveNote: (videoId: string, title: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onSaveBookmark: (videoId: string, positionSeconds: number, label: string) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
}

export function PlayerView({
  item,
  progressList,
  notes,
  bookmarks,
  onBack,
  onSaveProgress,
  onSaveNote,
  onDeleteNote,
  onSaveBookmark,
  onDeleteBookmark,
}: PlayerViewProps) {
  const currentProgress = progressList.find((p) => p.youtubeVideoId === item.sourceId);
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes');
  const [autoTrackingActive, setAutoTrackingActive] = useState(false);
  const [playbackTime, setPlaybackTime] = useState<number>(currentProgress?.positionSeconds || 0);

  // Note creation state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Bookmark creation state
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [bookmarkTime, setBookmarkTime] = useState('');

  // Auto-tracking YouTube postMessage listener
  const lastSaveRef = useRef(0);
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== 'object') return;

      if (data.event === 'infoDelivery' && data.info) {
        setAutoTrackingActive(true);
        if (typeof data.info.currentTime === 'number') {
          const t = Math.floor(data.info.currentTime);
          setPlaybackTime(t);
          const now = Date.now();
          if (data.info.playerState === 1 && now - lastSaveRef.current > 5000) {
            lastSaveRef.current = now;
            onSaveProgress(item.sourceId, t, false);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [item.sourceId, onSaveProgress]);

  const handleStepTime = (deltaSeconds: number) => {
    const next = Math.max(0, playbackTime + deltaSeconds);
    setPlaybackTime(next);
    onSaveProgress(item.sourceId, next, false);
  };

  const handleToggleCompleted = () => {
    const isComp = !currentProgress?.isCompleted;
    onSaveProgress(item.sourceId, playbackTime, isComp);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    onSaveNote(item.sourceId, noteTitle.trim(), noteContent.trim());
    setNoteTitle('');
    setNoteContent('');
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookmarkLabel.trim()) return;
    const pos = bookmarkTime ? parseInt(bookmarkTime, 10) : playbackTime;
    onSaveBookmark(item.sourceId, isNaN(pos) ? playbackTime : pos, bookmarkLabel.trim());
    setBookmarkLabel('');
    setBookmarkTime('');
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const itemNotes = notes.filter((n) => n.youtubeVideoId === item.sourceId || n.learningItemId === item.id);
  const itemBookmarks = bookmarks.filter((b) => b.youtubeVideoId === item.sourceId || b.learningItemId === item.id);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeading}>
          <button
            type="button"
            onClick={onBack}
            className={styles.backButton}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <svg className={styles.backIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Library</span>
          </button>
          <div className={styles.breadcrumbBar}>
            <span className={styles.playlistName}>{item.sourceType === 'playlist' ? 'Playlist Course' : 'Video Lecture'}</span>
            <span className={styles.breadcrumbDivider}>/</span>
            <span className={styles.lectureBadge}>{item.channelTitle || 'YouTube'}</span>
          </div>
          <h1 className={styles.title}>{item.title}</h1>
        </div>
      </header>

      {/* Active Player & Progress Tracker Section */}
      <section
        style={{
          background: 'var(--sf-color-card-bg)',
          border: '1px solid var(--sf-color-card-border)',
          borderRadius: '12px',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--sf-color-text-primary)', margin: 0 }}>
            Active Player &amp; Progress Tracker
          </h2>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: autoTrackingActive ? 'var(--sf-color-success-bg)' : 'var(--sf-color-primary-light)',
              color: autoTrackingActive ? 'var(--sf-color-success-text)' : 'var(--sf-color-primary)',
              border: `1px solid ${autoTrackingActive ? 'var(--sf-color-success-border)' : 'var(--sf-color-primary-border)'}`,
            }}
          >
            {autoTrackingActive ? '● Auto-tracking Active' : 'Manual Tracking Fallback'}
          </span>
        </div>

        {/* Video Embed Frame */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '8px', overflow: 'hidden', background: '#000', marginBottom: '1rem' }}>
          <iframe
            id="youtube-player"
            title="YouTube Video Player"
            src={`https://www.youtube.com/embed/${item.sourceId}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}&start=${currentProgress?.positionSeconds || 0}`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Playback Controls & Timestamp status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '0.5rem', borderTop: '1px solid var(--sf-color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleStepTime(-300)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--sf-color-border)', background: 'var(--sf-color-surface)', color: 'var(--sf-color-text-primary)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
            >
              -5 Min
            </button>
            <button
              type="button"
              onClick={() => handleStepTime(300)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--sf-color-border)', background: 'var(--sf-color-surface)', color: 'var(--sf-color-text-primary)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
            >
              +5 Min
            </button>
            <button
              type="button"
              onClick={handleToggleCompleted}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: currentProgress?.isCompleted ? 'var(--sf-color-success)' : 'var(--sf-color-primary)',
                color: '#fff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {currentProgress?.isCompleted ? '✓ Completed' : 'Mark Completed'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--sf-color-text-secondary)' }}>
              Saved Position: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--sf-color-primary)' }}>{formatSeconds(playbackTime)}</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--sf-color-text-muted)' }}>
              (Complies with YouTube Policy &amp; Terms)
            </span>
          </div>
        </div>
      </section>

      {/* Tabs: Notes & Bookmarks */}
      <section style={{ background: 'var(--sf-color-card-bg)', border: '1px solid var(--sf-color-card-border)', borderRadius: '12px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--sf-color-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'notes' ? 'var(--sf-color-primary-light)' : 'transparent',
              color: activeTab === 'notes' ? 'var(--sf-color-primary)' : 'var(--sf-color-text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Notes ({itemNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'bookmarks' ? 'var(--sf-color-primary-light)' : 'transparent',
              color: activeTab === 'bookmarks' ? 'var(--sf-color-primary)' : 'var(--sf-color-text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Bookmarks ({itemBookmarks.length})
          </button>
        </div>

        {activeTab === 'notes' ? (
          <div>
            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Note Title (Optional)..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--sf-color-border)', background: 'var(--sf-color-surface)', color: 'var(--sf-color-text-primary)' }}
              />
              <textarea
                rows={3}
                placeholder="Take markdown notes for this lecture..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--sf-color-border)', background: 'var(--sf-color-surface)', color: 'var(--sf-color-text-primary)', font: 'inherit' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  style={{ background: 'none', border: 'none', color: 'var(--sf-color-primary)', fontSize: '0.8125rem', cursor: 'pointer' }}
                >
                  {isPreviewMode ? 'Edit Raw' : 'Preview Note'}
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--sf-color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Note to SQLite
                </button>
              </div>
              {isPreviewMode && noteContent && (
                <div style={{ padding: '12px', borderRadius: '6px', background: 'var(--sf-color-surface-hover)', fontSize: '0.875rem' }}>
                  {renderFormattedNote(noteContent)}
                </div>
              )}
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {itemNotes.map((n) => (
                <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px', borderRadius: '8px', border: '1px solid var(--sf-color-border)', background: 'var(--sf-color-surface)' }}>
                  <div>
                    {n.title && <h4 style={{ margin: '0 0 4px', fontSize: '0.9375rem', color: 'var(--sf-color-text-primary)' }}>{n.title}</h4>}
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--sf-color-text-secondary)', whiteSpace: 'pre-wrap' }}>{n.content}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--sf-color-text-muted)', marginTop: '4px', display: 'block' }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    title="Delete Note"
                    onClick={() => onDeleteNote(n.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--sf-color-error)', cursor: 'pointer', padding: '4px' }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <form onSubmit={handleAddBookmark} style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Bookmark label (e.g., Intro, Key Concept)..."
                value={bookmarkLabel}
                onChange={(e) => setBookmarkLabel(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--sf-color-border)', background: 'var(--sf-color-surface)', color: 'var(--sf-color-text-primary)' }}
              />
              <input
                type="text"
                placeholder="Seconds (optional)"
                value={bookmarkTime}
                onChange={(e) => setBookmarkTime(e.target.value)}
                style={{ width: '120px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--sf-color-border)', background: 'var(--sf-color-surface)', color: 'var(--sf-color-text-primary)' }}
              />
              <button
                type="submit"
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--sf-color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                + Add Bookmark
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {itemBookmarks.map((bm) => (
                <div key={bm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--sf-color-border)', background: 'var(--sf-color-surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--sf-color-primary)' }}>
                      {formatSeconds(bm.positionSeconds)}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--sf-color-text-primary)' }}>{bm.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteBookmark(bm.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--sf-color-error)', cursor: 'pointer', padding: '2px 6px' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
