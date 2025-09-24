/* Updated to show flag buttons and include profile+gallery in export/import */
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Switch, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useRouter } from "expo-router";
import { useAppStore } from "../src/store/useStore";
import { 
  initializeNotifications, 
  cancelNotification, 
  scheduleDailyNext
} from "../src/utils/notifications";
import { TimePicker } from "../src/components/TimePicker";
import { parseHHMM, toHHMM } from "../src/utils/time";
import FlagDE from "../src/components/flags/FlagDE";
import FlagUK from "../src/components/flags/FlagUK";
import FlagPL from "../src/components/flags/FlagPL";
import { storage } from "../src/utils/storage";
import { useI18n } from "../src/i18n";

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75', input: '#fff' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8', input: '#1f1520' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e', input: '#fff' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866', input: '#ffffff' };
}

export default function SettingsScreen() {
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);
  const t = useI18n();

  const appTitle = t('common.appTitle');
  const version = Constants?.expoConfig?.version || '—';

  const [customMode, setCustomMode] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customTime, setCustomTime] = useState('08:00');
  const [cupInput, setCupInput] = useState(String(state.waterCupMl || 250));
  const [reminderTimes, setReminderTimes] = useState<Record<string, string>>({});

  // Backend URL runtime setting
  const [backendUrl, setBackendUrl] = useState<string>(storage.getString('backend_url') || '');

  // Initialize reminder times from stored reminders - UNIFIED STRING FORMAT
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
    const v = (backendUrl || '').trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(v)) {
      Alert.alert(t('common.error'), t('settings.invalidUrl'));
      return;
    }
    storage.set('backend_url', v);
    Alert.alert(t('settings.saved'));
  }

  async function testBackendUrl() {
    const v = (backendUrl || '').trim().replace(/\/$/, '');
    if (!v) { Alert.alert(t('common.info'), t('settings.enterUrlFirst')); return; }
    try {
      const res = await fetch(`${v}/api/`, { method: 'GET' });
      const ok = (res as any)?.ok;
      const txt = await (res as any).text?.();
      Alert.alert(ok ? t('common.ok') : t('common.error'), ok ? t('settings.connectionSuccessful') : `${t('common.response')} ${txt}`);
    } catch (e: any) {
      Alert.alert(t('common.error'), String(e?.message || e));
    }
  }

  async function saveCustomReminder() {
    const currentCustom = state.reminders.filter(r => !!r.label).length;
    if (currentCustom >= 10) {
      Alert.alert(
        t('settings.limitReachedTitle'), 
        t('settings.limitReachedMessage')
      );
      return;
    }

    if (!customLabel.trim() || !customTime) {
      Alert.alert(t('common.error'), t('settings.fillAllFields'));
      return;
    }

    const initialized = await initializeNotifications();
    if (!initialized) return;

    const id = `custom_${Date.now()}`;

    const timeData = parseHHMM(customTime);
    if (!timeData) {
      Alert.alert(t('common.error'), t('settings.invalidTime'));
      return;
    }

    // Schedule next occurrence one-time
    const notifId = await scheduleDailyNext(id, customLabel.trim(), t('reminders.types.custom'), timeData.hour, timeData.minute, 'reminders');

    if (notifId) {
      const tStr = `${timeData.hour.toString().padStart(2,'0')}:${timeData.minute.toString().padStart(2,'0')}`;
      state.addReminder({ id, type: 'custom', label: customLabel.trim(), time: tStr, enabled: true });
      state.setNotificationMeta(id, { id: notifId, time: tStr });
      setReminderTimes(prev => ({ ...prev, [id]: tStr }));

      setCustomMode(false);
      setCustomLabel('');
      setCustomTime('08:00');
      Alert.alert(t('common.done'));
    }
  }

  function reminderLabel(type: string, label?: string) {
    return label || t(`reminders.types.${type}`);
  }

  const desiredOrder = ['pills_morning','pills_evening','weight','water','sport'];
  const sortedReminders = [...state.reminders].sort((a,b) => { const ai = desiredOrder.indexOf(a.type); const bi = desiredOrder.indexOf(b.type); const aIdx = ai &lt; 0 ? 999 : ai; const bIdx = bi &lt; 0 ? 999 : bi; return aIdx - bIdx; });

  return (
    &lt;SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}&gt;
      &lt;View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}&gt; 
        &lt;TouchableOpacity onPress={() =&gt; router.back()} style={styles.iconBtn} accessibilityLabel={t('common.back')}&gt;
          &lt;Ionicons name='chevron-back' size={26} color={colors.text} /&gt;
        &lt;/TouchableOpacity&gt;
        &lt;View style={{ alignItems: 'center' }}&gt;
          &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
            &lt;Ionicons name='star' size={16} color={colors.primary} /&gt;
            &lt;Text style={[styles.appTitle, { color: colors.text, marginHorizontal: 6 }]}&gt;{appTitle}&lt;/Text&gt;
            &lt;Ionicons name='star' size={16} color={colors.primary} /&gt;
          &lt;/View&gt;
          &lt;Text style={[styles.title, { color: colors.muted }]}&gt;{t('settings.title')}&lt;/Text&gt;
        &lt;/View&gt;
        &lt;View style={{ width: 40 }} /&gt;
      &lt;/View&gt;

       &lt;ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}&gt;
        {/* Language */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}&gt;
            &lt;Ionicons name='globe' size={18} color={colors.primary} /&gt;
            &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('settings.language')}&lt;/Text&gt;
          &lt;/View&gt;
          &lt;View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}&gt;
            &lt;TouchableOpacity onPress={() =&gt; state.setLanguage('de')} accessibilityLabel='Deutsch' style={{ padding: 4, borderRadius: 8, borderWidth: 1, borderColor: state.language==='de'?colors.primary:colors.muted }}&gt;
              &lt;FlagDE width={40} height={26} /&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity onPress={() =&gt; state.setLanguage('en')} accessibilityLabel='English' style={{ padding: 4, borderRadius: 8, borderWidth: 1, borderColor: state.language==='en'?colors.primary:colors.muted }}&gt;
              &lt;FlagUK width={40} height={26} /&gt;
            &lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity onPress={() =&gt; state.setLanguage('pl')} accessibilityLabel='Polski' style={{ padding: 4, borderRadius: 8, borderWidth: 1, borderColor: state.language==='pl'?colors.primary:colors.muted }}&gt;
              &lt;FlagPL width={40} height={26} /&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Theme */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
            &lt;Ionicons name='color-palette' size={18} color={colors.primary} /&gt;
            &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('settings.theme')}&lt;/Text&gt;
          &lt;/View&gt;
          &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('settings.chooseThemeHint')}&lt;/Text&gt;
          &lt;View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}&gt;
            {(['pink_default','pink_pastel','pink_vibrant','golden_pink'] as const).map((tt) =&gt; (
              &lt;TouchableOpacity key={tt} onPress={() =&gt; state.setTheme(tt)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: state.theme===tt?colors.primary:'transparent' }]}&gt; 
                &lt;Text style={{ color: state.theme===tt?'#fff':colors.text }}&gt;{t(`themeLabels.${tt}`)}&lt;/Text&gt;
              &lt;/TouchableOpacity&gt;
            ))}
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Quick link: Profil */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name='person-circle' size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('settings.profileQuick')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;TouchableOpacity onPress={() =&gt; router.push('/profile')} style={[styles.badge, { borderColor: colors.muted }]}&gt;
              &lt;Text style={{ color: colors.text }}&gt;{t('common.open')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('settings.profileQuickHint')}&lt;/Text&gt;
        &lt;/View&gt;

        {/* Drinks settings */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
            &lt;Ionicons name='cafe' size={18} color={colors.primary} /&gt;
            &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('settings.drinksTitle')}&lt;/Text&gt;
          &lt;/View&gt;
          &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('settings.drinksInfo')}&lt;/Text&gt;
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}&gt;
            &lt;Text style={{ color: colors.text, width: 160 }}&gt;{t('settings.cupSize')}&lt;/Text&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}&gt;
              &lt;TextInput keyboardType='number-pad' value={cupInput} onChangeText={setCupInput} onBlur={() =&gt; { const n = parseInt((cupInput||'').replace(/[^0-9]/g,'' )||'0',10); const v = Math.max(0, Math.min(1000, isNaN(n)?0:n)); state.setWaterCupMl(v); setCupInput(String(v)); }} style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }} /&gt;
              &lt;Text style={{ color: colors.muted, marginLeft: 8 }}&gt;{t('common.ml')}&lt;/Text&gt;
            &lt;/View&gt;
          &lt;/View&gt;
          &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('settings.rangeHint')}&lt;/Text&gt;
        &lt;/View&gt;

        {/* Reminders */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name='notifications-outline' size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('settings.reminders')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;View style={{ flexDirection: 'row', gap: 8 }}&gt;
              &lt;TouchableOpacity onPress={seedDefaults} style={[styles.badge, { borderColor: colors.muted }]}&gt;&lt;Text style={{ color: colors.text }}&gt;{t('settings.seedDefaults')}&lt;/Text&gt;&lt;/TouchableOpacity&gt;
              &lt;TouchableOpacity onPress={() =&gt; setCustomMode((v)=&gt;!v)} style={[styles.badge, { borderColor: colors.muted }]}&gt;&lt;Text style={{ color: colors.text }}&gt;{t('settings.custom')}&lt;/Text&gt;&lt;/TouchableOpacity&gt;
            &lt;/View&gt;
          &lt;/View&gt;
          {customMode ? (
            &lt;View style={{ marginTop: 10 }}&gt;
              &lt;View style={{ flexDirection: 'row', gap: 8 }}&gt;
                &lt;TextInput placeholder={t('settings.label')} placeholderTextColor={colors.muted} value={customLabel} onChangeText={setCustomLabel} style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }} /&gt;
                &lt;View style={{ width: 100 }}&gt;
                  &lt;TimePicker
                    time={customTime}
                    onTimeChange={setCustomTime}
                    colors={colors}
                    style={{ borderWidth: 1, borderColor: colors.muted, borderRadius: 8, backgroundColor: colors.input }}
                  /&gt;
                &lt;/View&gt;
              &lt;/View&gt;
              &lt;View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}&gt;
                &lt;TouchableOpacity onPress={() =&gt; { setCustomMode(false); setCustomLabel(''); setCustomTime('08:00'); }} style={[styles.badge, { borderColor: colors.muted }]}&gt;&lt;Text style={{ color: colors.text }}&gt;{t('common.cancel')}&lt;/Text&gt;&lt;/TouchableOpacity&gt;
                &lt;TouchableOpacity onPress={saveCustomReminder} style={[styles.badge, { borderColor: colors.muted, backgroundColor: colors.primary }]}&gt;&lt;Text style={{ color: '#fff' }}&gt;{t('common.save')}&lt;/Text&gt;&lt;/TouchableOpacity&gt;
              &lt;/View&gt;
            &lt;/View&gt;
          ) : null}
          {sortedReminders.length === 0 ? (&lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('reminders.none')}&lt;/Text&gt;) : null}
          {sortedReminders.map((r) =&gt; (
            &lt;View key={r.id} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;View style={{ flex: 1 }}&gt;
                &lt;Text style={{ color: colors.text, fontWeight: '700' }}&gt;
                  {reminderLabel(r.type, r.label)}
                &lt;/Text&gt;
                &lt;View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}&gt;
                  &lt;View style={{ flex: 1 }}&gt;
                    &lt;TimePicker
                      time={reminderTimes[r.id] || '08:00'}
                      onTimeChange={(str) =&gt; updateTime(r.id, str)}
                      colors={colors}
                      style={{ width: 120, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, backgroundColor: colors.input }}
                    /&gt;
                  &lt;/View&gt;
                  &lt;View style={{ width: 8 }} /&gt;
                  &lt;Switch value={r.enabled} onValueChange={(v)=&gt;toggleReminder(r.id, v)} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} /&gt;
                &lt;/View&gt;
              &lt;/View&gt;
              &lt;TouchableOpacity onPress={async ()=&gt;{ const meta = state.notificationMeta[r.id]; if (meta?.id) await cancelNotification(meta.id); state.deleteReminder(r.id); }} style={{ padding: 8 }}&gt;
                &lt;Ionicons name='trash' size={18} color={colors.muted} /&gt;
              &lt;/TouchableOpacity&gt;
            &lt;/View&gt;
          ))}
        &lt;/View&gt;

        {/* KI Insights */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name='sparkles' size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('settings.aiInsights')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;Switch value={state.aiInsightsEnabled} onValueChange={(v)=&gt; state.setAiInsightsEnabled(v)} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} /&gt;
          &lt;/View&gt;
          &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('settings.aiInsightsHint')}&lt;/Text&gt;
        &lt;/View&gt;

        {/* Wöchentliche Events */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}&gt;
            &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
              &lt;Ionicons name='calendar' size={18} color={colors.primary} /&gt;
              &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('settings.weeklyEvents')}&lt;/Text&gt;
            &lt;/View&gt;
            &lt;Switch value={state.eventsEnabled} onValueChange={(v)=&gt; state.setEventsEnabled(v)} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} /&gt;
          &lt;/View&gt;
          &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('settings.weeklyEventsHint')}&lt;/Text&gt;
        &lt;/View&gt;

        {/* Backend URL */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}&gt;
            &lt;Ionicons name='cloud-outline' size={18} color={colors.primary} /&gt;
            &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('settings.backendUrl')}&lt;/Text&gt;
          &lt;/View&gt;
          &lt;Text style={{ color: colors.muted, marginBottom: 8 }}&gt;{t('settings.backendUrlHint')}&lt;/Text&gt;
          &lt;View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}&gt;
            &lt;TextInput
              placeholder={t('settings.backendPlaceholder')}
              placeholderTextColor={colors.muted}
              value={backendUrl}
              onChangeText={setBackendUrl}
              autoCapitalize='none'
              autoCorrect={false}
              style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }}
            /&gt;
            &lt;TouchableOpacity onPress={saveBackendUrl} style={[styles.badge, { borderColor: colors.muted, backgroundColor: colors.primary }]}&gt;
              &lt;Text style={{ color: '#fff' }}&gt;{t('common.save')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
          &lt;View style={{ marginTop: 8 }}&gt;
            &lt;TouchableOpacity onPress={testBackendUrl} style={[styles.badge, { borderColor: colors.muted }]}&gt;
              &lt;Text style={{ color: colors.text }}&gt;{t('settings.testConnection')}&lt;/Text&gt;
            &lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* Backup */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
            &lt;Ionicons name='cloud-upload' size={18} color={colors.primary} /&gt;
            &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('common.info')}&lt;/Text&gt;
          &lt;/View&gt;
          &lt;View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}&gt;
            &lt;TouchableOpacity onPress={exportData} style={[styles.badge, { borderColor: colors.muted }]}&gt;&lt;Text style={{ color: colors.text }}&gt;{t('settings.export')}&lt;/Text&gt;&lt;/TouchableOpacity&gt;
            &lt;TouchableOpacity onPress={importData} style={[styles.badge, { borderColor: colors.muted }]}&gt;&lt;Text style={{ color: colors.text }}&gt;{t('settings.import')}&lt;/Text&gt;&lt;/TouchableOpacity&gt;
          &lt;/View&gt;
        &lt;/View&gt;

        {/* App info */}
        &lt;View style={[styles.card, { backgroundColor: colors.card }]}&gt; 
          &lt;View style={{ flexDirection: 'row', alignItems: 'center' }}&gt;
            &lt;Ionicons name='apps-outline' size={18} color={colors.primary} /&gt;
            &lt;Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}&gt;{t('common.profile')}&lt;/Text&gt;
          &lt;/View&gt;
          &lt;Text style={{ color: colors.muted, marginTop: 6 }}&gt;{t('common.version')}: {version}&lt;/Text&gt;
          &lt;Text style={{ color: colors.muted, marginTop: 2 }}&gt;{t('common.createdBy')}&lt;/Text&gt;
        &lt;/View&gt;
      &lt;/ScrollView&gt;
    &lt;/SafeAreaView&gt;
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  appTitle: { fontSize: 18, fontWeight: '700' },
  title: { fontSize: 12 },
  iconBtn: { padding: 8 },
  card: { borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12, borderTopWidth: 1 }
});