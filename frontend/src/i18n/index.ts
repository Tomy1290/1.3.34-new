import { useAppStore } from "../store/useStore";
import de from "./de";
import en from "./en";
import pl from "./pl";

export type Lang = "de" | "en" | "pl";

const dicts: Record<Lang, any> = { de, en, pl };

export function useI18n() {
  const lang = useAppStore((s) => s.language) as Lang;
  return function t(key: string, vars?: Record<string, string | number>) {
    const parts = key.split(".");
    let cur: any = dicts[lang] || dicts.de;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in cur) cur = cur[p];
      else return key; // fallback to key
    }
    let str = String(cur);
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{${k}}`, "g"), String(v));
      });
    }
    return str;
  };
}

export function tDirect(lang: Lang, key: string, vars?: Record<string, string | number>) {
  const parts = key.split(".");
  let cur: any = dicts[lang] || dicts.de;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return key;
  }
  let str = String(cur);
  if (vars) Object.entries(vars).forEach(([k, v]) => { str = str.replace(new RegExp(`{${k}}`, "g"), String(v)); });
  return str;
}