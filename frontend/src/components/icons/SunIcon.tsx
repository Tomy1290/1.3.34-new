import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { View } from 'react-native';

export default function SunIcon({ size = 18, color = '#e91e63' }: { size?: number; color?: string }) {
  const s = size;
  const r = s * 0.3;
  return (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Circle cx={s/2} cy={s/2} r={r} fill={color} opacity={0.95} />
        {/* rays */}
        <Line x1={s/2} y1={2} x2={s/2} y2={s*0.2} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Line x1={s/2} y1={s-s*0.2} x2={s/2} y2={s-2} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Line x1={2} y1={s/2} x2={s*0.2} y2={s/2} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Line x1={s-s*0.2} y1={s/2} x2={s-2} y2={s/2} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Line x1={s*0.18} y1={s*0.18} x2={s*0.3} y2={s*0.3} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Line x1={s*0.7} y1={s*0.7} x2={s*0.82} y2={s*0.82} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Line x1={s*0.7} y1={s*0.3} x2={s*0.82} y2={s*0.18} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Line x1={s*0.18} y1={s*0.82} x2={s*0.3} y2={s*0.7} stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}