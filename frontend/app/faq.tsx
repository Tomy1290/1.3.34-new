import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';
import { useI18n } from '../src/i18n';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

export default function FAQScreen() {
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);
  const t = useI18n();

  type QA = { id: string; q: string; a: string };
  type Cat = { id: string; title: string; items: QA[] };

  const data: Cat[] = useMemo(() => [
    {
      id: 'nav',
      title: t('faq.categories.nav'),
      items: [
        { id: 'nav-1', q: t('faq.items.nav1.q'), a: t('faq.items.nav1.a') },
        { id: 'nav-2', q: t('faq.items.nav2.q'), a: t('faq.items.nav2.a') },
        { id: 'nav-3', q: t('faq.items.nav3.q'), a: t('faq.items.nav3.a') },
        { id: 'nav-4', q: t('faq.items.nav4.q'), a: t('faq.items.nav4.a') },
      ],
    },
    {
      id: 'drinks',
      title: t('faq.categories.drinks'),
      items: [
        { id: 'dr-1', q: t('faq.items.dr1.q'), a: t('faq.items.dr1.a') },
        { id: 'dr-2', q: t('faq.items.dr2.q'), a: t('faq.items.dr2.a') },
        { id: 'dr-3', q: t('faq.items.dr3.q'), a: t('faq.items.dr3.a') },
        { id: 'dr-4', q: t('faq.items.dr4.q'), a: t('faq.items.dr4.a') },
      ],
    },
    {
      id: 'cycle',
      title: t('faq.categories.cycle'),
      items: [
        { id: 'cy-1', q: t('faq.items.cy1.q'), a: t('faq.items.cy1.a') },
        { id: 'cy-2', q: t('faq.items.cy2.q'), a: t('faq.items.cy2.a') },
        { id: 'cy-3', q: t('faq.items.cy3.q'), a: t('faq.items.cy3.a') },
        { id: 'cy-4', q: t('faq.items.cy4.q'), a: t('faq.items.cy4.a') },
        { id: 'cy-5', q: t('faq.items.cy5.q'), a: t('faq.items.cy5.a') },
      ],
    },
    {
      id: 'weight',
      title: t('faq.categories.weight'),
      items: [
        { id: 'w-1', q: t('faq.items.w1.q'), a: t('faq.items.w1.a') },
        { id: 'w-2', q: t('faq.items.w2.q'), a: t('faq.items.w2.a') },
        { id: 'w-3', q: t('faq.items.w3.q'), a: t('faq.items.w3.a') },
      ],
    },
    {
      id: 'reminders',
      title: t('faq.categories.reminders'),
      items: [
        { id: 'r-1', q: t('faq.items.r1.q'), a: t('faq.items.r1.a') },
        { id: 'r-2', q: t('faq.items.r2.q'), a: t('faq.items.r2.a') },
        { id: 'r-3', q: t('faq.items.r3.q'), a: t('faq.items.r3.a') },
      ],
    },
    {
      id: 'game',
      title: t('faq.categories.game'),
      items: [
        { id: 'g-1', q: t('faq.items.g1.q'), a: t('faq.items.g1.a') },
        { id: 'g-2', q: t('faq.items.g2.q'), a: t('faq.items.g2.a') },
        { id: 'g-3', q: t('faq.items.g3.q'), a: t('faq.items.g3.a') },
      ],
    },
    {
      id: 'ai',
      title: t('faq.categories.ai'),
      items: [
        { id: 'ai-1', q: t('faq.items.ai1.q'), a: t('faq.items.ai1.a') },
        { id: 'ai-2', q: t('faq.items.ai2.q'), a: t('faq.items.ai2.a') },
        { id: 'ai-3', q: t('faq.items.ai3.q'), a: t('faq.items.ai3.a') },
      ],
    },
  ], [state.language]);

  const [openCat, setOpenCat] = useState<Record<string, boolean>>({ nav: true });
  const [openItem, setOpenItem] = useState<Record<string, boolean>>({});

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel={t('common.back')}>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{t('common.appTitle')}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{t('faq.title')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {data.map((cat) => (
          <View key={cat.id} style={[styles.card, { backgroundColor: colors.card }]}> 
            <TouchableOpacity onPress={() => setOpenCat((m)=>({ ...m, [cat.id]: !m[cat.id] }))} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{cat.title}</Text>
              <Ionicons name={openCat[cat.id] ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </TouchableOpacity>
            {openCat[cat.id] ? (
              <View style={{ marginTop: 8 }}>
                {cat.items.map((it) => (
                  <View key={it.id} style={{ marginTop: 8 }}>
                    <TouchableOpacity onPress={() => setOpenItem((m)=>({ ...m, [it.id]: !m[it.id] }))} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text }}>{it.q}</Text>
                      <Ionicons name={openItem[it.id] ? 'remove' : 'add'} size={18} color={colors.muted} />
                    </TouchableOpacity>
                    {openItem[it.id] ? (
                      <Text style={{ color: colors.muted, marginTop: 6 }}>{it.a}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appTitle: { fontSize: 14, fontWeight: '800' },
  title: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 12, padding: 12 },
});