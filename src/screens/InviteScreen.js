/**
 * src/screens/InviteScreen.js  ← ЗАМЕНИТЬ
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { acceptInviteToken } from '../api/friendsApi';

export default function InviteScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  // Токен може прийти з deep link або юзер вводить вручну
  const [token, setToken] = useState((route.params?.token || '').toUpperCase());
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      Alert.alert('Помилка', 'Введи токен запрошення');
      return;
    }
    setLoading(true);
    try {
      const sender = await acceptInviteToken(trimmed);
      Alert.alert(
        '🎉 Друг доданий!',
        `Ти тепер друзі з ${sender?.username || 'користувачем'}!\nЇх активність з'явиться в стрічці.`,
        [{
          text: 'Чудово!',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }),
        }]
      );
    } catch (e) {
      Alert.alert('Не вдалося', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.icon}>🎁</Text>
      <Text style={styles.title}>Запрошення</Text>
      <Text style={styles.subtitle}>
        Встав токен з посилання або введи його вручну щоб додати друга
      </Text>

      {/* Поле вводу токену */}
      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>Токен запрошення</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={t => setToken(t.toUpperCase())}
          placeholder="Наприклад: A3F9KX2WQP"
          placeholderTextColor="#bbb"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
        />
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.acceptBtn, (!token.trim() || loading) && styles.btnDisabled]}
          onPress={handleAccept}
          disabled={!token.trim() || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.acceptTxt}>✅ Додати в друзі</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.declineBtn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
          disabled={loading}
        >
          <Text style={styles.declineTxt}>Скасувати</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, alignItems: 'center' },
  icon: { fontSize: 80, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  subtitle: {
    fontSize: 15, color: '#666', textAlign: 'center',
    marginBottom: 32, lineHeight: 22,
  },
  inputWrap: { width: '100%', marginBottom: 32 },
  inputLabel: { fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '600' },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    padding: 14, fontSize: 20, fontWeight: '700',
    color: '#333', letterSpacing: 3, textAlign: 'center',
    backgroundColor: '#fafafa',
  },
  buttons: { width: '100%', gap: 12 },
  acceptBtn: {
    backgroundColor: '#2e7d32', padding: 16,
    borderRadius: 12, alignItems: 'center',
    minHeight: 52, justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  acceptTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  declineBtn: {
    backgroundColor: '#f5f5f5', padding: 16,
    borderRadius: 12, alignItems: 'center',
  },
  declineTxt: { color: '#666', fontWeight: '600', fontSize: 16 },
});