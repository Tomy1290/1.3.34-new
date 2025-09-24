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

function themeLabel(key: 'pink_default'|'pink_pastel'|'pink_vibrant'|'golden_pink', lang: 'de'|'en'|'pl') {
  const mapDe: Record<string,string> = { pink_default: 'Rosa – Standard', pink_pastel: 'Rosa – Pastell', pink_vibrant: 'Rosa – Kräftig', golden_pink: 'Goldenes Rosa' };
  const mapEn: Record<string,string> = { pink_default: 'Pink – Default', pink_pastel: 'Pink – Pastel', pink_vibrant: 'Pink – Vibrant', golden_pink: 'Golden Pink' };
  const mapPl: Record<string,string> = { pink_default: 'Różowy – domyślny', pink_pastel: 'Różowy – pastel', pink_vibrant: 'Różowy – intensywny', golden_pink: 'Złoty róż' };
  return (lang==='en'?mapEn:(lang==='pl'?mapPl:mapDe))[key] || key;
}

function reminderLabel(type: string, lang: 'de'|'en'|'pl', label?: string) {
  if (label) return label;
  const mapDe: Record<string,string> = { pills_morning: 'Tabletten morgens', pills_evening: 'Tabletten abends', weight: 'Gewicht', water: 'Wasser', sport: 'Sport', custom: 'Eigene Erinnerung' };
  const mapEn: Record<string,string> = { pills_morning: 'Pills morning', pills_evening: 'Pills evening', weight: 'Weight', water: 'Water', sport: 'Sport', custom: 'Custom reminder' };
  const mapPl: Record<string,string> = { pills_morning: 'Tabletki rano', pills_evening: 'Tabletki wieczorem', weight: 'Waga', water: 'Woda', sport: 'Sport', custom: 'Własne przypomnienie' };
  return (lang==='en'?mapEn:(lang==='pl'?mapPl:mapDe))[type] || type;
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
      Alert.alert(ok ? t('common.ok') : t('common.error'), ok ? t('settings.connectionSuccessful') : `Antwort: ${txt}`);
    } catch (e: any) {
      Alert.alert(t('common.error'), String(e?.message || e));
    }
  }

  async function saveCustomReminder() {
    const currentCustom = state.reminders.filter(r => !!r.label).length;
    if (currentCustom >= 10) {
      Alert.alert(
        state.language==='de'?'Limit erreicht':(state.language==='pl'?'Limit osiągnięty':'Limit reached'), 
        state.language==='de'?'Maximal 10 eigene Erinnerungen.':(state.language==='pl'?'Maks. 10 własnych przypomnień.':'Maximum 10 custom reminders.')
      );
      return;
    }

    if (!customLabel.trim() || !customTime) {
      Alert.alert(state.language==='de'?'Bitte alle Felder ausfüllen':(state.language==='pl'?'Proszę wypełnić wszystkie pola':'Please fill all fields'));
      return;
    }

    const initialized = await initializeNotifications();
    if (!initialized) return;

    const id = `custom_${Date.now()}`;

    const timeData = parseHHMM(customTime);
    if (!timeData) {
      Alert.alert(t('common.error'), 'Ungültige Zeit');
      return;
    }

    // Schedule next occurrence one-time
    const notifId = await scheduleDailyNext(id, customLabel.trim(), 'Custom reminder', timeData.hour, timeData.minute, 'reminders');

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

  const desiredOrder = ['pills_morning','pills_evening','weight','water','sport'];
  const sortedReminders = [...state.reminders].sort((a,b) => { const ai = desiredOrder.indexOf(a.type); const bi = desiredOrder.indexOf(b.type); const aIdx = ai < 0 ? 999 : ai; const bIdx = bi < 0 ? 999 : bi; return aIdx - bIdx; });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={t('common.back')}>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='star' size={16} color={colors.primary} />
            <Text style={[styles.appTitle, { color: colors.text, marginHorizontal: 6 }]}>{appTitle}</Text>
            <Ionicons name='star' size={16} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.muted }]}>{t('settings.title')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

       <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Language */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name='globe' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('settings.language')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => state.setLanguage('de')} accessibilityLabel='Deutsch' style={{ padding: 4, borderRadius: 8, borderWidth: 1, borderColor: state.language==='de'?colors.primary:colors.muted }}>
              <FlagDE width={40} height={26} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => state.setLanguage('en')} accessibilityLabel='English' style={{ padding: 4, borderRadius: 8, borderWidth: 1, borderColor: state.language==='en'?colors.primary:colors.muted }}>
              <FlagUK width={40} height={26} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => state.setLanguage('pl')} accessibilityLabel='Polski' style={{ padding: 4, borderRadius: 8, borderWidth: 1, borderColor: state.language==='pl'?colors.primary:colors.muted }}>
              <FlagPL width={40} height={26} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='color-palette' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('settings.theme')}</Text>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t('settings.chooseThemeHint')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {(['pink_default','pink_pastel','pink_vibrant','golden_pink'] as const).map((tt) => (
              <TouchableOpacity key={tt} onPress={() => state.setTheme(tt)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: state.theme===tt?colors.primary:'transparent' }]}> 
                <Text style={{ color: state.theme===tt?'#fff':colors.text }}>{themeLabel(tt, state.language as any)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick link: Profil */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='person-circle' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('settings.profileQuick')}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/profile')} style={[styles.badge, { borderColor: colors.muted }]}>
              <Text style={{ color: colors.text }}>{t('common.open')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t('settings.profileQuickHint')}</Text>
        </View>

        {/* Drinks settings */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='cafe' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('settings.drinksTitle')}</Text>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{state.language==='de'?'Bechergröße für Wasser (ml). Fortschrittsbalken berechnet Tagesziel automatisch aus Gewicht (35 ml/kg) und +500 ml bei Sport.':(state.language==='pl'?'Rozmiar kubka wody (ml). Pasek postępu oblicza cel dzienny automatycznie z wagi (35 ml/kg) i +500 ml przy sporcie.':'Cup size for water (ml). Progress bar computes daily target automatically from weight (35 ml/kg) and +500 ml if sport.')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: colors.text, width: 160 }}>{t('settings.cupSize')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TextInput keyboardType='number-pad' value={cupInput} onChangeText={setCupInput} onBlur={() => { const n = parseInt((cupInput||'').replace(/[^0-9]/g,'' )||'0',10); const v = Math.max(0, Math.min(1000, isNaN(n)?0:n)); state.setWaterCupMl(v); setCupInput(String(v)); }} style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }} />
              <Text style={{ color: colors.muted, marginLeft: 8 }}>ml</Text>
            </View>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t('settings.rangeHint')}</Text>
        </View>

        {/* Reminders */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='notifications-outline' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('settings.reminders')}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={seedDefaults} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{t('settings.seedDefaults')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setCustomMode((v)=>!v)} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{t('settings.custom')}</Text></TouchableOpacity>
            </View>
          </View>
          {customMode ? (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput placeholder={t('settings.label')} placeholderTextColor={colors.muted} value={customLabel} onChangeText={setCustomLabel} style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }} />
                <View style={{ width: 100 }}>
                  <TimePicker
                    time={customTime}
                    onTimeChange={setCustomTime}
                    colors={colors}
                    style={{ borderWidth: 1, borderColor: colors.muted, borderRadius: 8, backgroundColor: colors.input }}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <TouchableOpacity onPress={() => { setCustomMode(false); setCustomLabel(''); setCustomTime('08:00'); }} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{t('common.cancel')}</Text></TouchableOpacity>
                <TouchableOpacity onPress={saveCustomReminder} style={[styles.badge, { borderColor: colors.muted, backgroundColor: colors.primary }]}><Text style={{ color: '#fff' }}>{t('common.save')}</Text></TouchableOpacity>
              </View>
            </View>
          ) : null}
          {sortedReminders.length === 0 ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{t('reminders.none')}</Text>) : null}
          {sortedReminders.map((r) => (
            <View key={r.id} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {reminderLabel(r.type, state.language as any, r.label)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <View style={{ flex: 1 }}>
                    <TimePicker
                      time={reminderTimes[r.id] || '08:00'}
                      onTimeChange={(str) => updateTime(r.id, str)}
                      colors={colors}
                      style={{ width: 120, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, backgroundColor: colors.input }}
                    />
                  </View>
                  <View style={{ width: 8 }} />
                  <Switch value={r.enabled} onValueChange={(v)=>toggleReminder(r.id, v)} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} />
                </View>
              </View>
              <TouchableOpacity onPress={async ()=>{ const meta = state.notificationMeta[r.id]; if (meta?.id) await cancelNotification(meta.id); state.deleteReminder(r.id); }} style={{ padding: 8 }}>
                <Ionicons name='trash' size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* KI Insights */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='sparkles' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('settings.aiInsights')}</Text>
            </View>
            <Switch value={state.aiInsightsEnabled} onValueChange={(v)=> state.setAiInsightsEnabled(v)} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} />
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t('settings.aiInsightsHint')}</Text>
        </View>

        {/* Wöchentliche Events */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='calendar' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('settings.weeklyEvents')}</Text>
            </View>
            <Switch value={state.eventsEnabled} onValueChange={(v)=> state.setEventsEnabled(v)} thumbColor={'#fff'} trackColor={{ true: colors.primary, false: colors.muted }} />
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t('settings.weeklyEventsHint')}</Text>
        </View>

        {/* Backend URL */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name='cloud-outline' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('settings.backendUrl')}</Text>
          </View>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>{t('settings.backendUrlHint')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              placeholder='https://<dein-backend>'
              placeholderTextColor={colors.muted}
              value={backendUrl}
              onChangeText={setBackendUrl}
              autoCapitalize='none'
              autoCorrect={false}
              style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.input }}
            />
            <TouchableOpacity onPress={saveBackendUrl} style={[styles.badge, { borderColor: colors.muted, backgroundColor: colors.primary }]}>
              <Text style={{ color: '#fff' }}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 8 }}>
            <TouchableOpacity onPress={testBackendUrl} style={[styles.badge, { borderColor: colors.muted }]}>
              <Text style={{ color: colors.text }}>{t('settings.testConnection')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Backup */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='cloud-upload' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('common.info')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity onPress={exportData} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{t('settings.export')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={importData} style={[styles.badge, { borderColor: colors.muted }]}><Text style={{ color: colors.text }}>{t('settings.import')}</Text></TouchableOpacity>
          </View>
        </View>

        {/* App info */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='apps-outline' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('common.profile')}</Text>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t('common.version')}: {version}</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{t('common.createdBy')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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