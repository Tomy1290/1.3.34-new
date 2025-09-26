export function getLatestWeightKg(days: Record<string, any>): number | undefined {
  const arr = Object.values(days)
    .filter((d: any) => typeof d?.weight === 'number' && d?.date)
    .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
  const w = arr.length ? Number((arr as any)[arr.length - 1].weight) : undefined;
  return isNaN(w as any) ? undefined : (w as number);
}

export function computeDailyWaterTargetMl(weightKg?: number, didSport?: boolean): number {
  const base = weightKg ? Math.round(weightKg * 35) : 2000;
  const sportExtra = didSport ? 500 : 0;
  return base + sportExtra; // ml
}
