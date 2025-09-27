import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore, useLevel } from '../src/store/useStore';
import { LineChart } from 'react-native-gifted-charts';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useI18n } from '../src/i18n';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

function daysBetween(a: Date, b: Date) { return Math.round((+b - +a) / (1000*60*60*24)); }

export default function AnalysisScreen() {
  const router = useRouter();
  const state = useAppStore();
  const { level, xp } = useLevel();
  const colors = useThemeColors(state.theme);
  const t = useI18n();

  const weightArrAll = useMemo(() => Object.values(state.days).filter((d) => typeof d.weight === 'number').sort((a, b) => a.date.localeCompare(b.date)), [state.days]);

  const [range, setRange] = useState<'7'|'14'|'30'|'month'|'custom'>('14');
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const [help, setHelp] = useState<{[k:string]: boolean}>({});
  const toggleHelp = (k: string) => setHelp((h) => ({ ...h, [k]: !h[k] }));

  const weightArr = useMemo(() => {
    if (range === 'custom' && from && to) {
      return weightArrAll.filter(d => { const dt = new Date(d.date); return +dt >= +new Date(from.getFullYear(), from.getMonth(), from.getDate()) && +dt <= +new Date(to.getFullYear(), to.getMonth(), to.getDate()); });
    }
    if (range === 'month') {
      const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); const end = new Date(now.getFullYear(), now.getMonth()+1, 0);
      return weightArrAll.filter(d => { const dt = new Date(d.date); return +dt >= +start && +dt <= +end; });
    }
    const take = parseInt(range, 10);
    return weightArrAll.slice(-take);
  }, [weightArrAll, range, from, to]);

  const weightSeries = useMemo(() => weightArr.map((d) => ({ value: Number(d.weight) || 0 })), [weightArr]);
  const weightLabels = useMemo(() => weightArr.map((d, i) => {
    const dt = new Date(d.date);
    const label = `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}`;
    return i % 2 === 0 ? label : '';
  }), [weightArr]);

  const screenW = Dimensions.get('window').width;
  const chartWidth = Math.max(screenW - 32, weightSeries.length * 44);

  const lastForInsights = weightArr; // use current selection

  // BMI (from profile)
  const heightM = useMemo(() => {
    const cm = state.profile.heightCm;
    return cm && cm > 0 ? (cm / 100) : undefined;
  }, [state.profile.heightCm]);

  const lastWeight = useMemo(() => {
    const vals = Object.values(state.days).filter((d:any)=> typeof d.weight === 'number').sort((a:any,b:any)=> a.date.localeCompare(b.date));
    return vals.length ? Number((vals as any[])[vals.length-1].weight) : undefined;
  }, [state.days]);

  const bmi = useMemo(() => {
    if (!heightM || !lastWeight) return undefined;
    return lastWeight / (heightM * heightM);
  }, [heightM, lastWeight]);

  const bmiCategory = useMemo(() => {
    const v = bmi || 0;
    if (!bmi) return undefined;
    if (v < 18.5) return { label: 'Untergewicht', color: '#2196F3' } as const;
    if (v < 25) return { label: 'Normalgewicht', color: '#4CAF50' } as const;
    if (v < 30) return { label: 'Übergewicht', color: '#FFC107' } as const;
    return { label: 'Adipositas', color: '#F44336' } as const;
  }, [bmi]);

  // ===== Pro+++ computations =====
  const cycleHeat = useMemo(() => {
    const out: Record<number, { pain: number[]; energy: number[]; sleep: number[]; cramps: number; headache: number; nausea: number; count: number }> = {};
    const cycles = state.cycles || [];
    const logs = state.cycleLogs || {};
    const sortedStarts = cycles.map(c => new Date(c.start)).sort((a,b)=>+a-+b);
    function findCycleStart(dt: Date) {
      let sel: Date | null = null;
      for (const s of sortedStarts) { if (+s <= +dt) sel = s; else break; }
      return sel;
    }
    for (const [dateKey, log] of Object.entries(logs)) {
      const dt = new Date(dateKey);
      const start = findCycleStart(dt);
      if (!start) continue;
      const idx = daysBetween(start, dt); if (idx<0 || idx>35) continue;
      if (!out[idx]) out[idx] = { pain: [], energy: [], sleep: [], cramps: 0, headache: 0, nausea: 0, count: 0 };
      if (typeof (log as any).pain==='number') out[idx].pain.push((log as any).pain);
      if (typeof (log as any).energy==='number') out[idx].energy.push((log as any).energy);
      if (typeof (log as any).sleep==='number') out[idx].sleep.push((log as any).sleep);
      if ((log as any).cramps) out[idx].cramps += 1;
      if ((log as any).headache) out[idx].headache += 1;
      if ((log as any).nausea) out[idx].nausea += 1;
      out[idx].count += 1;
    }
    return out;
  }, [state.cycles, state.cycleLogs]);

  function avg(xs: number[]) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }

  const correlations = useMemo(() => {
    const days = Object.values(state.days).sort((a,b)=>a.date.localeCompare(b.date));
    const logs = state.cycleLogs || {};
    const waterOnHeadache = avg(Object.keys(logs).filter(k => (logs as any)[k]?.headache).map(k => (state.days as any)[k]?.drinks?.water ?? 0));
    const waterOnNoHeadache = avg(Object.keys(logs).filter(k => !(logs as any)[k]?.headache).map(k => (state.days as any)[k]?.drinks?.water ?? 0));
    const energyOnSport = avg((days as any[]).filter((d:any)=>d.drinks?.sport).map((d:any) => ((logs as any)[d.date]?.energy ?? 0)));
    const energyNoSport = avg((days as any[]).filter((d:any)=>!d.drinks?.sport).map((d:any) => ((logs as any)[d.date]?.energy ?? 0)));
    const sleepOnHighCoffee = avg((days as any[]).filter((d:any) => (d.drinks?.coffee ?? 0) >= 6).map((d:any) => ((logs as any)[d.date]?.sleep ?? 0)));
    const sleepOnLowCoffee = avg((days as any[]).filter((d:any) => (d.drinks?.coffee ?? 0) < 6).map((d:any) => ((logs as any)[d.date]?.sleep ?? 0)));
    const weightDays = (days as any[]).filter((d:any)=>typeof d.weight==='number');
    let weightChangeLowSleep = 0, nLow=0, weightChangeHighSleep=0, nHigh=0;
    for (let i=1;i<weightDays.length;i++) {
      const prev = weightDays[i-1]; const cur = weightDays[i];
      const sl = (logs as any)[cur.date]?.sleep ?? 0;
      const diff = Math.abs((cur.weight||0) - (prev.weight||0));
      if (sl <= 4) { weightChangeLowSleep += diff; nLow++; } else if (sl >= 7) { weightChangeHighSleep += diff; nHigh++; }
    }
    return {
      waterOnHeadache, waterOnNoHeadache,
      energyOnSport, energyNoSport,
      sleepOnHighCoffee, sleepOnLowCoffee,
      weightDeltaLowSleep: nLow? (weightChangeLowSleep/nLow):0,
      weightDeltaHighSleep: nHigh? (weightChangeHighSleep/nHigh):0,
    };
  }, [state.days, state.cycleLogs]);

  function fmtDiff(n: number) {
    const s = Math.abs(n).toFixed(1).replace(/\.0$/, '');
    if (n > 0) return { text: `↑ +${s}`, color: '#E53935' };
    if (n < 0) return { text: `↓ -${s}`, color: '#2E7D32' };
    return { text: '→ ±0', color: colors.muted };
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 12 }]}> 
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} style={{ padding: 8 }}>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='star' size={16} color={colors.primary} />
            <Text style={[styles.appTitle, { color: colors.text, marginHorizontal: 6 }]}>{t('common.appTitle')}</Text>
            <Ionicons name='star' size={16} color={colors.primary} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '70%', alignSelf: 'center', marginTop: 6 }}>
            <Text style={{ color: colors.text }}>{t('common.level')} {level}</Text>
            <Text style={{ color: colors.text }}>{xp} {t('common.xp')}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Gewicht */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='fitness' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('analysis.weight')}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleHelp('weight')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.weight ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{t('analysis.weight_help')}</Text>) : null}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity onPress={() => setRange('7')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: range==='7'?colors.primary:'transparent' }]}><Text style={{ color: range==='7'?'#fff':colors.text }}>{t('analysis.range7')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setRange('14')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: range==='14'?colors.primary:'transparent' }]}><Text style={{ color: range==='14'?'#fff':colors.text }}>{t('analysis.range14')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setRange('30')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: range==='30'?colors.primary:'transparent' }]}><Text style={{ color: range==='30'?'#fff':colors.text }}>{t('analysis.range30')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setRange('month')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: range==='month'?colors.primary:'transparent' }]}><Text style={{ color: range==='month'?'#fff':colors.text }}>{t('analysis.month')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setRange('custom')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: range==='custom'?colors.primary:'transparent' }]}><Text style={{ color: range==='custom'?'#fff':colors.text }}>{t('analysis.custom')}</Text></TouchableOpacity>
            {range==='custom' ? (
              <>
                <TouchableOpacity onPress={() => setShowFrom(true)} style={[styles.badge, { borderColor: colors.muted }]}>
                  <Text style={{ color: colors.text }}>{t('analysis.from')}: {from?from.toLocaleDateString():"--"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowTo(true)} style={[styles.badge, { borderColor: colors.muted }]}>
                  <Text style={{ color: colors.text }}>{t('analysis.to')}: {to?to.toLocaleDateString():"--"}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
          {showFrom && (<DateTimePicker value={from || new Date()} mode='date' onChange={(e, d) => { setShowFrom(false); if (d) setFrom(d); }} />)}
          {showTo && (<DateTimePicker value={to || new Date()} mode='date' onChange={(e, d) => { setShowTo(false); if (d) setTo(d); }} />)}
          {weightSeries.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ width: chartWidth, height: 260, justifyContent: 'center' }}>
                <LineChart data={weightSeries} color={colors.primary} thickness={2} hideRules={false} showYAxisText yAxisTextStyle={{ color: colors.muted }} yAxisColor={colors.muted} xAxisColor={colors.muted} noOfSections={4} areaChart startFillColor={colors.primary} endFillColor={colors.primary} startOpacity={0.15} endOpacity={0.01} initialSpacing={12} spacing={32} xAxisLabelTexts={weightLabels} xAxisLabelTextStyle={{ color: colors.muted, fontSize: 10 }} xAxisThickness={1} />
              </View>
            </ScrollView>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('common.tooFewData')}</Text>
          )}
        </View>

        {/* BMI zwischen Gewichtsanalyse und Premium Insights */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='scale' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('analysis.bmiTitle')}</Text>
            </View>
          </View>
          {(!heightM || !lastWeight) ? (
            <Text style={{ color: colors.muted, marginTop: 8 }}>{t('common.pleaseEnterSizeAndWeight')}</Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: colors.text }}>{t('analysis.lastWeightAndHeight', { weight: Number(lastWeight).toFixed(1), heightCm: Math.round((heightM||0)*100) })}</Text>
              <Text style={{ color: colors.text, marginTop: 2 }}>BMI: {bmi?.toFixed(1)} {bmiCategory?`(${bmiCategory.label})`:''}</Text>
              <View style={{ height: 10, backgroundColor: colors.bg, borderRadius: 5, overflow: 'hidden', marginTop: 8 }}>
                <View style={{ width: '100%', height: '100%', flexDirection: 'row' }}>
                  <View style={{ flex: 185, backgroundColor: '#2196F3' }} />
                  <View style={{ flex: 250-185, backgroundColor: '#4CAF50' }} />
                  <View style={{ flex: 300-250, backgroundColor: '#FFC107' }} />
                  <View style={{ flex: 400-300, backgroundColor: '#F44336' }} />
                </View>
              </View>
              {bmi ? (
                <View style={{ position: 'relative', height: 16, marginTop: 2 }}>
                  <View style={{ position: 'absolute', left: Math.min(100, Math.max(0, (bmi/40)*100)) + '%', top: 0 }}>
                    <Ionicons name='caret-down' size={16} color={bmiCategory?.color || colors.primary} />
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Premium Insights */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='sparkles' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('analysis.insights')}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleHelp('insights')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.insights ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{t('analysis.insights_help')}</Text>) : null}
          <View style={{ marginTop: 8 }}>
            {lastForInsights.length < 1 ? (<Text style={{ color: colors.muted }}>{t('common.tooFewData')}</Text>) : (
              lastForInsights.map((d, i) => {
                const dt = new Date(d.date);
                const label = `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}`;
                const next = lastForInsights[i+1] as any;
                const diff = i===lastForInsights.length-1 ? 0 : ((Number(next?.weight)||0) - (Number((d as any).weight)||0));
                const { text: diffText, color } = fmtDiff(diff);
                return (
                  <View key={(d as any).date} style={{ paddingVertical: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: colors.muted, width: 64 }}>{label}</Text>
                      <Text style={{ color: colors.text, width: 80, textAlign: 'right' }}>{Number((d as any).weight).toFixed(1)} {t('common.kg')}</Text>
                    </View>
                    {i<lastForInsights.length-1 ? (
                      <Text style={{ marginLeft: 64, width: 80, textAlign: 'right', color, fontWeight: '700' }}>{diffText}</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* KI Pro+++ */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='pulse' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('analysis.aiultra')}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleHelp('aiultra')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.aiultra ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{t('analysis.aiultra_help')}</Text>) : null}

          {/* Heatmap Schmerz (ø pain) über Zyklustage 0..28 */}
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{t('analysis.heatmapPain')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {Array.from({length: 29}).map((_,i) => {
                const cell = (cycleHeat as any)[i]; const p = cell ? avg(cell.pain) : 0; const intensity = Math.min(1, p/10);
                const bg = `rgba(216,27,96,${(0.1 + intensity*0.9).toFixed(2)})`;
                return (
                  <View key={i} style={{ width: 20, height: 20, borderRadius: 3, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#fff' }}>{i}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Korrelationen */}
          <View style={{ marginTop: 12, gap: 6 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{t('analysis.correlations')}</Text>
            <Text style={{ color: colors.muted }}>{t('analysis.corr.waterHeadache', { h: correlations.waterOnHeadache.toFixed(2), no: correlations.waterOnNoHeadache.toFixed(2) })}</Text>
            <Text style={{ color: colors.muted }}>{t('analysis.corr.energySport', { with: correlations.energyOnSport.toFixed(2), without: correlations.energyNoSport.toFixed(2) })}</Text>
            <Text style={{ color: colors.muted }}>{t('analysis.corr.sleepCoffee', { high: correlations.sleepOnHighCoffee.toFixed(2), low: correlations.sleepOnLowCoffee.toFixed(2) })}</Text>
            <Text style={{ color: colors.muted }}>{t('analysis.corr.weightDeltaSleep', { low: correlations.weightDeltaLowSleep.toFixed(2), high: correlations.weightDeltaHighSleep.toFixed(2) })}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 12, fontWeight: '600' }, appTitle: { fontSize: 14, fontWeight: '800' }, card: { borderRadius: 12, padding: 12 }, badge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 } });