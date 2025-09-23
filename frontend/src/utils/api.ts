import Constants from 'expo-constants';
import { storage } from './storage';

export function getBackendBaseUrl() {
  // 1) Runtime override via Settings
  const stored = storage.getString('backend_url');
  if (stored && typeof stored === 'string' && stored.trim().length > 0) {
    return stored.replace(/\/$/, '');
  }
  // 2) Build-time config via Expo extra
  const extra = (Constants.expoConfig as any)?.extra || (Constants.manifest as any)?.extra || {};
  const envUrl = extra.EXPO_PUBLIC_BACKEND_URL || (typeof process !== 'undefined' ? (process.env as any)?.EXPO_PUBLIC_BACKEND_URL : '');
  return String(envUrl || '').replace(/\/$/, '');
}

export async function apiFetch(path: string, init?: RequestInit) {
  const base = getBackendBaseUrl();
  if (!base) throw new Error('No backend URL configured. Set it in Settings > Backend URL.');
  const url = `${base}/api${path.startsWith('/') ? path : '/' + path}`;
  return fetch(url, init);
}