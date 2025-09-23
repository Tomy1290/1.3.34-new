import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';
import { markersForMonth } from '../src/utils/cycle';
import { LineChart } from 'react-native-gifted-charts';

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
  const lang = state.language;

  // entries markers from cycleLogs
  const hasLog = new Set<string>();
  for (const k of Object.keys(state.cycleLogs||{})) {
    const v = state.cycleLogs[k];
    if (!v) continue;
    if (typeof v.mood==='number' || typeof v.energy==='number' || typeof v.pain==='number' || typeof v.sleep==='number' || typeof v.flow==='number' || typeof v.sex==='boolean' || (v.notes && v.notes.trim().length>0)) {
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

  // Highlights across all attributes (last 6 months)
  const highlightItems = useMemo(() => {
    const now = new Date(); const six = new Date(); six.setMonth(six.getMonth()-6);
    const entries = Object.entries(state.cycleLogs||{})
      .map(([k,v]) => ({ key:k, date:new Date(k), v }))
      .filter(x => +x.date >= +six && +x.date <= +now);

    function score(v: any) {
      let s = 0;
      const flow = typeof v.flow==='number'? v.flow : 0; s += flow * 2;
      const pain = typeof v.pain==='number'? v.pain : 0; s += Math.max(0, pain - 5) * 2;
      const mood = typeof v.mood==='number'? v.mood : 0; s += mood <= 3 ? (4 - mood) * 2 : 0;
      const energy = typeof v.energy==='number'? v.energy : 0; s += energy <= 3 ? (4 - energy) * 1.5 : 0;
      const sleep = typeof v.sleep==='number'? v.sleep : 0; s += sleep <= 3 ? (4 - sleep) * 1.5 : 0;
      if (v.cramps) s += 2; if (v.headache) s += 2; if (v.nausea) s += 2;
      if (v.notes && v.notes.trim().length>=30) s += 2; else if (v.notes && v.notes.trim().length>0) s += 1;
      return s;
    }

    const arr = entries.map(e => ({ ...e, s: score(e.v) }))
      .filter(e => e.s > 0)
      .sort((a,b) => (b.s - a.s) || (+b.date - +a.date))
      .slice(0,5);

    return arr;
  }, [state.cycleLogs]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel='Zurück'>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{lang==='en' ? "Scarlett’s Health Tracking" : (lang==='pl'? 'Zdrowie Scarlett' : 'Scarletts Gesundheitstracking')}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{lang==='de'?'Zyklus':(lang==='pl'?'Cykl':'Cycle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Analysis – collapsible */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='stats-chart' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{lang==='de'?'Analyse':'Analysis'}</Text>
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
            <Text style={{ color: colors.muted, marginTop: 6 }}>Ø {lang==='de'?'Zykluslänge':'cycle length'} = {avgCycleLen}, Ø {lang==='de'?'Periodenlänge':'period length'} = {avgPeriodLen}. {lang==='de'?'Prognose basiert auf letzten Starts.':'Forecast based on recent cycle starts.'}</Text>
          ) : null}
          {expanded.analysis ? (
            <>
              {/* Last period */}
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{lang==='de'?'Letzte Periode':'Last period'}</Text>
                {last ? (
                  <Text style={{ color: colors.muted, marginTop: 4 }}>
                    {new Date(last.start).toLocaleDateString()} – {new Date(last.end as string).toLocaleDateString()} {lastPeriodLen?`(${lastPeriodLen} ${lang==='de'?'Tage':'days'})`:''}
                  </Text>
                ) : (
                  <Text style={{ color: colors.muted, marginTop: 4 }}>{lang==='de'?'Keine abgeschlossene Periode':'No completed period'}</Text>
                )}
              </View>
              {/* All periods avg + sparkline */}
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{lang==='de'?'Alle Perioden':'All periods'}</Text>
                <Text style={{ color: colors.muted, marginTop: 4 }}>Ø {lang==='de'?'Zykluslänge':'cycle length'}: {avgCycleLen} {lang==='de'?'Tage':'days'}</Text>
                <Text style={{ color: colors.muted, marginTop: 2 }}>Ø {lang==='de'?'Periodenlänge':'period length'}: {avgPeriodLen} {lang==='de'?'Tage':'days'}</Text>
                {sparkData.length > 1 ? (
                  <View style={{ marginTop: 6 }}>
                    <LineChart data={sparkData} height={50} initialSpacing={0} thickness={2} xAxisColor={'transparent'} yAxisColor={'transparent'} hideRules hideYAxisText hideDataPoints curved color={colors.primary} disableScroll areaChart hideAxes />
                    <Text style={{ color: colors.muted, marginTop: 4 }}>{lang==='de'?'Trend (letzte Zyklen)':'Trend (recent cycles)'}</Text>
                  </View>
                ) : null}
                {expectedNext ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Nächster Zyklus erwartet am':'Next cycle expected on'} {expectedNext.toLocaleDateString()}</Text>) : null}
              </View>
            </>
          ) : null}
        </View>

        {/* Calendar */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => setCursor(new Date(year, month-1, 1))} accessibilityLabel='Vorheriger Monat'>
              <Ionicons name='chevron-back' size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{new Date(year, month, 1).toLocaleDateString(lang==='de'?'de-DE':(lang==='pl'?'pl-PL':'en-US'), { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={() => setCursor(new Date(year, month+1, 1))} accessibilityLabel='Nächster Monat'>
              <Ionicons name='chevron-forward' size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <TouchableOpacity onPress={() => toggleHelp('calendar')}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {help.calendar ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Farben zeigen Periode/Fruchtbarkeit. Tippe auf einen Tag zum Eintrag.':'Colors indicate period/fertile days. Tap a day to log.'}</Text>) : null}
          {/* Weekday header (Mon start) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {[lang==='de'?['Mo','Di','Mi','Do','Fr','Sa','So']:(lang==='pl'?['Pn','Wt','Śr','Cz','Pt','So','Nd']:['Mo','Tu','We','Th','Fr','Sa','Su'])].flat().map((d, i) => (
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
                      <TouchableOpacity key={i} disabled={isFuture} style={{ width: `${100/7}%`, height: 44, alignItems: 'center', justifyContent: 'center', opacity: isFuture ? 0.5 : 1 }} onPress={() => !isFuture && router.push(`/cycle/${key}`)} accessibilityLabel={`Tag ${key}`} testID={`cycle-day-${key}`}>
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
              <Text style={{ color: colors.text, marginLeft: 6 }}>{lang==='de'?'Periode':'Period'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: `${colors.primary}33` }} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{lang==='de'?'Periode (bevorstehend)':'Period (upcoming)'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: colors.primary }} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{lang==='de'?'Fruchtbar':'Fertile'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary }} />
              <Text style={{ color: colors.text, marginLeft: 6 }}>{lang==='de'?'Erwarteter Start':'Expected start'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 6 }} />
              <Text style={{ color: colors.text }}>{lang==='de'?'Eisprung (kleiner Punkt)':'Ovulation (small dot)'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 18, height: 2, backgroundColor: colors.primary, marginRight: 6 }} />
              <Text style={{ color: colors.text }}>{lang==='de'?'Eintrag vorhanden':'Has entry'}</Text>
            </View>
          </View>
        </View>

        {/* History – last 12 cycles (collapsible) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='time' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{lang==='de'?'Historie (12 Perioden)':'History (12 cycles)'}</Text>
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
          {help.history ? (<Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Letzte 12 Zyklen mit Länge; laufende Zyklen sind markiert.':'Last 12 cycles with length; ongoing cycles marked.'}</Text>) : null}
          {expanded.history ? (
            state.cycles.length === 0 ? (
              <Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Keine Einträge.':'No entries.'}</Text>
            ) : (
              [...state.cycles].slice(-12).map((c, idx) => {
                const s = new Date(c.start); const e = c.end ? new Date(c.end) : undefined;
                const len = e ? Math.max(1, Math.round((+e - +s)/(24*60*60*1000))+1) : undefined;
                return (
                  <Text key={c.start+String(idx)} style={{ color: colors.muted, marginTop: idx===0?6:2 }}>
                    {s.toLocaleDateString()} {e ? `– ${e.toLocaleDateString()} (${len} ${lang==='de'?'Tage':'days'})` : `– ${lang==='de'?'laufend':'ongoing'}`}
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
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{lang==='de'?'Highlights':'Highlights'}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleExpanded('highlights')}>
              <Ionicons name={expanded.highlights?'chevron-up':'chevron-down'} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {expanded.highlights ? (
            highlightItems.length === 0 ? (
              <Text style={{ color: colors.muted, marginTop: 6 }}>{lang==='de'?'Keine Highlights':'No highlights'}</Text>
            ) : (
              <View style={{ marginTop: 6 }}>
                {highlightItems.map((it) => {
                  const v: any = it.v || {};
                  const dateLabel = new Date(it.key).toLocaleDateString(lang==='de'?'de-DE':(lang==='pl'?'pl-PL':'en-GB'));
                  const line = (label: string, value: string | number | undefined) => (value===undefined || value===null || value=== '') ? null : (
                    <Text style={{ color: colors.muted, marginTop: 2 }}>{label}: {value}</Text>
                  );
                  const bool = (label: string, on?: boolean) => on ? <Text style={{ color: colors.muted, marginTop: 2 }}>• {label}</Text> : null;
                  return (
                    <View key={it.key} style={{ borderTopWidth: 1, borderTopColor: `${colors.muted}33`, paddingTop: 8, marginTop: 8 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{dateLabel}</Text>
                      {/* Numbers */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                        {line(lang==='de'?'Periode':'Flow', typeof v.flow==='number'? v.flow : undefined)}
                        {line(lang==='de'?'Schmerz':'Pain', typeof v.pain==='number'? v.pain : undefined)}
                        {line(lang==='de'?'Stimmung':'Mood', typeof v.mood==='number'? v.mood : undefined)}
                        {line(lang==='de'?'Energie':'Energy', typeof v.energy==='number'? v.energy : undefined)}
                        {line(lang==='de'?'Schlaf':'Sleep', typeof v.sleep==='number'? v.sleep : undefined)}
                      </View>
                      {/* Toggles */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                        {bool(lang==='de'?'Krämpfe':'Cramps', v.cramps)}
                        {bool(lang==='de'?'Kopfschmerzen':'Headache', v.headache)}
                        {bool(lang==='de'?'Übelkeit':'Nausea', v.nausea)}
                        {bool('Sex', v.sex)}
                      </View>
                      {/* Notes */}
                      {v.notes ? <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={3}>{v.notes}</Text> : null}
                    </View>
                  );
                })}
              </View>
            )
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, appTitle: { fontSize: 14, fontWeight: '800' }, title: { fontSize: 12, fontWeight: '600' }, card: { borderRadius: 12, padding: 12 } });