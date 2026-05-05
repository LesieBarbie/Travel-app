import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

/**
 * Екран логіну/реєстрації.
 * Перемикач між двома режимами через стан isSignUp.
 */
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Помилка', 'Заповни email і пароль');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Помилка', 'Пароль має бути ≥6 символів');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        Alert.alert('Успіх', 'Акаунт створено! Тепер увійди.');
        setIsSignUp(false);
        setPassword('');
      } else {
        await signIn(email.trim(), password);
        // Після успішного логіну AuthContext сам оновить стан
      }
    } catch (e) {
      Alert.alert('Помилка', e.message || 'Щось пішло не так');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.icon}>🗺️</Text>
        <Text style={styles.title}>Travel Wish Map</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Створи акаунт' : 'Увійди до свого акаунту'}
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            placeholder="мінімум 6 символів"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Створити акаунт' : 'Увійти'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.toggleTxt}>
              {isSignUp
                ? 'Уже є акаунт? Увійти'
                : 'Немає акаунту? Зареєструватись'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24, alignItems: 'center' },
  icon: { fontSize: 60, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32 },
  form: { width: '100%' },
  label: { fontSize: 13, color: '#555', marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#5f5df8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggleBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  toggleTxt: { color: '#5f5df8', fontWeight: '600' },
});