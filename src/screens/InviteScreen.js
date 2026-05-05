import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Екран запрошення.
 *
 * Відкривається за посиланням типу:
 *   travelmap://invite/ABC123
 *   https://travelmap.app/invite/ABC123
 *
 * Показує інформацію про запрошення і дві кнопки: прийняти / відхилити.
 *
 * Якщо у тебе буде справжня система друзів — тут можна викликати API,
 * щоб показати ім'я того, хто запрошує. Зараз просто показуємо токен.
 */
export default function InviteScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const token = route.params?.token || '';

  const handleAccept = () => {
    Alert.alert(
      'Запрошення прийнято!',
      `Токен: ${token}\n\nУ цій версії застосунку ще немає системи друзів, але посилання спрацювало правильно.`,
      [{ text: 'OK', onPress: () => navigation.navigate('Map') }]
    );
  };

  const handleDecline = () => {
    Alert.alert('Запрошення відхилено', '', [
      { text: 'OK', onPress: () => navigation.navigate('Map') },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Text style={styles.icon}>🎁</Text>
      <Text style={styles.title}>Тебе запрошують!</Text>
      <Text style={styles.subtitle}>
        Хтось хоче поділитися з тобою своєю мапою подорожей у застосунку Travel Wish Map
      </Text>

      <View style={styles.tokenBox}>
        <Text style={styles.tokenLabel}>Код запрошення:</Text>
        <Text style={styles.tokenValue}>{token || '—'}</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
          <Text style={styles.acceptTxt}>✅ Прийняти</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
          <Text style={styles.declineTxt}>Відхилити</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>
        Цей екран відкрився через deep-link {`travelmap://invite/${token}`}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, alignItems: 'center' },
  icon: { fontSize: 80, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  tokenBox: {
    backgroundColor: '#f0f4ff',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  tokenLabel: { fontSize: 13, color: '#666', marginBottom: 6 },
  tokenValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5f5df8',
    letterSpacing: 2,
  },
  buttons: { width: '100%', gap: 12 },
  acceptBtn: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  declineBtn: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineTxt: { color: '#666', fontWeight: '600', fontSize: 16 },
  note: {
    marginTop: 24,
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});