import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';
import { markersForMonth } from '../src/utils/cycle';
import { LineChart } from 'react-native-gifted-charts';
import { useI18n } from '../src/i18n';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const days: Date[] = [];
  let d = new Date(first);
  while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
}

function dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

export default function CycleScreen() {
  const t = useI18n();
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);
  const [cursor, setCursor] = useState(new Date());
  const [help, setHelp] = useState<{[k:string]: boolean}>({});
  const [expanded, setExpanded] = useState<{analysis: boolean; history: boolean; highlights: boolean}>({ analysis: true, history: false, highlights: false });
  const toggleHelp = (k: string) => setHelp((h) => ({ ...h, [k]: !h[k] }));
  const toggleExpanded = (k: keyof typeof expanded) => setExpanded((e) => ({ ...e, [k]: !e[k] }));
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);
  const { period, upcomingPeriod, fertile, ovulation, expected, avgCycleLen, avgPeriodLen, expectedNext } = useMemo(() => markersForMonth(year, month, state.cycles), [year, month, state.cycles]);

  // entries markers from cycleLogs
  const hasLog = new Set<string>();
  for (const k of Object.keys(state.cycleLogs||{})) {
    const v = state.cycleLogs[k];
    if (!v) continue;
    if (typeof v.mood==='number' || typeof v.energy==='number' || typeof v.pain==='number' || typeof v.sleep==='number' || typeof v.flow==='number' || v.sex || (v.notes && v.notes.trim().length>0)) {
      hasLog.add(k);
    }
  }

  // Last and all periods analysis data
  const completed = useMemo(() => state.cycles.filter(c => c.start && c.end), [state.cycles]);
  const last = completed.length ? completed[completed.length - 1] : undefined;
  const lastPeriodLen = useMemo(() => {
    if (!last) return undefined;
    const s = new Date(last.start); const e = new Date(last.end as string);
    return Math.max(1, Math.round((+e - +s)/(24*60*60*1000)) + 1);
  }, [last]);
  const starts = useMemo(() => state.cycles.map(c => c.start).filter(Boolean).sort(), [state.cycles]);
  const cycleDiffs = useMemo(() => {
    const arr: number[] = [];
    for (let i=1;i<starts.length;i++){ const a = new Date(starts[i-1]); const b = new Date(starts[i]); const d = Math.round((+b-+a)/(24*60*60*1000)); if (d>0) arr.push(d); }
    return arr;
  }, [starts]);
  const sparkData = useMemo(() => cycleDiffs.slice(-12).map(v => ({ value: v })), [cycleDiffs]);

  const todayKey = dateKey(new Date());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel={t('common.back')}>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{t('common.appTitle')}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{t('cycle.title')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Analysis – collapsible */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='stats-chart' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.analysisTitle')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => toggleHelp('analysis')} style={{ paddingHorizontal: 8 }}>
                <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleExpanded('analysis')}>
                <Ionicons name={expanded.analysis?'chevron-up':'chevron-down'} size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>
          {help.analysis ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.analysisHelp', { avgCycleLen, avgPeriodLen })}</Text>
          ) : null}
          {expanded.analysis ? (
            <>
              {/* Last period */}
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('cycle.lastPeriodTitle')}</Text>
                {last ? (
                  <Text style={{ color: colors.muted, marginTop: 4 }}>
                    {new Date(last.start).toLocaleDateString()} – {new Date(last.end as string).toLocaleDateString()} {lastPeriodLen?`(${t('cycle.days', { count: lastPeriodLen })})`:''}
                  </Text>
                ) : (
                  <Text style={{ color: colors.muted, marginTop: 4 }}>{t('cycle.noCompletedPeriod')}</Text>
                )}
              </View>
              {/* All periods avg + sparkline */}
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('cycle.allPeriodsTitle')}</Text>
                <Text style={{ color: colors.muted, marginTop: 4 }}>{t('cycle.avgCycleLen')}: {avgCycleLen} {t('cycle.days', { count: 0 }).split(' ')[1]}</Text>
                <Text style={{ color: colors.muted, marginTop: 2 }}>{t('cycle.avgPeriodLen')}: {avgPeriodLen} {t('cycle.days', { count: 0 }).split(' ')[1]}</Text>
                {sparkData.length > 1 ? (
                  <View style={{ marginTop: 6 }}>
                    <LineChart data={sparkData} height={50} initialSpacing={0} thickness={2} xAxisColor={'transparent'} yAxisColor={'transparent'} hideRules hideYAxisText hideDataPoints curved color={colors.primary} disableScroll areaChart hideAxes />
                    <Text style={{ color: colors.muted, marginTop: 4 }}>{t('cycle.trendRecent')}</Text>
                  </View>
                ) : null}
                {expectedNext ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.expectedNextPrefix')} {expectedNext.toLocaleDateString()}</Text>) : null}
              </View>
            </>
          ) : null}
        </View>

        {/* Calendar */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => setCursor(new Date(year, month-1, 1))} accessibilityLabel={t('cycle.prevMonth')}>
              <Ionicons name='chevron-back' size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{new Date(year, month, 1).toLocaleDateString(state.language==='de'?'de-DE':(state.language==='pl'?'pl-PL':'en-US'), { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={() => setCursor(new Date(year, month+1, 1))} accessibilityLabel={t('cycle.nextMonth')}>
              <Ionicons name='chevron-forward' size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <TouchableOpacity onPress={() => toggleHelp('calendar')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.calendar ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.calendarHelp')}</Text>) : null}
          {/* Weekday header (Mon start) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {[state.language==='de'?['Mo','Di','Mi','Do','Fr','Sa','So']:(state.language==='pl'?['Pn','Wt','Śr','Cz','Pt','So','Nd']:['Mo','Tu','We','Th','Fr','Sa','Su'])].flat().map((d, i) => (
              <Text key={i} style={{ color: colors.muted, width: `${100/7}%`, textAlign: 'center' }}>{d}</Text>
            ))}
          </View>
          {/* Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {(() => {
              const first = new Date(year, month, 1);
              const pad = (first.getDay() + 6) % 7; // Monday first
              const blanks = Array.from({ length: pad });
              return (
                <>
                  {blanks.map((_, i) => (<View key={`b${i}`} style={{ width: `${100/7}%`, height: 44 }} />))}
                  {monthDays.map((d, i) => {
                    const key = dateKey(d);
                    const isPeriod = period.has(key);
                    const isUpcoming = upcomingPeriod.has(key);
                    const isFertile = fertile.has(key);
                    const isOv = ovulation.has(key);
                    const isExpected = expected.has(key);
                    const has = hasLog.has(key);
                    const isFuture = key > todayKey;
                    return (
                      <TouchableOpacity key={i} disabled={isFuture} style={{ width: `${100/7}%`, height: 44, alignItems: 'center', justifyContent: 'center', opacity: isFuture ? 0.5 : 1 }} onPress={() => !isFuture && router.push(`/cycle/${key}`)} accessibilityLabel={t('cycle.dayA11y', { key })} testID={`cycle-day-${key}`}>
                        <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: isPeriod ? colors.primary : (isUpcoming ? `${colors.primary}33` : (isFertile ? `${colors.primary}22` : 'transparent')),
                          borderWidth: isExpected ? 2 : (isFertile ? 1 : 0), borderColor: isExpected ? colors.primary : (isFertile ? colors.primary : 'transparent') }}>
                          <Text style={{ color: (isPeriod ? '#fff' : colors.text) }}>{d.getDate()}</Text>
                          {isOv ? <View style={{ position: 'absolute', right: 2, top: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: isPeriod ? '#fff' : colors.primary }} /> : null}
                          {has ? <View style={{ position: 'absolute', bottom: 3, width: 18, height: 2, backgroundColor: isPeriod ? '#fff' : colors.primary, borderRadius: 1 }} /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              );
            })()}
          </View>
          {/* Legend */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{t('cycle.legend.period')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: `${colors.primary}33` }} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{t('cycle.legend.upcoming')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: colors.primary }} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{t('cycle.legend.fertile')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary }} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{t('cycle.legend.expectedStart')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 6 }} />
              <Text style={{ color: colors.text }}>{t('cycle.legend.ovulation')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 18, height: 2, backgroundColor: colors.primary, marginRight: 6 }} />
              <Text style={{ color: colors.text }}>{t('cycle.legend.hasEntry')}</Text>
            </View>
          </View>
        </View>

        {/* History – last 12 cycles (collapsible) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='time' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.history12')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => toggleHelp('history')} style={{ paddingHorizontal: 8 }}>
                <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleExpanded('history')}>
                <Ionicons name={expanded.history?'chevron-up':'chevron-down'} size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>
          {help.history ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.historyHelp') || t('cycle.history12')}</Text>) : null}
          {expanded.history ? (
            state.cycles.length === 0 ? (
              <Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.noEntries')}</Text>
            ) : (
              [...state.cycles].slice(-12).map((c, idx) => {
                const s = new Date(c.start); const e = c.end ? new Date(c.end) : undefined;
                const len = e ? Math.max(1, Math.round((+e - +s)/(24*60*60*1000))+1) : undefined;
                return (
                  <Text key={c.start+String(idx)} style={{ color: colors.muted, marginTop: idx===0?6:2 }}>
                    {s.toLocaleDateString()} {e ? `– ${e.toLocaleDateString()} (${len} ${t('cycle.days', { count: len || 0 }).split(' ')[1]})` : `– ${t('cycle.ongoing')}`}
                  </Text>
                );
              })
            )
          ) : null}
        </View>

        {/* Highlights – top 5 intense days (last 6 months) with all attributes */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='flame' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('cycle.highlightsTitle')}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleExpanded('highlights')}>
              <Ionicons name={expanded.highlights?'chevron-up':'chevron-down'} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {expanded.highlights ? (
            (() => {
              const now = new Date(); const six = new Date(); six.setMonth(six.getMonth()-6);
              const entries = Object.entries(state.cycleLogs||{})
                .map(([k,v]) => ({ key:k, date:new Date(k), v }))
                .filter(x => +x.date >= +six && +x.date <= +now);

              function line(label: string, value: string | number | undefined) { return (value===undefined || value===null || value==='') ? null : (<Text style={{ color: colors.muted, marginTop: 2 }}>{label}: {value}</Text>); }
              function bool(label: string, on?: boolean) { return on ? <Text style={{ color: colors.muted, marginTop: 2 }}>• {label}</Text> : null; }

              const arr = entries.map(e => ({ ...e, s: (() => {
                const v: any = e.v || {}; let s = 0;
                // Period intensity
                const flow = typeof v.flow==='number'? v.flow : 0; s += flow * 2;
                // Pain & symptoms (primary negative drivers)
                const pain = typeof v.pain==='number'? v.pain : 0; s += Math.max(0, pain - 5) * 2;
                if (v.cramps) s += 2; if (v.headache) s += 2; if (v.nausea) s += 2;
                if (v.backPain) s += 1.5; if (v.breastTenderness) s += 1.2; if (v.waterRetention) s += 1; if (v.dizziness) s += 1.5;
                // Mood, energy, sleep low
                const mood = typeof v.mood==='number'? v.mood : 0; s += mood <= 3 ? (4 - mood) * 2 : 0;
                const energy = typeof v.energy==='number'? v.energy : 0; s += energy <= 3 ? (4 - energy) * 1.5 : 0;
                const sleep = typeof v.sleep==='number'? v.sleep : 0; s += sleep <= 3 ? (4 - sleep) * 1.5 : 0;
                // Stress high
                const stress = typeof v.stress==='number'? v.stress : 0; s += stress > 5 ? (stress - 5) * 1.5 : 0;
                // Appetite & cravings: extremes and highs
                const appetite = typeof v.appetite==='number'? v.appetite : 0; s += Math.abs(appetite - 5) * 0.5;
                const cravings = typeof v.cravings==='number'? v.cravings : 0; s += cravings > 5 ? (cravings - 5) * 1.0 : 0;
                // Focus low
                const focus = typeof v.focus==='number'? v.focus : 0; s += focus <= 3 ? (4 - focus) * 1.2 : 0;
                // Libido peaks (positive intensity but still a "highlight")
                const libido = typeof v.libido==='number'? v.libido : 0; s += libido >= 8 ? (libido - 7) * 0.8 : 0;
                // Notes length indicates noteworthy day
                if (v.notes && v.notes.trim().length>=30) s += 2; else if (v.notes && v.notes.trim().length>0) s += 1;
                return s;
              })() }))
                .filter(e => e.s > 0)
                .sort((a,b) => (b.s - a.s) || (+b.date - +a.date))
                .slice(0,5);

              if (arr.length === 0) return <Text style={{ color: colors.muted, marginTop: 6 }}>{t('cycle.noHighlights')}</Text>;

              return (
                <View style={{ marginTop: 6 }}>
                  {arr.map((it) => {
                    const v: any = it.v || {};
                    const dateLabel = new Date(it.key).toLocaleDateString(state.language==='de'?'de-DE':(state.language==='pl'?'pl-PL':'en-GB'));
                    return (
                      <View key={it.key} style={{ borderTopWidth: 1, borderTopColor: `${colors.muted}33`, paddingTop: 8, marginTop: 8 }}>
                        <Text style={{ color: colors.text, fontWeight: '700' }}>{dateLabel}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                          {line(t('cycle.fields.flow'), typeof v.flow==='number'? v.flow : undefined)}
                          {line(t('cycle.fields.pain'), typeof v.pain==='number'? v.pain : undefined)}
                          {line(t('cycle.fields.mood'), typeof v.mood==='number'? v.mood : undefined)}
                          {line(t('cycle.fields.energy'), typeof v.energy==='number'? v.energy : undefined)}
                          {line(t('cycle.fields.sleep'), typeof v.sleep==='number'? v.sleep : undefined)}
                          {line(t('cycle.stressTitle') || 'Stress', typeof v.stress==='number'? v.stress : undefined)}
                          {line(t('cycle.appetiteTitle') || 'Appetit', typeof v.appetite==='number'? v.appetite : undefined)}
                          {line(t('cycle.cravingsTitle') || 'Heißhunger', typeof v.cravings==='number'? v.cravings : undefined)}
                          {line(t('cycle.focusTitle') || 'Fokus', typeof v.focus==='number'? v.focus : undefined)}
                          {line(t('cycle.libidoTitle') || 'Libido', typeof v.libido==='number'? v.libido : undefined)}
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                          {bool(t('cycle.fields.cramps'), v.cramps)}
                          {bool(t('cycle.fields.headache'), v.headache)}
                          {bool(t('cycle.fields.nausea'), v.nausea)}
                          {bool(t('cycle.fields.sex'), v.sex)}
                          {bool(t('cycle.fields.backPain') || 'Rückenschmerzen', v.backPain)}
                          {bool(t('cycle.fields.breastTenderness') || 'Brustspannen', v.breastTenderness)}
                          {bool(t('cycle.fields.waterRetention') || 'Wassereinlagerungen', v.waterRetention)}
                          {bool(t('cycle.fields.dizziness') || 'Schwindel', v.dizziness)}
                        </View>
                        {v.notes ? <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={3}>{v.notes}</Text> : null}
                      </View>
                    );
                  })}
                </View>
              );
            })()
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, appTitle: { fontSize: 14, fontWeight: '800' }, title: { fontSize: 12, fontWeight: '600' }, card: { borderRadius: 12, padding: 12 } });