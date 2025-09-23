import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../../src/store/useStore';
import * as Haptics from 'expo-haptics';

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
  const colors = useThemeColors(state.theme);
  const serverLog = state.cycleLogs[date || ''] || {};
  const lang = state.language;
  const [help, setHelp] = useState<{[k:string]: boolean}>({});
  const [savedVisible, setSavedVisible] = useState(false);
  const toggleHelp = (k: string) => setHelp(h => ({ ...h, [k]: !h[k] }));

  // Local draft, only save to store when pressing save
  const [draft, setDraft] = useState({
    mood: serverLog.mood ?? 5,
    energy: serverLog.energy ?? 5,
    pain: serverLog.pain ?? 5,
    sleep: serverLog.sleep ?? 5,
    sex: !!serverLog.sex,
    notes: serverLog.notes || '',
    flow: typeof serverLog.flow === 'number' ? serverLog.flow : 0,
    cramps: !!serverLog.cramps,
    headache: !!serverLog.headache,
    nausea: !!serverLog.nausea,
  });
  useEffect(() => {
    // If date changes, refresh draft from store
    const s = state.cycleLogs[date || ''] || {};
    setDraft({ mood: s.mood ?? 5, energy: s.energy ?? 5, pain: s.pain ?? 5, sleep: s.sleep ?? 5, sex: !!s.sex, notes: s.notes || '', flow: typeof s.flow === 'number' ? s.flow : 0, cramps: !!s.cramps, headache: !!s.headache, nausea: !!s.nausea });
  }, [date]);

  const setVal = (field: 'mood'|'energy'|'pain'|'sleep', delta: number) => {
    setDraft((d) => ({ ...d, [field]: clamp((d as any)[field] + delta, 1, 10) }));
  };
  const setFlow = (val: number) => setDraft((d) => ({ ...d, flow: Math.max(0, Math.min(10, val)) }));

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
    return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 4 }}>{items}</View>;
  };

  const renderIconScale = (value: number, icon: keyof typeof Ionicons.glyphMap, field: 'energy'|'pain'|'sleep') => {
    const items = Array.from({ length: 10 }).map((_, i) => {
      const idx = i + 1;
      const active = idx <= value;
      return (
        <TouchableOpacity key={`${field}-${idx}`} onPress={() => setDraft((d)=>({ ...d, [field]: idx }))} style={{ padding: 2 }}>
          <Ionicons name={icon} size={16} color={active ? colors.primary : colors.muted} />
        </TouchableOpacity>
      );
    });
    return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 4 }}>{items}</View>;
  };

  const renderBleedingScale = (value: number) => {
    const items = Array.from({ length: 11 }).map((_, i) => {
      const idx = i; // 0..10
      const active = idx <= (typeof value === 'number' ? value : -1);
      return (
        <TouchableOpacity key={`flow-${idx}`} onPress={() => setFlow(idx)} style={{ padding: 2 }}>
          <Ionicons name='water' size={16} color={active ? colors.primary : colors.muted} />
        </TouchableOpacity>
      );
    });
    return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 4 }}>{items}</View>;
  };

  const saveDraft = () => {
    state.setCycleLog(String(date), draft as any);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === 'android') {
      ToastAndroid.show(lang==='de'?'Gespeichert':(lang==='pl'?'Zapisano':'Saved'), ToastAndroid.SHORT);
    } else {
      setSavedVisible(true);
      setTimeout(() => setSavedVisible(false), 1500);
    }
  };
  const deleteDraft = () => {
    state.clearCycleLog(String(date));
    setDraft({ mood: 5, energy: 5, pain: 5, sleep: 5, sex: false, notes: '', flow: 0, cramps: false, headache: false, nausea: false });
  };

  // 7-day rule and future lock for save/delete
  const canModify = (() => {
    try {
      const [y,m,d] = String(date).split('-').map((n)=>parseInt(n,10));
      const dt = new Date(y, m-1, d);
      const today = new Date();
      const dayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dtOnly = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (+dtOnly > +dayOnly) return false; // future
      const diffDays = Math.floor((+dayOnly - +dtOnly)/(24*60*60*1000));
      return diffDays <= 7;
    } catch { return true; }
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel='Zurück'>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{lang==='en' ? "Scarlett’s Health Tracking" : (lang==='pl'?'Zdrowie Scarlett':'Scarletts Gesundheitstracking')}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{lang==='de'?'Zyklus-Tag':'Cycle day'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '700' }}>{formattedDate}</Text>

          {/* Mood */}
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={'happy'} size={18} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{lang==='de'?'Stimmung':'Mood'}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleHelp('mood')}>
                <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {help.mood ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Wähle 1–10; links traurig, Mitte neutral, rechts glücklich.':'Choose 1–10; left sad, middle neutral, right happy.'}</Text>) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity testID={`cycle-mood-minus`} onPress={() => setVal('mood', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                <Ionicons name='remove' size={16} color={colors.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>{renderMoodScale(draft.mood)}</View>
              <TouchableOpacity testID={`cycle-mood-plus`} onPress={() => setVal('mood', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                <Ionicons name='add' size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Energy */}
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={'flash'} size={18} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{lang==='de'?'Energie':'Energy'}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleHelp('energy')}>
                <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {help.energy ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Wähle 1–10: höhere Zahl = mehr Energie.':'Choose 1–10: higher number = more energy.'}</Text>) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity testID={`cycle-energy-minus`} onPress={() => setVal('energy', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                <Ionicons name='remove' size={16} color={colors.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>{renderIconScale(draft.energy, 'flash', 'energy')}</View>
              <TouchableOpacity testID={`cycle-energy-plus`} onPress={() => setVal('energy', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                <Ionicons name='add' size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pain */}
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={'medkit'} size={18} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{lang==='de'?'Schmerz':'Pain'}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleHelp('pain')}>
                <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {help.pain ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Wähle 1–10: höher = stärker.':'Choose 1–10: higher = stronger.'}</Text>) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity testID={`cycle-pain-minus`} onPress={() => setVal('pain', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                <Ionicons name='remove' size={16} color={colors.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>{renderIconScale(draft.pain, 'medkit', 'pain')}</View>
              <TouchableOpacity testID={`cycle-pain-plus`} onPress={() => setVal('pain', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                <Ionicons name='add' size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sleep */}
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={'moon'} size={18} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{lang==='de'?'Schlaf':'Sleep'}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleHelp('sleep')}>
                <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {help.sleep ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Wähle 1–10: höhere Zahl = besserer Schlaf.':'Choose 1–10: higher number = better sleep.'}</Text>) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity testID={`cycle-sleep-minus`} onPress={() => setVal('sleep', -1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                <Ionicons name='remove' size={16} color={colors.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>{renderIconScale(draft.sleep, 'moon', 'sleep')}</View>
              <TouchableOpacity testID={`cycle-sleep-plus`} onPress={() => setVal('sleep', +1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                <Ionicons name='add' size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bleeding intensity (0..10 taps + stepper) */}
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name='water' size={16} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 6 }}>{lang==='de'?'Periode (Stärke)':'Bleeding (intensity)'}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleHelp('bleeding')}>
                <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {help.bleeding ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Wähle 0–10 Tropfen; mehr Tropfen = stärkere Blutung.':'Choose 0–10 drops; more drops = stronger bleeding.'}</Text>) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setFlow(draft.flow - 1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                <Ionicons name='remove' size={16} color={colors.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>{renderBleedingScale(draft.flow)}</View>
              <TouchableOpacity onPress={() => setFlow(draft.flow + 1)} style={[styles.stepBtnSmall, { borderColor: colors.primary }]}> 
                <Ionicons name='add' size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Additional: toggles */}
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{lang==='de'?'Weitere Angaben':'Additional'}</Text>
              <TouchableOpacity onPress={() => toggleHelp('additional')}>
                <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {help.additional ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Nützliche Marker: Krämpfe, Kopfschmerzen, Übelkeit.':'Useful markers: cramps, headache, nausea.'}</Text>) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setDraft((d)=>({ ...d, sex: !d.sex }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.sex ? colors.primary : 'transparent' }]}> 
                <Ionicons name='heart' size={14} color={draft.sex ? '#fff' : colors.primary} />
                <Text style={{ color: draft.sex ? '#fff' : colors.text, marginLeft: 6 }}>{lang==='de'?'Sex':'Sex'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDraft((d)=>({ ...d, cramps: !d.cramps }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.cramps ? colors.primary : 'transparent' }]}> 
                <Ionicons name='body' size={14} color={draft.cramps ? '#fff' : colors.primary} />
                <Text style={{ color: draft.cramps ? '#fff' : colors.text, marginLeft: 6 }}>{lang==='de'?'Krämpfe':'Cramps'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDraft((d)=>({ ...d, headache: !d.headache }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.headache ? colors.primary : 'transparent' }]}> 
                <Ionicons name='medkit' size={14} color={draft.headache ? '#fff' : colors.primary} />
                <Text style={{ color: draft.headache ? '#fff' : colors.text, marginLeft: 6 }}>{lang==='de'?'Kopfschmerzen':'Headache'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDraft((d)=>({ ...d, nausea: !d.nausea }))} style={[styles.chip, { borderColor: colors.primary, backgroundColor: draft.nausea ? colors.primary : 'transparent' }]}> 
                <Ionicons name='restaurant' size={14} color={draft.nausea ? '#fff' : colors.primary} />
                <Text style={{ color: draft.nausea ? '#fff' : colors.text, marginLeft: 6 }}>{lang==='de'?'Übelkeit':'Nausea'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes + Save/Delete */}
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{lang==='de'?'Notizen':'Notes'}</Text>
              <TouchableOpacity onPress={() => toggleHelp('notes')}>
                <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {help.notes ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Freitext für besondere Beobachtungen.':'Free text for notable observations.'}</Text>) : null}
            <TextInput testID='cycle-notes' style={{ marginTop: 8, minHeight: 100, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, padding: 10, color: colors.text, backgroundColor: colors.input }} placeholder={lang==='de'?'Notizen hier eingeben...':'Enter notes...'} placeholderTextColor={colors.muted} value={draft.notes} onChangeText={(v) => setDraft((d)=>({ ...d, notes: v }))} multiline />
            {!canModify ? (
              <Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Bearbeiten für Einträge älter als 7 Tage oder in der Zukunft deaktiviert.':'Editing disabled for entries older than 7 days or in the future.'}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <TouchableOpacity disabled={!canModify} onPress={deleteDraft} style={[styles.chip, { borderColor: colors.primary, opacity: canModify?1:0.4 }]}>
                <Ionicons name='trash' size={16} color={colors.primary} />
                <Text style={{ color: colors.text, marginLeft: 6 }}>{lang==='de'?'Löschen':'Delete'}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!canModify} onPress={saveDraft} style={[styles.chip, { backgroundColor: colors.primary, borderColor: colors.primary, opacity: canModify?1:0.4 }]}>
                <Ionicons name='save' size={16} color={'#fff'} />
                <Text style={{ color: '#fff', marginLeft: 6 }}>{lang==='de'?'Speichern':'Save'}</Text>
              </TouchableOpacity>
            </View>
            {savedVisible ? (<Text style={{ color: colors.muted, marginTop: 6, textAlign: 'right' }}>{lang==='de'?'Gespeichert':'Saved'}</Text>) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, appTitle: { fontSize: 14, fontWeight: '800' }, title: { fontSize: 12, fontWeight: '600' }, card: { borderRadius: 12, padding: 12 }, chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 }, stepBtnSmall: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, minWidth: 44, alignItems: 'center', justifyContent: 'center' } });