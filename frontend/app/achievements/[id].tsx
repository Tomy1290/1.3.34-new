import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useStore';
import { computeAchievements, getAchievementConfigById } from '../../src/achievements';
import { BadgeIcon } from '../../src/components/BadgeIcon';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

export default function AchievementDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const state = useAppStore();
  const colors = useThemeColors(state.theme);

  const { list } = useMemo(() => computeAchievements({
    days: state.days, goal: state.goal, reminders: state.reminders, chat: state.chat, saved: state.saved,
    achievementsUnlocked: state.achievementsUnlocked, xp: state.xp, language: state.language, theme: state.theme,
  }), [state.days, state.goal, state.reminders, state.chat, state.saved, state.achievementsUnlocked, state.xp, state.language, state.theme]);
  const ach = list.find(a => a.id === id);
  const config = getAchievementConfigById(id!);

  const tips = useMemo(() => generateTips(id || '', state.language), [id, state.language]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{ach?.title || 'Achievement'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        <View style={[styles.card, { backgroundColor: colors.card, alignItems: 'center' }]}>
          <BadgeIcon size={96} percent={ach?.percent ?? 0} color={colors.primary} bg={colors.bg} icon={config?.icon || 'trophy'} iconColor={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 12 }}>{ach?.title}</Text>
          <Text style={{ color: colors.muted, marginTop: 6, textAlign: 'center' }}>{ach?.description}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.muted }}>Fortschritt</Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{ach?.percent}%</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.muted }}>XP</Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{ach?.xp}</Text>
            </View>
          </View>
          <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 12, alignSelf: 'stretch' }}>
            <View style={{ width: `${ach?.percent ?? 0}%`, height: 8, backgroundColor: colors.primary }} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Tipps</Text>
          {tips.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <Ionicons name='bulb' size={16} color={colors.muted} />
              <Text style={{ color: colors.text, flex: 1 }}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function generateTips(id: string, lng: 'de'|'en') {
  const de = {
    drink_more: 'Plane feste Trinkzeiten (z. B. jede Stunde ein Glas Wasser).',
    sport_streak: 'Lege Erinnerungen für Sport fest und starte mit kurzen Einheiten (10–15 Min).',
    pills: 'Verbinde die Einnahme mit einer Routine (z. B. nach dem Zähneputzen).',
    goal: 'Teile dein Ziel in Zwischenziele auf und prüfe wöchentlich den Fortschritt.',
    coffee: 'Ersetze eine Tasse Kaffee durch Wasser oder Tee.',
    weight_days: 'Nutze täglich die gleiche Tageszeit und Waage für konsistente Werte.',
  };
  const en = {
    drink_more: 'Schedule fixed drinking times (e.g., a glass every hour).',
    sport_streak: 'Set reminders for short workouts (10–15 min) to build streaks.',
    pills: 'Tie pill intake to a routine (e.g., after brushing your teeth).',
    goal: 'Split your main goal into milestones and review weekly.',
    coffee: 'Swap one coffee for water or tea.',
    weight_days: 'Weigh at the same time daily for consistency.',
  };
  const t = lng === 'de' ? de : en;
  const tips: string[] = [];
  if (id.startsWith('water')) tips.push(t.drink_more);
  if (id.startsWith('sport')) tips.push(t.sport_streak);
  if (id.startsWith('pills')) tips.push(t.pills);
  if (id.startsWith('goal') || id.startsWith('weight')) tips.push(t.goal);
  if (id.startsWith('coffee')) tips.push(t.coffee);
  if (id.startsWith('weight_')) tips.push(t.weight_days);
  if (tips.length === 0) tips.push(lng==='de'?'Bleib dran – kleine Schritte summieren sich!':'Keep going – small steps add up!');
  return tips;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700' },
  iconBtn: { padding: 8 },
  card: { borderRadius: 12, padding: 12 },
});