import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LearningItem,
  DurableProgress,
  DurableNote,
  DurableBookmark,
  renderFormattedNote,
} from '@/core';
import { getPlatform } from '@/adapters/platform';
import { YouTubePlayer, YouTubePlayerRef } from '@/components/player/YouTubePlayer';
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
  const playlistVideos: Array<{
    id?: string;
    videoId: string;
    title: string;
    thumbnailUrl?: string | null;
    duration?: string;
    sourcePosition?: number;
  }> = useMemo(() => {
    if (item.sourceType !== 'playlist') return [];
    try {
      if ((item as any).videosJson) {
        return JSON.parse((item as any).videosJson);
      }
    } catch {}
    return [];
  }, [item]);

  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const activeVideo = playlistVideos[activeVideoIndex];
  const activeVideoId = activeVideo?.videoId || item.sourceId;

  const currentProgress = progressList.find((p) => p.youtubeVideoId === activeVideoId);
  const [activeTab, setActiveTab] = useState<'lessons' | 'notes' | 'bookmarks'>(() =>
    playlistVideos.length > 0 ? 'lessons' : 'notes'
  );
  const [autoTrackingActive, setAutoTrackingActive] = useState(false);
  const [playbackTime, setPlaybackTime] = useState<number>(currentProgress?.positionSeconds || 0);
  const [playerEngine, setPlayerEngine] = useState<'custom_player' | 'youtube_native'>('custom_player');
  const customPlayerRef = useRef<YouTubePlayerRef>(null);

  // Sync player engine choice from settings / localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('LearnUp_player_engine');
      if (stored === 'youtube_native' || stored === 'custom_player') {
        setPlayerEngine(stored);
      }
    } catch {}

    const handleEngineChange = (e: Event) => {
      const customEvent = e as CustomEvent<'custom_player' | 'youtube_native'>;
      if (customEvent.detail) {
        setPlayerEngine(customEvent.detail);
      }
    };
    window.addEventListener('LearnUp_player_engine_changed', handleEngineChange);
    return () => window.removeEventListener('LearnUp_player_engine_changed', handleEngineChange);
  }, []);

  useEffect(() => {
    setPlaybackTime(currentProgress?.positionSeconds || 0);
  }, [activeVideoId, currentProgress?.positionSeconds]);

  const handleSeekTo = (seconds: number) => {
    setPlaybackTime(seconds);
    onSaveProgress(activeVideoId, seconds, false);
    if (customPlayerRef.current) {
      customPlayerRef.current.seekTo(seconds);
    } else {
      const iframe = document.getElementById('youtube-player') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
          '*'
        );
      }
    }
  };

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
            onSaveProgress(activeVideoId, t, false);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeVideoId, onSaveProgress]);

  const handleStepTime = (deltaSeconds: number) => {
    const next = Math.max(0, playbackTime + deltaSeconds);
    setPlaybackTime(next);
    onSaveProgress(activeVideoId, next, false);
  };

  const handleToggleCompleted = () => {
    const isComp = !currentProgress?.isCompleted;
    onSaveProgress(activeVideoId, playbackTime, isComp);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    onSaveNote(activeVideoId, noteTitle.trim(), noteContent.trim());
    setNoteTitle('');
    setNoteContent('');
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookmarkLabel.trim()) return;
    const pos = bookmarkTime ? parseInt(bookmarkTime, 10) : playbackTime;
    onSaveBookmark(activeVideoId, isNaN(pos) ? playbackTime : pos, bookmarkLabel.trim());
    setBookmarkLabel('');
    setBookmarkTime('');
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const itemNotes = notes.filter((n) => n.youtubeVideoId === activeVideoId || n.learningItemId === item.id);
  const itemBookmarks = bookmarks.filter((b) => b.youtubeVideoId === activeVideoId || b.learningItemId === item.id);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--sf-color-text-primary)', margin: 0 }}>
              Active Player &amp; Progress Tracker
            </h2>
            <button
              type="button"
              onClick={() => {
                const next = playerEngine === 'custom_player' ? 'youtube_native' : 'custom_player';
                setPlayerEngine(next);
                try {
                  localStorage.setItem('LearnUp_player_engine', next);
                  window.dispatchEvent(new CustomEvent('LearnUp_player_engine_changed', { detail: next }));
                } catch {}
              }}
              style={{
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: playerEngine === 'custom_player' ? 'var(--sf-color-primary-light)' : 'var(--sf-color-surface)',
                color: playerEngine === 'custom_player' ? 'var(--sf-color-primary)' : 'var(--sf-color-text-secondary)',
                border: `1px solid ${playerEngine === 'custom_player' ? 'var(--sf-color-primary)' : 'var(--sf-color-border)'}`,
                cursor: 'pointer'
              }}
              title="Click to toggle between LearnUp Custom Player (HUD & Notes) and Standard YouTube Player"
            >
              {playerEngine === 'custom_player' ? '⚡ LearnUp Custom Player (HUD Active)' : '📺 Standard YouTube Player'}
            </button>
          </div>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: autoTrackingActive || playerEngine === 'custom_player' ? 'var(--sf-color-success-bg)' : 'var(--sf-color-primary-light)',
              color: autoTrackingActive || playerEngine === 'custom_player' ? 'var(--sf-color-success-text)' : 'var(--sf-color-primary)',
              border: `1px solid ${autoTrackingActive || playerEngine === 'custom_player' ? 'var(--sf-color-success-border)' : 'var(--sf-color-primary-border)'}`,
            }}
          >
            {autoTrackingActive || playerEngine === 'custom_player' ? '● Auto-tracking Active' : 'Manual Tracking Fallback'}
          </span>
        </div>

        {/* Video Embed Frame / LearnUp Custom Player */}
        <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', background: '#000', marginBottom: '1rem' }}>
          {playerEngine === 'custom_player' ? (
            <YouTubePlayer
              key={activeVideoId}
              ref={customPlayerRef}
              videoId={activeVideoId}
              title={activeVideo?.title || item.title || "YouTube Video Player"}
              initialPositionSeconds={currentProgress?.positionSeconds || 0}
              onProgressChange={(pos, dur, comp) => {
                setPlaybackTime(pos);
                onSaveProgress(activeVideoId, pos, comp);
              }}
              onCompleted={handleToggleCompleted}
            />
          ) : (
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
              <iframe
                key={activeVideoId}
                id="youtube-player"
                title={activeVideo?.title || item.title || "YouTube Video Player"}
                src={`https://www.youtube.com/embed/${activeVideoId}?enablejsapi=1&rel=0&modestbranding=1&start=${currentProgress?.positionSeconds || 0}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {/* Playback Controls & Timestamp status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '0.5rem', borderTop: '1px solid var(--sf-color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {playlistVideos.length > 1 && (
              <>
                <button
                  type="button"
                  disabled={activeVideoIndex <= 0}
                  onClick={() => setActiveVideoIndex((i) => Math.max(0, i - 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--sf-color-border)',
                    background: activeVideoIndex <= 0 ? 'var(--sf-color-surface-hover)' : 'var(--sf-color-surface)',
                    color: activeVideoIndex <= 0 ? 'var(--sf-color-text-muted)' : 'var(--sf-color-text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: activeVideoIndex <= 0 ? 'not-allowed' : 'pointer'
                  }}
                  title="Previous lesson"
                >
                  ◀ Prev
                </button>
                <button
                  type="button"
                  disabled={activeVideoIndex >= playlistVideos.length - 1}
                  onClick={() => setActiveVideoIndex((i) => Math.min(playlistVideos.length - 1, i + 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--sf-color-border)',
                    background: activeVideoIndex >= playlistVideos.length - 1 ? 'var(--sf-color-surface-hover)' : 'var(--sf-color-surface)',
                    color: activeVideoIndex >= playlistVideos.length - 1 ? 'var(--sf-color-text-muted)' : 'var(--sf-color-text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: activeVideoIndex >= playlistVideos.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Next lesson"
                >
                  Next ▶
                </button>
              </>
            )}
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
            <button
              type="button"
              onClick={() => {
                const platform = getPlatform();
                platform.openExternalUrl(`https://www.youtube.com/watch?v=${activeVideoId}`);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--sf-color-border)',
                background: 'var(--sf-color-surface)',
                color: 'var(--sf-color-text-primary)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Open current lesson on YouTube in your external browser"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#EF4444">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              Watch on YouTube ↗
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

      {/* Tabs: Lessons, Notes & Bookmarks */}
      <section style={{ background: 'var(--sf-color-card-bg)', border: '1px solid var(--sf-color-card-border)', borderRadius: '12px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--sf-color-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          {playlistVideos.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('lessons')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'lessons' ? 'var(--sf-color-primary-light)' : 'transparent',
                color: activeTab === 'lessons' ? 'var(--sf-color-primary)' : 'var(--sf-color-text-secondary)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Lessons ({playlistVideos.length})
            </button>
          )}
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

        {activeTab === 'lessons' && playlistVideos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {playlistVideos.map((vid, idx) => {
              const isSelected = idx === activeVideoIndex;
              const vidProgress = progressList.find((p) => p.youtubeVideoId === vid.videoId);
              const isDone = vidProgress?.isCompleted;
              return (
                <div
                  key={vid.videoId || idx}
                  onClick={() => setActiveVideoIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid var(--sf-color-primary)' : '1px solid var(--sf-color-border)',
                    background: isSelected ? 'var(--sf-color-primary-light)' : 'var(--sf-color-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isDone
                        ? 'var(--sf-color-success)'
                        : isSelected
                        ? 'var(--sf-color-primary)'
                        : 'var(--sf-color-surface-hover)',
                      color: isDone || isSelected ? '#fff' : 'var(--sf-color-text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? '✓' : idx + 1}
                  </span>
                  {vid.thumbnailUrl && (
                    <img
                      src={vid.thumbnailUrl}
                      alt=""
                      style={{ width: '64px', height: '36px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? 'var(--sf-color-primary)' : 'var(--sf-color-text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {vid.title}
                    </div>
                    {vid.duration && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--sf-color-text-muted)', marginTop: '2px' }}>
                        {vid.duration}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sf-color-primary)', flexShrink: 0 }}>
                      Playing
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : activeTab === 'notes' ? (
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
                <div
                  key={bm.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--sf-color-border)', background: 'var(--sf-color-surface)', cursor: 'pointer' }}
                  onClick={() => handleSeekTo(bm.positionSeconds)}
                  title={`Jump to ${formatSeconds(bm.positionSeconds)}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--sf-color-primary)' }}>
                      {formatSeconds(bm.positionSeconds)}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--sf-color-text-primary)' }}>{bm.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBookmark(bm.id);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--sf-color-error)', cursor: 'pointer', padding: '2px 6px' }}
                    title="Delete bookmark"
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
