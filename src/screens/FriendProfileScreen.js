import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../api/supabaseClient';
import { removeFriend } from '../api/friendsApi';
import { ACHIEVEMENTS } from '../data/achievements';

const ACH_META = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

export default function FriendProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { friendId, friendshipId, username } = route.params;

  const [countries, setCountries] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: c }, { data: a }] = await Promise.all([
          supabase
            .from('countries')
            .select('name, continent')
            .eq('user_id', friendId)
            .eq('visited', true)
            .order('name', { ascending: true }),
          supabase
            .from('achievement_unlocks')
            .select('achievement_id, achievement_title, created_at')
            .eq('user_id', friendId)
            .order('created_at', { ascending: false }),
        ]);
        setCountries(c || []);
        setAchievements(a || []);
      } catch (e) {
        console.warn('[FriendProfile] load error:', e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [friendId]);

  const handleRemove = () => {
    Alert.alert(
      'Видалити друга?',
      `${username} буде видалений зі списку друзів.`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friendshipId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Помилка', e.message);
            }
          },
        },
      ]
    );
  };

  // Групуємо країни по континентах
  const byContinent = {};
  for (const c of countries) {
    const cont = c.continent || 'Інше';
    if (!byContinent[cont]) byContinent[cont] = [];
    byContinent[cont].push(c.name);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Шапка профілю */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(username || '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>{username}</Text>
        <Text style={styles.stats}>
          {countries.length} країн • {achievements.length} ачивок
        </Text>
      </View>

      {/* Ачивки */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏆 Досягнення</Text>
        {achievements.length === 0 ? (
          <Text style={styles.empty}>Поки немає досягнень</Text>
        ) : (
          <View style={styles.achGrid}>
            {achievements.map((a) => {
              const meta = ACH_META[a.achievement_id];
              const icon = meta?.icon || '🏆';
              const title = a.achievement_title || a.achievement_id;
              return (
                <View key={a.achievement_id} style={styles.achItem}>
                  <Text style={styles.achIcon}>{icon}</Text>
                  <Text style={styles.achTitle} numberOfLines={2}>{title}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Відвідані країни по континентах */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>✈️ Відвідані країни ({countries.length})</Text>
        {countries.length === 0 ? (
          <Text style={styles.empty}>Поки не відвідано жодної країни</Text>
        ) : (
          Object.entries(byContinent).map(([continent, names]) => (
            <View key={continent} style={styles.continentBlock}>
              <Text style={styles.continentTitle}>{continent} ({names.length})</Text>
              {names.map(name => (
                <Text key={name} style={styles.countryItem}>• {name}</Text>
              ))}
            </View>
          ))
        )}
      </View>

      {/* Видалити друга */}
      <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
        <Text style={styles.removeBtnText}>🗑 Видалити зі списку друзів</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  profileHeader: {
    alignItems: 'center', padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#c8e6c9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#2e7d32' },
  username: { fontSize: 22, fontWeight: '700', color: '#1b5e20' },
  stats: { fontSize: 14, color: '#888', marginTop: 4 },

  card: {
    backgroundColor: '#fff', margin: 12, padding: 16, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 12 },
  empty: { color: '#bbb', fontStyle: 'italic', fontSize: 14 },

  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achItem: {
    width: '28%', alignItems: 'center',
    backgroundColor: '#fff8e1', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#ffe082',
  },
  achIcon: { fontSize: 26, marginBottom: 4 },
  achTitle: { fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 14 },

  continentBlock: { marginBottom: 12 },
  continentTitle: { fontSize: 13, fontWeight: '700', color: '#2e7d32', marginBottom: 4 },
  countryItem: { fontSize: 14, color: '#444', paddingVertical: 2 },

  removeBtn: {
    margin: 16, padding: 14,
    backgroundColor: '#ffebee', borderRadius: 12, alignItems: 'center',
  },
  removeBtnText: { color: '#c62828', fontWeight: '600', fontSize: 15 },
});