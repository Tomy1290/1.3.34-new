import Constants from 'expo-constants';

export function getBackendBaseUrl() {
  // Prefer explicit EXPO_PUBLIC_BACKEND_URL
  // Fallback to EXPO_PACKAGER_HOSTNAME when present (in our preview this is a full https host)
  // Final fallback to '' to allow proxying '/api' during preview
  const env = (typeof process !== 'undefined' ? (process.env as any) : {}) || {};
  const pub = env.EXPO_PUBLIC_BACKEND_URL || env.EXPO_BACKEND_URL || env.EXPO_PACKAGER_HOSTNAME || '';
  // Some hostnames already include protocol; ensure no trailing slash
  return String(pub).replace(/\/$/, '');
}

export async function apiFetch(path: string, init?: RequestInit) {
  const base = getBackendBaseUrl();
  const url = `${base}/api${path.startsWith('/') ? path : '/' + path}`;
  return fetch(url, init);
}