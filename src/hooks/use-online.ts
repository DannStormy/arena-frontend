import { useSyncExternalStore } from 'react';

/**
 * Tracks connectivity via navigator.onLine plus the 'online'/'offline' window
 * events. Uses useSyncExternalStore so every consumer shares one subscription
 * and stays in sync without extra re-renders.
 *
 * navigator.onLine is a coarse signal (it only knows the OS thinks there's a
 * link, not that the API is reachable), so it drives UX hints only — the actual
 * offline PLAY fallback keys off real request failures in use-challenges.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

/** SSR-safe default — treat as online when there is no navigator. */
function getServerSnapshot(): boolean {
  return true;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
