import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTravel } from '../context/TravelContext';
import { TOTAL_COUNTRIES, CONTINENT_COUNTS, getCountryById } from '../data/countries';
import { getUnlockedAchievements, ACHIEVEMENTS } from '../data/achievements';
import UserProfile from '../models/UserProfile';

export default function ProfileScreen() {
  const { visited, dream, resetAll } = useTravel();
  const unlocked = getUnlockedAchievements(visited, dream);

  // Створюємо екземпляр моделі UserProfile на льоту з актуальних даних.
  // Поля моделі (ім'я, кількість країн, відсоток, ранг) напряму
  // використовуються у UI нижче.
  const profile = useMemo(() => {
    const percent = (visited.length / TOTAL_COUNTRIES) * 100;
    return new UserProfile(
      'Мандрівник',       // name
      visited.length,     // visitedCount
      dream.length,       // dreamCount
      parseFloat(percent.toFixed(1)),  // worldPercent
      unlocked.length,    // achievementsUnlocked
      true,               // notificationsEnabled
      new Date()          // joinedAt (у реальному застосунку - береться з першого запуску)
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

  const perContinent = {};
  for (const v of visited) {
    const c = getCountryById(v.id);
    if (c) perContinent[c.continent] = (perContinent[c.continent] || 0) + 1;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
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
  resetBtn: {
    margin: 16, padding: 14,
    backgroundColor: '#ffebee',
    borderRadius: 10, alignItems: 'center',
  },
  resetTxt: { color: '#c62828', fontWeight: '600' },
});
