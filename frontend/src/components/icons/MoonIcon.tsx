import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { View } from 'react-native';

export default function MoonIcon({ size = 18, color = '#e91e63' }: { size?: number; color?: string }) {
  const s = size;
  return (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M21 12.79A9 9 0 0 1 11.21 3c-.34 0-.68.02-1.01.07A7 7 0 1 0 21 12.79z" fill={color} opacity={0.9} />
      </Svg>
    </View>
  );
}