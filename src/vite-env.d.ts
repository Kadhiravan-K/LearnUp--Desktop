/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

interface Window {
  __TAURI_INTERNALS__?: Record<string, unknown>;
  onYouTubeIframeAPIReady?: () => void;
  YT?: any;
}
