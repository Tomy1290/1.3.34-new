import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, useLevel } from "../src/store/useStore";
import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';
import { computeChains } from "../src/gamification/chains";
import { EVENTS, getWeekRange, getCurrentWeeklyEvent, computeEventProgress } from "../src/gamification/events";
import { toKey } from "../src/utils/date";
import CelebrationOverlay from "../src/components/CelebrationOverlay";
import { predictNextStart } from "../src/utils/cycle";
import PillIcon from "../src/components/icons/PillIcon";
import ScaleIcon from "../src/components/icons/ScaleIcon";
import { safeDateLabel } from "../src/utils/locale";
import { useI18n } from "../src/i18n";

function useThemeColors(theme: string) {
  if (theme === "pink_pastel") return { bg: "#fff0f5", card: "#ffe4ef", primary: "#d81b60", text: "#3a2f33", muted: "#8a6b75" };
  if (theme === "pink_vibrant") return { bg: "#1b0b12", card: "#2a0f1b", primary: "#ff2d87", text: "#ffffff", muted: "#e59ab8" };
  if (theme === "golden_pink") return { bg: "#fff8f0", card: "#ffe9c7", primary: "#dba514", text: "#2a1e22", muted: "#9b7d4e" };
  return { bg: "#fde7ef", card: "#ffd0e0", primary: "#e91e63", text: "#2a1e22", muted: "#7c5866" };
}

function getLatestWeightKg(days: Record<string, any>): number | undefined {
  const arr = Object.values(days).filter((d: any) => typeof d.weight === 'number' &amp;&amp; d.date).sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
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

  useEffect(() =&gt; { if (level &gt; prevLevelRef.current) { setCelebrationText(t('index.levelUp', { level })); setShowCelebration(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); prevLevelRef.current = level; } }, [level]);
  useEffect(() =&gt; { const count = state.achievementsUnlocked?.length || 0; if (count &gt; prevUnlockCountRef.current) { setCelebrationText(t('index.newAchievement')); setShowCelebration(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); prevUnlockCountRef.current = count; } }, [state.achievementsUnlocked]);

  // Always focus today on app open
  useEffect(() =&gt; { try { state.goToday(); } catch {} }, []);

  useEffect(() =&gt; { ensureDay(currentDate); }, [currentDate]);

  const todayKey = toKey(new Date());
  const day = days[currentDate] || { pills: { morning: false, evening: false }, drinks: { water: 0, coffee: 0, slimCoffee: false, gingerGarlicTea: false, waterCure: false, sport: false } } as any;

  const dateLabel = React.useMemo(() =&gt; { try { const [y, m, d] = currentDate.split('-').map((n) =&gt; parseInt(n, 10)); const dt = new Date(y, m - 1, d); return safeDateLabel(dt, language as any); } catch { return currentDate; } }, [currentDate, language]);

  const now = new Date();
  const { weekKey, dayKeys } = getWeekRange(now);

  // Chains (unchanged)
  const chainsAll = computeChains(state);
  const chainIdx = Math.abs(weekKey.split('').reduce((a,c)=&gt;a+c.charCodeAt(0),0)) % Math.max(1, chainsAll.length);
  const currentChain = chainsAll[chainIdx];

  // Weekly Event (1.1.3 style) based on events config
  const currentEvent = getCurrentWeeklyEvent(now);
  const eventProgress = computeEventProgress(dayKeys, state, currentEvent);
  useEffect(() =&gt; {
    if (state.eventsEnabled === false) return;
    if (eventProgress.completed) {
      const hist = state.eventHistory[weekKey];
      if (!hist?.completed) {
        try { state.completeEvent(weekKey, { id: currentEvent.id, xp: currentEvent.xp }); } catch {}
      }
    }
  }, [eventProgress.completed, weekKey, currentEvent?.id]);

  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState<string>(day?.weight ? String(day.weight) : "");
  useEffect(() =&gt; { setWeightInput(day?.weight ? String(day.weight) : ""); }, [currentDate, day?.weight]);

  const [help, setHelp] = useState<{[k:string]: boolean}>({});
  const toggleHelp = (k: string) =&gt; setHelp((h) =&gt; ({ ...h, [k]: !h[k] }));

  // Hydration progress
  const weightKg = getLatestWeightKg(days);
  const goalMl = computeDailyWaterTargetMl(weightKg, !!day.drinks.sport);
  const intakeMl = ((state.waterCupMl || 250) * (day.drinks.water || 0)) + (day.drinks.waterCure ? 1000 : 0);
  const percent = Math.max(0, Math.min(100, Math.round((intakeMl / Math.max(1, goalMl)) * 100)));

  // Next expected cycle
  const expectedNext = predictNextStart(state.cycles);

  const topChain = useMemo(() =&gt; {
    const chains = computeChains(state);
    return chains.sort((a,b) =&gt; (b.nextPercent - a.nextPercent))[0];
  }, [state.days, state.goal, state.reminders, state.chat, state.saved, state.achievementsUnlocked, state.xp, state.language, state.theme]);

  const lng2 = state.language === 'en' ? 'en' : 'de';

  return (
    &lt;SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}&gt;
      &lt;ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}&gt;
        {/* Header */}
        &lt;View style={[styles.headerCard, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ alignItems: 'center' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name="star" size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, marginHorizontal: 8 }}&gt;{t('common.appTitle')}&lt;/Text&gt;
              &lt;Ionicons name="star" size={18} color={colors.primary} /&gt;
            &lt;/View&gt;
            &lt;View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '70%', alignSelf: 'center', marginTop: 8 }}&gt;
              &lt;Text style={{ color: colors.text }}&gt;{t('common.level')} {level}&lt;/Text&gt;
              &lt;Text style={{ color: colors.text }}&gt;{xp} {t('common.xp')}&lt;/Text&gt;
            &lt;/View&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Date navigation */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;TouchableOpacity accessibilityLabel={t('common.previousDay')} onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); state.goPrevDay(); }} style={styles.iconBtn}&gt;
              &lt;Ionicons name="chevron-back" size={22} color={colors.text} /&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity accessibilityLabel={t('common.today')} onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); state.goToday(); }}&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700' }}&gt;{dateLabel}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity accessibilityLabel={t('common.nextDay')} onPress={() =&gt; { const canGoNext = currentDate &lt;= toKey(new Date()); if (canGoNext) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); state.goNextDay(); } }} style={styles.iconBtn}&gt;
              &lt;Ionicons name="chevron-forward" size={22} color={colors.text} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Pills Section */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;PillIcon size={20} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;
                {t('index.pillsTitle')}
              &lt;/Text&gt;
            &lt;/View&gt;
          &lt;/View&gt;

          &lt;View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}&gt;
            {/* Morning Button */}
            &lt;TouchableOpacity 
              accessibilityLabel={t('index.takeMorning')}
              onPress={() =&gt; { 
                try { togglePill(currentDate, 'morning'); } catch (e) { console.warn('toggle morning pill failed', e); }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
              }} 
              style={[styles.toggle, { 
                borderColor: colors.primary, 
                backgroundColor: day.pills.morning ? colors.primary : 'transparent' 
              }]}
            &gt; 
              &lt;Ionicons 
                name="sunny" 
                size={18} 
                color={day.pills.morning ? '#fff' : colors.primary} 
              /&gt;
              &lt;Text style={{ 
                color: day.pills.morning ? '#fff' : colors.text, 
                marginLeft: 6 
              }}&gt;
                {t('index.morning')}
              &lt;/Text&gt;
            &lt;/TouchableOpacity&gt;

            {/* Evening Button */}
            &lt;TouchableOpacity 
              accessibilityLabel={t('index.takeEvening')}
              onPress={() =&gt; { 
                try { togglePill(currentDate, 'evening'); } catch (e) { console.warn('toggle evening pill failed', e); }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
              }} 
              style={[styles.toggle, { 
                borderColor: colors.primary, 
                backgroundColor: day.pills.evening ? colors.primary : 'transparent' 
              }]}
            &gt; 
              &lt;Ionicons 
                name="moon" 
                size={18} 
                color={day.pills.evening ? '#fff' : colors.primary} 
              /&gt;
              &lt;Text style={{ 
                color: day.pills.evening ? '#fff' : colors.text, 
                marginLeft: 6 
              }}&gt;
                {t('index.evening')}
              &lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Drinks &amp; Sport */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name='cafe' size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('index.drinksSport')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('drinks')} &gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.drinks ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('index.drinksHelp')}&lt;/Text&gt; : null}

          {/* Hydration progress */}
          &lt;View style={{ marginTop: 8 }}&gt;
            &lt;View style={{ flexDirection: 'row', justifyContent: 'space-between' }}&gt;
              &lt;Text style={{ color: colors.muted }}&gt;{Math.round(intakeMl/10)/100} L&lt;/Text&gt;
              &lt;Text style={{ color: colors.muted }}&gt;{Math.round(goalMl/10)/100} L · {percent}%&lt;/Text&gt;
            &lt;/View&gt;
            &lt;View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 6 }}&gt;
              &lt;View style={{ width: `${percent}%`, height: 8, backgroundColor: colors.primary }} /&gt;
            &lt;/View&gt;
            {day.drinks.waterCure ? (
              &lt;View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginTop: 6 }}&gt;
                &lt;View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}&gt;
                  &lt;Text style={{ color: '#fff' }}&gt;{t('index.waterCureTag')}&lt;/Text&gt;
                &lt;/View&gt;
              &lt;/View&gt;
            ) : null}
          &lt;/View&gt;

          {/* Water simple counter */}
          &lt;View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}&gt;
            &lt;Text style={{ color: colors.text, fontWeight: '600' }}&gt;{t('index.water')}&lt;/Text&gt;
            &lt;View style={{ flex: 1 }} /&gt;
            &lt;TouchableOpacity onPress={() =&gt; { try { incDrink(currentDate, 'water', -1); } catch (e) { console.warn('dec water failed', e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtnSm, { borderColor: colors.primary }]} accessibilityLabel={t('index.decWater')}&gt;
              &lt;Ionicons name='remove' size={16} color={colors.primary} /&gt;
            &lt;/TouchableOpacity&gt;
            &lt;Text style={{ color: colors.text, marginHorizontal: 10, minWidth: 18, textAlign: 'center' }}&gt;{day.drinks.water}&lt;/Text&gt;
            &lt;TouchableOpacity onPress={() =&gt; { try { incDrink(currentDate, 'water', +1); } catch (e) { console.warn('inc water failed', e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtnSm, { borderColor: colors.primary }]} accessibilityLabel={t('index.incWater')}&gt;
              &lt;Ionicons name='add' size={16} color={colors.primary} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;

          {/* Coffee simple counter */}
          &lt;View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}&gt;
            &lt;Text style={{ color: colors.text, fontWeight: '600' }}&gt;{t('index.coffee')}&lt;/Text&gt;
            &lt;View style={{ flex: 1 }} /&gt;
            &lt;TouchableOpacity onPress={() =&gt; { try { incDrink(currentDate, 'coffee', -1); } catch (e) { console.warn('dec coffee failed', e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtnSm, { borderColor: colors.primary }]} accessibilityLabel={t('index.decCoffee')}&gt;
              &lt;Ionicons name='remove' size={16} color={colors.primary} /&gt;
            &lt;/TouchableOpacity&gt;
            &lt;Text style={{ color: colors.text, marginHorizontal: 10, minWidth: 18, textAlign: 'center' }}&gt;{day.drinks.coffee}&lt;/Text&gt;
            &lt;TouchableOpacity onPress={() =&gt; { try { incDrink(currentDate, 'coffee', +1); } catch (e) { console.warn('inc coffee failed', e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.counterBtnSm, { borderColor: colors.primary }]} accessibilityLabel={t('index.incCoffee')}&gt;
              &lt;Ionicons name='add' size={16} color={colors.primary} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;

          {/* Toggles */}
          &lt;View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}&gt;
            &lt;TouchableOpacity onPress={() =&gt; { try { toggleFlag(currentDate, 'slimCoffee'); } catch (e) { console.warn('toggle slimCoffee failed', e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.slimCoffee ? colors.primary : 'transparent' }]} accessibilityLabel={t('index.slimCoffee')}&gt;
              &lt;Text style={{ color: day.drinks.slimCoffee ? '#fff' : colors.text }}&gt;{t('index.slimCoffee')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity onPress={() =&gt; { try { toggleFlag(currentDate, 'gingerGarlicTea'); } catch (e) { console.warn('toggle gingerGarlicTea failed', e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.gingerGarlicTea ? colors.primary : 'transparent' }]} accessibilityLabel={t('index.gingerGarlicTea')}&gt;
              &lt;Text style={{ color: day.drinks.gingerGarlicTea ? '#fff' : colors.text }}&gt;{t('index.gingerGarlicTea')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity onPress={() =&gt; { try { toggleFlag(currentDate, 'waterCure'); } catch (e) { console.warn('toggle waterCure failed', e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.waterCure ? colors.primary : 'transparent' }]} accessibilityLabel={t('index.waterCure')}&gt;
              &lt;Text style={{ color: day.drinks.waterCure ? '#fff' : colors.text }}&gt;{t('index.waterCure')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity onPress={() =&gt; { try { toggleFlag(currentDate, 'sport'); } catch (e) { console.warn('toggle sport failed', e); } Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.chip, { borderColor: colors.primary, backgroundColor: day.drinks.sport ? colors.primary : 'transparent' }]} accessibilityLabel={t('index.sport')}&gt;
              &lt;Text style={{ color: day.drinks.sport ? '#fff' : colors.text }}&gt;{t('index.sport')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Weight */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;ScaleIcon size={20} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('index.weight')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('weight')} &gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.weight ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('index.weightHelp')}&lt;/Text&gt; : null}
          &lt;View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}&gt;
            &lt;TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() =&gt; setWeightModal(true)}&gt;
              &lt;Ionicons name='fitness' size={16} color={'#fff'} /&gt;
              &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{t('index.log')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() =&gt; router.push('/analysis')}&gt;
              &lt;Ionicons name='stats-chart' size={16} color={'#fff'} /&gt;
              &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{t('index.analysis')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() =&gt; router.push('/goals')}&gt;
              &lt;Ionicons name='flag' size={16} color={'#fff'} /&gt;
              &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{t('index.goal')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() =&gt; router.push('/gallery')}&gt;
              &lt;Ionicons name='images' size={16} color={'#fff'} /&gt;
              &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{t('index.gallery')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {typeof day.weight === 'number' ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('common.today')}: {day.weight} {t('common.kg')}&lt;/Text&gt; : null}
        &lt;/View&gt;

        {/* Cycle */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name='water' size={20} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('index.cycle')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('cycle')} &gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.cycle ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('index.cycleHelp')}&lt;/Text&gt; : null}
          {expectedNext ? (
            &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;
              {t('index.expectedNextPrefix')} {new Date(expectedNext).toDateString()}
            &lt;/Text&gt;
          ) : null}
          &lt;View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}&gt;
            {state.cycles.find((c: any) =&gt; !c.end) ? (
              &lt;TouchableOpacity onPress={() =&gt; { state.endCycle(currentDate); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={[styles.cta, { backgroundColor: colors.primary }]}&gt;
                &lt;Ionicons name='stop' size={16} color={'#fff'} /&gt;
                &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{t('index.endCycle')}&lt;/Text&gt;
              &lt;/TouchableOpacity&gt;
            ) : (
              &lt;TouchableOpacity onPress={() =&gt; { state.startCycle(currentDate); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={[styles.cta, { backgroundColor: colors.primary }]}&gt;
                &lt;Ionicons name='play' size={16} color={'#fff'} /&gt;
                &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{t('index.startCycle')}&lt;/Text&gt;
              &lt;/TouchableOpacity&gt;
            )}
            &lt;TouchableOpacity onPress={() =&gt; router.push('/cycle')} style={[styles.cta, { backgroundColor: colors.primary }]}&gt;
              &lt;Ionicons name='calendar' size={16} color={'#fff'} /&gt;
              &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{t('index.calendar')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Chains */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name='link' size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('index.chainsTitle')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('chains')} &gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.chains ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('index.chainsHelp')}&lt;/Text&gt; : null}
          {topChain ? (
            &lt;View style={{ marginTop: 6 }}&gt;
              &lt;Text style={{ color: colors.muted }}&gt;{topChain.title}&lt;/Text&gt;
              &lt;View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}&gt;
                &lt;View style={{ width: `${Math.round(topChain.nextPercent)}%`, height: 6, backgroundColor: colors.primary }} /&gt;
              &lt;/View&gt;
              {topChain.nextTitle ? &lt;Text style={{ color: colors.muted, marginTop: 4 }}&gt;{t('index.next')}: {topChain.nextTitle}&lt;/Text&gt; : null}
            &lt;/View&gt;
          ) : (
            &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('index.allChainsDone')}&lt;/Text&gt;
          )}
        &lt;/View&gt;

        {/* Weekly Event (1.1.3 style) */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name='calendar' size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('index.weeklyEvent')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; router.push('/events')}&gt;
              &lt;Ionicons name='chevron-forward' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {state.eventsEnabled === false ? (
            &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('index.eventsDisabled')}&lt;/Text&gt;
          ) : (
            &lt;View style={{ marginTop: 6 }}&gt;
              &lt;Text style={{ color: colors.text }}&gt;{currentEvent.title(lng2 as any)}&lt;/Text&gt;
              &lt;View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}&gt;
                &lt;View style={{ width: `${Math.round(eventProgress.percent || 0)}%`, height: 6, backgroundColor: (eventProgress.percent || 0) &gt;= 100 ? '#2bb673' : colors.primary }} /&gt;
              &lt;/View&gt;
              &lt;Text style={{ color: colors.muted, marginTop: 4 }}&gt;{Math.round(eventProgress.percent || 0)}% {(eventProgress.percent || 0) &gt;= 100 ? t('index.completed') : ''}&lt;/Text&gt;
            &lt;/View&gt;
          )}
        &lt;/View&gt;

        {/* Rewards */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name="gift" size={20} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('index.rewardsTitle')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('rewards')} &gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.rewards ? (
            &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('index.rewardsHelp')}&lt;/Text&gt;
          ) : null}
          &lt;View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}&gt;
            &lt;TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/achievements'); }}&gt;
              &lt;Ionicons name="trophy" size={16} color="#fff" /&gt;
              &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{t('index.achievements')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/leaderboard'); }}&gt;
              &lt;Ionicons name="podium" size={16} color={'#fff'} /&gt;
              &lt;Text style={{ color: '#fff', marginLeft: 6 }}&gt;{t('index.leaderboard')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Quick access */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;Text style={{ color: colors.text, fontWeight: '700' }}&gt;{t('index.quickAccess')}&lt;/Text&gt;
            &lt;TouchableOpacity onPress={() =&gt; toggleHelp('quick')} &gt;
              &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          {help.quick ? &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('index.quickHelp')}&lt;/Text&gt; : null}
          &lt;View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}&gt;
            &lt;TouchableOpacity onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/chat'); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel={t('index.chat')}&gt;
              &lt;Ionicons name="chatbubbles" size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, marginTop: 6 }}&gt;{t('index.chat')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;            
            &lt;TouchableOpacity onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/saved'); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel={t('index.saved')}&gt;
              &lt;Ionicons name="bookmark" size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, marginTop: 6 }}&gt;{t('index.saved')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/faq'); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel={t('index.faq')}&gt;
              &lt;Ionicons name="help-circle" size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, marginTop: 6 }}&gt;{t('index.faq')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity onPress={() =&gt; { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings'); }} style={[styles.quick, { backgroundColor: colors.bg }]} accessibilityLabel={t('index.settings')}&gt;
              &lt;Ionicons name="settings" size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, marginTop: 6 }}&gt;{t('index.settings')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;
      &lt;/ScrollView&gt;

      {/* Weight modal */}
      &lt;Modal visible={weightModal} transparent animationType="slide" onRequestClose={() =&gt; setWeightModal(false)}&gt;
        &lt;KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}&gt;
          &lt;View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}&gt;
            &lt;View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, width: '88%' }}&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700' }}&gt;{t('index.weightModalTitle')}&lt;/Text&gt;
              &lt;View style={{ marginTop: 12 }}&gt;
                &lt;View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}&gt;
                  &lt;Ionicons name="fitness" size={18} color={colors.primary} /&gt;
                  &lt;TextInput style={{ flex: 1, marginLeft: 8, color: colors.text }} keyboardType="decimal-pad" placeholder={t('index.weightPlaceholder')} placeholderTextColor={colors.muted} value={weightInput} onChangeText={setWeightInput} /&gt;
                  &lt;Text style={{ color: colors.muted }}&gt;{t('common.kg')}&lt;/Text&gt;
                &lt;/View&gt;
              &lt;/View&gt;
              &lt;View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}&gt;
                &lt;TouchableOpacity onPress={() =&gt; setWeightModal(false)} style={[styles.cta, { borderColor: colors.primary, borderWidth: 1 }]}&gt;
                  &lt;Text style={{ color: colors.text }}&gt;{t('common.cancel')}&lt;/Text&gt;
                &lt;/TouchableOpacity&gt;
                &lt;TouchableOpacity onPress={() =&gt; { try { const normalized = (weightInput || '').replace(',', '.'); const val = parseFloat(normalized); if (!isNaN(val) &amp;&amp; val &gt; 0) { setWeight(currentDate, val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setWeightModal(false); } } catch (e) { console.warn('set weight failed', e); } }} style={[styles.cta, { backgroundColor: colors.primary }]}&gt;
                  &lt;Text style={{ color: '#fff' }}&gt;{t('common.save')}&lt;/Text&gt;
                &lt;/TouchableOpacity&gt;
              &lt;/View&gt;
            &lt;/View&gt;
          &lt;/View&gt;
        &lt;/KeyboardAvoidingView&gt;
      &lt;/Modal&gt;

      &lt;CelebrationOverlay visible={showCelebration} message={celebrationText} onDone={() =&gt; setShowCelebration(false)} /&gt;
    &lt;/SafeAreaView&gt;
  );
}

const styles = StyleSheet.create({
  headerCard: { borderRadius: 12, padding: 16 },
  card: { borderRadius: 12, padding: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8 },
  iconBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  counterBtn: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8, borderWidth: 1, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  counterBtnSm: { paddingHorizontal: 8, paddingVertical: 8, borderRadius: 8, borderWidth: 1, minWidth: 36, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  quick: { width: '47%', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
});