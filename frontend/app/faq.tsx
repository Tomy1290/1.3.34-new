import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useStore';

function useThemeColors(theme: string) {
  if (theme === 'pink_pastel') return { bg: '#fff0f5', card: '#ffe4ef', primary: '#d81b60', text: '#3a2f33', muted: '#8a6b75' };
  if (theme === 'pink_vibrant') return { bg: '#1b0b12', card: '#2a0f1b', primary: '#ff2d87', text: '#ffffff', muted: '#e59ab8' };
  if (theme === 'golden_pink') return { bg: '#fff8f0', card: '#ffe9c7', primary: '#dba514', text: '#2a1e22', muted: '#9b7d4e' };
  return { bg: '#fde7ef', card: '#ffd0e0', primary: '#e91e63', text: '#2a1e22', muted: '#7c5866' };
}

export default function FAQScreen() {
  const state = useAppStore();
  const router = useRouter();
  const colors = useThemeColors(state.theme);
  const lng = state.language;
  const t = (de: string, en: string, pl?: string) => (lng === 'en' ? en : (lng === 'pl' && pl ? pl : de));

  type QA = { id: string; q: string; a: string };
  type Cat = { id: string; title: string; items: QA[] };

  const data: Cat[] = useMemo(() => [
    {
      id: 'nav',
      title: t('Einstieg & Navigation', 'Getting started & navigation', 'Pierwsze kroki i nawigacja'),
      items: [
        { id: 'nav-1', q: t('Wie wechsle ich den Tag?', 'How do I change the day?', 'Jak zmienić dzień?'), a: t('Nutze die Pfeile oben oder tippe auf das Datum, um zu „Heute“ zurückzuspringen.', 'Use the arrows on top or tap the date to jump back to "Today".', 'Użyj strzałek u góry lub stuknij datę, aby wrócić do „Dziś”.') },
        { id: 'nav-2', q: t('Wo finde ich den Kalender?', 'Where is the calendar?', 'Gdzie jest kalendarz?'), a: t('Dashboard → Karte „Zyklus“ → Button „Kalender“.', 'Dashboard → "Cycle" card → "Calendar" button.', 'Ekran główny → karta „Cykl” → przycisk „Kalendarz”.') },
        { id: 'nav-3', q: t('Was ist „Schnellzugriff“?', 'What is "Quick access"?', 'Czym jest „Szybki dostęp”?'), a: t('Kacheln zu häufig genutzten Bereichen wie Chat, Einstellungen, Gespeichert und FAQ.', 'Tiles to frequently used areas like Chat, Settings, Saved and FAQ.', 'Kafelki do często używanych sekcji: Czat, Ustawienia, Zapisane i FAQ.') },
        { id: 'nav-4', q: t('Wie ändere ich die Sprache?', 'How do I change language?', 'Jak zmienić język?'), a: t('Einstellungen → Sprache → Deutsch/English/Polski.', 'Settings → Language → Deutsch/English/Polski.', 'Ustawienia → Język → Deutsch/English/Polski.') },
      ],
    },
    {
      id: 'drinks',
      title: t('Getränke & Sport', 'Drinks & sport', 'Napoje i sport'),
      items: [
        { id: 'dr-1', q: t('Wie trage ich Wasser ein?', 'How to log water?', 'Jak dodać wodę?'), a: t('Im Bereich „Getränke & Sport“: „Wasser“ → – / Anzahl / +. Bechergröße in Einstellungen festlegen.', 'In "Drinks & Sport": "Water" → – / count / +. Set cup size in Settings.', 'W „Napoje i sport”: „Woda” → – / liczba / +. Ustaw pojemność kubka w Ustawieniach.') },
        { id: 'dr-2', q: t('Wie berechnet sich das Tagesziel?', 'How is the daily goal calculated?', 'Jak liczony jest cel dzienny?'), a: t('35 ml pro kg Körpergewicht + 500 ml bei Sport. „Wasserkur“ addiert +1,0 L zur Aufnahme (nicht zum Ziel).', '35 ml per kg body weight + 500 ml if sport. "Water cure" adds +1.0 L to intake (not to goal).', '35 ml na kg masy ciała + 500 ml przy sporcie. „Kuracja wodna” dodaje +1,0 L do spożycia (nie do celu).') },
        { id: 'dr-3', q: t('Was macht „Wasserkur“?', 'What does "Water cure" do?', 'Co robi „Kuracja wodna”?'), a: t('Schaltet einen +1,0 L Bonus für die Aufnahme an/aus.', 'Toggles a +1.0 L intake bonus on/off.', 'Włącza/wyłącza bonus +1,0 L do spożycia.') },
        { id: 'dr-4', q: t('Zählt Kaffee negativ für XP?', 'Does coffee reduce XP?', 'Czy kawa zmniejsza XP?'), a: t('Ab der 7. Tasse werden pro weiterer Tasse 10 XP abgezogen; darunter unverändert.', 'From the 7th cup, -10 XP per additional cup; below that unchanged.', 'Od 7. filiżanki -10 XP za każdą kolejną; poniżej bez zmian.') },
      ],
    },
    {
      id: 'cycle',
      title: t('Zyklus-Tracking', 'Cycle tracking', 'Śledzenie cyklu'),
      items: [
        { id: 'cy-1', q: t('Wie starte/beende ich meinen Zyklus?', 'How do I start/end my cycle?', 'Jak rozpocząć/zakończyć cykl?'), a: t('Dashboard → Karte „Zyklus“ → „Zyklus Beginn/Ende“.', 'Dashboard → "Cycle" card → "Start/End cycle".', 'Ekran główny → karta „Cykl” → „Start/End cycle”.') },
        { id: 'cy-2', q: t('Was bedeuten die Farben im Kalender?', 'What do calendar colors mean?', 'Co oznaczają kolory w kalendarzu?'), a: t('Vollfarbe: Periode. Hell: bevorstehende Periode. Umrandet: fruchtbar. Kleiner Punkt: Eisprung.', 'Solid: period. Light: upcoming period. Outlined: fertile. Small dot: ovulation.', 'Pełny kolor: okres. Jasny: nadchodzący okres. Obramowanie: płodność. Kropka: owulacja.') },
        { id: 'cy-3', q: t('Kann ich zukünftige Tage öffnen?', 'Can I open future days?', 'Czy mogę otwierać przyszłe dni?'), a: t('Zukunftstage sind gesperrt. Tippe auf vergangene/heutige Tage zum Eintrag.', 'Future days are locked. Tap past/today to log.', 'Przyszłe dni są zablokowane. Stuknij dni przeszłe/dzisiejsze, aby dodać wpis.') },
        { id: 'cy-4', q: t('Was ist die 7‑Tage-Regel?', 'What is the 7‑day rule?', 'Na czym polega reguła 7 dni?'), a: t('Einträge älter als 7 Tage (und Zukunft) können nicht gespeichert/gelöscht werden.', 'Entries older than 7 days (and future) cannot be saved/deleted.', 'Wpisów starszych niż 7 dni (i przyszłych) nie można zapisywać/usuwać.') },
        { id: 'cy-5', q: t('Wie erfasse ich die Periodenstärke?', 'How to log period intensity?', 'Jak zapisać intensywność okresu?'), a: t('Auf dem Zyklus-Tag: „Periode (Stärke)“ 0–10 per Tap oder mit –/+ einstellen.', 'On cycle day: "Bleeding (intensity)" 0–10 via tap or –/+.','Na dniu cyklu: „Periode (siła)” 0–10 stuknięciem lub –/+.') },
      ],
    },
    {
      id: 'weight',
      title: t('Gewicht & Analyse', 'Weight & analysis', 'Waga i analiza'),
      items: [
        { id: 'w-1', q: t('Wie trage ich mein Gewicht ein?', 'How do I log my weight?', 'Jak zapisać wagę?'), a: t('Dashboard → Karte „Gewicht“ → „Eintragen“.', 'Dashboard → "Weight" card → "Log".', 'Ekran główny → karta „Waga” → „Zapisz”.') },
        { id: 'w-2', q: t('Was zeigt die Analyse?', 'What does analysis show?', 'Co pokazuje analiza?'), a: t('Verläufe, Filter und Hinweise (erweiterte Stats ab Level 10; Premium Insights optional).', 'Trends, filters and hints (extended stats at Level 10; premium insights optional).', 'Trendy, filtry i wskazówki (rozszerzone statystyki od poziomu 10; premium insights opcjonalnie).') },
        { id: 'w-3', q: t('Wie wird das Wasserziel im Dashboard berechnet?', 'How is the water goal on the dashboard calculated?', 'Jak liczony jest cel wody na ekranie głównym?'), a: t('Automatisch aus Gewicht (35 ml/kg) + 500 ml bei Sport; Bechergröße in Einstellungen.', 'Automatically from weight (35 ml/kg) + 500 ml if sport; cup size in Settings.', 'Automatycznie z wagi (35 ml/kg) + 500 ml przy sporcie; rozmiar kubka w Ustawieniach.') },
      ],
    },
    {
      id: 'reminders',
      title: t('Erinnerungen & Daten', 'Reminders & data', 'Przypomnienia i dane'),
      items: [
        { id: 'r-1', q: t('Wie richte ich Erinnerungen ein?', 'How to set reminders?', 'Jak ustawić przypomnienia?'), a: t('Einstellungen → Erinnerungen. „Standard anlegen“ oder eigene (Label + Zeit).', 'Settings → Reminders. "Seed defaults" or create custom (label + time).', 'Ustawienia → Przypomnienia. „Utwórz domyślne” lub własne (etykieta + czas).') },
        { id: 'r-2', q: t('Wie exportiere/importiere ich Daten?', 'How to export/import data?', 'Jak eksportować/importować dane?'), a: t('Einstellungen → Daten & Backup. Android: SAF-Ordner wählen; sonst teilen als JSON.', 'Settings → Data & Backup. Android: choose SAF folder; otherwise share JSON.', 'Ustawienia → Dane i kopia. Android: wybierz katalog SAF; w innym razie udostępnij JSON.') },
        { id: 'r-3', q: t('Welche Werte hat die Bechergröße?', 'What is the cup size range?', 'Jaki jest zakres rozmiaru kubka?'), a: t('0–1000 ml; Eingabe wird automatisch auf den Bereich gekürzt.', '0–1000 ml; input is clamped automatically.', '0–1000 ml; wartość jest automatycznie zawężana do zakresu.') },
      ],
    },
    {
      id: 'game',
      title: t('Gamification & Erfolge', 'Gamification & achievements', 'Gamifikacja i osiągnięcia'),
      items: [
        { id: 'g-1', q: t('Wie erhalte ich XP/Level?', 'How do I gain XP/level?', 'Jak zdobywać XP/poziomy?'), a: t('Durch tägliche Aktionen, Wasser, Events und Erfolge. Level steigt pro 100 XP.', 'Via daily actions, water, events and achievements. Level increases per 100 XP.', 'Poprzez codzienne akcje, wodę, wydarzenia i osiągnięcia. Poziom rośnie co 100 XP.') },
        { id: 'g-2', q: t('Was sind „Ketten“?', 'What are "chains"?', 'Czym są „łańcuchy”?'), a: t('Meilensteine aus mehreren Erfolgen. Sortierung nach Fortschritt. Zeigt den nächsten Schritt.', 'Milestones composed of multiple achievements. Sorted by progress, shows next step.', 'Kamienie milowe z wielu osiągnięć. Sortowane wg postępu, pokazują kolejny krok.') },
        { id: 'g-3', q: t('Gibt es Belohnungen?', 'Are there rewards?', 'Czy są nagrody?'), a: t('Ja: z. B. L10 Erweiterte Stats, L25 Premium Insights, L50 VIP-Chat, L75 Golden Pink.', 'Yes: e.g. L10 Extended Stats, L25 Premium Insights, L50 VIP chat, L75 Golden Pink.', 'Tak: np. L10 Rozszerzone statystyki, L25 Premium Insights, L50 VIP czat, L75 Golden Pink.') },
      ],
    },
    {
      id: 'ai',
      title: t('Chat & KI', 'Chat & AI', 'Czat i AI'),
      items: [
        { id: 'ai-1', q: t('Was ist VIP-Chat?', 'What is VIP chat?', 'Czym jest VIP czat?'), a: t('Ab Level 50 längerer Verlauf (bis 30 Nachrichten).', 'From level 50 longer history (up to 30 messages).', 'Od poziomu 50 dłuższa historia (do 30 wiadomości).') },
        { id: 'ai-2', q: t('Wie speichere ich Tipps aus dem Chat?', 'How do I save tips from chat?', 'Jak zapisać wskazówki z czatu?'), a: t('Im Chat: Tipp speichern (Bookmark). Später unter „Gespeichert“.', 'In chat: save via bookmark. Later under "Saved".', 'Na czacie: zapisz zakładką. Później w „Zapisane”.') },
        { id: 'ai-3', q: t('Was sind „Premium Insights“?', 'What are "Premium insights"?', 'Czym są „Premium insights”?'), a: t('Optionale KI-Hinweise in Analyse/Chat (Einstellungen → Premium Insights).', 'Optional AI hints in analysis/chat (Settings → Premium insights).', 'Opcjonalne wskazówki AI w analizie/czacie (Ustawienia → Premium insights).') },
      ],
    },
  ], [lng]);

  const [openCat, setOpenCat] = useState<Record<string, boolean>>({ nav: true });
  const [openItem, setOpenItem] = useState<Record<string, boolean>>({});

  const appTitle = lng==='en' ? "Scarlett’s Health Tracking" : (lng==='pl'? 'Zdrowie Scarlett' : 'Scarletts Gesundheitstracking');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { backgroundColor: colors.card, paddingVertical: 16 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel={t('Zurück','Back','Wróć')}>
          <Ionicons name='chevron-back' size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.appTitle, { color: colors.text }]}>{appTitle}</Text>
          <Text style={[styles.title, { color: colors.muted }]}>FAQ</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {data.map((cat) => (
          <View key={cat.id} style={[styles.card, { backgroundColor: colors.card }]}> 
            <TouchableOpacity onPress={() => setOpenCat((m)=>({ ...m, [cat.id]: !m[cat.id] }))} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{cat.title}</Text>
              <Ionicons name={openCat[cat.id] ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </TouchableOpacity>
            {openCat[cat.id] ? (
              <View style={{ marginTop: 8 }}>
                {cat.items.map((it) => (
                  <View key={it.id} style={{ marginTop: 8 }}>
                    <TouchableOpacity onPress={() => setOpenItem((m)=>({ ...m, [it.id]: !m[it.id] }))} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text }}>{it.q}</Text>
                      <Ionicons name={openItem[it.id] ? 'remove' : 'add'} size={18} color={colors.muted} />
                    </TouchableOpacity>
                    {openItem[it.id] ? (
                      <Text style={{ color: colors.muted, marginTop: 6 }}>{it.a}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appTitle: { fontSize: 14, fontWeight: '800' },
  title: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 12, padding: 12 },
});