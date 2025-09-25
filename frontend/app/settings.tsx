/* Updated to show flag buttons and include profile+gallery in export/import */
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { useAppStore } from "../src/store/useStore";
import { initializeNotifications, cancelNotification, scheduleDailyNext, getScheduledNotifications } from "../src/utils/notifications";
import { TimePicker } from "../src/components/TimePicker";
import { parseHHMM, toHHMM } from "../src/utils/time";
import FlagDE from "../src/components/flags/FlagDE";
import FlagUK from "../src/components/flags/FlagUK";
import FlagPL from "../src/components/flags/FlagPL";
import { storage } from "../src/utils/storage";
import { useI18n } from "../src/i18n";

function useThemeColors(theme: string) {
  if (theme === "pink_pastel") return { bg: "#fff0f5", card: "#ffe4ef", primary: "#d81b60", text: "#3a2f33", muted: "#8a6b75", input: "#fff" };
  if (theme === "pink_vibrant") return { bg: "#1b0b12", card: "#2a0f1b", primary: "#ff2d87", text: "#ffffff", muted: "#e59ab8", input: "#1f1520" };
  if (theme === "golden_pink") return { bg: "#fff8f0", card: "#ffe9c7", primary: "#dba514", text: "#2a1e22", muted: "#9b7d4e", input: "#fff" };
  return { bg: "#fde7ef", card: "#ffd0e0", primary: "#e91e63", text: "#2a1e22", muted: "#7c5866", input: "#ffffff" };
}

export default function SettingsScreen() {
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);
  const t = useI18n();

  const appTitle = t("common.appTitle");
  const version = Constants?.expoConfig?.version || "—";

  const [customMode, setCustomMode] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customTime, setCustomTime] = useState("08:00");
  const [cupInput, setCupInput] = useState(String(state.waterCupMl || 250));
  const [reminderTimes, setReminderTimes] = useState<Record<string, string>>({});

  const [backendUrl, setBackendUrl] = useState<string>(storage.getString("backend_url") || "");

  useEffect(() => {
    const times: Record<string, string> = {};
    if (state.reminders && Array.isArray(state.reminders)) {
      for (const r of state.reminders) {
        if (!r || !r.id) continue;
        const tStr = toHHMM((r as any).time);
        if (tStr) times[r.id] = tStr;
      }
    }
    setReminderTimes(times);
  }, [state.reminders]);

  function saveBackendUrl() {
    const v = (backendUrl || "").trim().replace(/\/$/, "");
    if (!/^https?:\/\//i.test(v)) {
      Alert.alert(t("common.error"), t("settings.invalidUrl"));
      return;
    }
    storage.set("backend_url", v);
    Alert.alert(t("settings.saved"));
  }

  async function testBackendUrl() {
    const v = (backendUrl || "").trim().replace(/\/$/, "");
    if (!v) {
      Alert.alert(t("common.info"), t("settings.enterUrlFirst"));
      return;
    }
    try {
      const res = await fetch(`${v}/api/`, { method: "GET" });
      const ok = (res as any)?.ok;
      const txt = await (res as any).text?.();
      Alert.alert(ok ? t("common.ok") : t("common.error"), ok ? t("settings.connectionSuccessful") : `${t("common.response")} ${txt}`);
    } catch (e: any) {
      Alert.alert(t("common.error"), String(e?.message || e));
    }
  }

  async function seedDefaults() {
    const initialized = await initializeNotifications();
    if (!initialized) return;
    const defs: { id: string; type: string; time: string; enabled: boolean }[] = [
      { id: "pills_morning", type: "pills_morning", time: "08:00", enabled: true },
      { id: "pills_evening", type: "pills_evening", time: "20:00", enabled: true },
      { id: "weight", type: "weight", time: "08:30", enabled: true },
      { id: "water", type: "water", time: "10:00", enabled: true },
      { id: "sport", type: "sport", time: "18:00", enabled: true },
    ];
    for (const d of defs) {
      try {
        const exists = state.reminders.find((r) => r.id === d.id || (r.type === d.type && !r.label));
        let nid: string | null = null;
        if (d.enabled) {
          const parsed = parseHHMM(d.time) || { hour: 8, minute: 0 };
          const title = t(`reminders.types.${d.type}`);
          nid = await scheduleDailyNext(d.id, title, t("reminders.actionTime"), parsed.hour, parsed.minute, "reminders");
        }
        if (exists) {
          state.updateReminder(exists.id, { time: d.time, enabled: d.enabled });
          state.setNotificationMeta(exists.id, nid ? { id: nid, time: d.time } : undefined);
        } else {
          state.addReminder({ id: d.id, type: d.type, time: d.time, enabled: d.enabled });
          if (nid) state.setNotificationMeta(d.id, { id: nid, time: d.time });
        }
      } catch {}
    }
    state.setHasSeededReminders(true);
    Alert.alert(t("common.done"));
  }

  async function updateTime(id: string, hhmm: string) {
    const parsed = parseHHMM(hhmm);
    if (!parsed) {
      Alert.alert(t("common.error"), t("settings.invalidTime"));
      return;
    }
    try {
      const meta = state.notificationMeta[id];
      if (meta?.id) await cancelNotification(meta.id);
    } catch {}
    const rem = state.reminders.find((r) => r.id === id);
    state.updateReminder(id, { time: toHHMM(hhmm) || hhmm });
    if (rem?.enabled) {
      const title = rem.label || (rem?.type ? t(`reminders.types.${rem.type}`) : "");
      const nid = await scheduleDailyNext(id, title, t("reminders.actionTime"), parsed.hour, parsed.minute, "reminders");
      if (nid) state.setNotificationMeta(id, { id: nid, time: toHHMM(hhmm) || hhmm });
    }
    setReminderTimes((prev) => ({ ...prev, [id]: toHHMM(hhmm) || hhmm }));
  }

  async function toggleReminder(id: string, enabled: boolean) {
    const rem = state.reminders.find((r) => r.id === id);
    if (!rem) return;
    state.updateReminder(id, { enabled });
    try {
      const meta = state.notificationMeta[id];
      if (!enabled && meta?.id) {
        await cancelNotification(meta.id);
        state.setNotificationMeta(id, undefined);
      } else if (enabled) {
        const tParsed = parseHHMM(rem.time) || { hour: 8, minute: 0 };
        const title = rem.label || (rem?.type ? t(`reminders.types.${rem.type}`) : "");
        const nid = await scheduleDailyNext(id, title, t("reminders.actionTime"), tParsed.hour, tParsed.minute, "reminders");
        if (nid) state.setNotificationMeta(id, { id: nid, time: rem.time });
      }
    } catch {}
  }

  async function saveCustomReminder() {
    const label = (customLabel || '').trim();
    const timeStr = toHHMM(customTime) || customTime || '08:00';
    if (!label) { Alert.alert(t('common.error'), t('settings.label')); return; }
    const parsed = parseHHMM(timeStr) || { hour: 8, minute: 0 };
    try {
      const id = `custom_${Date.now()}`;
      // Add reminder to store
      state.addReminder({ id, type: 'custom', time: timeStr, enabled: true, label });
      // Schedule daily repeating
      const nid = await scheduleDailyNext(id, label, t('reminders.actionTime'), parsed.hour, parsed.minute, 'reminders');
      if (nid) state.setNotificationMeta(id, { id: nid, time: timeStr });
      setCustomMode(false); setCustomLabel(''); setCustomTime('08:00');
      Alert.alert(t('common.done'));
    } catch (e: any) {
      Alert.alert(t('common.error'), String(e?.message || e));
    }
  }

  async function exportData() {
    try {
      const full = useAppStore.getState();
      const payload = JSON.stringify(full);
      const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
      const fileUri = `${dir}scarlett-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, payload, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: "application/json" });
      } else {
        Alert.alert(t("common.ok"), fileUri);
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), String(e?.message || e));
    }
  }

  async function importData() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: "application/json" });
      if (picked.type !== "success" || !picked.uri) return;
      const content = await FileSystem.readAsStringAsync(picked.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const obj = JSON.parse(content);
      if (!obj || typeof obj !== "object") throw new Error("Invalid file");
      // Merge minimal keys
      (useAppStore as any).setState((prev: any) => ({
        ...prev,
        days: obj.days || prev.days,
        goal: obj.goal || prev.goal,
        reminders: Array.isArray(obj.reminders) ? obj.reminders.map((r: any) => ({ ...r, time: toHHMM(r?.time) || "08:00" })) : prev.reminders,
        chat: obj.chat || prev.chat,
        saved: obj.saved || prev.saved,
        achievementsUnlocked: obj.achievementsUnlocked || prev.achievementsUnlocked,
        xp: typeof obj.xp === "number" ? obj.xp : prev.xp,
        xpBonus: typeof obj.xpBonus === "number" ? obj.xpBonus : prev.xpBonus,
        language: prev.language, // keep user setting
        theme: obj.theme || prev.theme,
        eventHistory: obj.eventHistory || prev.eventHistory,
        legendShown: obj.legendShown ?? prev.legendShown,
        rewardsSeen: obj.rewardsSeen || prev.rewardsSeen,
        profileAlias: obj.profileAlias || prev.profileAlias,
        xpLog: obj.xpLog || prev.xpLog,
        aiInsightsEnabled: obj.aiInsightsEnabled ?? prev.aiInsightsEnabled,
        aiFeedback: obj.aiFeedback || prev.aiFeedback,
        eventsEnabled: obj.eventsEnabled ?? prev.eventsEnabled,
        cycles: obj.cycles || prev.cycles,
        cycleLogs: obj.cycleLogs || prev.cycleLogs,
        waterCupMl: typeof obj.waterCupMl === "number" ? obj.waterCupMl : prev.waterCupMl,
        lastChatLeaveAt: obj.lastChatLeaveAt || prev.lastChatLeaveAt,
        profile: obj.profile || prev.profile,
        gallery: obj.gallery || prev.gallery,
      }));
      // Reschedule enabled reminders
      const next = (useAppStore.getState().reminders || []).filter((r) => r.enabled);
      const ok = await initializeNotifications();
      if (ok) {
        for (const r of next) {
          try {
            const p = parseHHMM(r.time) || { hour: 8, minute: 0 };
            const title = r.label || (r?.type ? t(`reminders.types.${r.type}`) : "");
            const nid = await scheduleDailyNext(r.id, title, t("reminders.actionTime"), p.hour, p.minute, "reminders");
            if (nid) state.setNotificationMeta(r.id, { id: nid, time: r.time });
          } catch {}
        }
      }
      Alert.alert(t("common.done"));
    } catch (e: any) {
      Alert.alert(t("common.error"), String(e?.message || e));
    }
  }

  const desiredOrder = ["pills_morning", "pills_evening", "weight", "water", "sport"];
  const sortedReminders = [...state.reminders].sort((a, b) => {
    const ai = desiredOrder.indexOf(a.type);
    const bi = desiredOrder.indexOf(b.type);
    const aIdx = ai < 0 ? 999 : ai;
    const bIdx = bi < 0 ? 999 : bi;
    return aIdx - bIdx;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={t("common.back")}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="star" size={16} color={colors.primary} />
            <Text style={[styles.appTitle, { color: colors.text, marginHorizontal: 6 }]}>{appTitle}</Text>
            <Ionicons name="star" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.muted }]}>{t("settings.title")}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Language */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="globe" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("settings.language")}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <TouchableOpacity onPress={() => state.setLanguage("de")} accessibilityLabel={t('common.lang.de')} style={{ padding: 4, borderRadius: 8, borderWidth: 1, borderColor: state.language === "de" ? colors.primary : colors.muted }}>
              <FlagDE width={40} height={26} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => state.setLanguage("en")} accessibilityLabel={t('common.lang.en')} style={{ padding: 4, borderRadius: 8, borderWidth: 1, borderColor: state.language === "en" ? colors.primary : colors.muted }}>
              <FlagUK width={40} height={26} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => state.setLanguage("pl")} accessibilityLabel={t('common.lang.pl')} style={{ padding: 4, borderRadius: 8, borderWidth: 1, borderColor: state.language === "pl" ? colors.primary : colors.muted }}>
              <FlagPL width={40} height={26} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="color-palette" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("settings.theme")}</Text>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t("settings.chooseThemeHint")}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {["pink_default", "pink_pastel", "pink_vibrant", "golden_pink"].map((tt) => (
              <TouchableOpacity key={tt} onPress={() => state.setTheme(tt as any)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: state.theme === tt ? colors.primary : "transparent" }]}> 
                <Text style={{ color: state.theme === tt ? "#fff" : colors.text }}>{t(`themeLabels.${tt}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick link: Profil */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="person-circle" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("settings.profileQuick")}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/profile")} style={[styles.badge, { borderColor: colors.muted }]}> 
              <Text style={{ color: colors.text }}>{t("common.open")}</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t("settings.profileQuickHint")}</Text>
        </View>

        {/* Drinks settings */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="cafe" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("settings.drinksTitle")}</Text>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t("settings.drinksInfo")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: colors.text, width: 160 }}>{t("settings.cupSize")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <TextInput
                keyboardType="number-pad"
                value={cupInput}
                onChangeText={setCupInput}
                onBlur={() => {
                  const n = parseInt((cupInput || "").replace(/[^0-9]/g, "") || "0", 10);
                  const v = Math.max(0, Math.min(1000, isNaN(n) ? 0 : n));
                  state.setWaterCupMl(v);
                  setCupInput(String(v));
                }}
                style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }}
  async function saveCustomReminder() {
    const label = (customLabel || '').trim();
    const timeStr = toHHMM(customTime) || customTime || '08:00';
    if (!label) { Alert.alert(t('common.error'), t('settings.label')); return; }
    const parsed = parseHHMM(timeStr) || { hour: 8, minute: 0 };
    try {
      const id = `custom_${Date.now()}`;
      // Add reminder to store
      state.addReminder({ id, type: 'custom', time: timeStr, enabled: true, label });
      // Schedule daily repeating
      const nid = await scheduleDailyNext(id, label, t('reminders.actionTime'), parsed.hour, parsed.minute, 'reminders');
      if (nid) state.setNotificationMeta(id, { id: nid, time: timeStr });
      setCustomMode(false); setCustomLabel(''); setCustomTime('08:00');
      Alert.alert(t('common.done'));
    } catch (e: any) {
      Alert.alert(t('common.error'), String(e?.message || e));
    }
  }

              />
              <Text style={{ color: colors.muted, marginLeft: 8 }}>{t("common.ml")}</Text>
            </View>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t("settings.rangeHint")}</Text>
        </View>

        {/* Reminders */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="notifications-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("settings.reminders")}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={seedDefaults} style={[styles.badge, { borderColor: colors.muted }]}> 
                <Text style={{ color: colors.text }}>{t("settings.seedDefaults")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCustomMode((v) => !v)} style={[styles.badge, { borderColor: colors.muted }]}> 
                <Text style={{ color: colors.text }}>{t("settings.custom")}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {customMode ? (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  placeholder={t("settings.label")}
                  placeholderTextColor={colors.muted}
                  value={customLabel}
                  onChangeText={setCustomLabel}
                  style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }}
                />
                <View style={{ width: 100 }}>
                  <TimePicker time={customTime} onTimeChange={setCustomTime} colors={colors} style={{ borderWidth: 1, borderColor: colors.muted, borderRadius: 8, backgroundColor: colors.input }} />
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <TouchableOpacity onPress={() => { setCustomMode(false); setCustomLabel(""); setCustomTime("08:00"); }} style={[styles.badge, { borderColor: colors.muted }]}> 
                  <Text style={{ color: colors.text }}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveCustomReminder} style={[styles.badge, { borderColor: colors.muted, backgroundColor: colors.primary }]}> 
                  <Text style={{ color: "#fff" }}>{t("common.save")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          {sortedReminders.length === 0 ? <Text style={{ color: colors.muted, marginTop: 6 }}>{t("reminders.none")}</Text> : null}
          {sortedReminders.map((r) => (
            <View key={r.id} style={{ marginTop: 8, flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{r.label || t(`reminders.types.${r.type}`)}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                  <View style={{ flex: 1 }}>
                    <TimePicker time={reminderTimes[r.id] || "08:00"} onTimeChange={(str) => updateTime(r.id, str)} colors={colors} style={{ width: 120, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, backgroundColor: colors.input }} />
                  </View>
                  <View style={{ width: 8 }} />
                  <Switch value={r.enabled} onValueChange={(v) => toggleReminder(r.id, v)} thumbColor={"#fff"} trackColor={{ true: colors.primary, false: colors.muted }} />
                </View>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  const meta = state.notificationMeta[r.id];
                  if (meta?.id) await cancelNotification(meta.id);
                  state.deleteReminder(r.id);
                }}
                style={{ padding: 8 }}
              >
                <Ionicons name="trash" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* AI Insights */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("settings.aiInsights")}</Text>
            </View>
            <Switch value={state.aiInsightsEnabled} onValueChange={(v) => state.setAiInsightsEnabled(v)} thumbColor={"#fff"} trackColor={{ true: colors.primary, false: colors.muted }} />
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t("settings.aiInsightsHint")}</Text>
        </View>

        {/* Weekly events */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("settings.weeklyEvents")}</Text>
            </View>
            <Switch value={state.eventsEnabled} onValueChange={(v) => state.setEventsEnabled(v)} thumbColor={"#fff"} trackColor={{ true: colors.primary, false: colors.muted }} />
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t("settings.weeklyEventsHint")}</Text>
        </View>

        {/* Backend URL */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="cloud-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("settings.backendUrl")}</Text>
          </View>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>{t("settings.backendUrlHint")}</Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              placeholder={t("settings.backendPlaceholder")}
              placeholderTextColor={colors.muted}
              value={backendUrl}
              onChangeText={setBackendUrl}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }}
            />
            <TouchableOpacity onPress={saveBackendUrl} style={[styles.badge, { borderColor: colors.muted, backgroundColor: colors.primary }]}> 
              <Text style={{ color: "#fff" }}>{t("common.save")}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 8 }}>
            <TouchableOpacity onPress={testBackendUrl} style={[styles.badge, { borderColor: colors.muted }]}> 
              <Text style={{ color: colors.text }}>{t("settings.testConnection")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Backup */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="cloud-upload" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("common.info")}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity onPress={exportData} style={[styles.badge, { borderColor: colors.muted }]}> 
              <Text style={{ color: colors.text }}>{t("settings.export")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={importData} style={[styles.badge, { borderColor: colors.muted }]}> 
              <Text style={{ color: colors.text }}>{t("settings.import")}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Debug: geplante Benachrichtigungen anzeigen */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="bug-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>Debug</Text>
            </View>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const list = await getScheduledNotifications();
                  const lines = (list || []).map((n) => {
                    const t = (n as any)?.content?.title || '(ohne Titel)';
                    const trig = (n as any)?.trigger;
                    let when = '';
                    if (trig?.date) {
                      try { when = new Date(trig.date).toLocaleString(); } catch {}
                    } else if (typeof trig?.hour === 'number' && typeof trig?.minute === 'number') {
                      when = `${String(trig.hour).padStart(2,'0')}:${String(trig.minute).padStart(2,'0')} (täglich)`;
                    } else if (typeof trig?.seconds === 'number') {
                      when = `in ${trig.seconds}s`;
                    }
                    return `• ${t} → ${when}`;
                  }).join('\n');
                  const msg = lines || 'Keine geplanten Benachrichtigungen gefunden.';
                  Alert.alert('Geplante Benachrichtigungen', msg);
                } catch (e: any) {
                  Alert.alert('Fehler', String(e?.message || e));
                }
              }}
              style={[styles.badge, { borderColor: colors.muted, backgroundColor: colors.primary }]}>
              <Text style={{ color: '#fff' }}>Anzeigen</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>Zeigt eine Liste aller durch das System geplanten Benachrichtigungen.</Text>
        </View>


        {/* App info */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="apps-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("common.profile")}</Text>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t("common.version")}: {version}</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{t("common.createdBy")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  appTitle: { fontSize: 18, fontWeight: "700" },
  title: { fontSize: 12 },
  iconBtn: { padding: 8 },
  card: { borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12, borderTopWidth: 1 },
});