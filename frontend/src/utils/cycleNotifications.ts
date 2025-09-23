import { AppState } from '../store/useStore';
import { scheduleOneTimeNotification, cancelNotification } from './notifications';
import { predictNextStart, getFertileWindow, getOvulationDate } from './cycle';
import { storage } from './storage';

/**
 * AUTOMATIC CYCLE NOTIFICATIONS (fixed to match current cycle utils)
 */

interface CycleNotification {
  id: string;
  type: 'period' | 'ovulation' | 'fertile_start' | 'fertile_end' | 'health_check';
  notificationId: string | null;
  scheduledDate: Date;
}

const CYCLE_NOTIFICATION_STORAGE_KEY = 'cycleNotifications';

function getStoredCycleNotifications(): CycleNotification[] {
  try {
    const stored = storage.getString(CYCLE_NOTIFICATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function storeCycleNotifications(notifications: CycleNotification[]): void {
  try {
    storage.set(CYCLE_NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('❌ Error storing cycle notifications:', error);
  }
}

async function cancelExistingCycleNotifications(): Promise<void> {
  const existing = getStoredCycleNotifications();
  for (const n of existing) {
    if (n.notificationId) await cancelNotification(n.notificationId);
  }
  storeCycleNotifications([]);
  console.log('🗑️ Cancelled all existing cycle notifications');
}

function t(lang: string, key: string) {
  const texts: any = {
    period_today: { de: ['🩸 Periode heute erwartet', 'Deine Periode sollte heute beginnen. Vergiss nicht, sie zu tracken!'], en: ['🩸 Period expected today', "Your period should start today. Don't forget to track it!"], pl: ['🩸 Okres oczekiwany dzisiaj', 'Twój okres powinien się dzisiaj rozpocząć. Nie zapomnij go śledzić!'] },
    period_tomorrow: { de: ['🩸 Periode morgen erwartet', 'Deine Periode beginnt wahrscheinlich morgen. Bereite dich vor!'], en: ['🩸 Period expected tomorrow', 'Your period will likely start tomorrow. Get prepared!'], pl: ['🩸 Okres oczekiwany jutro', 'Twój okres prawdopodobnie zacznie się jutro. Przygotuj się!'] },
    fertile_start: { de: ['🌸 Fruchtbare Phase beginnt', 'Deine fruchtbare Phase beginnt heute. Zeit für besondere Aufmerksamkeit!'], en: ['🌸 Fertile window begins', 'Your fertile window starts today. Time for special attention!'], pl: ['🌸 Rozpoczyna się okno płodności', 'Twoje okno płodności zaczyna się dzisiaj. Czas na szczególną uwagę!'] },
    ovulation: { de: ['🥚 Eisprung heute', 'Heute ist dein voraussichtlicher Eisprung. Höchste Fruchtbarkeit!'], en: ['🥚 Ovulation today', 'Today is your expected ovulation day. Peak fertility!'], pl: ['🥚 Owulacja dzisiaj', 'Dzisiaj jest twój przewidywany dzień owulacji. Szczyt płodności!'] },
    fertile_end: { de: ['🌸 Fruchtbare Phase endet', 'Deine fruchtbare Phase endet heute. Die nächste Periode ist in etwa 2 Wochen zu erwarten.'], en: ['🌸 Fertile window ending', 'Your fertile window ends today. Next period expected in about 2 weeks.'], pl: ['🌸 Koniec okna płodności', 'Twoje okno płodności kończy się dzisiaj. Następny okres oczekiwany za około 2 tygodnie.'] },
    health_check: { de: ['💝 Zyklus-Gesundheitscheck', 'Zeit für deinen wöchentlichen Gesundheitscheck. Wie fühlst du dich heute?'], en: ['💝 Cycle health check', 'Time for your weekly health check. How are you feeling today?'], pl: ['💝 Kontrola zdrowia cyklu', 'Czas na cotygodniową kontrolę zdrowia. Jak się dzisiaj czujesz?'] },
  };
  const langKey = lang === 'pl' ? 'pl' : (lang === 'en' ? 'en' : 'de');
  return texts[key]?.[langKey] || ['Erinnerung', ''];
}

export async function scheduleCycleNotifications(state: AppState): Promise<void> {
  try {
    console.log('📅 Scheduling automatic cycle notifications...');
    await cancelExistingCycleNotifications();

    if (!state.cycles || state.cycles.length === 0) {
      console.log('⚠️ No cycle data available, skipping cycle notifications');
      return;
    }

    const language = state.language || 'de';
    const out: CycleNotification[] = [];

    const next = predictNextStart(state.cycles);
    if (next) {
      const periodDay = new Date(next.getFullYear(), next.getMonth(), next.getDate(), 9, 0, 0);
      if (periodDay > new Date()) {
        const [title, body] = t(language, 'period_today');
        const id = await scheduleOneTimeNotification(title, body, periodDay, 'cycle');
        if (id) out.push({ id: `period_today_${Date.now()}`, type: 'period', notificationId: id, scheduledDate: periodDay });
      }
      const periodPrev = new Date(next.getFullYear(), next.getMonth(), next.getDate()-1, 20, 0, 0);
      if (periodPrev > new Date()) {
        const [title, body] = t(language, 'period_tomorrow');
        const id = await scheduleOneTimeNotification(title, body, periodPrev, 'cycle');
        if (id) out.push({ id: `period_tomorrow_${Date.now()}`, type: 'period', notificationId: id, scheduledDate: periodPrev });
      }
    }

    const fertile = getFertileWindow(state.cycles);
    if (fertile) {
      const start = new Date(fertile.start.getFullYear(), fertile.start.getMonth(), fertile.start.getDate(), 9, 0, 0);
      if (start > new Date()) {
        const [title, body] = t(language, 'fertile_start');
        const id = await scheduleOneTimeNotification(title, body, start, 'cycle');
        if (id) out.push({ id: `fertile_start_${Date.now()}`, type: 'fertile_start', notificationId: id, scheduledDate: start });
      }
      const ovu = getOvulationDate(state.cycles);
      if (ovu) {
        const ov = new Date(ovu.getFullYear(), ovu.getMonth(), ovu.getDate(), 10, 0, 0);
        if (ov > new Date()) {
          const [title, body] = t(language, 'ovulation');
          const id = await scheduleOneTimeNotification(title, body, ov, 'cycle');
          if (id) out.push({ id: `ovulation_${Date.now()}`, type: 'ovulation', notificationId: id, scheduledDate: ov });
        }
      }
      const end = new Date(fertile.end.getFullYear(), fertile.end.getMonth(), fertile.end.getDate(), 18, 0, 0);
      if (end > new Date()) {
        const [title, body] = t(language, 'fertile_end');
        const id = await scheduleOneTimeNotification(title, body, end, 'cycle');
        if (id) out.push({ id: `fertile_end_${Date.now()}`, type: 'fertile_end', notificationId: id, scheduledDate: end });
      }
    }

    // Weekly health check (next Sunday 11:00)
    const nextSunday = new Date();
    const day = nextSunday.getDay();
    const add = (7 - day) % 7 || 7; // next Sunday (not today)
    nextSunday.setDate(nextSunday.getDate() + add);
    nextSunday.setHours(11, 0, 0, 0);
    const [title, body] = t(language, 'health_check');
    const healthId = await scheduleOneTimeNotification(title, body, nextSunday, 'cycle');
    if (healthId) out.push({ id: `health_check_${Date.now()}`, type: 'health_check', notificationId: healthId, scheduledDate: nextSunday });

    storeCycleNotifications(out);
    console.log(`✅ Scheduled ${out.length} cycle notifications`);
  } catch (e) {
    console.error('❌ Error scheduling cycle notifications:', e);
  }
}

export async function updateCycleNotifications(state: AppState): Promise<void> {
  await scheduleCycleNotifications(state);
}