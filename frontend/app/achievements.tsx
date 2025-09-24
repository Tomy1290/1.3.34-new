import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppStore } from "../src/store/useStore";
import { computeAchievements, getAchievementConfigById } from "../src/achievements";
import { BadgeIcon } from "../src/components/BadgeIcon";
import { computeChains } from "../src/gamification/chains";
import { useI18n } from "../src/i18n";

function useThemeColors(theme: string) {
  if (theme === "pink_pastel") return { bg: "#fff0f5", card: "#ffe4ef", primary: "#d81b60", text: "#3a2f33", muted: "#8a6b75" };
  if (theme === "pink_vibrant") return { bg: "#1b0b12", card: "#2a0f1b", primary: "#ff2d87", text: "#ffffff", muted: "#e59ab8" };
  if (theme === "golden_pink") return { bg: "#fff8f0", card: "#ffe9c7", primary: "#dba514", text: "#2a1e22", muted: "#9b7d4e" };
  return { bg: "#fde7ef", card: "#ffd0e0", primary: "#e91e63", text: "#2a1e22", muted: "#7c5866" };
}

export default function AchievementsScreen() {
  const router = useRouter();
  const state = useAppStore();
  const colors = useThemeColors(state.theme);
  const t = useI18n();
  const [filter, setFilter] = useState<'all'|'progress'|'done'>('all');
  const [query, setQuery] = useState("");

  const { list } = useMemo(() => computeAchievements({
    days: state.days, goal: state.goal, reminders: state.reminders, chat: state.chat, saved: state.saved,
    achievementsUnlocked: state.achievementsUnlocked, xp: state.xp, language: state.language, theme: state.theme,
  }), [state.days, state.goal, state.reminders, state.chat, state.saved, state.achievementsUnlocked, state.xp, state.language, state.theme]);

  const filtered = useMemo(() => {
    let arr = list;
    if (filter === 'progress') arr = arr.filter(a => !a.completed && a.percent > 0);
    if (filter === 'done') arr = arr.filter(a => a.completed);
    if (query.trim()) arr = arr.filter(a => a.title.toLowerCase().includes(query.toLowerCase()));
    return arr.sort((a,b) => (a.completed === b.completed) ? (b.percent - a.percent) : (a.completed ? 1 : -1));
  }, [list, filter, query]);

  const chainsRaw = useMemo(() => computeChains(state), [state.days, state.goal, state.reminders, state.chat, state.saved, state.achievementsUnlocked, state.xp, state.language, state.theme]);
  const chains = useMemo(() => {
    let arr = chainsRaw;
    if (filter === 'progress') arr = arr.filter(c => c.completed < c.total);
    if (filter === 'done') arr = arr.filter(c => c.completed >= c.total);
    const sorted = [...arr].sort((a,b) => {
      const aDone = a.completed >= a.total; const bDone = b.completed >= b.total;
      if (aDone && !bDone) return 1; if (!aDone && bDone) return -1;
      const ap = aDone ? 100 : Math.round(a.nextPercent);
      const bp = bDone ? 100 : Math.round(b.nextPercent);
      return bp - ap;
    });
    return sorted;
  }, [chainsRaw, filter]);

  const [showAch, setShowAch] = useState(false);
  const [showChains, setShowChains] = useState(false);
  const [showUnlocks, setShowUnlocks] = useState(false);

  const appTitle = t('common.appTitle');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{appTitle}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{t('achievements.title')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Search & filters at top */}
        <TextInput
          placeholder={t('achievements.search')}
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={[styles.input, { borderColor: colors.muted, color: colors.text }]} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['all','progress','done'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.badge, { borderColor: colors.muted, backgroundColor: filter===f ? colors.primary : 'transparent' }]}
              accessibilityLabel={`${t('achievements.filter')} ${t(`achievements.filters.${f}`)}`}
            >
              <Text style={{ color: filter===f ? '#fff' : colors.text }}>{t(`achievements.filters.${f}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Achievements list – collapsible, show first 3 by default */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t('achievements.title')}</Text>
            <TouchableOpacity onPress={() => setShowAch(v=>!v)}>
              <Ionicons name={showAch?'chevron-up':'chevron-down'} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {(showAch ? filtered : filtered.slice(0,3)).map((a) => {
            const cfg = getAchievementConfigById(a.id);
            return (
              <TouchableOpacity key={a.id} style={[styles.itemCard, { backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 12 }]} onPress={() => router.push(`/achievements/${a.id}`)}>
                <BadgeIcon size={48} percent={a.percent} color={colors.primary} bg={colors.bg} icon={cfg?.icon || 'trophy'} iconColor={colors.text} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{a.title}</Text>
                  <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={2}>{a.description}</Text>
                  <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                    <View style={{ width: `${a.percent}%`, height: 6, backgroundColor: colors.primary }} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Ionicons name={a.completed ? 'trophy' : 'medal'} size={18} color={a.completed ? colors.primary : colors.muted} />
                  <Text style={{ color: colors.text }}>{a.xp} {t('common.xp')}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {filtered.length > 3 ? (
            <TouchableOpacity onPress={() => setShowAch(v=>!v)} style={{ alignSelf: 'center', marginTop: 6 }}>
              <Text style={{ color: colors.primary }}>{showAch ? t('common.showLess') : t('common.showMore')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Chains – collapsible, first 3; filter and sort by progress */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t('index.chainsTitle')}</Text>
            <TouchableOpacity onPress={() => setShowChains(v=>!v)}>
              <Ionicons name={showChains?'chevron-up':'chevron-down'} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {(showChains ? chains : chains.slice(0,3)).map((c) => {
            const done = c.completed >= c.total;
            const pct = done ? 100 : Math.round(c.nextPercent);
            const statusText = done ? t('achievements.completed') : t('achievements.step', { step: c.completed + 1, total: c.total });
            return (
              <View key={c.id} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text }}>{c.title} · {statusText}</Text>
                  <Text style={{ color: colors.muted }}>{pct}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                  <View style={{ width: `${pct}%`, height: 6, backgroundColor: done ? '#2bb673' : colors.primary }} />
                </View>
                {!done && c.nextTitle ? <Text style={{ color: colors.muted, marginTop: 4 }}>{t('index.next')}: {c.nextTitle}</Text> : null}
              </View>
            );
          })}
          {chains.length > 3 ? (
            <TouchableOpacity onPress={() => setShowChains(v=>!v)} style={{ alignSelf: 'center', marginTop: 6 }}>
              <Text style={{ color: colors.primary }}>{showChains ? t('common.showLess') : t('common.showMore')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Unlock previews – collapsible */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t('achievements.unlocks.title')}</Text>
            <TouchableOpacity onPress={() => setShowUnlocks(v=>!v)}>
              <Ionicons name={showUnlocks?'chevron-up':'chevron-down'} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {showUnlocks ? (
            <>
              <View style={{ marginTop: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('achievements.unlocks.extStats', { level: 10 })}</Text>
              </View>
              <View style={{ marginTop: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('achievements.unlocks.premiumInsights', { level: 25 })}</Text>
              </View>
              <View style={{ marginTop: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('achievements.unlocks.vipChat', { level: 50 })}</Text>
              </View>
              <View style={{ marginTop: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('achievements.unlocks.goldenPinkTheme', { level: 75 })}</Text>
              </View>
              <View style={{ marginTop: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('achievements.unlocks.legendaryStatus', { level: 100 })}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={{ color: colors.text, marginTop: 6 }}>• {t('achievements.unlocks.extStats', { level: 10 })}</Text>
              <Text style={{ color: colors.text, marginTop: 6 }}>• {t('achievements.unlocks.premiumInsights', { level: 25 })}</Text>
              <Text style={{ color: colors.text, marginTop: 6 }}>• {t('achievements.unlocks.vipChat', { level: 50 })}</Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 12, fontWeight: '600' },
  appTitle: { fontSize: 14, fontWeight: '800' },
  iconBtn: { padding: 8 },
  badge: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  card: { borderRadius: 12, padding: 12 },
  itemCard: { borderRadius: 12, padding: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
});