import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/useStore';

export default function DebugNotificationsScreen() {
  const router = useRouter();
  const theme = useAppStore((s) => s.theme);
  const colors = theme==='pink_vibrant'
    ? { bg: '#1b0b12', card: '#2a0f1b', text: '#fff', muted: '#e59ab8', primary: '#ff2d87' }
    : (theme==='pink_pastel'
      ? { bg: '#fff0f5', card: '#ffe4ef', text: '#3a2f33', muted: '#8a6b75', primary: '#d81b60' }
      : (theme==='golden_pink'
        ? { bg: '#fff8f0', card: '#ffe9c7', text: '#2a1e22', muted: '#9b7d4e', primary: '#dba514' }
        : { bg: '#fde7ef', card: '#ffd0e0', text: '#2a1e22', muted: '#7c5866', primary: '#e91e63' }));

  const [list, setList] = useState<Notifications.NotificationRequest[]>([]);

  const load = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Aktuell geplante Notifications:', scheduled);
    setList(scheduled);
  };

  const clearAll = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setList([]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}> 
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel='Zurück'>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]}>Debug – Notifications</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Geplante Benachrichtigungen inspizieren</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={load} style={[styles.btn, { backgroundColor: colors.primary }]}>
            <Ionicons name='refresh' size={16} color={'#fff'} />
            <Text style={{ color: '#fff', marginLeft: 6 }}>Neu laden</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAll} style={[styles.btn, { borderColor: colors.primary, borderWidth: 1 }]}>
            <Ionicons name='trash' size={16} color={colors.primary} />
            <Text style={{ color: colors.text, marginLeft: 6 }}>Alle löschen</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ marginTop: 8 }}>
          {list.length === 0 ? (
            <Text style={{ color: colors.muted }}>Keine geplanten Benachrichtigungen.</Text>
          ) : list.map((n, idx) => (
            <View key={n.identifier || String(idx)} style={{ backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <Text style={{ color: colors.text }}>➡️ ID: {n.identifier}</Text>
              <Text style={{ color: colors.text }}>Titel: {n.content?.title}</Text>
              <Text style={{ color: colors.text }}>Body: {n.content?.body}</Text>
              <Text style={{ color: colors.muted, marginTop: 6 }}>Trigger: {JSON.stringify(n.trigger)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700' },
  btn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
});