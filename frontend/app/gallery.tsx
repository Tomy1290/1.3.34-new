import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Dimensions, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../src/store/useStore';
import { toKey } from '../src/utils/date';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useI18n } from '../src/i18n';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

function bytesFromBase64(b64: string) { try { const l = b64.includes(',')? b64.split(',')[1].length : b64.length; return Math.floor(l * (3/4)); } catch { return 0; } }

export default function GalleryScreen() {
  const t = useI18n();
  function fmtKey(key?: string) {
    try {
      if (!key) return '—';
      const [y, m, d] = key.split('-');
      if (!y || !m || !d) return key;
      return `${d.padStart(2,'0')}.${m.padStart(2,'0')}.${y}`;
    } catch {
      return key || '—';
    }
  }
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);
  const [info, setInfo] = useState(false);

  // Calendar state
  const [monthDate, setMonthDate] = useState(new Date());
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 0);
  const firstWeekday = (monthStart.getDay() + 6) % 7; // Mon=0
  const daysInMonth = monthEnd.getDate();

  const [selectedDateKey, setSelectedDateKey] = useState(toKey(new Date()));
  const selectedPhotos = state.gallery[selectedDateKey] || [];

  // Stats helpers
  const allKeys = Object.keys(state.gallery).sort();
  const firstPhotoDate = allKeys[0] ? allKeys[0] : undefined;
  const lastPhotoDate = allKeys.length ? allKeys[allKeys.length-1] : undefined;
  const storageBytes = useMemo(() => {
    let sum = 0; for (const k of Object.keys(state.gallery)) { for (const p of (state.gallery[k]||[])) sum += bytesFromBase64(p.base64); }
    return sum;
  }, [state.gallery]);
  const storageMB = (storageBytes/1024/1024).toFixed(1);

  const monthSummary = useMemo(()=>{
    const out: { label: string; count: number; days: number }[] = [];
    const now = new Date();
    for (let i=0;i<3;i++) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const y = d.getFullYear(); const m = d.getMonth();
      const label = d.toLocaleDateString(state.language==='de'?'de-DE':(state.language==='pl'?'pl-PL':'en-US'), { month: 'long', year: 'numeric' });
      const days = new Date(y, m+1, 0).getDate();
      const count = Object.keys(state.gallery).filter(k=>{ const dt = new Date(k); return dt.getFullYear()===y && dt.getMonth()===m; }).length;
      out.push({ label, count, days });
    }
    return out;
  }, [state.gallery, state.language]);

  async function addPhoto(from: 'camera'|'gallery') {
    const count = selectedPhotos.length;
    if (count >= 5) { alert(t('gallery.limitPerDay')); return; }
    try {
      if (from==='camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status!=='granted') { alert(t('gallery.cameraNotAllowed')); return; }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
        if (!res.canceled && res.assets?.[0]?.base64) {
          const b64 = `data:${res.assets[0].mimeType||'image/jpeg'};base64,${res.assets[0].base64}`;
          state.addPhoto(selectedDateKey, b64);
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status!=='granted') { alert(t('gallery.galleryNotAllowed')); return; }
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true });
        if (!res.canceled && res.assets?.[0]?.base64) {
          const b64 = `data:${res.assets[0].mimeType||'image/jpeg'};base64,${res.assets[0].base64}`;
          state.addPhoto(selectedDateKey, b64);
        }
      }
    } catch (e) { alert(String(e)); }
  }

  // Viewer (Pinch-to-zoom via Gesture API + Reanimated)
  const [viewer, setViewer] = useState<{visible:boolean; uri?:string}>({visible:false});
  const scaleSv = useSharedValue(1);
  const baseScaleSv = useSharedValue(1);
  const pinch = Gesture.Pinch()
    .onStart(() => { baseScaleSv.value = scaleSv.value; })
    .onUpdate((e) => { const next = baseScaleSv.value * e.scale; scaleSv.value = Math.min(4, Math.max(1, next)); })
    .onEnd(() => { /* keep scale */ });
  const imageStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleSv.value }] }));

  // A/B compare
  const photosDays = Object.keys(state.gallery).sort();
  const [aDay, setADay] = useState<string | undefined>(undefined);
  const [bDay, setBDay] = useState<string | undefined>(undefined);
  const [aIdx, setAIdx] = useState(0);
  const [bIdx, setBIdx] = useState(0);
  const [compareMode, setCompareMode] = useState<'idle'|'selectingA'|'selectingB'|'show'>('idle');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ backgroundColor: colors.card, paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel={t('common.back')}>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='star' size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '800', marginHorizontal: 6 }}>{t('gallery.title')}</Text>
            <Ionicons name='star' size={16} color={colors.primary} />
          </View>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{t('gallery.subTitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Info */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='information-circle' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('common.info')}</Text>
            </View>
            <TouchableOpacity onPress={()=> setInfo(v=>!v)}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {info ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>
              {t('gallery.infoText', { storageMB })}
            </Text>
          ) : null}
        </View>

        {/* Calendar */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => { const d = new Date(monthDate); d.setMonth(d.getMonth() - 1); setMonthDate(d); }} accessibilityLabel={t('gallery.prevMonth')}>
              <Ionicons name='chevron-back' size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toLocaleDateString(state.language==='de'?'de-DE':(state.language==='pl'?'pl-PL':'en-US'), { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={() => { const d = new Date(monthDate); d.setMonth(d.getMonth() + 1); setMonthDate(d); }} accessibilityLabel={t('gallery.nextMonth')}>
              <Ionicons name='chevron-forward' size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          {/* Weekday header (Mon start) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {[state.language==='de'?['Mo','Di','Mi','Do','Fr','Sa','So']:(state.language==='pl'?['Pn','Wt','Śr','Cz','Pt','So','Nd']:['Mo','Tu','We','Th','Fr','Sa','Su'])].flat().map((d, i) => (
              <Text key={i} style={{ color: colors.muted, width: `${100/7}%`, textAlign: 'center' }}>{d}</Text>
            ))}
          </View>
          {/* Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {(() => {
              const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
              const pad = (first.getDay() + 6) % 7; // Monday first
              const blanks = Array.from({ length: pad });
              const days: Date[] = []; const d = new Date(first);
              while (d.getMonth() === monthDate.getMonth()) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
              return (
                <>
                  {blanks.map((_, i) => (<View key={`b${i}`} style={{ width: `${100/7}%`, height: 44 }} />))}
                  {days.map((dayDate, i) => {
                    const key = toKey(dayDate);
                    const has = ((state.gallery[key]||[]).length > 0);
                    const isFuture = +dayDate > +new Date();
                    const selected = key === selectedDateKey;
                    const onDayPress = () => {
                      setSelectedDateKey(key);
                      if (compareMode === 'selectingA') { setADay(key); setCompareMode('selectingB'); }
                      else if (compareMode === 'selectingB') { if (aDay && key === aDay) return; setBDay(key); setCompareMode('show'); }
                    };
                    return (
                      <TouchableOpacity key={key} disabled={isFuture} style={{ width: `${100/7}%`, height: 44, alignItems: 'center', justifyContent: 'center', opacity: isFuture ? 0.5 : 1 }} onPress={onDayPress} accessibilityLabel={t('gallery.dayA11y', { key })}>
                        <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? `${colors.primary}22` : 'transparent', borderWidth: selected ? 2 : 0, borderColor: selected ? colors.primary : 'transparent' }}>
                          <Text style={{ color: colors.text }}>{dayDate.getDate()}</Text>
                          {has ? <View style={{ position: 'absolute', bottom: 3, width: 18, height: 2, backgroundColor: colors.primary, borderRadius: 1 }} /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              );
            })()}
          </View>
          <Text style={{ color: colors.muted, marginTop: 8 }}>{t('common.selected')}: {selectedDateKey}</Text>
          {/* Compare controls under calendar */}
          <View style={{ marginTop: 10 }}>
            {compareMode === 'idle' ? (
              <TouchableOpacity disabled={Object.keys(state.gallery).length < 2} onPress={() => { setADay(undefined); setBDay(undefined); setAIdx(0); setBIdx(0); setCompareMode('selectingA'); }} style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, opacity: Object.keys(state.gallery).length < 2 ? 0.5 : 1 }}>
                <Text style={{ color: colors.text }}>{t('gallery.startCompare')}</Text>
              </TouchableOpacity>
            ) : null}
            {compareMode === 'selectingA' ? (
              <Text style={{ color: colors.muted }}>{t('gallery.pickFirstDay')}</Text>
            ) : null}
            {compareMode === 'selectingB' ? (
              <Text style={{ color: colors.muted }}>{t('gallery.pickSecondDay')}</Text>
            ) : null}
            {compareMode === 'show' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name='swap-horizontal' size={16} color={colors.muted} />
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{t('common.before')}: {aDay}</Text>
                </View>
                <Text style={{ color: colors.muted }}>→</Text>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('common.after')}: {bDay}</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => setCompareMode('idle')} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.muted }}>
                  <Text style={{ color: colors.text }}>{t('gallery.endCompare')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* Add photo */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='images' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('gallery.photosCount', { count: selectedPhotos.length })}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={()=> addPhoto('camera')} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.muted }}>
                <Text style={{ color: colors.text }}>{t('common.camera')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=> addPhoto('gallery')} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.muted }}>
                <Text style={{ color: colors.text }}>{t('common.gallery')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {selectedPhotos.length===0 ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('gallery.noPhotosForDay')}</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {selectedPhotos.map((p,i)=> (
                <View key={p.id} style={{ width: 100, height: 140 }}>
                  <TouchableOpacity activeOpacity={0.9} onPress={()=>{ scaleSv.value = 1; baseScaleSv.value = 1; setViewer({ visible: true, uri: p.base64 }); }} style={{ width: '100%', height: '100%' }}>
                    <Image source={{ uri: p.base64 }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={()=> Alert.alert(t('gallery.deletePhotoConfirmTitle'), t('gallery.deletePhotoConfirmMessage'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.delete'), style: 'destructive', onPress: ()=> state.deletePhoto(selectedDateKey, p.id) },
                  ])} accessibilityLabel='Foto löschen' style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, padding: 6 }}>
                    <Ionicons name='trash' size={16} color={'#fff'} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Stats under calendar */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='stats-chart' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('gallery.statisticsTitle')}</Text>
          </View>
          <Text style={{ color: colors.muted, marginTop: 6 }}>{t('gallery.firstPhotoLabel')} {firstPhotoDate || '—'}</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{t('gallery.lastPhotoLabel')} {lastPhotoDate || '—'}</Text>
          <View style={{ marginTop: 8, gap: 8 }}>
            {monthSummary.map((m)=>{
              const pct = Math.round((m.count / Math.max(1,m.days)) * 100);
              return (
                <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.text, width: 160 }}>{m.label}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={{ width: 140 }}>
                    <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: 8, backgroundColor: colors.primary }} />
                    </View>
                  </View>
                  <Text style={{ color: colors.muted, marginLeft: 8 }}>{m.count}/{m.days}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* A/B compare */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='swap-horizontal' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('gallery.compareTitle')}</Text>
          </View>
          {photosDays.length<1 ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('common.tooFewData')}</Text>
          ) : (
            <View style={{ marginTop: 6 }}>
              {compareMode === 'show' ? (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(state.gallery[aDay||'']||[]).map((p,idx)=> (
                        <TouchableOpacity key={p.id} onPress={()=> setAIdx(idx)} style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.muted, backgroundColor: aIdx===idx?colors.primary:'transparent' }}>
                          <Text style={{ color: aIdx===idx?'#fff':colors.text }}>{t('common.before')} {idx+1}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(state.gallery[bDay||'']||[]).map((p,idx)=> (
                        <TouchableOpacity key={p.id} onPress={()=> setBIdx(idx)} style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.muted, backgroundColor: bIdx===idx?colors.primary:'transparent' }}>
                          <Text style={{ color: bIdx===idx?'#fff':colors.text }}>{t('common.after')} {idx+1}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ) : null}

              {compareMode === 'show' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name='swap-horizontal' size={16} color={colors.muted} />
                    <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 6 }}>
                      {t('common.before')}: {fmtKey(aDay)}
                    </Text>
                    <Text style={{ color: colors.muted, marginHorizontal: 6 }}>→</Text>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {t('common.after')}: {fmtKey(bDay)}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  {aDay && (state.gallery[aDay]||[])[aIdx] ? (
                    <Image source={{ uri: (state.gallery[aDay]||[])[aIdx].base64 }} style={{ width: '100%', height: 260, borderRadius: 8 }} resizeMode='cover' />
                  ) : <Text style={{ color: colors.muted }}>{t('common.before')} —</Text>}
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  {bDay && (state.gallery[bDay]||[])[bIdx] ? (
                    <Image source={{ uri: (state.gallery[bDay]||[])[bIdx].base64 }} style={{ width: '100%', height: 260, borderRadius: 8 }} resizeMode='cover' />
                  ) : <Text style={{ color: colors.muted }}>{t('common.after')} —</Text>}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fullscreen viewer */}
      <Modal visible={viewer.visible} transparent animationType='fade' onRequestClose={()=> setViewer({visible:false})}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity onPress={()=> setViewer({visible:false})} style={{ position: 'absolute', top: 40, right: 16, zIndex: 2 }}>
            <Ionicons name='close' size={28} color={'#fff'} />
          </TouchableOpacity>
          <GestureDetector gesture={pinch}>
            <View style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height*0.8, alignItems: 'center', justifyContent: 'center' }}>
              {viewer.uri ? (
                <Animated.Image source={{ uri: viewer.uri }} style={[{ width: '90%', height: '90%' }, imageStyle]} resizeMode='contain' />
              ) : null}
            </View>
          </GestureDetector>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ card: { borderRadius: 12, padding: 12 } });