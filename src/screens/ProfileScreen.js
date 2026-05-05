import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTravel } from '../context/TravelContext';
import { useAuth } from '../context/AuthContext';
import { TOTAL_COUNTRIES, CONTINENT_COUNTS, getCountryById } from '../data/countries';
import { getUnlockedAchievements, ACHIEVEMENTS } from '../data/achievements';
import UserProfile from '../models/UserProfile';
import { setDemoOffline, getDemoOffline, subscribeDemoOffline } from '../api/supabaseClient';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { visited, dream, resetAll, syncPending } = useTravel();
  const { user, signOut } = useAuth();
  const unlocked = getUnlockedAchievements(visited, dream);

  const [syncing, setSyncing] = useState(false);
  const [online, setOnlineState] = useState(!getDemoOffline());
  const [signingOut, setSigningOut] = useState(false);

  // Підписуємось на зміни прапорця "demo offline" - щоб UI оновлювався
  // якщо хтось ще його змінив (наприклад, у фоні)
  useEffect(() => {
    const unsub = subscribeDemoOffline((isOffline) => {
      setOnlineState(!isOffline);
    });
    return unsub;
  }, []);

  const profile = useMemo(() => {
    const percent = (visited.length / TOTAL_COUNTRIES) * 100;
    return new UserProfile(
      'Мандрівник',
      visited.length,
      dream.length,
      parseFloat(percent.toFixed(1)),
      unlocked.length,
      true,
      new Date()
    );
  }, [visited.length, dream.length, unlocked.length]);

  const confirmReset = () => {
    Alert.alert(
      'Скинути все?',
      'Це видалить усі позначки. Дію не можна скасувати.',
      [
        { text: 'Скасувати', style: 'cancel' },
        { text: 'Видалити все', style: 'destructive', onPress: resetAll },
      ]
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncPending();
      Alert.alert(
        'Синхронізація завершена',
        `Успішно: ${res.synced}\nПомилки: ${res.failed}`
      );
    } catch (e) {
      Alert.alert('Помилка', e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Вийти з акаунту?',
      'Локальні дані залишаться, але для перегляду треба буде увійти знову.',
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Вийти',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
            } catch (e) {
              Alert.alert('Помилка', e.message);
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const toggleOnline = () => {
    const newValue = !online;
    // Якщо newValue=true (онлайн), то demoOffline=false
    // Якщо newValue=false (офлайн), то demoOffline=true
    setDemoOffline(!newValue);
    setOnlineState(newValue);
  };

  const perContinent = {};
  for (const v of visited) {
    const c = getCountryById(v.id);
    if (c) perContinent[c.continent] = (perContinent[c.continent] || 0) + 1;
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>🧭</Text>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.rank}>{profile.getRank()}</Text>
        <Text style={styles.subtitle}>
          {profile.visitedCount} країн • {profile.worldPercent}% світу
        </Text>
      </View>

      {/* Блок акаунта */}
      {user && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Акаунт</Text>
          <Row label="Email" value={user.email} />
          <Row label="ID" value={user.id?.slice(0, 8) + '...'} />
          <TouchableOpacity
            style={[styles.signOutBtn, signingOut && styles.primaryBtnDisabled]}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator color="#c62828" />
            ) : (
              <Text style={styles.signOutTxt}>🚪 Вийти з акаунту</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Статистика</Text>
        <Row label="Відвідано країн" value={profile.visitedCount} />
        <Row label="У мріях" value={profile.dreamCount} />
        <Row
          label="Досягнень отримано"
          value={`${profile.achievementsUnlocked} / ${ACHIEVEMENTS.length}`}
        />
        <Row
          label="Сповіщення"
          value={profile.notificationsEnabled ? 'Увімкнено' : 'Вимкнено'}
        />
      </View>

      {/* Блок синхронізації (offline-first) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>☁️ Синхронізація</Text>
        <Row
          label="Стан мережі"
          value={online ? '🟢 Онлайн' : '🔴 Офлайн'}
        />
        <TouchableOpacity style={styles.secondaryBtn} onPress={toggleOnline}>
          <Text style={styles.secondaryTxt}>
            {online ? 'Вимкнути мережу (демо)' : 'Увімкнути мережу (демо)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, syncing && styles.primaryBtnDisabled]}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryTxt}>Синхронізувати зараз</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.hint}>
          Застосунок працює offline-first: усі зміни зберігаються локально одразу,
          а синхронізуються з сервером у фоні. Якщо мережі немає — записи з
          позначкою syncStatus='pending' чекають, поки з'явиться мережа.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌍 За континентами</Text>
        {Object.keys(CONTINENT_COUNTS).map((continent) => (
          <Row
            key={continent}
            label={continent}
            value={`${perContinent[continent] || 0} / ${CONTINENT_COUNTS[continent]}`}
          />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>✅ Відвідані країни</Text>
        {visited.length === 0 ? (
          <Text style={styles.empty}>Поки порожньо. Познач першу країну на мапі!</Text>
        ) : (
          visited.map((c) => (
            <Text key={c.id} style={styles.listItem}>• {c.name}</Text>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💭 Мрії</Text>
        {dream.length === 0 ? (
          <Text style={styles.empty}>Додай країни до списку мрій.</Text>
        ) : (
          dream.map((c) => (
            <Text key={c.id} style={styles.listItem}>• {c.name}</Text>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.resetBtn} onPress={confirmReset}>
        <Text style={styles.resetTxt}>Скинути все</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#e0f2f1',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarTxt: { fontSize: 40 },
  name: { fontSize: 20, fontWeight: '700' },
  rank: { fontSize: 16, fontWeight: '500', color: '#2e7d32', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    margin: 10, padding: 16, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: '#555', fontSize: 14 },
  rowValue: { color: '#111', fontWeight: '600', fontSize: 14 },
  empty: { color: '#999', fontStyle: 'italic' },
  listItem: { fontSize: 14, paddingVertical: 3, color: '#333' },
  hint: { fontSize: 12, color: '#777', marginTop: 10, lineHeight: 17 },
  primaryBtn: {
    marginTop: 10, padding: 12,
    backgroundColor: '#2e7d32',
    borderRadius: 10, alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryTxt: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    marginTop: 8, padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 10, alignItems: 'center',
  },
  secondaryTxt: { color: '#333', fontWeight: '600' },
  signOutBtn: {
    marginTop: 12, padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 10, alignItems: 'center',
  },
  signOutTxt: { color: '#c62828', fontWeight: '700' },
  resetBtn: {
    margin: 16, padding: 14,
    backgroundColor: '#ffebee',
    borderRadius: 10, alignItems: 'center',
  },
  resetTxt: { color: '#c62828', fontWeight: '600' },
});