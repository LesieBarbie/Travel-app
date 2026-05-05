import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DeepLinkRouter from '../navigation/DeepLinkRouter';

/**
 * Debug Screen — екран для розробника.
 *
 * Дозволяє тестувати deep links без реального зовнішнього посилання:
 *  - Поле введення URL
 *  - Кнопка "Відкрити" виконує DeepLinkRouter.handle(url)
 *  - Готові приклади URL (preset кнопки)
 *  - Перегляд результату парсингу (parseURL)
 *  - Можливість поділитись будь-яким URL через системний Share
 *
 * Якщо емулятор/девайс не підтримує Universal Links —
 * через цей екран можна перевірити всю логіку маршрутизації.
 */

const PRESETS = [
  { label: '🏠 Home', url: 'travelmap://home' },
  { label: '🇩🇪 Country (Germany)', url: 'travelmap://country/276' },
  { label: '🌆 Region (Bayern)', url: 'travelmap://country/276/region/Bayern' },
  { label: '📋 Catalog', url: 'travelmap://catalog' },
  { label: '✅ Catalog filter=visited', url: 'travelmap://catalog?filter=visited' },
  { label: '🎁 Invite', url: 'travelmap://invite/ABC123' },
  { label: '🏆 Achievements', url: 'travelmap://achievements' },
  { label: '🌐 HTTPS Country', url: 'https://travelmap.app/country/250' },
  { label: '❌ Невалідний URL', url: 'travelmap://something/random' },
];

export default function DebugScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState('travelmap://country/276');
  const [parseResult, setParseResult] = useState(null);

  // Створюємо роутер тут і прив'язуємо до навігації
  const router = React.useMemo(() => {
    const r = new DeepLinkRouter();
    r.setNavigation(navigation);
    return r;
  }, [navigation]);

  const handleOpen = () => {
    if (!url.trim()) {
      Alert.alert('Введіть URL');
      return;
    }
    const ok = router.handle(url.trim());
    if (!ok) {
      Alert.alert('Невідомий URL', 'DeepLinkRouter не зміг розпізнати цей URL.');
    }
  };

  const handleParse = () => {
    const result = router.parseURL(url.trim());
    setParseResult(result);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: url, url });
    } catch (e) {
      Alert.alert('Помилка шерингу', e.message);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Text style={styles.title}>🛠️ Debug — Deep Links</Text>
      <Text style={styles.subtitle}>
        Введи URL і натисни «Відкрити». Це симулює, що ти отримав посилання
        з листа, push-сповіщення або QR-коду.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>URL</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="travelmap://country/276"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleOpen}>
            <Text style={styles.primaryTxt}>▶ Відкрити</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleParse}>
            <Text style={styles.secondaryTxt}>🔍 Розібрати</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare}>
            <Text style={styles.secondaryTxt}>📤 Поділитись</Text>
          </TouchableOpacity>
        </View>
      </View>

      {parseResult !== null && (
        <View style={styles.card}>
          <Text style={styles.label}>Результат parseURL():</Text>
          <Text style={styles.code}>
            {parseResult ? JSON.stringify(parseResult, null, 2) : 'null (URL не розпізнано)'}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Готові приклади</Text>
        {PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.url}
            style={styles.preset}
            onPress={() => setUrl(preset.url)}
          >
            <Text style={styles.presetLabel}>{preset.label}</Text>
            <Text style={styles.presetUrl}>{preset.url}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 18 },
  card: {
    backgroundColor: '#f7f7f7',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, color: '#333' },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#5f5df8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryTxt: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryTxt: { color: '#333', fontWeight: '600', fontSize: 13 },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    color: '#333',
  },
  preset: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  presetLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  presetUrl: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#5f5df8',
    marginTop: 2,
  },
});