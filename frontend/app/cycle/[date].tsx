import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../../src/store/useStore';
import * as Haptics from 'expo-haptics';
import { useI18n } from '../../src/i18n';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75', input: '#ffffff' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8', input: '#1f1520' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e', input: '#fff' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866', input: '#ffffff' };
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export default function CycleDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const state = useAppStore();
  const router = useRouter();
  const t = useI18n();
  const colors = useThemeColors(state.theme);
  const serverLog = state.cycleLogs[date || ''] || {};
  const [help, setHelp] = useState<{[k:string]: boolean}>({});
  const [savedVisible, setSavedVisible] = useState(false);
  const toggleHelp = (k: string) => setHelp(h => ({ ...h, [k]: !h[k] }));

  // Local draft, only save to store when pressing save
  const [draft, setDraft] = useState<{ mood:number; energy:number; pain:number; sleep:number; stress:number; appetite:number; cravings:number; focus:number; libido:number; sex:boolean; notes:string; period?:boolean; flow?:number; cramps:boolean; backPain:boolean; breastTenderness:boolean; waterRetention:boolean; dizziness:boolean; headache:boolean; nausea:boolean; }>(() => ({
    mood: serverLog.mood ?? 5,
    energy: serverLog.energy ?? 5,
    pain: serverLog.pain ?? 5,
    sleep: serverLog.sleep ?? 5,
    stress: serverLog.stress ?? 5,
    appetite: serverLog.appetite ?? 5,
    cravings: serverLog.cravings ?? 5,
    focus: serverLog.focus ?? 5,
    libido: serverLog.libido ?? 5,
    sex: !!serverLog.sex,
    notes: serverLog.notes || '',
    period: typeof serverLog.period === 'boolean' ? !!serverLog.period : (typeof serverLog.flow === 'number' && serverLog.flow > 0),
    flow: typeof serverLog.flow === 'number' && serverLog.flow > 0 ? Math.max(1, Math.min(10, serverLog.flow)) : undefined,
    cramps: !!serverLog.cramps,
    backPain: !!serverLog.backPain,
    breastTenderness: !!serverLog.breastTenderness,
    waterRetention: !!serverLog.waterRetention,
    dizziness: !!serverLog.dizziness,
    headache: !!serverLog.headache,
    nausea: !!serverLog.nausea,
  }));
  useEffect(() => {
    // If date changes, refresh draft from store
    const s = state.cycleLogs[date || ''] || {};
    setDraft({
      mood: s.mood ?? 5,
      energy: s.energy ?? 5,
      pain: s.pain ?? 5,
      sleep: s.sleep ?? 5,
      stress: s.stress ?? 5,
      appetite: s.appetite ?? 5,
      cravings: s.cravings ?? 5,
      focus: s.focus ?? 5,
      libido: s.libido ?? 5,
      sex: !!s.sex,
      notes: s.notes || '',
      period: typeof s.period === 'boolean' ? !!s.period : (typeof s.flow === 'number' && s.flow > 0),
      flow: typeof s.flow === 'number' && s.flow > 0 ? Math.max(1, Math.min(10, s.flow)) : undefined,
      cramps: !!s.cramps,
      backPain: !!s.backPain,
      breastTenderness: !!s.breastTenderness,
      waterRetention: !!s.waterRetention,
      dizziness: !!s.dizziness,
      headache: !!s.headache,
      nausea: !!s.nausea,
    });
  }, [date]);

  const setVal = (field: 'mood'|'energy'|'pain'|'sleep'|'stress'|'appetite'|'cravings'|'focus'|'libido', delta: number) => {
    setDraft((d) => ({ ...d, [field]: clamp((d as any)[field] + delta, 1, 10) }));
  };
  const setFlow = (val: number) => setDraft((d) => ({ ...d, flow: Math.max(1, Math.min(10, val)), period: true }));
  const clearFlow = () => setDraft((d) => ({ ...d, flow: undefined, period: false }));

  const formattedDate = (() => { try { const [y,m,d] = String(date).split('-').map(Number); return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`; } catch { return String(date); }})();

  const renderMoodScale = (value: number) => {
    const items = Array.from({ length: 10 }).map((_, i) => {
      const idx = i + 1;
      let name: keyof typeof MaterialIcons.glyphMap = 'sentiment-neutral';
      if (idx <= 2) name = 'sentiment-very-dissatisfied';
      else if (idx === 3) name = 'sentiment-dissatisfied';
      else if (idx >= 9) name = 'sentiment-very-satisfied';
      else if (idx >= 8) name = 'sentiment-satisfied';
      const active = idx <= value;
      return (
        <TouchableOpacity key={`mood-${idx}`} onPress={() => setDraft((d)=>({ ...d, mood: idx }))} style={{ padding: 2 }}>
          <MaterialIcons name={name} size={18} color={active ? colors.primary : colors.muted} />
        </TouchableOpacity>
      );
    });
    return &lt;View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 4 }}>{items}&lt;/View>;
  };

  const renderIconScale = (value: number, icon: keyof typeof Ionicons.glyphMap, field: 'energy'|'pain'|'sleep'|'appetite'|'cravings'|'focus'|'libido') => {
    const items = Array.from({ length: 10 }).map((_, i) => {
      const idx = i + 1;
      const active = idx &lt;= value;
      return (
        &lt;TouchableOpacity key={`${field}-${idx}`} onPress={() => setDraft((d)=>({ ...d, [field]: idx }))} style={{ padding: 2 }}>
          &lt;Ionicons name={icon} size={16} color={active ? colors.primary : colors.muted} />
        &lt;/TouchableOpacity>
      );
    });
    return &lt;View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 4 }}>{items}&lt;/View>;
  };

  const renderBleedingScale = (value?: number) => {
    const items = Array.from({ length: 10 }).map((_, i) => {
      const idx = i + 1; // 1..10
      const active = typeof value === 'number' ? idx &lt;= value : false;
      return (
        &lt;TouchableOpacity key={`flow-${idx}`} onPress={() => setFlow(idx)} style={{ padding: 2 }}>
          &lt;Ionicons name='water' size={16} color={active ? colors.primary : colors.muted} />
        &lt;/TouchableOpacity>
      );
    });
    return &lt;View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 4 }}>{items}&lt;/View>;
  };

  const saveDraft = () => {
    const payload: any = { ...draft };
    if (!payload.period) { delete payload.flow; }
    state.setCycleLog(String(date), payload);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === 'android') {
      ToastAndroid.show(t('common.saved') || 'Saved', ToastAndroid.SHORT);
    } else {
      setSavedVisible(true);
      setTimeout(() => setSavedVisible(false), 1500);
    }
  };
  const deleteDraft = () => {
    state.clearCycleLog(String(date));
    setDraft({ mood: 5, energy: 5, pain: 5, sleep: 5, stress:5, appetite:5, cravings:5, focus:5, libido:5, sex: false, notes: '', period: false, flow: undefined as any, cramps: false, backPain:false, breastTenderness:false, waterRetention:false, dizziness:false, headache: false, nausea: false });
  };

  // 7-day rule and future lock for save/delete
  const canModify = (() => {
    try {
      const [y,m,d] = String(date).split('-').map((n)=>parseInt(n,10));
      const dt = new Date(y, m-1, d);
      const today = new Date();
      const dayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dtOnly = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (+dtOnly &gt; +dayOnly) return false; // future
      const diffDays = Math.floor((+dayOnly - +dtOnly)/(24*60*60*1000));
      return diffDays &lt;= 7;
    } catch { return true; }
  })();

  return (
    &lt;SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      &lt;View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        &lt;TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel={t('common.back')}>
          &lt;Ionicons name='chevron-back' size={26} color={colors.text} />
        &lt;/TouchableOpacity>
        &lt;View style={{ alignItems: 'center' }}>
          &lt;Text style={[styles.appTitle, { color: colors.text }]}>{t('common.appTitle')}&lt;/Text>
          &lt;Text style={[styles.title, { color: colors.muted }]}>{t('cycle.dayTitle')}&lt;/Text>
        &lt;/View>
        &lt;View style={{ width: 40 }} />
      &lt;/View>

      &lt;KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex: 1 }}>
        &lt;ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          &lt;Text style={{ color: colors.text, textAlign: 'center', fontWeight: '700' }}>{formattedDate}&lt;/Text>

          {/* Mood */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}>
                &lt;Ionicons name={'happy'} size={18} color={colors.primary} />
                &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.moodTitle')}&lt;/Text>
              &lt;/View>
              &lt;TouchableOpacity onPress={() => toggleHelp('mood')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.mood ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.moodHelp')}&lt;/Text>) : null}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              &lt;TouchableOpacity testID={`cycle-mood-minus`} onPress={() => setVal('mood', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='remove' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
              &lt;View style={{ flex: 1, alignItems: 'center' }}>{renderMoodScale(draft.mood)}&lt;/View>
              &lt;TouchableOpacity testID={`cycle-mood-plus`} onPress={() => setVal('mood', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='add' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
            &lt;/View>
          &lt;/View>

          {/* Energy */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}>
                &lt;Ionicons name={'flash'} size={18} color={colors.primary} />
                &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.energyTitle')}&lt;/Text>
              &lt;/View>
              &lt;TouchableOpacity onPress={() => toggleHelp('energy')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.energy ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.energyHelp')}&lt;/Text>) : null}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              &lt;TouchableOpacity testID={`cycle-energy-minus`} onPress={() => setVal('energy', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='remove' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
              &lt;View style={{ flex: 1, alignItems: 'center' }}>{renderIconScale(draft.energy, 'flash', 'energy')}&lt;/View>
              &lt;TouchableOpacity testID={`cycle-energy-plus`} onPress={() => setVal('energy', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='add' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
            &lt;/View>
          &lt;/View>

          {/* Appetite */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}>
                &lt;Ionicons name={'fast-food'} size={18} color={colors.primary} />
                &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.appetiteTitle') || 'Appetit'}&lt;/Text>
              &lt;/View>
              &lt;TouchableOpacity onPress={() => toggleHelp('appetite')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.appetite ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.appetiteHelp') || '1–10; höher = mehr Appetit.'}&lt;/Text>) : null}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              &lt;TouchableOpacity onPress={() => setVal('appetite', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='remove' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
              &lt;View style={{ flex: 1, alignItems: 'center' }}>{renderIconScale(draft.appetite, 'fast-food', 'appetite')}&lt;/View>
              &lt;TouchableOpacity onPress={() => setVal('appetite', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='add' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
            &lt;/View>
          &lt;/View>

          {/* Cravings */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}>
                &lt;Ionicons name={'ice-cream'} size={18} color={colors.primary} />
                &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.cravingsTitle') || 'Heißhunger'}&lt;/Text>
              &lt;/View>
              &lt;TouchableOpacity onPress={() => toggleHelp('cravings')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.cravings ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.cravingsHelp') || '1–10; höher = stärkerer Heißhunger.'}&lt;/Text>) : null}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              &lt;TouchableOpacity onPress={() => setVal('cravings', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='remove' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
              &lt;View style={{ flex: 1, alignItems: 'center' }}>{renderIconScale(draft.cravings, 'ice-cream', 'cravings')}&lt;/View>
              &lt;TouchableOpacity onPress={() => setVal('cravings', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='add' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
            &lt;/View>
          &lt;/View>

          {/* Focus/Concentration */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}>
                &lt;Ionicons name={'book'} size={18} color={colors.primary} />
                &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.focusTitle') || 'Fokus/Konzentration'}&lt;/Text>
              &lt;/View>
              &lt;TouchableOpacity onPress={() => toggleHelp('focus')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.focus ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.focusHelp') || '1–10; höher = bessere Konzentration.'}&lt;/Text>) : null}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              &lt;TouchableOpacity onPress={() => setVal('focus', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='remove' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
              &lt;View style={{ flex: 1, alignItems: 'center' }}>{renderIconScale(draft.focus, 'book', 'focus')}&lt;/View>
              &lt;TouchableOpacity onPress={() => setVal('focus', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='add' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
            &lt;/View>
          &lt;/View>

          {/* Libido */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}>
                &lt;Ionicons name={'flame'} size={18} color={colors.primary} />
                &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.libidoTitle') || 'Libido'}&lt;/Text>
              &lt;/View>
              &lt;TouchableOpacity onPress={() => toggleHelp('libido')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.libido ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.libidoHelp') || '1–10; höher = stärkere Libido.'}&lt;/Text>) : null}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              &lt;TouchableOpacity onPress={() => setVal('libido', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='remove' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
              &lt;View style={{ flex: 1, alignItems: 'center' }}>{renderIconScale(draft.libido, 'flame', 'libido')}&lt;/View>
              &lt;TouchableOpacity onPress={() => setVal('libido', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='add' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
            &lt;/View>
          &lt;/View>

          {/* Pain */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}>
                &lt;Ionicons name={'medkit'} size={18} color={colors.primary} />
                &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.painTitle')}&lt;/Text>
              &lt;/View>
              &lt;TouchableOpacity onPress={() => toggleHelp('pain')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.pain ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.painHelp')}&lt;/Text>) : null}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              &lt;TouchableOpacity testID={`cycle-pain-minus`} onPress={() => setVal('pain', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='remove' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
              &lt;View style={{ flex: 1, alignItems: 'center' }}>{renderIconScale(draft.pain, 'medkit', 'pain')}&lt;/View>
              &lt;TouchableOpacity testID={`cycle-pain-plus`} onPress={() => setVal('pain', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='add' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
            &lt;/View>
          &lt;/View>

          {/* Sleep */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}>
                &lt;Ionicons name={'moon'} size={18} color={colors.primary} />
                &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.sleepTitle')}&lt;/Text>
              &lt;/View>
              &lt;TouchableOpacity onPress={() => toggleHelp('sleep')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.sleep ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.sleepHelp')}&lt;/Text>) : null}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              &lt;TouchableOpacity testID={`cycle-sleep-minus`} onPress={() => setVal('sleep', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='remove' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
              &lt;View style={{ flex: 1, alignItems: 'center' }}>{renderIconScale(draft.sleep, 'moon', 'sleep')}&lt;/View>
              &lt;TouchableOpacity testID={`cycle-sleep-plus`} onPress={() => setVal('sleep', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='add' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
            &lt;/View>
          &lt;/View>

          {/* Stress */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}>
                &lt;Ionicons name={'alert'} size={18} color={colors.primary} />
                &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.stressTitle') || 'Stress'}&lt;/Text>
              &lt;/View>
              &lt;TouchableOpacity onPress={() => toggleHelp('stress')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.stress ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.stressHelp') || '1–10; höher = mehr Stress.'}&lt;/Text>) : null}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              &lt;TouchableOpacity testID={`cycle-stress-minus`} onPress={() => setDraft((d)=>({ ...d, stress: clamp((d.stress||5)-1,1,10) }))} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='remove' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
              &lt;View style={{ flex: 1, alignItems: 'center' }}>{renderIconScale(draft.stress||5, 'alert', 'energy')}&lt;/View>
              &lt;TouchableOpacity testID={`cycle-stress-plus`} onPress={() => setDraft((d)=>({ ...d, stress: clamp((d.stress||5)+1,1,10) }))} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='add' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
            &lt;/View>
          &lt;/View>

          {/* Bleeding intensity (1..10), no toggle */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}>
                &lt;Ionicons name='water' size={16} color={colors.primary} />
                &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 6 }}>{t('cycle.bleedingTitle')}&lt;/Text>
              &lt;/View>
              &lt;TouchableOpacity onPress={() => toggleHelp('bleeding')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.bleeding ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.bleedingHelp')}&lt;/Text>) : null}

            &lt;View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'space-between' }}>
              &lt;Text style={{ color: colors.text }}>{t('cycle.fields.flow')}&lt;/Text>
              &lt;TouchableOpacity onPress={clearFlow} style={[styles.chip, { borderColor: colors.primary, backgroundColor: 'transparent' }]}> 
                &lt;Text style={{ color: colors.text }}>{t('common.cancel')}&lt;/Text>
              &lt;/TouchableOpacity>
            &lt;/View>

            {/* Always show scale; selecting sets period=true */}
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              &lt;TouchableOpacity onPress={() => setFlow((draft.flow||5) - 1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='remove' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
              &lt;View style={{ flex: 1, alignItems: 'center' }}>{renderBleedingScale(draft.flow)}&lt;/View>
              &lt;TouchableOpacity onPress={() => setFlow((draft.flow||5) + 1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                &lt;Ionicons name='add' size={16} color={colors.primary} />
              &lt;/TouchableOpacity>
            &lt;/View>
          &lt;/View>

          {/* Additional: toggles */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;Text style={{ color: colors.text, fontWeight: '700' }}>{t('cycle.additionalTitle')}&lt;/Text>
              &lt;TouchableOpacity onPress={() => toggleHelp('additional')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.additional ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.additionalHelp')}&lt;/Text>) : null}
            &lt;View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              &lt;TouchableOpacity onPress={() => setDraft((d)=>({ ...d, sex: !d.sex }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.sex ? colors.primary : 'transparent' }]}> 
                &lt;Ionicons name='heart' size={14} color={draft.sex ? '#fff' : colors.primary} />
                &lt;Text style={{ color: draft.sex ? '#fff' : colors.text, marginLeft: 6 }}>{t('cycle.fields.sex')}&lt;/Text>
              &lt;/TouchableOpacity>
              &lt;TouchableOpacity onPress={() => setDraft((d)=>({ ...d, cramps: !d.cramps }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.cramps ? colors.primary : 'transparent' }]}> 
                &lt;Ionicons name='body' size={14} color={draft.cramps ? '#fff' : colors.primary} />
                &lt;Text style={{ color: draft.cramps ? '#fff' : colors.text, marginLeft: 6 }}>{t('cycle.fields.cramps')}&lt;/Text>
              &lt;/TouchableOpacity>
              &lt;TouchableOpacity onPress={() => setDraft((d)=>({ ...d, backPain: !d.backPain }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.backPain ? colors.primary : 'transparent' }]}> 
                &lt;Ionicons name='fitness' size={14} color={draft.backPain ? '#fff' : colors.primary} />
                &lt;Text style={{ color: draft.backPain ? '#fff' : colors.text, marginLeft: 6 }}>{t('cycle.fields.backPain') || 'Rückenschmerzen'}&lt;/Text>
              &lt;/TouchableOpacity>
              &lt;TouchableOpacity onPress={() => setDraft((d)=>({ ...d, breastTenderness: !d.breastTenderness }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.breastTenderness ? colors.primary : 'transparent' }]}> 
                &lt;Ionicons name='female' size={14} color={draft.breastTenderness ? '#fff' : colors.primary} />
                &lt;Text style={{ color: draft.breastTenderness ? '#fff' : colors.text, marginLeft: 6 }}>{t('cycle.fields.breastTenderness') || 'Brustspannen'}&lt;/Text>
              &lt;/TouchableOpacity>
              &lt;TouchableOpacity onPress={() => setDraft((d)=>({ ...d, waterRetention: !d.waterRetention }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.waterRetention ? colors.primary : 'transparent' }]}> 
                &lt;Ionicons name='water' size={14} color={draft.waterRetention ? '#fff' : colors.primary} />
                &lt;Text style={{ color: draft.waterRetention ? '#fff' : colors.text, marginLeft: 6 }}>{t('cycle.fields.waterRetention') || 'Wassereinlagerungen'}&lt;/Text>
              &lt;/TouchableOpacity>
              &lt;TouchableOpacity onPress={() => setDraft((d)=>({ ...d, dizziness: !d.dizziness }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.dizziness ? colors.primary : 'transparent' }]}> 
                &lt;Ionicons name='swap-vertical' size={14} color={draft.dizziness ? '#fff' : colors.primary} />
                &lt;Text style={{ color: draft.dizziness ? '#fff' : colors.text, marginLeft: 6 }}>{t('cycle.fields.dizziness') || 'Schwindel'}&lt;/Text>
              &lt;/TouchableOpacity>
              &lt;TouchableOpacity onPress={() => setDraft((d)=>({ ...d, headache: !d.headache }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.headache ? colors.primary : 'transparent' }]}> 
                &lt;Ionicons name='medkit' size={14} color={draft.headache ? '#fff' : colors.primary} />
                &lt;Text style={{ color: draft.headache ? '#fff' : colors.text, marginLeft: 6 }}>{t('cycle.fields.headache')}&lt;/Text>
              &lt;/TouchableOpacity>
              &lt;TouchableOpacity onPress={() => setDraft((d)=>({ ...d, nausea: !d.nausea }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.nausea ? colors.primary : 'transparent' }]}> 
                &lt;Ionicons name='restaurant' size={14} color={draft.nausea ? '#fff' : colors.primary} />
                &lt;Text style={{ color: draft.nausea ? '#fff' : colors.text, marginLeft: 6 }}>{t('cycle.fields.nausea')}&lt;/Text>
              &lt;/TouchableOpacity>
            &lt;/View>
          &lt;/View>

          {/* Notes + Save/Delete */}
          &lt;View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              &lt;Text style={{ color: colors.text, fontWeight: '700' }}>{t('cycle.notesTitle')}&lt;/Text>
              &lt;TouchableOpacity onPress={() => toggleHelp('notes')}>
                &lt;Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              &lt;/TouchableOpacity>
            &lt;/View>
            {help.notes ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.notesHelp')}&lt;/Text>) : null}
            &lt;TextInput testID='cycle-notes' style={{ marginTop: 8, minHeight: 100, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, padding: 10, color: colors.text, backgroundColor: colors.input }} placeholder={t('cycle.notesPlaceholder')} placeholderTextColor={colors.muted} value={draft.notes} onChangeText={(v) => setDraft((d)=>({ ...d, notes: v }))} multiline />
            {!canModify ? (
              &lt;Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.editDisabled7d')}&lt;/Text>
            ) : null}
            &lt;View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              &lt;TouchableOpacity disabled={!canModify} onPress={deleteDraft} style={[styles.chip, { borderColor: colors.primary, opacity: canModify?1:0.4 }]}> 
                &lt;Ionicons name='trash' size={16} color={colors.primary} />
                &lt;Text style={{ color: colors.text, marginLeft: 6 }}>{t('common.delete')}&lt;/Text>
              &lt;/TouchableOpacity>
              &lt;TouchableOpacity disabled={!canModify} onPress={saveDraft} style={[styles.chip, { backgroundColor: colors.primary, borderColor: colors.primary, opacity: canModify?1:0.4 }]}> 
                &lt;Ionicons name='save' size={16} color={'#fff'} />
                &lt;Text style={{ color: '#fff', marginLeft: 6 }}>{t('common.save')}&lt;/Text>
              &lt;/TouchableOpacity>
            &lt;/View>
            {savedVisible ? (&lt;Text style={{ color: colors.muted, marginTop: 6, textAlign: 'right' }}>{t('common.saved') || 'Saved'}&lt;/Text>) : null}
          &lt;/View>
        &lt;/ScrollView>
      &lt;/KeyboardAvoidingView>
    &lt;/SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, appTitle: { fontSize: 14, fontWeight: '800' }, title: { fontSize: 12, fontWeight: '600' }, card: { borderRadius: 12, padding: 12 }, chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 }, stepBtnSmall: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, minWidth: 44, alignItems: 'center', justifyContent: 'center' } });