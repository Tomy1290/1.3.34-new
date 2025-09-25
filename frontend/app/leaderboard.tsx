import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';
import { getWeekRange } from '../src/gamification/events';
import { useI18n } from '../src/i18n';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75', input: '#ffffff' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8', input: '#1f1520' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e', input: '#fff' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866', input: '#ffffff' };
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const state = useAppStore();
  const t = useI18n();
  const colors = useThemeColors(state.theme);

  const week = useMemo(() => getWeekRange(new Date()), []);
  const weeklyXp = useMemo(() => {
    const start = +week.start; const end = +week.end + 24*60*60*1000 - 1;
    return (state.xpLog||[]).filter(e => e.ts &gt;= start &amp;&amp; e.ts &lt;= end).reduce((a,b)=&gt;a+b.amount,0);
  }, [state.xpLog]);

  const profileName = (state.profile?.name || '').trim();

  return (
    &lt;SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}&gt;
      &lt;View style={[styles.header, { backgroundColor: colors.card }]}&gt; 
        &lt;TouchableOpacity onPress={() =&gt; router.back()} style={styles.iconBtn} accessibilityLabel={t('common.back')}&gt;
          &lt;Ionicons name='chevron-back' size={24} color={colors.text} /&gt;
        &lt;/TouchableOpacity&gt;
        &lt;View style={{ alignItems: 'center' }}&gt;
          &lt;Text style={[styles.appTitle, { color: colors.text }]}&gt;{t('common.appTitle')}&lt;/Text&gt;
          &lt;Text style={[styles.title, { color: colors.muted }]}&gt;{t('leaderboard.title')}&lt;/Text&gt;
        &lt;/View&gt;
        &lt;View style={{ width: 40 }} /&gt;
      &lt;/View&gt;

      &lt;ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}&gt;
        {/* My points */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;Text style={{ color: colors.text, fontWeight: '700' }}&gt;{t('leaderboard.myPoints')}&lt;/Text&gt;
          &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('leaderboard.thisWeek')}: {weeklyXp} {t('common.xp')}&lt;/Text&gt;
          &lt;Text style={{ color: colors.muted, marginTop: 2 }}&gt;{t('leaderboard.total')}: {state.xp} {t('common.xp')}&lt;/Text&gt;
        &lt;/View&gt;

        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;Text style={{ color: colors.text, fontWeight: '700' }}&gt;{t('leaderboard.title')}&lt;/Text&gt;
          &lt;View style={{ marginTop: 6 }}&gt;
            &lt;View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700' }}&gt;{profileName || t('leaderboard.you')}&lt;/Text&gt;
              &lt;Text style={{ color: colors.muted }}&gt;{weeklyXp} {t('common.xp')} ({t('leaderboard.week')}) · {state.xp} {t('common.xp')} ({t('leaderboard.total')})&lt;/Text&gt;
            &lt;/View&gt;
            &lt;Text style={{ color: colors.muted, marginTop: 8 }}&gt;{t('leaderboard.offlineHint')}&lt;/Text&gt;
          &lt;/View&gt;
        &lt;/View&gt;
      &lt;/ScrollView&gt;
    &lt;/SafeAreaView&gt;
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