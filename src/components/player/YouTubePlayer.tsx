'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef
} from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { usePlayerShortcuts } from '@/lib/hooks/usePlayerShortcuts';
import styles from './YouTubePlayer.module.css';

export interface YouTubePlayerRef {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
}

export interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  onCompleted?: () => void;
  initialPositionSeconds?: number;
  onProgressChange?: (pos: number, dur: number, completed: boolean) => void;
}

export type DeviceMode = 'phone' | 'tablet' | 'laptop' | 'vr';

const COMPLETION_THRESHOLD = 0.90;

/**
 * Calculates whether a video should be marked as completed.
 * Exported for unit testing.
 */
export function isVideoCompleted(positionSeconds: number, durationSeconds: number): boolean {
  return durationSeconds > 0 && (positionSeconds / durationSeconds) >= COMPLETION_THRESHOLD;
}

/**
 * Sanitizes a raw video identifier to extract a valid YouTube video ID.
 * Strips preview prefixes (video-, pv-) and extracts 11-character YouTube video IDs.
 * Exported for unit testing.
 */
export function sanitizeVideoId(rawId: string): string {
  if (!rawId) return '';
  const trimmed = rawId.trim();
  const stripped = trimmed.replace(/^(video-|pv-)/i, '');
  const match = stripped.match(/^[a-zA-Z0-9_-]{11}/);
  if (match) {
    return match[0];
  }
  return stripped;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(function YouTubePlayer(
  { videoId, title = 'LearnUp Player', onCompleted, initialPositionSeconds, onProgressChange },
  ref
) {
  const cleanVideoId = sanitizeVideoId(videoId);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const { shortcuts } = usePlayerShortcuts();

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedFraction, setBufferedFraction] = useState(0);
  const [startSeconds, setStartSeconds] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [ccEnabled, setCcEnabled] = useState(false);
  const [ccLanguage, setCcLanguage] = useState<string>('en');
  const [isMuted, setIsMuted] = useState(false);
  const [annotationsEnabled, setAnnotationsEnabled] = useState(true);

  // Sleep Timer state
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | 'end' | 'off'>('off');
  const [sleepTimerRemainingSeconds, setSleepTimerRemainingSeconds] = useState<number | null>(null);

  // Custom Player HUD & Gestures
  const [volume, setVolume] = useState<number>(80);
  const [brightness, setBrightness] = useState<number>(100);
  const [showControls, setShowControls] = useState(true);
  const [isSpeedBoostActive, setIsSpeedBoostActive] = useState(false);
  const [activeOverlayHud, setActiveOverlayHud] = useState<{
    type: 'brightness' | 'volume' | 'seek-left' | 'seek-right' | 'speed-boost' | null;
    value?: number | string;
  }>({ type: null });

  // Popover menus
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeDevice, setActiveDevice] = useState<DeviceMode>('laptop');

  // Timers & tracking refs
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const gestureStartRef = useRef<{ y: number; x: number; isLeft: boolean; initialVal: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressPollRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedPositionRef = useRef<number>(-1);
  const previousSpeedRef = useRef<number>(1.0);
  const sleepTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-detect responsive device mode in background
  useEffect(() => {
    const handleAutoDetectDevice = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setActiveDevice('phone');
      } else if (w < 1024) {
        setActiveDevice('tablet');
      } else {
        setActiveDevice('laptop');
      }
    };
    handleAutoDetectDevice();
    window.addEventListener('resize', handleAutoDetectDevice);
    return () => window.removeEventListener('resize', handleAutoDetectDevice);
  }, []);

  // Sleep Timer Countdown
  useEffect(() => {
    if (sleepTimerMinutes === 'off') {
      setSleepTimerRemainingSeconds(null);
      if (sleepTimerIntervalRef.current) clearInterval(sleepTimerIntervalRef.current);
      return;
    }

    if (sleepTimerMinutes === 'end') {
      return;
    }

    const totalSeconds = (sleepTimerMinutes as number) * 60;
    setSleepTimerRemainingSeconds(totalSeconds);

    if (sleepTimerIntervalRef.current) clearInterval(sleepTimerIntervalRef.current);

    sleepTimerIntervalRef.current = setInterval(() => {
      setSleepTimerRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
            playerRef.current.pauseVideo();
          }
          if (sleepTimerIntervalRef.current) clearInterval(sleepTimerIntervalRef.current);
          setSleepTimerMinutes('off');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (sleepTimerIntervalRef.current) clearInterval(sleepTimerIntervalRef.current);
    };
  }, [sleepTimerMinutes]);

  // Imperative ref for notes and timestamp bookmark seeking
  useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds: number) => {
        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(seconds, true);
          setCurrentTime(seconds);
        }
      },
      getCurrentTime: () => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          return Math.floor(playerRef.current.getCurrentTime());
        }
        return Math.floor(currentTime);
      }
    }),
    [currentTime]
  );

  // Reset error when video changes
  useEffect(() => {
    setHasError(false);
    setErrorMessage(null);
  }, [cleanVideoId]);

  // Fetch initial user progress for resume
  useEffect(() => {
    setIsReady(false);
    lastSyncedPositionRef.current = -1;

    if (initialPositionSeconds && initialPositionSeconds > 0) {
      setStartSeconds(initialPositionSeconds);
      return;
    }

    setStartSeconds(0);
    if (!cleanVideoId) return;

    const abortController = new AbortController();

    fetch(`/api/progress/${cleanVideoId}`, { signal: abortController.signal })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((resJson) => {
        if (!resJson) return;
        const data = resJson.data || resJson;
        if (!data.is_completed && data.position_seconds) {
          setStartSeconds(data.position_seconds);
        }
      })
      .catch(() => {
        // Safe desktop fallback
      });

    return () => {
      stopPolling();
      abortController.abort();
    };
  }, [cleanVideoId, initialPositionSeconds]);

  // Background progress sync
  const syncProgress = useCallback(
    async (player: any) => {
      if (!player || !cleanVideoId) return;
      try {
        const pos = Math.floor(player.getCurrentTime() || 0);
        const dur = Math.floor(player.getDuration() || 0);

        if (pos === lastSyncedPositionRef.current) return;
        lastSyncedPositionRef.current = pos;

        const completed = isVideoCompleted(pos, dur);

        if (onProgressChange) {
          onProgressChange(pos, dur, completed);
        }

        fetch('/api/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            youtubeVideoId: cleanVideoId,
            positionSeconds: pos,
            durationSeconds: dur,
            isCompleted: completed
          })
        }).catch(() => {
          // Ignore desktop 404
        });
      } catch (error) {
        console.error('Failed to sync progress:', error);
      }
    },
    [cleanVideoId, onProgressChange]
  );

  const startPolling = useCallback(
    (player: any) => {
      stopPolling();
      intervalRef.current = setInterval(() => {
        syncProgress(player);
      }, 10000);
    },
    [syncProgress]
  );

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // High-frequency UI time updater for scrubber
  useEffect(() => {
    if (isPlaying) {
      progressPollRef.current = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const cur = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          const loaded = playerRef.current.getVideoLoadedFraction() || 0;
          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);
          setBufferedFraction(loaded);
        }
      }, 250);
    } else {
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
      }
    }
    return () => {
      if (progressPollRef.current) clearInterval(progressPollRef.current);
    };
  }, [isPlaying]);

  // Player Ready
  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    try {
      playerRef.current = event.target;
      setIsReady(true);
      setHasError(false);
      if (startSeconds > 0 && event.target?.seekTo) {
        event.target.seekTo(startSeconds, true);
        setCurrentTime(startSeconds);
      }
      const dur = event.target?.getDuration ? event.target.getDuration() : 0;
      if (dur) setDuration(dur);
      if (event.target?.setVolume) event.target.setVolume(volume);
    } catch (e) {
      console.warn('YouTube onReady error caught:', e);
    }
  };

  // Player Error Handler
  const onPlayerError: YouTubeProps['onError'] = (event) => {
    try {
      setIsPlaying(false);
      setHasError(true);
      const errorCode = event?.data;
      let msg = 'Unable to play this video. It may be private, deleted, or restricted from embedded playback.';
      if (errorCode === 101 || errorCode === 150) {
        msg = 'The video owner does not allow embedding this video on external sites.';
      } else if (errorCode === 100) {
        msg = 'This video has been removed or marked as private.';
      }
      setErrorMessage(msg);
    } catch (e) {
      console.warn('YouTube onError handling error caught:', e);
    }
  };

  // Player State Change
  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    try {
      if (event.data === 1) {
        setIsPlaying(true);
        startPolling(event.target);
      } else if (event.data === 2) {
        setIsPlaying(false);
        stopPolling();
        syncProgress(event.target);
      } else if (event.data === 0) {
        setIsPlaying(false);
        stopPolling();
        syncProgress(event.target);
        if (sleepTimerMinutes === 'end') {
          setSleepTimerMinutes('off');
        }
        if (onCompleted) {
          onCompleted();
        }
      }
    } catch (e) {
      console.warn('YouTube onStateChange handling error caught:', e);
    }
  };

  // Show / Hide HUD controls
  const showHUD = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettingsMenu(false);
      }, 3500);
    }
  }, [isPlaying]);

  const triggerHudIndicator = (
    type: 'brightness' | 'volume' | 'seek-left' | 'seek-right' | 'speed-boost',
    value?: number | string
  ) => {
    setActiveOverlayHud({ type, value });
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setActiveOverlayHud({ type: null });
    }, 1200);
  };

  // Play / Pause Toggle
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    showHUD();
  }, [isPlaying, showHUD]);

  // Seek
  const handleSeek = useCallback((newSecs: number) => {
    const clamped = Math.max(0, Math.min(duration, newSecs));
    setCurrentTime(clamped);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(clamped, true);
    }
  }, [duration]);

  const handleSkip = useCallback((deltaSeconds: number) => {
    const target = currentTime + deltaSeconds;
    handleSeek(target);
    if (deltaSeconds < 0) {
      triggerHudIndicator('seek-left', `${Math.abs(deltaSeconds)}s`);
    } else {
      triggerHudIndicator('seek-right', `${deltaSeconds}s`);
    }
    showHUD();
  }, [currentTime, handleSeek, showHUD]);

  // Volume Adjustment
  const handleVolumeChange = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    setVolume(clamped);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(clamped);
      if (clamped > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
    triggerHudIndicator('volume', `${clamped}%`);
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
      triggerHudIndicator('volume', `${volume}%`);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
      triggerHudIndicator('volume', 'Muted');
    }
  }, [isMuted, volume]);

  // Brightness Adjustment (20% to 150%)
  const handleBrightnessChange = useCallback((newBri: number) => {
    const clamped = Math.max(20, Math.min(150, Math.round(newBri)));
    setBrightness(clamped);
    triggerHudIndicator('brightness', `${clamped}%`);
  }, []);

  // Speed Adjustment
  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(speed);
    }
  }, []);

  // Captions Toggle & Language Change
  const handleCcLanguageChange = useCallback((lang: string) => {
    setCcLanguage(lang);
    if (lang === 'off') {
      setCcEnabled(false);
      if (playerRef.current) {
        try {
          playerRef.current.unloadModule?.('captions');
          playerRef.current.setOption?.('captions', 'track', {});
        } catch (e) {
          console.warn('Captions module notice:', e);
        }
      }
    } else {
      setCcEnabled(true);
      if (playerRef.current) {
        try {
          playerRef.current.loadModule?.('captions');
          playerRef.current.setOption?.('captions', 'track', { languageCode: lang });
        } catch (e) {
          console.warn('Captions module notice:', e);
        }
      }
    }
  }, []);

  const toggleCaptions = useCallback(() => {
    if (ccEnabled) {
      handleCcLanguageChange('off');
    } else {
      handleCcLanguageChange('en');
    }
    showHUD();
  }, [ccEnabled, handleCcLanguageChange, showHUD]);

  // Quality Adjustment (only numbers shown)
  const handleQualityChange = useCallback((qualityNum: string) => {
    setSelectedQuality(qualityNum);
    const ytQualityMap: Record<string, string> = {
      '1080p': 'hd1080',
      '720p': 'hd720',
      '480p': 'large',
      '360p': 'medium',
      '240p': 'small',
      '144p': 'tiny',
      'Auto': 'auto'
    };
    const mapped = ytQualityMap[qualityNum] || 'auto';
    if (playerRef.current && typeof playerRef.current.setPlaybackQuality === 'function') {
      playerRef.current.setPlaybackQuality(mapped);
    }
  }, []);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(console.error);
    } else {
      document.exitFullscreen?.().catch(console.error);
    }
  }, []);

  // -------------------------------------------------------------
  // Touch / Pointer Gesture Handling
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    showHUD();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;

    // Long press detection for 2X Speed Boost
    previousSpeedRef.current = playbackSpeed;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      setIsSpeedBoostActive(true);
      if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
        playerRef.current.setPlaybackRate(2.0);
      }
      triggerHudIndicator('speed-boost', '2X SPEED');
    }, 240);

    // Gesture initiation for Brightness (left) or Volume (right)
    gestureStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      isLeft: isLeftHalf,
      initialVal: isLeftHalf ? brightness : volume
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!gestureStartRef.current) return;

    const deltaY = gestureStartRef.current.y - e.clientY;
    const deltaX = Math.abs(gestureStartRef.current.x - e.clientX);

    if (Math.abs(deltaY) > 10 || deltaX > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    if (Math.abs(deltaY) > 8) {
      const step = deltaY * 0.4;
      if (gestureStartRef.current.isLeft) {
        handleBrightnessChange(gestureStartRef.current.initialVal + step);
      } else {
        handleVolumeChange(gestureStartRef.current.initialVal + step);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isSpeedBoostActive) {
      setIsSpeedBoostActive(false);
      if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
        playerRef.current.setPlaybackRate(previousSpeedRef.current);
      }
      setActiveOverlayHud({ type: null });
    }

    // Double tap detection
    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    let isDoubleTap = false;
    if (rect && now - lastTapRef.current.time < 300) {
      const x = e.clientX - rect.left;
      if (x < rect.width * 0.35) {
        handleSkip(-10);
        isDoubleTap = true;
      } else if (x > rect.width * 0.65) {
        handleSkip(10);
        isDoubleTap = true;
      }
    }

    // Single tap/click toggles play/pause if no drag occurred
    if (!isDoubleTap && gestureStartRef.current) {
      const movedX = Math.abs(e.clientX - gestureStartRef.current.x);
      const movedY = Math.abs(e.clientY - gestureStartRef.current.y);
      if (movedX < 8 && movedY < 8) {
        togglePlayPause();
      }
    }

    lastTapRef.current = { time: now, x: e.clientX };
    gestureStartRef.current = null;
  };

  // Mouse wheel scroll for Brightness (left) or Volume (right)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const isLeft = e.clientX - rect.left < rect.width / 2;
    const delta = e.deltaY < 0 ? 5 : -5;
    if (isLeft) {
      handleBrightnessChange(brightness + delta);
    } else {
      handleVolumeChange(volume + delta);
    }
  };

  // Keyboard Shortcuts via usePlayerShortcuts
  const handlersRef = useRef({
    togglePlayPause,
    handleSkip,
    handleVolumeChange,
    toggleMute,
    toggleFullscreen,
    toggleCaptions,
    volume,
    shortcuts
  });

  useEffect(() => {
    handlersRef.current = {
      togglePlayPause,
      handleSkip,
      handleVolumeChange,
      toggleMute,
      toggleFullscreen,
      toggleCaptions,
      volume,
      shortcuts
    };
  }, [
    togglePlayPause,
    handleSkip,
    handleVolumeChange,
    toggleMute,
    toggleFullscreen,
    toggleCaptions,
    volume,
    shortcuts
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const h = handlersRef.current;
      const key = e.key;

      const matches = (conf: string) => {
        if (!conf) return false;
        if (conf.toLowerCase() === 'space' && key === ' ') return true;
        return conf.toLowerCase() === key.toLowerCase();
      };

      if (matches(h.shortcuts.togglePlay) || key === ' ' || key.toLowerCase() === 'k') {
        e.preventDefault();
        h.togglePlayPause();
      } else if (matches(h.shortcuts.seekBackward) || key === 'ArrowLeft' || key.toLowerCase() === 'j') {
        e.preventDefault();
        h.handleSkip(-10);
      } else if (matches(h.shortcuts.seekForward) || key === 'ArrowRight' || key.toLowerCase() === 'l') {
        e.preventDefault();
        h.handleSkip(10);
      } else if (matches(h.shortcuts.volumeUp) || key === 'ArrowUp') {
        e.preventDefault();
        h.handleVolumeChange(h.volume + 5);
      } else if (matches(h.shortcuts.volumeDown) || key === 'ArrowDown') {
        e.preventDefault();
        h.handleVolumeChange(h.volume - 5);
      } else if (matches(h.shortcuts.toggleMute) || key.toLowerCase() === 'm') {
        e.preventDefault();
        h.toggleMute();
      } else if (matches(h.shortcuts.toggleFullscreen) || key.toLowerCase() === 'f') {
        e.preventDefault();
        h.toggleFullscreen();
      } else if (matches(h.shortcuts.toggleCaptions) || key.toLowerCase() === 'c') {
        e.preventDefault();
        h.toggleCaptions();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = bufferedFraction * 100;

  return (
    <div
      ref={containerRef}
      className={`${styles.playerContainer} ${styles[`mode-${activeDevice}`]}`}
      onMouseMove={showHUD}
      onWheel={handleWheel}
      tabIndex={0}
      aria-label={title}
    >
      {/* VR Spatial Ambient Back-Glow */}
      {activeDevice === 'vr' && <div className={styles.vrAmbientGlow} />}

      {/* Screen Brightness Filter Layer */}
      <div
        className={styles.videoFilterWrapper}
        style={{ filter: `brightness(${brightness}%)` }}
      >
        {cleanVideoId ? (
          <YouTube
            videoId={cleanVideoId}
            className={styles.iframeWrapper}
            iframeClassName={styles.iframe}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            onError={onPlayerError}
            opts={{
              playerVars: {
                autoplay: 0,
                controls: 1,
                disablekb: 0,
                enablejsapi: 1,
                fs: 1,
                iv_load_policy: annotationsEnabled ? 1 : 3,
                modestbranding: 1,
                rel: 0,
                playsinline: 1
              }
            }}
          />
        ) : null}
      </div>

      {/* Error Overlay */}
      {(hasError || !cleanVideoId) && (
        <div className={styles.errorOverlay}>
          <div className={styles.errorCard}>
            <span className={styles.errorIcon}>⚠️</span>
            <p className={styles.errorTitle}>Playback Unavailable</p>
            <p className={styles.errorText}>
              {errorMessage || (!cleanVideoId ? 'Invalid or missing YouTube Video ID.' : 'Unable to play this video.')}
            </p>
            {cleanVideoId && (
              <a
                href={`https://www.youtube.com/watch?v=${cleanVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.errorLink}
              >
                Watch directly on YouTube ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Interactive Gesture Touch Surface (Passes clicks directly to YouTube iframe when not yet ready) */}
      <div
        className={`${styles.gestureOverlay} ${!isReady ? styles.gestureOverlayInactive : ''}`}
        onPointerDown={isReady ? handlePointerDown : undefined}
        onPointerMove={isReady ? handlePointerMove : undefined}
        onPointerUp={isReady ? handlePointerUp : undefined}
        onPointerCancel={isReady ? handlePointerUp : undefined}
        onClick={isReady ? togglePlayPause : undefined}
      />

      {/* Transparent Frosted HUD Overlays */}
      {isSpeedBoostActive && (
        <div className={styles.speedBoostBanner}>
          <span>⚡</span>
          <span>2X SPEED BOOST</span>
        </div>
      )}

      {sleepTimerRemainingSeconds !== null && (
        <div className={styles.sleepTimerActiveBadge}>
          <span>⏱️</span>
          <span>Sleep in {Math.floor(sleepTimerRemainingSeconds / 60)}m {sleepTimerRemainingSeconds % 60}s</span>
        </div>
      )}

      {activeOverlayHud.type === 'brightness' && (
        <div className={`${styles.hudPill} ${styles.hudLeft}`}>
          <span className={styles.hudIcon}>☀️</span>
          <div className={styles.hudBarTrack}>
            <div className={styles.hudBarFill} style={{ height: `${(brightness / 150) * 100}%` }} />
          </div>
          <span className={styles.hudText}>{activeOverlayHud.value}</span>
        </div>
      )}

      {activeOverlayHud.type === 'volume' && (
        <div className={`${styles.hudPill} ${styles.hudRight}`}>
          <span className={styles.hudIcon}>{isMuted ? '🔇' : '🔊'}</span>
          <div className={styles.hudBarTrack}>
            <div className={styles.hudBarFill} style={{ height: `${volume}%` }} />
          </div>
          <span className={styles.hudText}>{activeOverlayHud.value}</span>
        </div>
      )}

      {activeOverlayHud.type === 'seek-left' && (
        <div className={`${styles.rippleSeek} ${styles.rippleLeft}`}>
          <span>⏪ -{activeOverlayHud.value}</span>
        </div>
      )}

      {activeOverlayHud.type === 'seek-right' && (
        <div className={`${styles.rippleSeek} ${styles.rippleRight}`}>
          <span>+{activeOverlayHud.value} ⏩</span>
        </div>
      )}

      {/* Center Big Play Button */}
      {!isPlaying && (
        <button
          type="button"
          className={styles.centerPlayButton}
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          aria-label="Play Video"
        >
          <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {/* Bottom Control Bar */}
      <div className={`${styles.bottomBar} ${showControls ? styles.visible : ''}`}>
        {/* Scrubber Progress Bar */}
        <div
          className={styles.scrubberContainer}
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            handleSeek(pos * duration);
          }}
        >
          <div className={styles.scrubberRail}>
            <div className={styles.bufferFill} style={{ width: `${bufferedPercent}%` }} />
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
            <div className={styles.scrubberThumb} style={{ left: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Controls Row */}
        <div className={styles.controlsRow}>
          <div className={styles.leftControls}>
            {/* Play / Pause */}
            <button
              type="button"
              className={styles.controlBtn}
              onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip -10s */}
            <button
              type="button"
              className={styles.controlBtn}
              onClick={(e) => { e.stopPropagation(); handleSkip(-10); }}
              title="Rewind 10s"
            >
              <span className={styles.skipLabel}>-10s</span>
            </button>

            {/* Skip +10s */}
            <button
              type="button"
              className={styles.controlBtn}
              onClick={(e) => { e.stopPropagation(); handleSkip(10); }}
              title="Forward 10s"
            >
              <span className={styles.skipLabel}>+10s</span>
            </button>

            {/* Volume Control */}
            <div className={styles.volumeGroup} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.controlBtn}
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? '🔇' : volume > 50 ? '🔊' : '🔉'}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className={styles.volumeSlider}
                aria-label="Volume Slider"
              />
            </div>

            {/* Duration Timestamps */}
            <div className={styles.timeDisplay}>
              <span>{formatTime(currentTime)}</span>
              <span className={styles.timeDivider}>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className={styles.rightControls}>
            {/* Closed Captions CC */}
            <button
              type="button"
              className={`${styles.controlBtn} ${ccEnabled ? styles.ccActive : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleCaptions(); }}
              title="Toggle Subtitles / CC"
            >
              <span className={styles.ccBadge}>CC</span>
            </button>

            {/* Settings Menu Popup */}
            <div className={styles.settingsWrapper}>
              <button
                type="button"
                className={styles.controlBtn}
                onClick={(e) => { e.stopPropagation(); setShowSettingsMenu((prev) => !prev); }}
                title="Playback Settings"
                aria-label="Settings"
              >
                ⚙️
              </button>

              {showSettingsMenu && (
                <div className={styles.settingsPopover} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.popoverHeader}>Player Controls &amp; Settings</div>

                  {/* 1. CC Language Selection */}
                  <div className={styles.popoverSection}>
                    <label className={styles.popoverLabel}>Subtitles &amp; Captions</label>
                    <select
                      value={ccEnabled ? ccLanguage : 'off'}
                      onChange={(e) => handleCcLanguageChange(e.target.value)}
                      className={styles.popoverSelect}
                    >
                      <option value="off">Off</option>
                      <option value="en">English (US)</option>
                      <option value="en-auto">English (Auto-generated)</option>
                      <option value="es">Spanish (Español)</option>
                      <option value="fr">French (Français)</option>
                      <option value="de">German (Deutsch)</option>
                      <option value="ja">Japanese (日本語)</option>
                    </select>
                  </div>

                  {/* 2. Video Quality (Only numbers shown) */}
                  <div className={styles.popoverSection}>
                    <label className={styles.popoverLabel}>Video Quality</label>
                    <select
                      value={selectedQuality}
                      onChange={(e) => handleQualityChange(e.target.value)}
                      className={styles.popoverSelect}
                    >
                      <option value="Auto">Auto</option>
                      <option value="1080p">1080p</option>
                      <option value="720p">720p</option>
                      <option value="480p">480p</option>
                      <option value="360p">360p</option>
                      <option value="240p">240p</option>
                      <option value="144p">144p</option>
                    </select>
                  </div>

                  {/* 3. Playback Speed */}
                  <div className={styles.popoverSection}>
                    <label className={styles.popoverLabel}>Playback Speed</label>
                    <select
                      value={playbackSpeed}
                      onChange={(e) => handleSpeedChange(Number(e.target.value))}
                      className={styles.popoverSelect}
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={0.75}>0.75x</option>
                      <option value={1.0}>1.0x (Normal)</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={1.75}>1.75x</option>
                      <option value={2.0}>2.0x</option>
                    </select>
                  </div>

                  {/* 4. Screen Brightness Slider */}
                  <div className={styles.popoverSection}>
                    <div className={styles.popoverSliderRow}>
                      <span className={styles.popoverLabel}>Screen Brightness: {brightness}%</span>
                      <input
                        type="range"
                        min="20"
                        max="150"
                        value={brightness}
                        onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                        className={styles.popoverSlider}
                      />
                    </div>
                  </div>

                  {/* 5. Annotations Toggle */}
                  <div className={`${styles.popoverSection} ${styles.toggleSwitchRow}`}>
                    <span className={styles.popoverLabel}>Video Annotations</span>
                    <label className={styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        checked={annotationsEnabled}
                        onChange={(e) => setAnnotationsEnabled(e.target.checked)}
                      />
                      <span className={styles.toggleSlider} />
                    </label>
                  </div>

                  {/* 6. Sleep Timer */}
                  <div className={styles.popoverSection}>
                    <label className={styles.popoverLabel}>Sleep Timer</label>
                    <select
                      value={sleepTimerMinutes}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'off' || val === 'end') {
                          setSleepTimerMinutes(val);
                        } else {
                          setSleepTimerMinutes(Number(val));
                        }
                      }}
                      className={styles.popoverSelect}
                    >
                      <option value="off">Off</option>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="end">End of video</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              className={styles.controlBtn}
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              title="Fullscreen"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';
