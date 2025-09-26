import Constants from 'expo-constants';
import { storage } from './storage';

export function getBackendBaseUrl() {
  // 1) Runtime override via Settings
  const stored = storage.getString('backend_url');
  if (stored && typeof stored === 'string' && stored.trim().length > 0) {
    return stored.replace(/\/$/, '');
  }
  // 2) Build-time config via Expo extra or environment variables
  const extra = (Constants.expoConfig as any)?.extra || (Constants.manifest as any)?.extra || {};
  const envCandidates = [
    extra.EXPO_PUBLIC_BACKEND_URL,
    extra.REACT_APP_BACKEND_URL, // allow CRA-style var passed via extra
    typeof process !== 'undefined' ? (process.env as any)?.REACT_APP_BACKEND_URL : '',
    typeof process !== 'undefined' ? (process.env as any)?.EXPO_PUBLIC_BACKEND_URL : '',
  ].filter(Boolean);
  const picked = String(envCandidates[0] || '').trim();
  return picked.replace(/\/$/, '');
}

export async function apiFetch(path: string, init?: RequestInit) {
  const base = getBackendBaseUrl();
  if (!base) throw new Error('No backend URL configured. Set it in Settings > Backend URL.');
  const url = `${base}/api${path.startsWith('/') ? path : '/' + path}`;
  return fetch(url, init);
}

export async function warmupBackend(timeoutMs: number = 3500) {
  try {
    const base = getBackendBaseUrl();
    if (!base) return false; // no URL configured -> skip
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
    try {
      await fetch(`${base}/api/`, {
        method: 'GET',
        headers: { 'x-warmup': '1' },
        cache: 'no-store',
        signal: controller.signal as any,
      });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(t);
    }
  } catch {
    return false;
  }
}
