import { MMKV } from "react-native-mmkv";

export const storage = new MMKV({ id: "scarlett-health" });

export const mmkvAdapter = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};