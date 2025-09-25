import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, useLevel } from "../src/store/useStore";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { computeChains } from "../src/gamification/chains";
import { EVENTS, getWeekRange, getCurrentWeeklyEvent, computeEventProgress } from "../src/gamification/events";
import { toKey } from "../src/utils/date";
import CelebrationOverlay from "../src/components/CelebrationOverlay";
import { predictNextStart } from "../src/utils/cycle";
import PillIcon from "../src/components/icons/PillIcon";
import ScaleIcon from "../src/components/icons/ScaleIcon";
import SunIcon from "../src/components/icons/SunIcon";
import MoonIcon from "../src/components/icons/MoonIcon";
import { safeDateLabel } from "../src/utils/locale";
import { useI18n } from "../src/i18n";

function useThemeColors(theme: string) {
  if (theme === "pink_pastel") return { bg: "#fff0f5", card: "#ffe4ef", primary: "#d81b60", text: "#3a2f33", muted: "#8a6b75" };
  if (theme === "pink_vibrant") return { bg: "#1b0b12", card: "#2a0f1b", primary: "#ff2d87", text: "#ffffff", muted: "#e59ab8" };
  if (theme === "golden_pink") return { bg: "#fff8f0", card: "#ffe9c7", primary: "#dba514", text: "#2a1e22", muted: "#9b7d4e" };
  return { bg: "#fde7ef", card: "#ffd0e0", primary: "#e91e63", text: "#2a1e22", muted: "#7c5866" };
}

function getLatestWeightKg(days: Record<string, any>): number | undefined {
  const arr = Object.values(days)
    .filter((d: any) => typeof d.weight === "number" && d.date)
    .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
  const w = arr.length ? Number(arr[arr.length - 1].weight) : undefined;
  return isNaN(w as any) ? undefined : (w as number);
}

function computeDailyWaterTargetMl(weightKg?: number, didSport?: boolean): number {
  const base = weightKg ? Math.round(weightKg * 35) : 2000;
  const sportExtra = didSport ? 500 : 0;
  return base + sportExtra; // ml
}

export default function Home() {
  const router = useRouter();
  const state = useAppStore();
  const { theme, days, eventHistory, currentDate, ensureDay, language, togglePill, incDrink, toggleFlag, setWeight } = state as any;
  const { level, xp } = useLevel();
  const colors = useThemeColors(theme);
  const t = useI18n();

  const prevLevelRef = useRef(level);
  const prevUnlockCountRef = useRef(state.achievementsUnlocked?.length || 0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationText, setCelebrationText] = useState("");

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setCelebrationText(t("index.levelUp", { level }));
      setShowCelebration(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      prevLevelRef.current = level;
    }
  }, [level]);
  useEffect(() => {
    const count = state.achievementsUnlocked?.length || 0;
    if (count > prevUnlockCountRef.current) {
      setCelebrationText(t("index.newAchievement"));
      setShowCelebration(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      prevUnlockCountRef.current = count;
    }
  }, [state.achievementsUnlocked]);

  // Always focus today on app open
  useEffect(() => {
    try {
      state.goToday();
    } catch {}
  }, []);

  useEffect(() => {
    ensureDay(currentDate);
  }, [currentDate]);

  const todayKey = toKey(new Date());
  const day =
    days[currentDate] ||
    ({ pills: { morning: false, evening: false }, drinks: { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false } } as any);

  const dateLabel = React.useMemo(() => {
    try {
      const [y, m, d] = currentDate.split("-").map((n) => parseInt(n, 10));
      const dt = new Date(y, m - 1, d);
      return safeDateLabel(dt, language as any);
    } catch {
      return currentDate;
    }
  }, [currentDate, language]);

  const now = new Date();
  const { weekKey, dayKeys } = getWeekRange(now);

  // Chains (unchanged)
  const chainsAll = computeChains(state);
  const chainIdx = Math.abs(weekKey.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % Math.max(1, chainsAll.length);
  const currentChain = chainsAll[chainIdx];

  // Weekly Event (1.1.3 style) based on events config
  const currentEvent = getCurrentWeeklyEvent(now);
  const eventProgress = computeEventProgress(dayKeys, state, currentEvent);
  useEffect(() => {
    if (state.eventsEnabled === false) return;
    if (eventProgress.completed) {
      const hist = state.eventHistory[weekKey];
      if (!hist?.completed) {
        try {
          state.completeEvent(weekKey, { id: currentEvent.id, xp: currentEvent.xp });
        } catch {}
      }
    }
  }, [eventProgress.completed, weekKey, currentEvent?.id]);

  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState<string>(day?.weight ? String(day.weight) : "");
  useEffect(() => {
    setWeightInput(day?.weight ? String(day.weight) : "");
  }, [currentDate, day?.weight]);

  const [help, setHelp] = useState<{ [k: string]: boolean }>({});
  const toggleHelp = (k: string) => setHelp((h) => ({ ...h, [k]: !h[k] }));

  // Hydration progress
  const weightKg = getLatestWeightKg(days);
  const goalMl = computeDailyWaterTargetMl(weightKg, !!day.drinks.sport);
  const intakeMl = (state.waterCupMl || 250) * (day.drinks.water || 0) + (day.drinks.waterCure ? 1000 : 0);
  const percent = Math.max(0, Math.min(100, Math.round((intakeMl / Math.max(1, goalMl)) * 100)));

  // Next expected cycle
  const expectedNext = predictNextStart(state.cycles);

  const topChain = useMemo(() => {
    const chains = computeChains(state);
    return chains.sort((a, b) => b.nextPercent - a.nextPercent)[0];
  }, [state.days, state.goal, state.reminders, state.chat, state.saved, state.achievementsUnlocked, state.xp, state.language, state.theme]);

  const lng2 = state.language === "en" ? "en" : "de";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.card }]}>
          <View style={{ alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="star" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18, marginHorizontal: 8 }}>{t("common.appTitle")}</Text>
              <Ionicons name="star" size={18} color={colors.primary} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", width: "70%", alignSelf: "center", marginTop: 8 }}>
              <Text style={{ color: colors.text }}>{t("common.level")} {level}</Text>
              <Text style={{ color: colors.text }}>{xp} {t("common.xp")}</Text>
            </View>
          </View>
        </View>

        {/* Date navigation */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <TouchableOpacity accessibilityLabel={t("common.previousDay")} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); state.goPrevDay(); }} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t("common.today")} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); state.goToday(); }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{dateLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={t("common.nextDay")} onPress={() => { const canGoNext = currentDate <= toKey(new Date()); if (canGoNext) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); state.goNextDay(); } }} style={styles.iconBtn}>
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pills Section */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <PillIcon size={20} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("index.pillsTitle")}</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
            {/* Morning Button */}
            <TouchableOpacity
              accessibilityLabel={t("index.takeMorning")}
              onPress={() => {
                try {
                  togglePill(currentDate, "morning");
                } catch (e) {
                  console.warn("toggle morning pill failed", e);
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.toggle, {
                borderColor: colors.primary,
                backgroundColor: day.pills.morning ? colors.primary : "transparent",
              }]}
            >
              <SunIcon size={18} color={day.pills.morning ? "#fff" : colors.primary} />
              <Text style={{ color: day.pills.morning ? "#fff" : colors.text, marginLeft: 6 }}>{t("index.morning")}</Text>
              <View style={{ flex: 1 }} />
              <Ionicons
                name={day.pills.morning ? "checkmark-circle" : "close-circle"}
                size={18}
                color={day.pills.morning ? "#fff" : colors.primary}
              />
            </TouchableOpacity>

            {/* Evening Button */}
            <TouchableOpacity
              accessibilityLabel={t("index.takeEvening")}
              onPress={() => {
                try {
                  togglePill(currentDate, "evening");
                } catch (e) {
                  console.warn("toggle evening pill failed", e);
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.toggle, {
                borderColor: colors.primary,
                backgroundColor: day.pills.evening ? colors.primary : "transparent",
              }]}
            >
              <MoonIcon size={18} color={day.pills.evening ? "#fff" : colors.primary} />
              <Text style={{ color: day.pills.evening ? "#fff" : colors.text, marginLeft: 6 }}>{t("index.evening")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Drinks & Sport */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="cafe" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: "700", marginLeft: 8 }}>{t("index.drinksSport")}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleHelp("drinks")}>
              <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.drinks ? <Text style={{ color: colors.muted, marginTop: 6 }}>{t("index.drinksHelp")}</Text> : null}

          {/* Hydration progress */}
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.muted }}>{Math.round(intakeMl / 10) / 100} L</Text>
              <Text style={{ color: colors.muted }}>{Math.round(goalMl / 10) / 100} L · {percent}%</Text>
            </View>
            <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
              <View style={{ width: `${percent}%`, height: 8, backgroundColor: colors.primary }} />
            </View>
            {day.drinks.waterCure ? (
              <View style={{ flexDirection: "row", justifyContent: "flex-start", marginTop: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: "#fff" }}>{t("index.waterCureTag")}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Water simple counter */}
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: colors.text, fontWeight: "600" }}>{t("index.water")}</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => { try { incDrink(currentDate, "water", -1); } catch (e) { console.warn("dec water failed", e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtnSm, { borderColor: colors.primary }]} accessibilityLabel={t("index.decWater")}>
              <Ionicons name="remove" size={16} color={colors.primary} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, marginHorizontal: 10, minWidth: 18, textAlign: "center" }}>{day.drinks.water}</Text>
            <TouchableOpacity onPress={() => { try { incDrink(currentDate, "water", +1); } catch (e) { console.warn("inc water failed", e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtnSm, { borderColor: colors.primary }]} accessibilityLabel={t("index.incWater")}>
              <Ionicons name="add" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Coffee simple counter */}
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: colors.text, fontWeight: "600" }}>{t("index.coffee")}</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => { try { incDrink(currentDate, "coffee", -1); } catch (e) { console.warn("dec coffee failed", e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtnSm, { borderColor: colors.primary }]} accessibilityLabel={t("index.decCoffee")}>
              <Ionicons name="remove" size={16} color={colors.primary} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, marginHorizontal: 10, minWidth: 18, textAlign: "center" }}>{day.drinks.coffee}</Text>
            <TouchableOpacity onPress={() => { try { incDrink(currentDate, "coffee", +1); } catch (e) { console.warn("inc coffee failed", e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtnSm, { borderColor: colors.primary }]} accessibilityLabel={t("index.incCoffee")}>
              <Ionicons name="add" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Flags */}
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity onPress={() => toggleFlag(currentDate, "slimCoffee")} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.slimCoffee ? colors.primary : "transparent" }]}>
              <Text style={{ color: day.drinks.slimCoffee ? "#fff" : colors.text }}>{t("index.slimCoffee")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleFlag(currentDate, "gingerGarlicTea")} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.gingerGarlicTea ? colors.primary : "transparent" }]}>
              <Text style={{ color: day.drinks.gingerGarlicTea ? "#fff" : colors.text }}>{t("index.gingerGarlicTea")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleFlag(currentDate, "waterCure")} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.waterCure ? colors.primary : "transparent" }]}>
              <Text style={{ color: day.drinks.waterCure ? "#fff" : colors.text }}>{t("index.waterCure")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleFlag(currentDate, "sport")} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.sport ? colors.primary : "transparent" }]}>
              <Text style={{ color: day.drinks.sport ? "#fff" : colors.text }}>{t("index.sport")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>{t("index.quickAccess")}</Text>
          <View style={{ marginTop: 10, flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/analysis"); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel={t("index.analysis")}>
              <Ionicons name="analytics" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{t("index.analysis")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/events"); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel={t("index.events")}>
              <Ionicons name="trophy" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{t("index.events")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/chat"); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel={t("index.chat")}>
              <Ionicons name="chatbubbles" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{t("index.chat")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/saved"); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel={t("index.saved")}>
              <Ionicons name="bookmark" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{t("index.saved")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/faq"); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel={t("index.faq")}>
              <Ionicons name="help-circle" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{t("index.faq")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/settings"); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel={t("index.settings")}>
              <Ionicons name="settings" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 6 }}>{t("index.settings")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Weight modal */}
      <Modal visible={weightModal} transparent animationType="slide" onRequestClose={() => setWeightModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}>
            <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, width: "88%" }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{t("index.weightModalTitle")}</Text>
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Ionicons name="fitness" size={18} color={colors.primary} />
                  <TextInput style={{ flex: 1, marginLeft: 8, color: colors.text }} keyboardType="decimal-pad" placeholder={t("index.weightPlaceholder")} placeholderTextColor={colors.muted} value={weightInput} onChangeText={setWeightInput} />
                  <Text style={{ color: colors.muted }}>{t("common.kg")}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                <TouchableOpacity onPress={() => setWeightModal(false)} style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]}> 
                  <Text style={{ color: colors.text }}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    try {
                      const normalized = (weightInput || "").replace(",", ".");
                      const val = parseFloat(normalized);
                      if (!isNaN(val) && val > 0) {
                        setWeight(currentDate, val);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setWeightModal(false);
                      }
                    } catch (e) {
                      console.warn("set weight failed", e);
                    }
                  }}
                  style={[styles.cta, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: "#fff" }}>{t("common.save")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CelebrationOverlay visible={showCelebration} message={celebrationText} onDone={() => setShowCelebration(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerCard: { borderRadius: 12, padding: 16 },
  card: { borderRadius: 12, padding: 12 },
  cta: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8 },
  iconBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  toggle: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  counterBtn: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8, borderWidth: 1, minWidth: 44, alignItems: "center", justifyContent: "center" },
  counterBtnSm: { paddingHorizontal: 8, paddingVertical: 8, borderRadius: 8, borderWidth: 1, minWidth: 36, alignItems: "center", justifyContent: "center" },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  quick: { width: "47%", borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center" },
});