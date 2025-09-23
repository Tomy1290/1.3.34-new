import { format, parse, isValid } from "date-fns";

export const toKey = (d: Date) => format(d, "yyyy-MM-dd");
export const displayDate = (d: Date) => format(d, "dd.MM.yyyy");

export function parseGermanOrShort(input: string): Date | null {
  // Accept TT.MM.JJJJ or TT.MM.JJ
  const patterns = ["dd.MM.yyyy", "dd.MM.yy"] as const;
  for (const p of patterns) {
    const dt = parse(input, p, new Date());
    if (isValid(dt)) return dt;
  }
  return null;
}