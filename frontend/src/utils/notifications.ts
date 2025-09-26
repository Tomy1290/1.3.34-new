import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import { storage } from './storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }),
});

function logNotificationPlanned(type: string, title: string, when: Date | null) {
  try {
    if (when) console.log(`🔔 [${type}] "${title}" → ${when.toLocaleString()}`);
    else console.log(`⏭️ [${type}] "${title}" nicht geplant (Vergangenheit).`);
  } catch {}
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true, allowAnnouncements: true } as any,
        android: { allowAlert: true, allowBadge: true, allowSound: true } as any,
      } as any);
      return status === 'granted';
    }
    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return false;
  }
}

export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Erinnerungen', description: 'Tabletten, Sport, Gewicht und andere Erinnerungen',
      importance: Notifications.AndroidImportance.HIGH, sound: 'default', enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250], lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      lightColor: '#FF2D87', showBadge: true,
    });
    await Notifications.setNotificationChannelAsync('cycle', {
      name: 'Zyklus & Gesundheit', description: 'Automatische Zyklus-, Eisprung- und Gesundheitsbenachrichtigungen',
      importance: Notifications.AndroidImportance.HIGH, sound: 'default', enableVibrate: true,
      vibrationPattern: [0, 500, 250, 500], lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      lightColor: '#FF69B4', showBadge: true,
    });
  } catch (error) {
    console.error('❌ Error setting up Android channels:', error);
  }
}

async function cleanupLegacySchedules() {
  try {
    const list = await Notifications.getAllScheduledNotificationsAsync();
    const now = Date.now();
    for (const n of list) {
      const trig: any = (n as any)?.trigger;
      if (trig && typeof trig.seconds === 'number' && !trig.repeats) {
        try { await Notifications.cancelScheduledNotificationAsync((n as any).identifier); } catch {}
      }
      if (trig && (trig as any).date) {
        const when = +new Date((trig as any).date);
        if (when && when <= now) {
          try { await Notifications.cancelScheduledNotificationAsync((n as any).identifier); } catch {}
        }
      }
    }
  } catch {}
}

export async function initializeNotifications(): Promise<boolean> {
  try {
    const hasPermissions = await requestNotificationPermissions();
    if (!hasPermissions) return false;
    await setupAndroidChannels();
    try { await cleanupLegacySchedules(); } catch {}
    return true;
  } catch (error) {
    console.error('❌ Error initializing notifications:', error);
    return false;
  }
}

export function computeNextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (+next <= +now) next.setDate(next.getDate() + 1);
  return next;
}

export function isHyperOSLike() {
  const brand = (Device?.brand || '').toLowerCase();
  const manufacturer = (Device?.manufacturer || '').toLowerCase();
  return brand.includes('xiaomi') || brand.includes('redmi') || brand.includes('poco') || manufacturer.includes('xiaomi');
}

export async function scheduleDailyReminder(
  id: string,
  title: string,
  body: string,
  hour: number,
  minute: number,
  channel: 'reminders' | 'cycle' = 'reminders'
): Promise<string | null> {
  try {
    const next = computeNextOccurrence(hour, minute);
    const diffMs = +next - +new Date();
    if (diffMs > 0 && diffMs < 20_000) next.setMinutes(next.getMinutes() + 2);
    const nid = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, channelId: channel },
      trigger: { hour: next.getHours(), minute: next.getMinutes(), repeats: true } as any,
    });
    logNotificationPlanned('DailyRepeating', title, next);
    return nid;
  } catch (e) {
    console.error('❌ scheduleDailyReminder error:', e);
    return null;
  }
}

export async function scheduleDailyNext(
  id: string,
  title: string,
  body: string,
  hour: number,
  minute: number,
  channel: 'reminders' | 'cycle' = 'reminders'
): Promise<string | null> {
  return scheduleDailyReminder(id, title, body, hour, minute, channel);
}

export async function scheduleOneTimeNotification(
  title: string,
  body: string,
  date: Date,
  channel: 'reminders' | 'cycle' = 'cycle'
): Promise<string | null> {
  try {
    if (date <= new Date()) { logNotificationPlanned('OneTime', title, null); return null; }
    const nid = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, channelId: channel },
      trigger: { date },
    });
    logNotificationPlanned('OneTime', title, date);
    return nid;
  } catch (e) {
    console.error('❌ scheduleOneTimeNotification error:', e);
    return null;
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.error('❌ cancelNotification error:', e);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) { console.error('❌ cancelAllNotifications error:', e); }
}

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try { return await Notifications.getAllScheduledNotificationsAsync(); } catch { return []; }
}

// Support function requested by user – cancels previously stored cycle notifications
// Uses the storage key written by cycleNotifications.ts
const CYCLE_KEY = 'cycle_notifications';
export async function cancelExistingCycleNotifications(): Promise<void> {
  try {
    const raw = storage.getString(CYCLE_KEY);
    if (raw) {
      const arr: any[] = JSON.parse(raw);
      for (const n of arr) {
        const id = (n && (n.notificationId || n.identifier)) as string;
        if (id) { try { await Notifications.cancelScheduledNotificationAsync(id); } catch {} }
      }
    }
    storage.set(CYCLE_KEY, JSON.stringify([]));
    console.log('🗑️ Cancelled all existing cycle notifications');
  } catch (e) {
    console.error('❌ cancelExistingCycleNotifications error:', e);
  }
}

export async function testNotification(): Promise<void> {
  try {
    const has = await requestNotificationPermissions();
    if (!has) { Alert.alert('Fehler', 'Benachrichtigungen sind nicht erlaubt.'); return; }
    await setupAndroidChannels();
    const testDate = new Date();
    testDate.setSeconds(testDate.getSeconds() + 3);
    const nid = await scheduleOneTimeNotification('✅ Test erfolgreich!', 'Benachrichtigungen funktionieren.', testDate, 'reminders');
    if (nid) Alert.alert('🧪 Test gestartet', 'Eine Test-Benachrichtigung wird in 3 Sekunden angezeigt.');
  } catch (e: any) {
    Alert.alert('Fehler', `Test fehlgeschlagen: ${e?.message || e}`);
  }
}

export const ensureNotificationPermissions = requestNotificationPermissions;
export const ensureAndroidChannel = setupAndroidChannels;