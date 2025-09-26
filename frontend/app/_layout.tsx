import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeNotifications, computeNextOccurrence, scheduleOneTimeNotification, cancelNotification } from '../src/utils/notifications';
import { scheduleCycleNotifications } from '../src/utils/cycleNotifications';
import { useAppStore } from "../src/store/useStore";
// import { warmupBackend } from "../src/utils/api";
import { AppState } from 'react-native';



export default function RootLayout() {
  const theme = useAppStore((s) => s.theme);
  const barStyle = theme === "pink_vibrant" ? "light" : "dark";
  const bg = theme === 'pink_vibrant' ? '#1b0b12' : '#fde7ef';

  const [bootVisible, setBootVisible] = useState(true);
  useEffect(() => { const t = setTimeout(() => setBootVisible(false), 1200); return () => clearTimeout(t); }, []);

  useEffect(() => {
    (async () => {
      const initialized = await initializeNotifications();
      if (initialized) {
        const state = useAppStore.getState();
        // Keine globalen Resets mehr beim Start – manche Systeme feuern sonst direkt.
        await scheduleCycleNotifications(state);
        // Reminder werden ausschließlich über Settings geplant (explizites User-Event).
        // Hotfix: Prüfe und räume offensichtlich problematische Termine auf (Date in Vergangenheit)
        try {
          const state2 = useAppStore.getState();
          const nm = state2.notificationMeta || {};
          for (const key of Object.keys(nm)) {
            const meta = nm[key];
            if (!meta?.id) continue;
            // keine Logik hier: cleanupLegacySchedules in initializeNotifications übernimmt OS-seitig die Stornierung
          }
        } catch {}

      }
    })();

  // Warm up backend (render.com) disabled temporarily for crash debugging
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       await warmupBackend(3500);
  //     } catch {}

  // Re-warmup disabled temporarily for crash debugging
  // useEffect(() => {
  //   const sub = AppState.addEventListener('change', (state) => {
  //     if (state === 'active') {
  //       try { warmupBackend(2500); } catch {}
  //     }
  //   });
  //   return () => { try { sub.remove(); } catch {} };
  // }, []);

    })();
  }, []);

  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={barStyle as any} />
      <Stack screenOptions={{ headerShown: false }} />
      {bootVisible ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
          <Image source={require('../assets/images/icon.png')} style={{ width: 120, height: 120, resizeMode: 'contain' }} />
          <Text style={{ marginTop: 12, color: theme==='pink_vibrant' ? '#ffffff' : '#3a2f33' }}>created by Gugi</Text>
        </View>
      ) : null}
    </GestureHandlerRootView>
  );
}