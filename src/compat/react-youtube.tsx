import React, { useEffect, useRef } from 'react';

export interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setVolume: (volume: number) => void;
  getVolume?: () => number;
}

export interface YouTubeEvent<T = any> {
  target: YouTubePlayer;
  data: T;
}

export interface YouTubeProps {
  videoId?: string;
  id?: string;
  className?: string;
  iframeClassName?: string;
  style?: React.CSSProperties;
  title?: string;
  loading?: 'lazy' | 'eager';
  opts?: {
    height?: string | number;
    width?: string | number;
    playerVars?: Record<string, any>;
  };
  onReady?: (event: YouTubeEvent) => void;
  onError?: (event: YouTubeEvent) => void;
  onPlay?: (event: YouTubeEvent) => void;
  onPause?: (event: YouTubeEvent) => void;
  onEnd?: (event: YouTubeEvent) => void;
  onStateChange?: (event: YouTubeEvent) => void;
  onPlaybackRateChange?: (event: YouTubeEvent) => void;
  onPlaybackQualityChange?: (event: YouTubeEvent) => void;
}

export const YouTube: React.FC<YouTubeProps> = ({
  videoId,
  id = 'youtube-player',
  className,
  style,
  title = 'YouTube Video Player',
  opts,
  onReady,
  onError,
  onStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;

    function initPlayer() {
      if (!isMounted || !containerRef.current || !(window as any).YT || !(window as any).YT.Player) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
      }

      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId,
        width: opts?.width || '100%',
        height: opts?.height || '100%',
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          rel: 0,
          ...opts?.playerVars,
        },
        events: {
          onReady: (e: any) => {
            if (isMounted && onReady) onReady(e);
          },
          onStateChange: (e: any) => {
            if (isMounted && onStateChange) onStateChange(e);
          },
          onError: (e: any) => {
            if (isMounted && onError) onError(e);
          },
        },
      });
    }

    if (!(window as any).YT || !(window as any).YT.Player) {
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      const prevCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      isMounted = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, [videoId, JSON.stringify(opts)]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }} className={className}>
      <div ref={containerRef} id={id} title={title} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default YouTube;
