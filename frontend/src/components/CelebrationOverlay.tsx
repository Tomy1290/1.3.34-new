import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

export type CelebrationProps = {
  visible: boolean;
  message: string;
  sub?: string;
  onDone?: () => void;
};

export default function CelebrationOverlay({ visible, message, sub, onDone }: CelebrationProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const [blast, setBlast] = useState(false);

  useEffect(() => {
    if (visible) {
      setBlast(true);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start(() => {
        setTimeout(() => Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => { setBlast(false); onDone && onDone(); }), 1200);
      });
    } else {
      setBlast(false);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents='none' style={[styles.wrap, { opacity: fade }]}> 
      <View style={styles.card}>
        <Text style={styles.title}>{message}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {blast ? <ConfettiCannon count={120} origin={{ x: 0, y: 0 }} fadeOut autoStart onAnimationEnd={() => {}} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  title: { color: '#fff', fontWeight: '900', fontSize: 28 },
  sub: { color: '#fff', marginTop: 6, fontSize: 16 },
});