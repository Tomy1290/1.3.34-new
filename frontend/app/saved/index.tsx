import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/useStore';
import * as Haptics from 'expo-haptics';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

const PRESET_CATEGORIES = ['Motivation', 'Ernährung', 'Trinken', 'Sport', 'Allgemein'];

export default function SavedManager() {
  const router = useRouter();
  const state = useAppStore();
  const colors = useThemeColors(state.theme);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newText, setNewText] = useState('');
  const [showNew, setShowNew] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');

  const categories = useMemo(() => {
    const fromSaved = Array.from(new Set((state.saved || []).map(s => s.category).filter(Boolean) as string[]));
    return Array.from(new Set([...PRESET_CATEGORIES, ...fromSaved]));
  }, [state.saved]);

  const filtered = useMemo(() => {
    let arr = state.saved || [];
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(s => (s.title?.toLowerCase().includes(q) || s.text.toLowerCase().includes(q) || (s.tags||[]).some(t => t.toLowerCase().includes(q))));
    }
    if (categoryFilter) {
      arr = arr.filter(s => (s.category || '') === categoryFilter);
    }
    return arr;
  }, [state.saved, query, categoryFilter]);

  function addItem() {
    if (!newText.trim()) return;
    state.addSaved({ id: String(Date.now()), title: newTitle || 'Notiz', category: newCategory || undefined, tags: newTags ? newTags.split(',').map(t => t.trim()).filter(Boolean) : undefined, text: newText.trim(), createdAt: Date.now() });
    setNewTitle(''); setNewCategory(''); setNewTags(''); setNewText(''); setShowNew(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function openEdit(id: string) {
    const it = (state.saved || []).find(s => s.id === id); if (!it) return;
    setEditingId(id);
    setEditTitle(it.title || '');
    setEditCategory(it.category || '');
    setEditTags((it.tags || []).join(', '));
  }

  function saveEdit() {
    if (!editingId) return;
    const tags = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : undefined;
    useAppStore.getState().updateSaved(editingId, { title: editTitle || 'Notiz', category: editCategory || undefined, tags });
    setEditingId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={state.language==='de'?'Zurück':'Back'}>
          <Ionicons name='chevron-back' size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{state.language==='en' ? "Scarlett’s Health Tracking" : 'Scarletts Gesundheitstracking'}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>{state.language==='de'?'Gespeicherte Nachrichten':'Saved messages'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ padding: 16, gap: 8 }}>
        <TextInput value={query} onChangeText={setQuery} placeholder='Suchen (Titel, Text, Tags)…' placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text }]} />
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setCategoryFilter('')} style={[styles.badge, { borderColor: colors.muted, backgroundColor: categoryFilter===''?colors.primary:'transparent' }]}>
            <Text style={{ color: categoryFilter===''?'#fff':colors.text }}>Alle</Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity key={c} onPress={() => setCategoryFilter(c)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: categoryFilter===c?colors.primary:'transparent' }]}>
              <Text style={{ color: categoryFilter===c?'#fff':colors.text }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Collapsible new item */}
        <TouchableOpacity onPress={() => setShowNew((v)=>!v)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Ionicons name={showNew ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 6 }}>{state.language==='de'?'Neu anlegen':'Create new'}</Text>
        </TouchableOpacity>
        {showNew ? (
          <View style={[styles.card, { backgroundColor: colors.card, marginTop: 8 }]}> 
            <TextInput value={newTitle} onChangeText={setNewTitle} placeholder='Titel (optional)' placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text, marginBottom: 8 }]} />
            <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
              {PRESET_CATEGORIES.map((c) => (
                <TouchableOpacity key={c} onPress={() => setNewCategory(c)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: newCategory===c?colors.primary:'transparent' }]}> 
                  <Text style={{ color: newCategory===c?'#fff':colors.text }}>{c}</Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 8 }} />
              <TextInput value={newCategory} onChangeText={setNewCategory} placeholder='Eigene Kategorie…' placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text, width: 180 }]} />
            </ScrollView>
            <TextInput value={newTags} onChangeText={setNewTags} placeholder='Tags (kommagetrennt)' placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text, marginTop: 8 }]} />
            <TextInput value={newText} onChangeText={setNewText} placeholder='Text…' placeholderTextColor={colors.muted} multiline style={[styles.input, { borderColor: colors.muted, color: colors.text, marginTop: 8, minHeight: 80 }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity onPress={addItem} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}> 
                <Ionicons name='save' size={16} color='#fff' />
                <Text style={{ color: '#fff', marginLeft: 8 }}>{state.language==='de'?'Speichern':'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {filtered.map((s) => (
          <View key={s.id} style={[styles.card, { backgroundColor: colors.card }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{s.title || 'Notiz'}</Text>
                {s.category ? <Text style={{ color: colors.muted, marginTop: 2 }}>{s.category}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => openEdit(s.id)}>
                  <Ionicons name='create-outline' size={18} color={colors.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => useAppStore.getState().deleteSaved(s.id)}>
                  <Ionicons name='trash' size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{ color: colors.text, marginTop: 8 }}>{s.text}</Text>
            {s.tags?.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {s.tags.map((t, i) => (
                  <View key={i} style={[styles.tag, { borderColor: colors.muted }]}> 
                    <Text style={{ color: colors.muted }}>#{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={!!editingId} transparent animationType='slide' onRequestClose={() => setEditingId(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <View style={[styles.modalSheet, { backgroundColor: colors.bg, borderColor: colors.muted }]}> 
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{state.language==='de'?'Nachricht bearbeiten':'Edit message'}</Text>
                <TouchableOpacity onPress={() => setEditingId(null)}>
                  <Ionicons name='close' size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <TextInput value={editTitle} onChangeText={setEditTitle} placeholder='Titel' placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text, marginTop: 12 }]} />
              <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {categories.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setEditCategory(c)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: editCategory===c?colors.primary:'transparent' }]}> 
                    <Text style={{ color: editCategory===c?'#fff':colors.text }}>{c}</Text>
                  </TouchableOpacity>
                ))}
                <View style={{ width: 8 }} />
                <TextInput value={editCategory} onChangeText={setEditCategory} placeholder='Eigene Kategorie…' placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text, width: 180 }]} />
              </ScrollView>
              <TextInput value={editTags} onChangeText={setEditTags} placeholder='Tags (kommagetrennt)' placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text, marginTop: 12 }]} />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <TouchableOpacity onPress={saveEdit} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}> 
                  <Ionicons name='save' size={16} color={'#fff'} />
                  <Text style={{ color: '#fff', marginLeft: 8 }}>{state.language==='de'?'Speichern':'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appTitle: { fontSize: 14, fontWeight: '800' },
  title: { fontSize: 12, fontWeight: '600' },
  iconBtn: { padding: 8 },
  badge: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  card: { borderRadius: 12, padding: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  modalSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, borderTopWidth: 1 },
});