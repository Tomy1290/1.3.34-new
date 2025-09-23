export type HM = { hour: number; minute: number };

export function parseHHMM(input: string | null | undefined): HM | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  // Accept formats like "H:MM", "HH:MM", "HMM", "HHMM"
  const onlyDigits = trimmed.replace(/[^0-9]/g, '');
  let hour = 0, minute = 0;
  if (onlyDigits.length === 4) {
    hour = parseInt(onlyDigits.slice(0, 2), 10);
    minute = parseInt(onlyDigits.slice(2), 10);
  } else if (onlyDigits.length === 3) {
    hour = parseInt(onlyDigits.slice(0, 1), 10);
    minute = parseInt(onlyDigits.slice(1), 10);
  } else if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':');
    hour = parseInt(h, 10);
    minute = parseInt(m, 10);
  } else {
    return null;
  }
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function toHHMM(value: string | Date | number | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const hm = parseHHMM(value);
    if (!hm) return null;
    return `${hm.hour.toString().padStart(2, '0')}:${hm.minute.toString().padStart(2, '0')}`;
  }
  if (typeof value === 'number') {
    // assume milliseconds or minutes; if < 24*60 consider minutes
    if (value < 24 * 60) {
      const hour = Math.floor(value / 60);
      const minute = value % 60;
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  if (value instanceof Date) {
    return `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`;
  }
  return null;
}