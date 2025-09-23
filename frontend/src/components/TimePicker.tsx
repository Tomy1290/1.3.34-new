import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerProps {
  time: string; // unified HH:MM format
  onTimeChange: (time: string) => void;
  label?: string;
  colors: {
    text: string;
    primary: string;
    card: string;
    muted: string;
  };
  style?: any;
}

function normalizeDisplay(time: string): string {
  // Always show HH:MM
  const parts = time?.split(':') || [];
  const h = parts[0] ? parts[0].padStart(2, '0') : '00';
  const m = parts[1] ? parts[1].padStart(2, '0') : '00';
  return `${h}:${m}`;
}

export function TimePicker({ time, onTimeChange, label, colors, style }: TimePickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [timeInput, setTimeInput] = useState('');

  const openModal = () => {
    const clean = (time || '08:00').replace(':', '');
    setTimeInput(clean);
    setShowModal(true);
  };

  const handleTimeUpdate = () => {
    const normalized = (timeInput || '').replace(/[^\d]/g, '');
    let hour = NaN, minute = NaN;
    if (normalized.length === 4) {
      hour = parseInt(normalized.substring(0, 2), 10);
      minute = parseInt(normalized.substring(2, 4), 10);
    } else if (normalized.length === 3) {
      hour = parseInt(normalized.substring(0, 1), 10);
      minute = parseInt(normalized.substring(1, 3), 10);
    }
    if (!isNaN(hour) && !isNaN(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      const hh = hour.toString().padStart(2, '0');
      const mm = minute.toString().padStart(2, '0');
      onTimeChange(`${hh}:${mm}`);
    }
    setShowModal(false);
    setTimeInput('');
  };

  return (
    <View style={style}>
      {label ? (
        <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}>{label}</Text>
      ) : null}

      <TouchableOpacity
        onPress={openModal}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.card,
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.primary + '40',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 16, marginLeft: 8, fontWeight: '500' }}>
            {normalizeDisplay(time)}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.card, padding: 20, borderRadius: 12, width: 280 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
              Zeit eingeben
            </Text>
            <TextInput
              value={timeInput}
              onChangeText={setTimeInput}
              placeholder="z.B. 1430 oder 14:30"
              placeholderTextColor={colors.muted}
              style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary, borderRadius: 8, padding: 12, fontSize: 16, color: colors.text, textAlign: 'center', marginBottom: 16 }}
              keyboardType="numeric"
              maxLength={5}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.muted, alignItems: 'center' }}>
                <Text style={{ color: colors.text }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleTimeUpdate} style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}