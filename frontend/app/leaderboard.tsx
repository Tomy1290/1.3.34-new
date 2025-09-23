import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';
import { getWeekRange } from '../src/gamification/events';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75', input: '#ffffff' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8', input: '#1f1520' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e', input: '#fff' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866', input: '#ffffff' };
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const state = useAppStore();
  const colors = useThemeColors(state.theme);
  const [alias, setAlias] = useState(state.profileAlias || '');

  const week = useMemo(() => getWeekRange(new Date()), []);
  const weeklyXp = useMemo(() => {
    const start = +week.start; const end = +week.end + 24*60*60*1000 - 1;
    return (state.xpLog||[]).filter(e => e.ts >= start && e.ts <= end).reduce((a,b)=>a+b.amount,0);
  }, [state.xpLog]);

  function saveAlias() {
    state.setProfileAlias(alias.trim() || '');
  }

  const appTitle = state.language==='en' ? "Scarlett’s Health Tracking" : 'Scarletts Gesundheitstracking';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel='Zurück'>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{appTitle}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{state.language==='de'?'Bestenliste':'Leaderboard'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'Profil':'Profile'}</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Alias':'Alias'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <TextInput value={alias} onChangeText={setAlias} placeholder={state.language==='de'?'Dein Name':'Your name'} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.muted, backgroundColor: colors.input }]} />
            <TouchableOpacity onPress={saveAlias} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}> 
              <Ionicons name='save' size={16} color={'#fff'} />
              <Text style={{ color: '#fff', marginLeft: 6 }}>{state.language==='de'?'Speichern':'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'Meine Punkte':'My points'}</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Diese Woche':'This week'}: {weeklyXp} XP</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{state.language==='de'?'Gesamt':'Total'}: {state.xp} XP</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={{ color: colors.text, fontWeight: '700' }}>{state.language==='de'?'Bestenliste':'Leaderboard'}</Text>
          <View style={{ marginTop: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{state.profileAlias || (state.language==='de'?'Du':'You')}</Text>
              <Text style={{ color: colors.muted }}>{weeklyXp} XP ({state.language==='de'?'Woche':'Week'}) · {state.xp} XP ({state.language==='de'?'Gesamt':'Total'})</Text>
            </View>
            <Text style={{ color: colors.muted, marginTop: 8 }}>{state.language==='de'?'Offline‑Modus: Nur eigene Werte. Online‑Sync kann später ergänzt werden.':'Offline mode: Only your own stats. Online sync can be added later.'}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appTitle: { fontSize: 14, fontWeight: '800' },
  title: { fontSize: 12, fontWeight: '600' },
  iconBtn: { padding: 8 },
  card: { borderRadius: 12, padding: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
});