import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';
import { LineChart } from 'react-native-gifted-charts';
import { toKey } from '../src/utils/date';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useI18n } from '../src/i18n';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

function daysBetween(a: Date, b: Date) { return Math.max(1, Math.round((+b - +a) / (1000*60*60*24))); }

export default function GoalsScreen() {
  const t = useI18n();
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);
  const [info, setInfo] = useState(false);

  const weights = useMemo(() => Object.values(state.days).filter((d:any)=> typeof d.weight==='number').sort((a:any,b:any)=> a.date.localeCompare(b.date)), [state.days]);
  const lastW = useMemo(()=> weights.length? Number((weights[weights.length-1] as any).weight): undefined, [weights]);
  const firstW = useMemo(()=> weights.length? Number((weights[0] as any).weight): undefined, [weights]);
  const firstDate = useMemo(()=> weights.length? new Date((weights[0] as any).date): undefined, [weights]);

  const [targetWInput, setTargetWInput] = useState(state.goal?.targetWeight ? String(state.goal.targetWeight) : (lastW?String(lastW):''));
  const [targetDateInput, setTargetDateInput] = useState(state.goal?.targetDate || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const selectedTargetDate = useMemo(() => { try { return targetDateInput ? new Date(targetDateInput) : null; } catch { return null; } }, [targetDateInput]);

  const effectiveStartDateKey = state.goal?.startDate || (firstDate ? toKey(firstDate) : toKey(new Date()));
  const effectiveStartDate = useMemo(()=> { const [y,m,d] = effectiveStartDateKey.split('-').map(n=>parseInt(n,10)); return new Date(y, m-1, d); }, [effectiveStartDateKey]);
  const effectiveStartWeight = state.goal?.startWeight ?? firstW ?? lastW ?? 0;

  const planVsActual = useMemo(() => {
    if (!effectiveStartWeight || !effectiveStartDate || !targetDateInput || !lastW) return null;
    const targetDate = new Date(targetDateInput);
    if (isNaN(+targetDate)) return null;
    const totalDays = daysBetween(effectiveStartDate, targetDate);
    const elapsed = daysBetween(effectiveStartDate, new Date());
    const ratio = Math.min(1, Math.max(0, elapsed/totalDays));
    const plannedToday = effectiveStartWeight + (Number(targetWInput||effectiveStartWeight) - effectiveStartWeight) * ratio;
    const delta = lastW - plannedToday;
    return { plannedToday, actual: lastW, delta };
  }, [effectiveStartWeight, effectiveStartDate, targetDateInput, lastW, targetWInput]);

  // Pace 7d and trend/ETA
  const metrics = useMemo(() => {
    if (weights.length < 2) return { pace: 0, eta: null as Date|null, trend: '—', plateau: false };
    const map: Record<string, number> = {}; (weights as any[]).forEach((w:any)=>{ map[w.date]=Number(w.weight)||0; });
    const today = weights[weights.length-1] as any;
    const d7 = new Date(today.date); d7.setDate(d7.getDate()-7);
    let refKey = toKey(d7);
    let ref = map[refKey];
    // find nearest within 3 days back if exact missing
    if (typeof ref !== 'number') {
      for (let k=1;k<=3;k++) { const cand = new Date(d7); cand.setDate(cand.getDate()-k); const key = toKey(cand); if (typeof map[key]==='number') { ref = map[key]; break; } }
    }
    let pace = 0; // kg/day
    if (typeof ref === 'number') {
      const days = daysBetween(new Date(refKey), new Date(today.date));
      if (days>0) pace = (Number(today.weight)-ref)/days;
    } else {
      // fallback: first vs last of last 7 entries
      const slice = (weights as any[]).slice(-7);
      if (slice.length>=2) {
        const first = Number(slice[0].weight); const last = Number(slice[slice.length-1].weight);
        const days = daysBetween(new Date(slice[0].date), new Date(slice[slice.length-1].date));
        pace = days>0 ? (last-first)/days : 0;
      }
    }
    // trend simple
    const lastN = (weights as any[]).slice(-10);
    const change = Number(lastN[lastN.length-1].weight) - Number(lastN[0].weight);
    const plateau = Math.abs(change) < 0.5;
    const trend = pace < -0.02 ? 'fallend' : (pace > 0.02 ? 'steigend' : 'stabil');

    // ETA
    let eta: Date|null = null;
    const target = Number(targetWInput||0);
    const last = Number(today.weight);
    if (target && pace) {
      const towardLoss = target < last && pace < 0; // losing and moving down
      const towardGain = target > last && pace > 0; // gaining and moving up
      if (towardLoss || towardGain) {
        const daysRemain = Math.abs((target - last) / pace);
        if (isFinite(daysRemain) && daysRemain < 365*5) {
          eta = new Date(); eta.setDate(eta.getDate() + Math.round(daysRemain));
        }
      }
    }
    return { pace, trend, plateau, eta };
  }, [weights, targetWInput]);

  const bmi = useMemo(() => {
    const h = state.profile.heightCm ? state.profile.heightCm/100 : undefined;
    if (!h || !lastW) return undefined;
    return lastW / (h*h);
  }, [state.profile.heightCm, lastW]);

  // ===== EWMA (glättung) + Konfidenzband (1σ) =====
  const ewma = useMemo(() => {
    try {
      if (weights.length < 2) return null;
      const alpha = 0.3;
      const smoothed: { date: string; value: number }[] = [];
      let prev = Number((weights[0] as any).weight) || 0;
      smoothed.push({ date: (weights[0] as any).date, value: prev });
      for (let i=1;i<weights.length;i++) {
        const v = Number((weights[i] as any).weight) || prev;
        const s = alpha * v + (1 - alpha) * prev;
        smoothed.push({ date: (weights[i] as any).date, value: s });
        prev = s;
      }
      // residual std dev
      const residuals = weights.map((w:any, i:number) => (Number(w.weight) || 0) - (smoothed[i]?.value || 0));
      const mean = residuals.reduce((a,b)=>a+b,0) / residuals.length;
      const varr = residuals.reduce((a,b)=>a + Math.pow(b-mean,2),0) / Math.max(1, residuals.length-1);
      const sigma = Math.sqrt(Math.max(0, varr));
      // slope per day from last 7 smoothed points
      const take = smoothed.slice(-7);
      let slope = 0;
      if (take.length >= 2) {
        const first = take[0]; const last = take[take.length-1];
        const days = daysBetween(new Date(first.date), new Date(last.date));
        slope = days>0 ? (last.value - first.value)/days : 0;
      }
      return { smoothed, sigma, slope };
    } catch { return null; }
  }, [weights]);

  const tips = useMemo(() => {
    const list: string[] = [];
    const pace = metrics.pace; // kg/day
    const today = new Date();
    const targetDate = new Date(targetDateInput || '');
    const last = lastW || 0;
    const target = parseFloat((targetWInput||'').replace(',','.'));
    if (!isNaN(+targetDate) && target && last) {
      const daysRem = Math.max(1, Math.round((+targetDate - +today)/(1000*60*60*24)));
      const predictedAtTargetDate = last + pace * daysRem;
      const diffToTarget = predictedAtTargetDate - target;
      const requiredDaily = (target - last) / daysRem; // kg/day required
      if (Math.abs(diffToTarget) <= 0.5) {
        list.push(t('goals.tips.onCourse'));
      } else if ((pace <= 0 && requiredDaily <= pace) || (pace >= 0 && requiredDaily >= pace)) {
        // pace is strong enough
        list.push(t('goals.tips.paceOk'));
      } else {
        // propose realistic goal or new date
        const neededDays = pace !== 0 ? Math.round((target - last) / pace) : Infinity;
        if (isFinite(neededDays) && neededDays > daysRem) {
          const newDate = new Date(); newDate.setDate(newDate.getDate() + neededDays);
          list.push(t('goals.tips.trendNotEnoughDate', { date: newDate.toLocaleDateString() }));
        } else {
          const realisticTarget = Number(predictedAtTargetDate.toFixed(1));
          list.push(t('goals.tips.realisticTarget', { date: targetDate.toLocaleDateString(), target: realisticTarget }));
        }
        list.push(t('goals.tips.neededDaily', { required: requiredDaily.toFixed(3), pace: pace.toFixed(3) }));
      }
    }

    const plateau = metrics.plateau;
    const waterAvg = (() => {
      const days = Object.values(state.days);
      const last7 = (days as any[]).sort((a:any,b:any)=> a.date.localeCompare(b.date)).slice(-7);
      if (last7.length===0) return 0; return last7.reduce((acc:any,d:any)=> acc + (d.drinks?.water||0), 0) / last7.length;
    })();
    const sportDays7 = (()=>{
      const days = (Object.values(state.days) as any[]).sort((a:any,b:any)=> a.date.localeCompare(b.date)).slice(-7);
      return days.filter((d:any)=> d.drinks?.sport).length;
    })();
    if (plateau) list.push(t('goals.tips.plateau'));
    if (pace < -0.25) list.push(t('goals.tips.fastLoss'));
    if (waterAvg < 3) list.push(t('goals.tips.moreWater'));
    if (sportDays7 < 2) list.push(t('goals.tips.moreExercise'));
    if (list.length===0) list.push(t('goals.tips.keepGoing'));
    return list.slice(0,5);
  }, [metrics, state.days, targetDateInput, targetWInput, lastW, t]);

  function saveGoal() {
    const tw = parseFloat((targetWInput||'').replace(',','.'));
    if (!tw || !targetDateInput) return;
    const startW = firstW || (lastW||tw);
    const startDate = toKey(new Date());
    state.setGoal({ targetWeight: tw, targetDate: targetDateInput, startWeight: startW, active: true, startDate });
  }

  // ===== Verlauf: History (Soll vs Ist bis heute) =====
  const chartHist = useMemo(() => {
    try {
      if (!effectiveStartDate || !effectiveStartWeight || !targetDateInput) return null;
      const targetDate = new Date(targetDateInput);
      if (isNaN(+targetDate)) return null;
      const start = new Date(effectiveStartDate.getFullYear(), effectiveStartDate.getMonth(), effectiveStartDate.getDate());
      const today = new Date(); const todayKey = toKey(today);
      const totalDaysAll = daysBetween(start, targetDate);
      const totalDaysHist = Math.max(1, Math.min(totalDaysAll, daysBetween(start, today)));
      const weightMap: Record<string, number> = {}; for (const d of weights as any[]) weightMap[d.date] = Number(d.weight)||0;
      const screenW = Dimensions.get('window').width; const chartWidth = screenW - 32; const minSpacing = 22; const maxPoints = Math.max(6, Math.floor(chartWidth / minSpacing));
      let step = Math.max(1, Math.ceil(totalDaysHist / maxPoints));
      const dates: Date[] = []; const addDate = (d: Date) => { const k = toKey(d); if (!dates.find(x=>toKey(x)===k)) dates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate())); };
      for (let i=0;i<=totalDaysHist;i+=step) { const di = new Date(start); di.setDate(start.getDate()+i); addDate(di); }
      addDate(today);
      dates.sort((a,b)=> +a - +b);
      const labelEvery = Math.max(1, Math.ceil(dates.length / 6));
      const labels: string[] = [];
      const dateKeys: string[] = [];
      const targetW = Number((targetWInput||effectiveStartWeight));
      const planned: {value:number}[] = [];
      const actual: {value:number}[] = [];
      let lastKnown = effectiveStartWeight;
      dates.forEach((d, idx) => {
        const k = toKey(d); dateKeys.push(k);
        if (typeof weightMap[k] === 'number') lastKnown = weightMap[k];
        const dayPos = Math.min(totalDaysAll, Math.max(0, daysBetween(start, d)));
        const plannedVal = effectiveStartWeight + (targetW - effectiveStartWeight) * (dayPos / totalDaysAll);
        const isToday = k === todayKey;
        planned.push({ value: plannedVal });
        actual.push({ value: lastKnown, ...(isToday ? { customDataPoint: () => (<View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#fff' }} />) } : {}) });
        const dt = d; const lbl = `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}`;
        if (idx % labelEvery === 0 || isToday || idx===dates.length-1 || idx===0) labels.push(lbl); else labels.push('');
      });
      const spacing = Math.max(12, Math.floor((chartWidth - 24) / Math.max(1, dates.length-1)));
      return { planned, actual, labels, spacing, dateKeys };
    } catch { return null; }
  }, [effectiveStartDate, effectiveStartWeight, targetDateInput, targetWInput, weights, state.days, state.theme]);

  // ===== Prognose ab heute: Erwartet (EWMA) vs Soll =====
  const chartFuture = useMemo(() => {
    try {
      if (!effectiveStartDate || !effectiveStartWeight || !targetDateInput || !lastW) return null;
      const targetDate = new Date(targetDateInput); if (isNaN(+targetDate)) return null;
      const today = new Date(); const todayKey = toKey(today);
      const lastEntryKey = (weights as any[]).map(w=>w.date).slice(-1)[0] || todayKey;
      const lastEntryDate = new Date(lastEntryKey);
      const slope = ewma?.slope ?? metrics.pace ?? 0;
      const sigma = ewma?.sigma ?? 0;
      const totalDaysFuture = Math.max(1, daysBetween(today, targetDate));
      const screenW = Dimensions.get('window').width; const chartWidth = screenW - 32; const minSpacing = 22; const maxPoints = Math.max(6, Math.floor(chartWidth / minSpacing));
      let step = Math.max(1, Math.ceil(totalDaysFuture / maxPoints));
      const dates: Date[] = []; const addDate = (d: Date) => { const k = toKey(d); if (!dates.find(x=>toKey(x)===k)) dates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate())); };
      for (let i=0;i<=totalDaysFuture;i+=step) { const di = new Date(today); di.setDate(today.getDate()+i); addDate(di); }
      addDate(targetDate);
      dates.sort((a,b)=> +a - +b);
      const labels: string[] = []; const labelEvery = Math.max(1, Math.ceil(dates.length/6));
      const planned: {value:number}[] = []; const expected: {value:number}[] = []; const upper: {value:number}[] = [];
      const targetW = Number((targetWInput||effectiveStartWeight));
      const totalDaysAll = Math.max(1, daysBetween(effectiveStartDate, targetDate));
      const dateKeys: string[] = [];
      dates.forEach((d, idx)=>{
        const k = toKey(d); dateKeys.push(k);
        const dayPosAll = Math.min(totalDaysAll, Math.max(0, daysBetween(effectiveStartDate, d)));
        const p = effectiveStartWeight + (targetW - effectiveStartWeight) * (dayPosAll / totalDaysAll);
        planned.push({ value: p });
        const dayFromLast = Math.max(0, daysBetween(lastEntryDate, d));
        const exp = lastW + slope * dayFromLast;
        expected.push({ value: exp });
        upper.push({ value: exp + 1.0 * sigma });
        const lbl = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
        labels.push(idx % labelEvery === 0 || idx===0 || idx===dates.length-1 ? lbl : '');
      });
      const spacing = Math.max(12, Math.floor((chartWidth - 24) / Math.max(1, dates.length-1)));
      return { planned, expected, upper, labels, spacing, dateKeys, sigma };
    } catch { return null; }
  }, [effectiveStartDate, effectiveStartWeight, targetDateInput, targetWInput, weights, metrics.pace, lastW, ewma, state.theme]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ backgroundColor: colors.card, paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel={t('common.back')}>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='star' size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '800', marginHorizontal: 6 }}>{t('goals.title')}</Text>
            <Ionicons name='star' size={16} color={colors.primary} />
          </View>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{t('goals.subtitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Info */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='information-circle' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('goals.infoTitle')}</Text>
            </View>
            <TouchableOpacity onPress={()=> setInfo(v=>!v)}>
              <Ionicons name='information-circle-outline' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {info ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>
              {t('goals.infoText')}
            </Text>
          ) : null}
        </View>

        {/* Goal form */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='flag' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('goals.goalFormTitle')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: colors.text, width: 120 }}>{t('goals.targetWeight')}</Text>
            <TextInput value={targetWInput} onChangeText={setTargetWInput} keyboardType='decimal-pad' placeholder={t('goals.targetWeightPlaceholder')} placeholderTextColor={colors.muted} style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, color: colors.text }} />
            <Text style={{ color: colors.muted, marginLeft: 8 }}>{t('common.kg')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: colors.text, width: 120 }}>{t('goals.targetDate')}</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ flex: 1, borderWidth: 1, borderColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text }}>{selectedTargetDate ? selectedTargetDate.toLocaleDateString() : t('goals.pickDate')}</Text>
              <Ionicons name='calendar' size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {showDatePicker ? (
            <DateTimePicker
              value={selectedTargetDate || new Date()}
              mode='date'
              display='calendar'
              onChange={(e, d) => { setShowDatePicker(false); if (d) setTargetDateInput(toKey(d)); }}
            />
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            {state.goal ? (
              <TouchableOpacity onPress={()=> state.removeGoal()} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.muted }}>
                <Text style={{ color: colors.text }}>{t('goals.remove')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={saveGoal} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary }}>
              <Text style={{ color: '#fff' }}>{t('goals.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BMI block (wie Profil) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='scale' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('goals.bmiTitle')}</Text>
            </View>
          </View>
          {(!state.profile.heightCm || !lastW) ? (
            <Text style={{ color: colors.muted, marginTop: 8 }}>{t('goals.enterHeightAndWeight')}</Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: colors.text }}>{t('analysis.lastWeightAndHeight', { weight: lastW?.toFixed(1), heightCm: state.profile.heightCm })}</Text>
              <Text style={{ color: colors.text, marginTop: 2 }}>BMI: {bmi?.toFixed(1)}</Text>
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
                  <View style={{ position: 'absolute', left: Math.min(100, Math.max(0, (bmi/40)*100)) + '%' , top: 0 }}>
                    <Ionicons name='caret-down' size={16} color={colors.primary} />
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Plan vs. Ist (heutiger Vergleich) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='stats-chart' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('goals.planVsActual')}</Text>
          </View>
          {!planVsActual ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('goals.notEnoughData')}</Text>
          ) : (
            <View style={{ marginTop: 6 }}>
              <Text style={{ color: colors.muted }}>{t('goals.plannedToday')}: {planVsActual.plannedToday.toFixed(1)} {t('common.kg')}</Text>
              <Text style={{ color: colors.muted }}>{t('goals.actual')}: {planVsActual.actual.toFixed(1)} {t('common.kg')} ({planVsActual.delta>=0?'+':''}{planVsActual.delta.toFixed(1)} {t('common.kg')})</Text>
              <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
                <View style={{ width: `${Math.min(100, Math.max(0, (planVsActual.actual - (state.goal?.targetWeight||planVsActual.actual)) / ((effectiveStartWeight||planVsActual.actual) - (state.goal?.targetWeight||planVsActual.actual) || 1) * 100))}%`, height: 8, backgroundColor: colors.primary }} />
              </View>
            </View>
          )}
        </View>

        {/* Verlauf (Soll vs. Ist – Ist nur bis heute) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='trending-down' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('goals.historyTitle')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 10, height: 3, backgroundColor: '#2bb673', marginRight: 6 }} />
                <Text style={{ color: colors.muted }}>{t('goals.plannedLabel')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 10, height: 3, backgroundColor: colors.primary, marginRight: 6 }} />
                <Text style={{ color: colors.muted }}>{t('goals.actual')}</Text>
              </View>
            </View>
          </View>
          {!chartHist ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('goals.needData')}</Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              <LineChart
                data={chartHist.actual}
                data2={chartHist.planned}
                color={colors.primary}
                color2={'#2bb673'}
                thickness={2}
                thickness2={2}
                showYAxisText
                yAxisTextStyle={{ color: colors.muted }}
                yAxisColor={colors.muted}
                xAxisColor={colors.muted}
                noOfSections={4}
                hideRules={false}
                initialSpacing={8}
                spacing={chartHist.spacing}
                xAxisLabelTexts={chartHist.labels}
                xAxisLabelTextStyle={{ color: colors.muted, fontSize: 10 }}
                xAxisThickness={1}
                focusEnabled
                showDataPointOnPress
                pointerConfig={{
                  activatePointersOnLongPress: true,
                  pointerStripHeight: 200,
                  pointerStripColor: colors.muted,
                  pointerStripWidth: 1,
                  pointerColor: colors.muted,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelComponent: (items) => {
                    try {
                      const idx = (items && items[0] && typeof items[0].index === 'number') ? items[0].index : 0;
                      const dateKey = chartHist.dateKeys[idx] || '';
                      const dt = dateKey ? new Date(dateKey) : null;
                      const label = dt ? `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}` : '';
                      const ist = items?.[0]?.value ?? undefined;
                      const soll = items?.[1]?.value ?? undefined;
                      return (
                        <View style={{ backgroundColor: colors.card, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.muted, minWidth: 140 }}>
                          <Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <View style={{ width: 10, height: 3, backgroundColor: colors.primary, marginRight: 6 }} />
                            <Text style={{ color: colors.text }}>{t('goals.actual')}: {typeof ist==='number'? ist.toFixed(1): '—'} {t('common.kg')}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <View style={{ width: 10, height: 3, backgroundColor: '#2bb673', marginRight: 6 }} />
                            <Text style={{ color: colors.text }}>{t('goals.plannedLabel')}: {typeof soll==='number'? soll.toFixed(1): '—'} {t('common.kg')}</Text>
                          </View>
                        </View>
                      );
                    } catch { return <View />; }
                  },
                }}
              />
              <Text style={{ color: colors.muted, marginTop: 6 }}>{t('goals.actualEndsToday')}</Text>
            </View>
          )}
        </View>

        {/* Prognose ab heute (Erwartet vs. Soll) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='trending-up' size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('goals.futureTitle')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 10, height: 3, backgroundColor: '#00bcd4', marginRight: 6 }} />
                <Text style={{ color: colors.muted }}>{t('goals.expectedLabel')} (EWMA)</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 10, height: 3, backgroundColor: '#2bb673', marginRight: 6 }} />
                <Text style={{ color: colors.muted }}>{t('goals.plannedLabel')}</Text>
              </View>
            </View>
          </View>
          {!chartFuture ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('goals.notEnoughData')} {t('goals.orGoalMissing') || ''}</Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              <LineChart
                data={chartFuture.expected}
                data2={chartFuture.planned}
                data3={chartFuture.upper}
                color={'#00bcd4'}
                color2={'#2bb673'}
                color3={'rgba(0,188,212,0.6)'}
                thickness={2}
                thickness2={2}
                thickness3={1}
                showYAxisText
                yAxisTextStyle={{ color: colors.muted }}
                yAxisColor={colors.muted}
                xAxisColor={colors.muted}
                noOfSections={4}
                hideRules={false}
                initialSpacing={8}
                spacing={chartFuture.spacing}
                xAxisLabelTexts={chartFuture.labels}
                xAxisLabelTextStyle={{ color: colors.muted, fontSize: 10 }}
                xAxisThickness={1}
                focusEnabled
                showDataPointOnPress
                pointerConfig={{
                  activatePointersOnLongPress: true,
                  pointerStripHeight: 200,
                  pointerStripColor: colors.muted,
                  pointerStripWidth: 1,
                  pointerColor: colors.muted,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelComponent: (items) => {
                    try {
                      const idx = (items && items[0] && typeof items[0].index === 'number') ? items[0].index : 0;
                      const dateKey = chartFuture.dateKeys[idx] || '';
                      const dt = dateKey ? new Date(dateKey) : null;
                      const label = dt ? `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}` : '';
                      const exp = items?.[0]?.value ?? undefined; // expected
                      const soll = items?.[1]?.value ?? undefined; // planned
                      const sig = chartFuture.sigma || 0;
                      const low = typeof exp==='number' ? exp - 1.0*sig : undefined;
                      const up = typeof exp==='number' ? exp + 1.0*sig : undefined;
                      return (
                        <View style={{ backgroundColor: colors.card, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.muted, minWidth: 160 }}>
                          <Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <View style={{ width: 10, height: 3, backgroundColor: '#00bcd4', marginRight: 6 }} />
                            <Text style={{ color: colors.text }}>{t('goals.expectedLabel')}: {typeof exp==='number'? exp.toFixed(1): '—'} {t('common.kg')}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <View style={{ width: 10, height: 3, backgroundColor: '#2bb673', marginRight: 6 }} />
                            <Text style={{ color: colors.text }}>{t('goals.plannedLabel')}: {typeof soll==='number'? soll.toFixed(1): '—'} {t('common.kg')}</Text>
                          </View>
                          <Text style={{ color: colors.muted, marginTop: 4 }}>{t('goals.expectedBand')}: {typeof low==='number' &amp;&amp; typeof up==='number' ? `${low.toFixed(1)}–${up.toFixed(1)} ${t('common.kg')}` : '—'}</Text>
                        </View>
                      );
                    } catch { return <View />; }
                  },
                }}
              />
              <Text style={{ color: colors.muted, marginTop: 6 }}>{t('goals.futureTitle')}: {t('goals.expectedLabel')} = EWMA; {t('goals.expectedBand')}.</Text>
            </View>
          )}
        </View>

        {/* Pace/ETA/Trend/BMI */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='pulse' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('goals.metricsTitle')}</Text>
          </View>
          <View style={{ marginTop: 6, gap: 4 }}>
            <Text style={{ color: colors.muted }}>{t('goals.paceLabel')}: {metrics.pace.toFixed(3)} {t('common.kg')}/Tag</Text>
            <Text style={{ color: colors.muted }}>{t('goals.trendLabel')}: {metrics.trend}{metrics.plateau?' · Plateau':''}</Text>
            <Text style={{ color: colors.muted }}>{t('goals.etaLabel')}: {metrics.eta ? metrics.eta.toLocaleDateString() : '—'}</Text>
            <Text style={{ color: colors.muted }}>BMI: {bmi?bmi.toFixed(1):'—'}</Text>
          </View>
        </View>

        {/* Analyse + Kurztipps */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name='bulb' size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 8 }}>{t('goals.tipsTitle')}</Text>
          </View>
          {tips.map((tip, i)=> (
            <Text key={i} style={{ color: colors.muted, marginTop: 4 }}>• {tip}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ card: { borderRadius: 12, padding: 12 } });